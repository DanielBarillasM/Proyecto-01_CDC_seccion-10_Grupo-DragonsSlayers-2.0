// ============================================================
// FASE DE DECLARACIÓN — Recolección de clases y resolución de tipos
// ============================================================
//
// Antes de recorrer los cuerpos de funciones y métodos, se necesita conocer
// TODAS las clases del programa (con su jerarquía de herencia, campos y
// métodos) para poder resolver referencias adelantadas: una clase puede
// usarse como tipo antes de su declaración textual, y un método puede
// invocar a otro declarado más abajo en el mismo cuerpo de clase.
//
// Decisión documentada (ver docs/DECISIONES_SEMANTICAS.md, sección "Espacio
// de nombres de clases"): las clases se resuelven en un registro único para
// todo el programa, independientemente del bloque léxico en el que
// aparezcan. Esto simplifica la resolución de tipos y la herencia sin
// afectar los ejemplos del lenguaje, donde las clases se declaran a nivel
// de programa.

import { ParserRuleContext } from "antlr4ts";
import {
  ClassDeclarationContext,
  type ClassMemberContext,
  type FunctionDeclarationContext,
  type ProgramContext,
  type StatementContext,
  type TypeContext
} from "../generated/CompiscriptParser";
import { createDiagnostic, type SemanticDiagnostic } from "./diagnostics";
import { T, type SemanticType } from "./semanticTypes";
import type { SourceLocation } from "./symbols";

export interface FieldInfo {
  name: string;
  type: SemanticType;
  mutable: boolean;
  declaration: SourceLocation;
}

export interface MethodInfo {
  name: string;
  params: { name: string; type: SemanticType }[];
  returnType: SemanticType;
  declaration: SourceLocation;
  ctx: FunctionDeclarationContext;
}

export interface ClassInfo {
  name: string;
  parentName: string | null;
  declaration: SourceLocation;
  ctx: ClassDeclarationContext;
  fields: Map<string, FieldInfo>;
  methods: Map<string, MethodInfo>;
  /** Se llena tras validar que la cadena de herencia no es circular. */
  parent: ClassInfo | null;
}

export function locOf(ctx: ParserRuleContext): SourceLocation {
  const symbol = ctx.start;
  return { line: symbol.line, column: symbol.charPositionInLine + 1 };
}

/** ¿`child` es la misma clase que `ancestor` o hereda de ella (transitivamente)? */
export function isSubclassOf(
  classInfoMap: Map<string, ClassInfo>,
  child: string,
  ancestor: string
): boolean {
  let current: ClassInfo | undefined = classInfoMap.get(child);
  const seen = new Set<string>();
  while (current) {
    if (current.name === ancestor) return true;
    if (seen.has(current.name)) return false;
    seen.add(current.name);
    current = current.parent ?? undefined;
  }
  return false;
}

/** Busca un campo en la clase o en cualquier ancestro. */
export function lookupField(classInfoMap: Map<string, ClassInfo>, className: string, fieldName: string): FieldInfo | undefined {
  let current: ClassInfo | undefined = classInfoMap.get(className);
  const seen = new Set<string>();
  while (current) {
    const field = current.fields.get(fieldName);
    if (field) return field;
    if (seen.has(current.name)) break;
    seen.add(current.name);
    current = current.parent ?? undefined;
  }
  return undefined;
}

/** Busca un método en la clase o en cualquier ancestro. */
export function lookupMethod(classInfoMap: Map<string, ClassInfo>, className: string, methodName: string): MethodInfo | undefined {
  let current: ClassInfo | undefined = classInfoMap.get(className);
  const seen = new Set<string>();
  while (current) {
    const method = current.methods.get(methodName);
    if (method) return method;
    if (seen.has(current.name)) break;
    seen.add(current.name);
    current = current.parent ?? undefined;
  }
  return undefined;
}

/**
 * resolveType
 *
 * Convierte un `TypeContext` de la gramática en un `SemanticType`. Un
 * `Identifier` como tipo base se interpreta como una instancia de clase.
 * Si la clase no existe todavía en `classInfoMap` (porque no es un tipo de
 * clase válido), se reporta SEM001 y se devuelve `error` para evitar
 * cascadas posteriores.
 */
export function resolveType(
  ctx: TypeContext,
  classInfoMap: Map<string, ClassInfo>,
  diagnostics: SemanticDiagnostic[]
): SemanticType {
  const baseTypeCtx = ctx.baseType();
  let base: SemanticType;

  if (baseTypeCtx.BOOLEAN_TYPE()) base = T.boolean;
  else if (baseTypeCtx.INTEGER_TYPE()) base = T.integer;
  else if (baseTypeCtx.FLOAT_TYPE()) base = T.float;
  else if (baseTypeCtx.STRING_TYPE()) base = T.string;
  else {
    const name = baseTypeCtx.Identifier()!.text;
    if (classInfoMap.has(name)) {
      base = T.instance(name);
    } else {
      diagnostics.push(
        createDiagnostic("SEM001", "error", locOf(baseTypeCtx), `El tipo '${name}' no está declarado como clase.`, {
          symbol: name,
          hint: "Declara la clase antes de usarla como tipo, o corrige el nombre."
        })
      );
      base = T.error;
    }
  }

  const dimensions = ctx.LBRACKET().length;
  let result: SemanticType = base;
  for (let i = 0; i < dimensions; i++) result = T.array(result);
  return result;
}

function walkForClassDeclarations(ctx: ParserRuleContext, out: ClassDeclarationContext[]): void {
  for (let i = 0; i < ctx.childCount; i++) {
    const child = ctx.getChild(i);
    if (child instanceof ClassDeclarationContext) {
      out.push(child);
    }
    if (child instanceof ParserRuleContext) {
      walkForClassDeclarations(child, out);
    }
  }
}

/** Recorre TODO el árbol buscando declaraciones de clase, sin importar el
 * bloque en el que aparezcan (ver decisión documentada arriba). */
function findAllClassDeclarations(program: ProgramContext): ClassDeclarationContext[] {
  const out: ClassDeclarationContext[] = [];
  walkForClassDeclarations(program, out);
  return out;
}

function fieldTypeFromLiteral(): SemanticType {
  // Los campos de clase en Compiscript normalmente se declaran sin
  // inicializador (se asignan en el constructor mediante `this.x = ...`).
  // Si un campo trae inicializador con una expresión no trivial, se marca
  // `unknown` en esta fase; el visitor semántico validará la asignación en
  // el constructor de todas formas.
  return T.unknown;
}

/**
 * collectClassInfo
 *
 * Primera pasada real de la fase de declaración: registra todas las
 * clases del programa, resuelve su cadena de herencia (detectando ciclos,
 * SEM020) y calcula el tipo de cada campo y la firma de cada método.
 */
export function collectClassInfo(
  program: ProgramContext,
  diagnostics: SemanticDiagnostic[]
): Map<string, ClassInfo> {
  const classInfoMap = new Map<string, ClassInfo>();
  const declarations = findAllClassDeclarations(program);

  // 1) Registrar nombres y detectar duplicados (SEM002).
  for (const ctx of declarations) {
    const ids = ctx.Identifier();
    const name = ids[0].text;
    const parentName = ctx.COLON() && ids.length > 1 ? ids[1].text : null;
    const declaration = locOf(ctx);

    if (classInfoMap.has(name)) {
      const existing = classInfoMap.get(name)!;
      diagnostics.push(
        createDiagnostic("SEM002", "error", declaration, `La clase '${name}' ya fue declarada.`, {
          symbol: name,
          related: [{ message: "Declaración original de la clase.", line: existing.declaration.line, column: existing.declaration.column }]
        })
      );
      continue;
    }

    classInfoMap.set(name, {
      name,
      parentName,
      declaration,
      ctx,
      fields: new Map(),
      methods: new Map(),
      parent: null
    });
  }

  // 2) Resolver punteros de herencia y detectar ciclos (SEM020).
  for (const info of classInfoMap.values()) {
    if (!info.parentName) continue;
    const parent = classInfoMap.get(info.parentName);
    if (!parent) {
      diagnostics.push(
        createDiagnostic(
          "SEM020",
          "error",
          info.declaration,
          `La clase '${info.name}' hereda de '${info.parentName}', que no está declarada.`,
          { symbol: info.name }
        )
      );
      continue;
    }
    info.parent = parent;
  }

  for (const info of classInfoMap.values()) {
    const seen = new Set<string>();
    let current: ClassInfo | null = info;
    let cyclic = false;
    while (current) {
      if (seen.has(current.name)) {
        cyclic = true;
        break;
      }
      seen.add(current.name);
      current = current.parent;
    }
    if (cyclic) {
      diagnostics.push(
        createDiagnostic("SEM020", "error", info.declaration, `La herencia de la clase '${info.name}' es circular.`, {
          symbol: info.name
        })
      );
      info.parent = null;
    }
  }

  // 3) Resolver campos y métodos, ahora que todas las clases son conocidas.
  for (const info of classInfoMap.values()) {
    for (const member of info.ctx.classMember()) {
      registerMember(member, info, classInfoMap, diagnostics);
    }
  }

  return classInfoMap;
}

function registerMember(
  member: ClassMemberContext,
  info: ClassInfo,
  classInfoMap: Map<string, ClassInfo>,
  diagnostics: SemanticDiagnostic[]
): void {
  const fn = member.functionDeclaration();
  if (fn) {
    const name = fn.Identifier().text;
    const declaration = locOf(fn);
    if (info.methods.has(name) || info.fields.has(name)) {
      const existing = info.methods.get(name) ?? info.fields.get(name)!;
      diagnostics.push(
        createDiagnostic("SEM002", "error", declaration, `El método '${name}' ya fue declarado en la clase '${info.name}'.`, {
          symbol: name,
          related: [{ message: "Declaración original del método.", line: existing.declaration.line, column: existing.declaration.column }]
        })
      );
      return;
    }
    const { params } = resolveParameters(fn, classInfoMap, diagnostics);
    const returnType = fn.type() ? resolveType(fn.type()!, classInfoMap, diagnostics) : T.void;
    info.methods.set(name, { name, params, returnType, declaration, ctx: fn });
    return;
  }

  const varDecl = member.variableDeclaration();
  if (varDecl) {
    const name = varDecl.Identifier().text;
    const declaration = locOf(varDecl);
    if (info.fields.has(name) || info.methods.has(name)) {
      const existing = info.fields.get(name) ?? info.methods.get(name)!;
      diagnostics.push(
        createDiagnostic("SEM002", "error", declaration, `El campo '${name}' ya fue declarado en la clase '${info.name}'.`, {
          symbol: name,
          related: [{ message: "Declaración original del campo.", line: existing.declaration.line, column: existing.declaration.column }]
        })
      );
      return;
    }
    const typeAnnotation = varDecl.typeAnnotation();
    const type = typeAnnotation ? resolveType(typeAnnotation.type(), classInfoMap, diagnostics) : fieldTypeFromLiteral();
    info.fields.set(name, { name, type, mutable: true, declaration });
    return;
  }

  const constDecl = member.constantDeclaration();
  if (constDecl) {
    const name = constDecl.Identifier().text;
    const declaration = locOf(constDecl);
    if (info.fields.has(name) || info.methods.has(name)) {
      const existing = info.fields.get(name) ?? info.methods.get(name)!;
      diagnostics.push(
        createDiagnostic("SEM002", "error", declaration, `El campo '${name}' ya fue declarado en la clase '${info.name}'.`, {
          symbol: name,
          related: [{ message: "Declaración original del campo.", line: existing.declaration.line, column: existing.declaration.column }]
        })
      );
      return;
    }
    const typeAnnotation = constDecl.typeAnnotation();
    const type = typeAnnotation ? resolveType(typeAnnotation.type(), classInfoMap, diagnostics) : T.unknown;
    info.fields.set(name, { name, type, mutable: false, declaration });
  }
}

export function resolveParameters(
  fn: FunctionDeclarationContext,
  classInfoMap: Map<string, ClassInfo>,
  diagnostics: SemanticDiagnostic[]
): { params: { name: string; type: SemanticType }[] } {
  const params: { name: string; type: SemanticType }[] = [];
  const seen = new Set<string>();
  const parameterList = fn.parameters();
  if (!parameterList) return { params };

  for (const param of parameterList.parameter()) {
    const name = param.Identifier().text;
    const typeAnnotation = param.typeAnnotation();
    const type = typeAnnotation ? resolveType(typeAnnotation.type(), classInfoMap, diagnostics) : T.unknown;
    if (seen.has(name)) {
      diagnostics.push(
        createDiagnostic("SEM019", "error", locOf(param), `El parámetro '${name}' está duplicado en la función '${fn.Identifier().text}'.`, {
          symbol: name
        })
      );
      continue;
    }
    seen.add(name);
    params.push({ name, type });
  }
  return { params };
}

/** Extrae los statements inmediatos de un bloque o del programa (no
 * recursivo), usados para el hoisting local de funciones/clases. */
export function immediateStatements(statements: StatementContext[]): StatementContext[] {
  return statements;
}
