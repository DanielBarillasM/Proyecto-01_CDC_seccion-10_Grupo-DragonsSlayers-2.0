// ============================================================
// VISITOR SEMÁNTICO PRINCIPAL — Compiscript
// ============================================================
//
// Recorre el CST producido por el parser de ANTLR y, para cada nodo con
// significado semántico, realiza tres cosas a la vez:
//   1) resuelve/valida símbolos contra la tabla de ámbitos (ScopeManager);
//   2) infiere y valida el tipo de cada expresión (typeSystem.ts);
//   3) construye el árbol semántico anotado que consume la UI.
//
// La entrada y las instrucciones se recorren mediante el Visitor real de
// ANTLR (`AbstractParseTreeVisitor` + `CompiscriptVisitor`). Las expresiones
// delegan en helpers tipados que devuelven `{ type, node }` para conservar
// simultáneamente inferencia de tipos y construcción del árbol anotado.

import type { ParserRuleContext } from "antlr4ts";
import { AbstractParseTreeVisitor } from "antlr4ts/tree/AbstractParseTreeVisitor";
import type { CompiscriptVisitor } from "../generated/CompiscriptVisitor";
import type {
  AdditiveExpressionContext,
  ArgumentsContext,
  ArrayLiteralContext,
  AssignmentExpressionContext,
  BlockContext,
  BreakStatementContext,
  ClassDeclarationContext,
  ConditionalExpressionContext,
  ConstantDeclarationContext,
  ContinueStatementContext,
  DoWhileStatementContext,
  EqualityExpressionContext,
  ExpressionContext,
  ExpressionStatementContext,
  ForeachStatementContext,
  ForInitializerContext,
  ForStatementContext,
  FunctionDeclarationContext,
  IfStatementContext,
  LeftHandSideContext,
  LiteralExpressionContext,
  LogicalAndExpressionContext,
  LogicalOrExpressionContext,
  MultiplicativeExpressionContext,
  PrimaryAtomContext,
  PrimaryExpressionContext,
  PrintStatementContext,
  ProgramContext,
  RelationalExpressionContext,
  ReturnStatementContext,
  StatementContext,
  SuffixOperatorContext,
  SwitchStatementContext,
  TryCatchStatementContext,
  UnaryExpressionContext,
  VariableDeclarationContext,
  WhileStatementContext
} from "../generated/CompiscriptParser";
import {
  type ClassInfo,
  collectClassInfo,
  isSubclassOf,
  locOf,
  lookupField,
  lookupMethod,
  resolveParameters,
  resolveType
} from "./declarationVisitor";
import { createDiagnostic, resetDiagnosticCounter, type SemanticDiagnostic } from "./diagnostics";
import { bodyGuaranteesReturn, findFirstUnreachableIndex } from "./flowAnalysis";
import { ScopeManager, type ScopeInfo } from "./scopes";
import type { SourceLocation, SymbolEntry } from "./symbols";
import {
  T,
  displayType,
  isAbsorbing,
  isArrayType,
  isFunctionType,
  isInstanceType,
  type SemanticType
} from "./semanticTypes";
import {
  commonType,
  isAdditiveOperand,
  isAssignable,
  isComparable,
  isLogicalOperand,
  isMeaninglessOperand,
  isValidSwitchDiscriminant,
  numericResult
} from "./typeSystem";
import { createSemanticNode, resetSemanticNodeCounter, type SemanticTreeNode } from "./ast";

export interface SemanticAnalysisOutput {
  diagnostics: SemanticDiagnostic[];
  scopes: ScopeManager;
  tree: SemanticTreeNode[];
}

interface ExprResult {
  type: SemanticType;
  node: SemanticTreeNode;
  /** Presente cuando la expresión es una referencia directa a un símbolo
   * (variable, parámetro, función), usado para validar asignaciones. */
  symbol?: SymbolEntry;
  /** Metadatos del destino cuando la expresión termina en un campo o método. */
  mutableTarget?: boolean;
  targetLabel?: string;
}

/** Contexto de la función actualmente visitada (para validar `return`,
 * inferencia de captura de variables en closures y consistencia de tipos
 * de retorno). */
interface FunctionContext {
  returnType: SemanticType;
  scopeId: string;
  name: string;
  hasExplicitReturnType: boolean;
}

const MAX_DIAGNOSTICS = 500;

export function runSemanticAnalysis(program: ProgramContext): SemanticAnalysisOutput {
  resetDiagnosticCounter();
  resetSemanticNodeCounter();
  const diagnostics: SemanticDiagnostic[] = [];
  const scopes = new ScopeManager(locOf(program));
  const classInfoMap = collectClassInfo(program, diagnostics);

  const analyzer = new SemanticAnalyzer(scopes, classInfoMap, diagnostics);
  const tree = analyzer.run(program);

  const uniqueDiagnostics = diagnostics.filter((diagnostic, index, all) =>
    all.findIndex((candidate) =>
      candidate.code === diagnostic.code &&
      candidate.severity === diagnostic.severity &&
      candidate.line === diagnostic.line &&
      candidate.column === diagnostic.column &&
      candidate.message === diagnostic.message
    ) === index
  );

  return { diagnostics: uniqueDiagnostics.slice(0, MAX_DIAGNOSTICS), scopes, tree };
}

class SemanticAnalyzer extends AbstractParseTreeVisitor<SemanticTreeNode> implements CompiscriptVisitor<SemanticTreeNode> {
  private functionStack: FunctionContext[] = [];
  private classStack: ClassInfo[] = [];
  /** Pila de ámbitos de función activos al momento de cada declaración de
   * variable, usada para detectar cuándo una función anidada "captura"
   * una variable de un ámbito de función externo (closures). */
  private funcScopeStack: string[] = [];

  constructor(
    private scopes: ScopeManager,
    private classInfoMap: Map<string, ClassInfo>,
    private diagnostics: SemanticDiagnostic[]
  ) {
    super();
  }

  /** Resultado de respaldo requerido por AbstractParseTreeVisitor. La
   * recorrida normal entra por visitProgram/visitStatement y no depende de
   * este nodo; se mantiene sin usar el contador para preservar IDs estables. */
  protected defaultResult(): SemanticTreeNode {
    return { id: "ast-default", kind: "unknown", label: "nodo no visitado", diagnostics: [], children: [] };
  }

  private report(
    code: Parameters<typeof createDiagnostic>[0],
    severity: "error" | "warning",
    loc: SourceLocation,
    message: string,
    options?: Parameters<typeof createDiagnostic>[4]
  ): void {
    if (this.diagnostics.length >= MAX_DIAGNOSTICS) return;
    this.diagnostics.push(createDiagnostic(code, severity, loc, message, options));
  }

  private isSubclass(child: string, ancestor: string): boolean {
    return isSubclassOf(this.classInfoMap, child, ancestor);
  }

  run(program: ProgramContext): SemanticTreeNode[] {
    // La entrada pasa por el visitor real generado por ANTLR. De esta forma
    // la fase cumple el contrato Listener/Visitor del proyecto sin mantener
    // un parser semántico paralelo.
    return program.accept(this).children;
  }

  public visitProgram(ctx: ProgramContext): SemanticTreeNode {
    // Fase 1: registrar en el ámbito global cada clase y función de nivel
    // superior (hoisting), para permitir llamadas/usos adelantados.
    this.hoistTopLevel(ctx.statement());
    const children = ctx.statement().map((statement) => statement.accept(this));
    return createSemanticNode("program", "program", { location: locOf(ctx), scopeId: this.scopes.rootId, children });
  }

  // ────────────────────────────────────────────────────────────────────
  // Hoisting: declara símbolos de función/clase antes de visitar cuerpos.
  // ────────────────────────────────────────────────────────────────────

  private hoistTopLevel(statements: StatementContext[]): void {
    this.hoistDeclarations(statements);
  }

  /** Hoisting local de funciones y clases en el ámbito activo. Permite
   * recursión, referencias adelantadas y funciones anidadas sin perder
   * las reglas de ámbito léxico. */
  private hoistDeclarations(statements: StatementContext[]): void {
    // Cada declaración se intenta registrar, incluso si ya existe el nombre.
    // `ScopeManager.declare()` es quien detecta la colisión y permite emitir
    // SEM002. Si simplemente omitiéramos el segundo registro, dos funciones
    // homónimas pasarían inadvertidas por el hoisting.
    for (const stmt of statements) {
      const fn = stmt.functionDeclaration();
      if (fn) this.declareFunctionSymbol(fn);

      const cls = stmt.classDeclaration();
      if (cls) this.declareClassSymbol(cls);
    }
  }

  private declareFunctionSymbol(fn: FunctionDeclarationContext): SymbolEntry | undefined {
    const name = fn.Identifier().text;
    const declaration = locOf(fn);
    const { params } = resolveParameters(fn, this.classInfoMap, this.diagnostics);
    const returnType = fn.type() ? resolveType(fn.type()!, this.classInfoMap, this.diagnostics) : T.void;

    const result = this.scopes.declare({
      name,
      kind: "function",
      type: T.fn(params.map((p) => p.type), returnType),
      mutable: false,
      initialized: true,
      declaration,
      parameters: params,
      returnType
    });

    if (!result.ok) {
      this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, {
        symbol: name,
        related: [{ message: "Declaración original.", line: result.existing.declaration.line, column: result.existing.declaration.column }]
      });
      return undefined;
    }
    return result.symbol;
  }

  private declareClassSymbol(cls: ClassDeclarationContext): SymbolEntry | undefined {
    const name = cls.Identifier(0).text;
    const declaration = locOf(cls);
    const result = this.scopes.declare({
      name,
      kind: "class",
      type: T.classType(name),
      mutable: false,
      initialized: true,
      declaration,
      members: [...this.classInfoMap.get(name)?.fields.keys() ?? [], ...this.classInfoMap.get(name)?.methods.keys() ?? []],
      parentClass: this.classInfoMap.get(name)?.parentName ?? undefined
    });
    if (!result.ok) {
      // Ya reportado como SEM002 en collectClassInfo si aplicaba a nivel de
      // clases; aquí solo se evita duplicar si colisiona con otro símbolo.
      if (result.existing.kind !== "class") {
        this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, { symbol: name });
      }
      return undefined;
    }
    return result.symbol;
  }

  // ────────────────────────────────────────────────────────────────────
  // Statements
  // ────────────────────────────────────────────────────────────────────

  public visitStatement(ctx: StatementContext): SemanticTreeNode {
    if (ctx.variableDeclaration()) return this.visitVariableDeclaration(ctx.variableDeclaration()!);
    if (ctx.constantDeclaration()) return this.visitConstantDeclaration(ctx.constantDeclaration()!);
    if (ctx.functionDeclaration()) return this.visitFunctionDeclaration(ctx.functionDeclaration()!, false);
    if (ctx.classDeclaration()) return this.visitClassDeclaration(ctx.classDeclaration()!);
    if (ctx.printStatement()) return this.visitPrintStatement(ctx.printStatement()!);
    if (ctx.block()) return this.visitBlock(ctx.block()!, "block");
    if (ctx.ifStatement()) return this.visitIfStatement(ctx.ifStatement()!);
    if (ctx.whileStatement()) return this.visitWhileStatement(ctx.whileStatement()!);
    if (ctx.doWhileStatement()) return this.visitDoWhileStatement(ctx.doWhileStatement()!);
    if (ctx.forStatement()) return this.visitForStatement(ctx.forStatement()!);
    if (ctx.foreachStatement()) return this.visitForeachStatement(ctx.foreachStatement()!);
    if (ctx.tryCatchStatement()) return this.visitTryCatchStatement(ctx.tryCatchStatement()!);
    if (ctx.switchStatement()) return this.visitSwitchStatement(ctx.switchStatement()!);
    if (ctx.breakStatement()) return this.visitBreakStatement(ctx.breakStatement()!);
    if (ctx.continueStatement()) return this.visitContinueStatement(ctx.continueStatement()!);
    if (ctx.returnStatement()) return this.visitReturnStatement(ctx.returnStatement()!);
    if (ctx.expressionStatement()) return this.visitExpressionStatement(ctx.expressionStatement()!);
    return createSemanticNode("statement", "instrucción desconocida", { location: locOf(ctx) });
  }

  private visitBlockStatements(statements: StatementContext[]): SemanticTreeNode[] {
    this.hoistDeclarations(statements);
    const unreachableFrom = findFirstUnreachableIndex(statements);
    const nodes: SemanticTreeNode[] = [];
    for (let i = 0; i < statements.length; i++) {
      const node = statements[i].accept(this);
      if (unreachableFrom >= 0 && i >= unreachableFrom) {
        this.report("SEM018", "warning", node.location ?? { line: 0, column: 0 }, "Código inalcanzable: esta instrucción nunca se ejecuta.");
        node.diagnostics.push("SEM018");
      }
      nodes.push(node);
    }
    return nodes;
  }

  private visitBlock(ctx: BlockContext, kind: "block" | "loop" | "catch" = "block", name = "bloque"): SemanticTreeNode {
    this.scopes.enterScope(kind === "loop" ? "loop" : kind === "catch" ? "catch" : "block", name, locOf(ctx));
    const children = this.visitBlockStatements(ctx.statement());
    this.scopes.exitScope(locOf(ctx));
    return createSemanticNode("block", "bloque", { location: locOf(ctx), children });
  }

  private visitVariableDeclaration(ctx: VariableDeclarationContext): SemanticTreeNode {
    const name = ctx.Identifier().text;
    const declaration = locOf(ctx);
    const typeAnnotation = ctx.typeAnnotation();
    const declaredType = typeAnnotation ? resolveType(typeAnnotation.type(), this.classInfoMap, this.diagnostics) : undefined;

    let initType: SemanticType | undefined;
    let initNode: SemanticTreeNode | undefined;
    if (ctx.initializer()) {
      const result = this.visitExpression(ctx.initializer()!.expression());
      initType = result.type;
      initNode = result.node;
    }

    let finalType: SemanticType = declaredType ?? initType ?? T.unknown;

    if (declaredType && initType && !isAssignable(declaredType, initType, (c, p) => this.isSubclass(c, p))) {
      this.report(
        "SEM003",
        "error",
        declaration,
        `No se puede inicializar '${name}' de tipo '${displayType(declaredType)}' con un valor de tipo '${displayType(initType)}'.`,
        { symbol: name }
      );
      finalType = declaredType;
    }

    const result = this.scopes.declare({
      name,
      kind: "variable",
      type: finalType,
      mutable: true,
      initialized: Boolean(ctx.initializer()),
      declaration
    });

    const diagnosticsForNode: string[] = [];
    if (!result.ok) {
      this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, {
        symbol: name,
        related: [{ message: "Declaración original.", line: result.existing.declaration.line, column: result.existing.declaration.column }]
      });
      diagnosticsForNode.push("SEM002");
    }

    return createSemanticNode("variable-declaration", `let ${name}: ${displayType(finalType)}`, {
      location: declaration,
      inferredType: displayType(finalType),
      symbolId: result.ok ? result.symbol.id : undefined,
      scopeId: this.scopes.currentScopeId(),
      diagnostics: diagnosticsForNode,
      children: initNode ? [initNode] : []
    });
  }

  private visitConstantDeclaration(ctx: ConstantDeclarationContext): SemanticTreeNode {
    const name = ctx.Identifier().text;
    const declaration = locOf(ctx);
    const typeAnnotation = ctx.typeAnnotation();
    const declaredType = typeAnnotation ? resolveType(typeAnnotation.type(), this.classInfoMap, this.diagnostics) : undefined;

    const initResult = this.visitExpression(ctx.expression());
    let finalType = declaredType ?? initResult.type;

    if (declaredType && !isAssignable(declaredType, initResult.type, (c, p) => this.isSubclass(c, p))) {
      this.report(
        "SEM003",
        "error",
        declaration,
        `No se puede inicializar la constante '${name}' de tipo '${displayType(declaredType)}' con un valor de tipo '${displayType(initResult.type)}'.`,
        { symbol: name }
      );
      finalType = declaredType;
    }

    const result = this.scopes.declare({
      name,
      kind: "constant",
      type: finalType,
      mutable: false,
      initialized: true,
      declaration
    });

    const diagnosticsForNode: string[] = [];
    if (!result.ok) {
      this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, {
        symbol: name,
        related: [{ message: "Declaración original.", line: result.existing.declaration.line, column: result.existing.declaration.column }]
      });
      diagnosticsForNode.push("SEM002");
    }

    return createSemanticNode("constant-declaration", `const ${name}: ${displayType(finalType)}`, {
      location: declaration,
      inferredType: displayType(finalType),
      symbolId: result.ok ? result.symbol.id : undefined,
      scopeId: this.scopes.currentScopeId(),
      diagnostics: diagnosticsForNode,
      children: [initResult.node]
    });
  }

  private visitFunctionDeclaration(ctx: FunctionDeclarationContext, isMethod: boolean, ownerClass?: ClassInfo): SemanticTreeNode {
    const name = ctx.Identifier().text;
    const declaration = locOf(ctx);

    // Si no fue hoisted (por ejemplo, funciones anidadas dentro de otra
    // función), se declara aquí mismo.
    let symbol = this.scopes.resolveLocal(name, this.scopes.currentScopeId());
    if (!symbol && !isMethod) {
      symbol = this.declareFunctionSymbol(ctx);
    }

    const { params } = resolveParameters(ctx, this.classInfoMap, this.diagnostics);
    const returnType = ctx.type() ? resolveType(ctx.type()!, this.classInfoMap, this.diagnostics) : T.void;

    const functionScope = this.scopes.enterScope("function", name, declaration);
    this.funcScopeStack.push(functionScope.id);

    if (isMethod && ownerClass) {
      this.scopes.declare({
        name: "this",
        kind: "parameter",
        type: T.instance(ownerClass.name),
        mutable: false,
        initialized: true,
        declaration
      });
    }

    for (const param of params) {
      const result = this.scopes.declare({
        name: param.name,
        kind: "parameter",
        type: param.type,
        mutable: true,
        initialized: true,
        declaration
      });
      if (!result.ok) {
        this.report("SEM019", "error", declaration, `El parámetro '${param.name}' está duplicado.`, { symbol: param.name });
      }
    }

    this.functionStack.push({ returnType, scopeId: functionScope.id, name, hasExplicitReturnType: Boolean(ctx.type()) });

    const bodyStatements = ctx.block().statement();
    const bodyChildren = this.visitBlockStatements(bodyStatements);

    if (returnType.kind !== "primitive" || returnType.name !== "void") {
      if (!bodyGuaranteesReturn(bodyStatements)) {
        this.report(
          "SEM008",
          "warning",
          declaration,
          `La función '${name}' declara un tipo de retorno '${displayType(returnType)}' pero no garantiza un 'return' en todas sus rutas.`,
          { symbol: name }
        );
      }
    }

    this.functionStack.pop();
    this.funcScopeStack.pop();
    this.scopes.exitScope(locOf(ctx.block()));

    return createSemanticNode(
      isMethod ? "method-declaration" : "function-declaration",
      `${isMethod ? "método" : "function"} ${name}(${params.map((p) => `${p.name}: ${displayType(p.type)}`).join(", ")}): ${displayType(returnType)}`,
      {
        location: declaration,
        symbolId: symbol?.id,
        scopeId: functionScope.id,
        inferredType: displayType(returnType),
        children: bodyChildren
      }
    );
  }

  private visitClassDeclaration(ctx: ClassDeclarationContext): SemanticTreeNode {
    const name = ctx.Identifier(0).text;
    const declaration = locOf(ctx);
    const info = this.classInfoMap.get(name);
    let symbol = this.scopes.resolveLocal(name, this.scopes.currentScopeId());
    if (!symbol) symbol = this.declareClassSymbol(ctx);

    if (!info) {
      return createSemanticNode("class-declaration", `class ${name}`, { location: declaration, symbolId: symbol?.id });
    }

    const classScope = this.scopes.enterScope("class", name, declaration);
    this.classStack.push(info);
    this.declareClassMembers(info);

    const children: SemanticTreeNode[] = [];
    for (const member of ctx.classMember()) {
      const fn = member.functionDeclaration();
      if (fn) {
        children.push(this.visitFunctionDeclaration(fn, true, info));
        continue;
      }
      const varDecl = member.variableDeclaration();
      if (varDecl) {
        children.push(this.visitClassField(varDecl, info));
        continue;
      }
      const constDecl = member.constantDeclaration();
      if (constDecl) {
        children.push(this.visitClassConstField(constDecl, info));
      }
    }

    this.classStack.pop();
    this.scopes.exitScope(declaration);

    return createSemanticNode("class-declaration", `class ${name}${info.parentName ? `: ${info.parentName}` : ""}`, {
      location: declaration,
      symbolId: symbol?.id,
      scopeId: classScope.id,
      children
    });
  }

  private declareClassMembers(owner: ClassInfo): void {
    for (const field of owner.fields.values()) {
      this.scopes.declare({
        name: field.name,
        kind: "field",
        type: field.type,
        mutable: field.mutable,
        initialized: field.mutable ? false : true,
        declaration: field.declaration
      });
    }

    for (const method of owner.methods.values()) {
      this.scopes.declare({
        name: method.name,
        kind: "method",
        type: T.fn(method.params.map((param) => param.type), method.returnType),
        mutable: false,
        initialized: true,
        declaration: method.declaration,
        parameters: method.params,
        returnType: method.returnType
      });
    }
  }

  private visitClassField(ctx: VariableDeclarationContext, owner: ClassInfo): SemanticTreeNode {
    const name = ctx.Identifier().text;
    const field = owner.fields.get(name);
    const symbol = this.scopes.resolveLocal(name, this.scopes.currentScopeId());
    let initNode: SemanticTreeNode | undefined;

    if (ctx.initializer()) {
      const result = this.visitExpression(ctx.initializer()!.expression());
      initNode = result.node;
      if (field && ctx.typeAnnotation() && !isAssignable(field.type, result.type, (c, p) => this.isSubclass(c, p))) {
        this.report("SEM003", "error", locOf(ctx), `El campo '${name}' no admite un valor de tipo '${displayType(result.type)}'.`, { symbol: name });
      } else if (field && !ctx.typeAnnotation()) {
        field.type = result.type;
        if (symbol) symbol.type = result.type;
      }
      if (symbol) this.scopes.markInitialized(symbol.id);
    }

    const resolvedType = field ? field.type : T.unknown;
    return createSemanticNode("field-declaration", `${name}: ${displayType(resolvedType)}`, {
      location: locOf(ctx),
      inferredType: displayType(resolvedType),
      symbolId: symbol?.id,
      scopeId: this.scopes.currentScopeId(),
      children: initNode ? [initNode] : []
    });
  }

  private visitClassConstField(ctx: ConstantDeclarationContext, owner: ClassInfo): SemanticTreeNode {
    const name = ctx.Identifier().text;
    const field = owner.fields.get(name);
    const symbol = this.scopes.resolveLocal(name, this.scopes.currentScopeId());
    const result = this.visitExpression(ctx.expression());

    if (field && ctx.typeAnnotation() && !isAssignable(field.type, result.type, (c, p) => this.isSubclass(c, p))) {
      this.report("SEM003", "error", locOf(ctx), `La constante de clase '${name}' no admite un valor de tipo '${displayType(result.type)}'.`, { symbol: name });
    } else if (field && !ctx.typeAnnotation()) {
      field.type = result.type;
      if (symbol) symbol.type = result.type;
    }

    const resolvedType = field ? field.type : result.type;
    return createSemanticNode("field-declaration", `const ${name}: ${displayType(resolvedType)}`, {
      location: locOf(ctx),
      inferredType: displayType(resolvedType),
      symbolId: symbol?.id,
      scopeId: this.scopes.currentScopeId(),
      children: [result.node]
    });
  }

  private visitPrintStatement(ctx: PrintStatementContext): SemanticTreeNode {
    const result = this.visitExpression(ctx.expression());
    return createSemanticNode("print", "print(...)", { location: locOf(ctx), children: [result.node] });
  }

  private visitIfStatement(ctx: IfStatementContext): SemanticTreeNode {
    const cond = this.visitExpression(ctx.expression());
    this.assertBoolean(cond.type, locOf(ctx.expression()), "la condición de 'if'");

    const branches = ctx.statement();
    const thenNode = branches[0].accept(this);
    const children = [cond.node, thenNode];
    if (branches.length > 1) children.push(branches[1].accept(this));

    return createSemanticNode("if", "if / else", { location: locOf(ctx), children });
  }

  private visitWhileStatement(ctx: WhileStatementContext): SemanticTreeNode {
    const cond = this.visitExpression(ctx.expression());
    this.assertBoolean(cond.type, locOf(ctx.expression()), "la condición de 'while'");
    const bodyNode = this.visitLoopBody(ctx.statement());
    return createSemanticNode("while", "while", { location: locOf(ctx), children: [cond.node, bodyNode] });
  }

  private visitDoWhileStatement(ctx: DoWhileStatementContext): SemanticTreeNode {
    const bodyNode = this.visitLoopBody(ctx.statement());
    const cond = this.visitExpression(ctx.expression());
    this.assertBoolean(cond.type, locOf(ctx.expression()), "la condición de 'do...while'");
    return createSemanticNode("do-while", "do ... while", { location: locOf(ctx), children: [bodyNode, cond.node] });
  }

  private visitForStatement(ctx: ForStatementContext): SemanticTreeNode {
    this.scopes.enterScope("loop", "for", locOf(ctx));

    let initNode: SemanticTreeNode | undefined;
    const forInit = ctx.forInitializer();
    if (forInit) initNode = this.visitForInitializer(forInit);

    const expressions = ctx.expression();
    let condNode: SemanticTreeNode | undefined;
    let updateNode: SemanticTreeNode | undefined;

    // La gramática permite `expression? SEMI expression?`; ANTLR entrega
    // las expresiones presentes en orden, así que hay que desambiguar según
    // cuántas hay realmente.
    if (expressions.length === 2) {
      const cond = this.visitExpression(expressions[0]);
      this.assertBoolean(cond.type, locOf(expressions[0]), "la condición de 'for'");
      condNode = cond.node;
      updateNode = this.visitExpression(expressions[1]).node;
    } else if (expressions.length === 1) {
      // Con una sola expresión distinguimos condición y actualización por
      // su posición respecto al segundo ';' del encabezado del for.
      const expression = expressions[0];
      const expressionResult = this.visitExpression(expression);
      const secondSemiTokenIndex = ctx.SEMI(1).symbol.tokenIndex;
      if (expression.start.tokenIndex < secondSemiTokenIndex) {
        this.assertBoolean(expressionResult.type, locOf(expression), "la condición de 'for'");
        condNode = expressionResult.node;
      } else {
        updateNode = expressionResult.node;
      }
    }

    const bodyNode = ctx.statement().accept(this);
    this.scopes.exitScope(locOf(ctx));

    const children = [initNode, condNode, updateNode, bodyNode].filter(Boolean) as SemanticTreeNode[];
    return createSemanticNode("for", "for", { location: locOf(ctx), children });
  }

  private visitForInitializer(ctx: ForInitializerContext): SemanticTreeNode {
    const identifier = ctx.Identifier();
    if (identifier) {
      const name = identifier.text;
      const declaration = locOf(ctx);
      const typeAnnotation = ctx.typeAnnotation();
      const declaredType = typeAnnotation ? resolveType(typeAnnotation.type(), this.classInfoMap, this.diagnostics) : undefined;
      let initType: SemanticType | undefined;
      let initNode: SemanticTreeNode | undefined;
      if (ctx.initializer()) {
        const result = this.visitExpression(ctx.initializer()!.expression());
        initType = result.type;
        initNode = result.node;
      }
      const finalType = declaredType ?? initType ?? T.unknown;
      if (declaredType && initType && !isAssignable(declaredType, initType, (c, p) => this.isSubclass(c, p))) {
        this.report(
          "SEM003",
          "error",
          declaration,
          `No se puede inicializar '${name}' de tipo '${displayType(declaredType)}' con un valor de tipo '${displayType(initType)}'.`,
          { symbol: name }
        );
      }
      const result = this.scopes.declare({
        name,
        kind: "variable",
        type: finalType,
        mutable: true,
        initialized: Boolean(ctx.initializer()),
        declaration
      });
      if (!result.ok) {
        this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, { symbol: name });
      }
      return createSemanticNode("for-init", `let ${name}`, { location: declaration, children: initNode ? [initNode] : [] });
    }
    const expr = ctx.expression();
    if (expr) return this.visitExpression(expr).node;
    return createSemanticNode("for-init", "(vacío)", { location: locOf(ctx) });
  }

  private visitForeachStatement(ctx: ForeachStatementContext): SemanticTreeNode {
    const iterableResult = this.visitExpression(ctx.expression());
    const name = ctx.Identifier().text;
    const declaration = locOf(ctx);

    this.scopes.enterScope("loop", "foreach", declaration);

    let elementType: SemanticType = T.unknown;
    if (isArrayType(iterableResult.type)) {
      elementType = iterableResult.type.element;
    } else if (!isAbsorbing(iterableResult.type)) {
      this.report(
        "SEM016",
        "error",
        locOf(ctx.expression()),
        `'foreach' requiere un arreglo; se recibió '${displayType(iterableResult.type)}'.`
      );
    }

    const declResult = this.scopes.declare({
      name,
      kind: "variable",
      type: elementType,
      mutable: true,
      initialized: true,
      declaration
    });
    if (!declResult.ok) {
      this.report("SEM002", "error", declaration, `'${name}' ya fue declarado en este ámbito.`, { symbol: name });
    }

    const bodyNode = ctx.statement().accept(this);
    this.scopes.exitScope(declaration);

    return createSemanticNode("foreach", `foreach (${name} in ...)`, {
      location: declaration,
      children: [iterableResult.node, bodyNode]
    });
  }

  private visitLoopBody(ctx: StatementContext): SemanticTreeNode {
    // Si el cuerpo ya es un bloque `{ }`, se abre como ámbito "loop" para
    // que break/continue lo detecten sin duplicar el ámbito del `while`.
    if (ctx.block()) return this.visitBlock(ctx.block()!, "loop", "cuerpo del ciclo");
    this.scopes.enterScope("loop", "cuerpo del ciclo", locOf(ctx));
    const node = ctx.accept(this);
    this.scopes.exitScope(locOf(ctx));
    return node;
  }

  private visitTryCatchStatement(ctx: TryCatchStatementContext): SemanticTreeNode {
    const tryNode = this.visitBlock(ctx.block(0));

    const catchDeclaration = locOf(ctx);
    this.scopes.enterScope("catch", "catch", catchDeclaration);
    const errorName = ctx.Identifier().text;
    this.scopes.declare({
      name: errorName,
      kind: "catch",
      type: T.string,
      mutable: false,
      initialized: true,
      declaration: catchDeclaration
    });
    const catchChildren = this.visitBlockStatements(ctx.block(1).statement());
    this.scopes.exitScope(locOf(ctx.block(1)));

    return createSemanticNode("try-catch", `try / catch (${errorName})`, {
      location: locOf(ctx),
      children: [tryNode, createSemanticNode("catch-block", "catch", { location: catchDeclaration, children: catchChildren })]
    });
  }

  private visitSwitchStatement(ctx: SwitchStatementContext): SemanticTreeNode {
    const discriminant = this.visitExpression(ctx.expression());
    if (!isValidSwitchDiscriminant(discriminant.type)) {
      this.report(
        "SEM021",
        "error",
        locOf(ctx.expression()),
        `El discriminante de 'switch' debe ser integer, float, string o boolean; se recibió '${displayType(discriminant.type)}'.`
      );
    }

    this.scopes.enterScope("switch", "switch", locOf(ctx));

    const children: SemanticTreeNode[] = [discriminant.node];
    for (const switchCase of ctx.switchCase()) {
      const caseExprResult = this.visitExpression(switchCase.expression());
      if (!isComparable(discriminant.type, caseExprResult.type, "==")) {
        this.report(
          "SEM021",
          "error",
          locOf(switchCase.expression()),
          `El valor de 'case' (${displayType(caseExprResult.type)}) no es comparable con el discriminante (${displayType(discriminant.type)}).`
        );
      }
      const caseChildren = this.visitBlockStatements(switchCase.statement());
      children.push(createSemanticNode("case", `case ${switchCase.expression().text}`, { location: locOf(switchCase), children: [caseExprResult.node, ...caseChildren] }));
    }

    const defaultCase = ctx.defaultCase();
    if (defaultCase) {
      const defaultChildren = this.visitBlockStatements(defaultCase.statement());
      children.push(createSemanticNode("default", "default", { location: locOf(defaultCase), children: defaultChildren }));
    }

    this.scopes.exitScope(locOf(ctx));

    return createSemanticNode("switch", "switch", { location: locOf(ctx), children });
  }

  private visitBreakStatement(ctx: BreakStatementContext): SemanticTreeNode {
    const enclosing = this.scopes.enclosingLoopOrSwitch(["loop", "switch"]);
    if (!enclosing) {
      this.report("SEM010", "error", locOf(ctx), "'break' usado fuera de un bucle o switch.");
    }
    return createSemanticNode("break", "break", { location: locOf(ctx) });
  }

  private visitContinueStatement(ctx: ContinueStatementContext): SemanticTreeNode {
    const enclosing = this.scopes.enclosingLoopOrSwitch(["loop"]);
    if (!enclosing) {
      this.report("SEM011", "error", locOf(ctx), "'continue' usado fuera de un bucle.");
    }
    return createSemanticNode("continue", "continue", { location: locOf(ctx) });
  }

  private visitReturnStatement(ctx: ReturnStatementContext): SemanticTreeNode {
    const current = this.functionStack[this.functionStack.length - 1];
    if (!current) {
      this.report("SEM009", "error", locOf(ctx), "'return' usado fuera de una función.");
      if (ctx.expression()) return createSemanticNode("return", "return", { location: locOf(ctx), children: [this.visitExpression(ctx.expression()!).node] });
      return createSemanticNode("return", "return", { location: locOf(ctx) });
    }

    if (!ctx.expression()) {
      if (current.hasExplicitReturnType && current.returnType.kind !== "primitive" ) {
        this.report(
          "SEM008",
          "error",
          locOf(ctx),
          `La función '${current.name}' debe devolver un valor de tipo '${displayType(current.returnType)}'.`
        );
      } else if (current.hasExplicitReturnType && !(current.returnType.kind === "primitive" && current.returnType.name === "void")) {
        this.report(
          "SEM008",
          "error",
          locOf(ctx),
          `La función '${current.name}' debe devolver un valor de tipo '${displayType(current.returnType)}'.`
        );
      }
      return createSemanticNode("return", "return;", { location: locOf(ctx) });
    }

    const result = this.visitExpression(ctx.expression()!);
    if (current.hasExplicitReturnType && !isAssignable(current.returnType, result.type, (c, p) => this.isSubclass(c, p))) {
      this.report(
        "SEM008",
        "error",
        locOf(ctx),
        `La función '${current.name}' declara retornar '${displayType(current.returnType)}' pero se devuelve '${displayType(result.type)}'.`
      );
    }
    return createSemanticNode("return", `return ${displayType(result.type)}`, { location: locOf(ctx), children: [result.node] });
  }

  private visitExpressionStatement(ctx: ExpressionStatementContext): SemanticTreeNode {
    return this.visitExpression(ctx.expression()).node;
  }

  // ────────────────────────────────────────────────────────────────────
  // Expresiones
  // ────────────────────────────────────────────────────────────────────

  private assertBoolean(type: SemanticType, loc: SourceLocation, description: string): void {
    if (isAbsorbing(type)) return;
    if (type.kind === "primitive" && type.name === "boolean") return;
    this.report("SEM005", "error", loc, `${description} debe ser de tipo boolean; se recibió '${displayType(type)}'.`);
  }

  private visitExpression(ctx: ExpressionContext): ExprResult {
    return this.visitAssignment(ctx.assignmentExpression());
  }

  private visitAssignment(ctx: AssignmentExpressionContext): ExprResult {
    if (ctx.conditionalExpression()) return this.visitConditional(ctx.conditionalExpression()!);

    const target = this.visitLeftHandSide(ctx.leftHandSide()!, true);
    const value = this.visitAssignment(ctx.assignmentExpression()!);
    const loc = locOf(ctx);

    if (target.symbol && !target.symbol.mutable) {
      this.report("SEM003", "error", loc, `No se puede asignar a '${target.symbol.name}' porque es constante o no asignable.`, {
        symbol: target.symbol.name
      });
    } else if (!target.symbol && target.mutableTarget === false) {
      this.report("SEM003", "error", loc, `No se puede asignar a '${target.targetLabel ?? "este miembro"}' porque es constante o no asignable.`);
    } else if (target.symbol) {
      this.scopes.markInitialized(target.symbol.id);
    }

    if (!isAssignable(target.type, value.type, (c, p) => this.isSubclass(c, p))) {
      this.report(
        "SEM003",
        "error",
        loc,
        `No se puede asignar un valor de tipo '${displayType(value.type)}' a un destino de tipo '${displayType(target.type)}'.`
      );
    }

    return {
      type: target.type,
      node: createSemanticNode("assignment", `= ${displayType(value.type)}`, { location: loc, inferredType: displayType(target.type), children: [target.node, value.node] })
    };
  }

  private visitConditional(ctx: ConditionalExpressionContext): ExprResult {
    const orResult = this.visitLogicalOr(ctx.logicalOrExpression());
    const expressions = ctx.expression();
    if (expressions.length === 0) return orResult;

    this.assertBoolean(orResult.type, locOf(ctx.logicalOrExpression()), "la condición del operador ternario");
    const thenResult = this.visitExpression(expressions[0]);
    const elseResult = this.visitExpression(expressions[1]);

    const merged = commonType([thenResult.type, elseResult.type]);
    const resultType = merged ?? T.unknown;
    if (!merged) {
      this.report(
        "SEM004",
        "error",
        locOf(ctx),
        `Las ramas del operador ternario tienen tipos incompatibles: '${displayType(thenResult.type)}' y '${displayType(elseResult.type)}'.`
      );
    }

    return {
      type: resultType,
      node: createSemanticNode("ternary", `?: ${displayType(resultType)}`, {
        location: locOf(ctx),
        inferredType: displayType(resultType),
        children: [orResult.node, thenResult.node, elseResult.node]
      })
    };
  }

  private visitLogicalOr(ctx: LogicalOrExpressionContext): ExprResult {
    const operands = ctx.logicalAndExpression().map((e) => this.visitLogicalAnd(e));
    return this.foldLogical(operands, "||", ctx);
  }

  private visitLogicalAnd(ctx: LogicalAndExpressionContext): ExprResult {
    const operands = ctx.equalityExpression().map((e) => this.visitEquality(e));
    return this.foldLogical(operands, "&&", ctx);
  }

  private foldLogical(operands: ExprResult[], op: "||" | "&&", ctx: ParserRuleContext): ExprResult {
    if (operands.length === 1) return operands[0];
    for (const operand of operands) {
      this.assertLogical(operand.type, locOf(ctx), op);
    }
    return {
      type: T.boolean,
      node: createSemanticNode("logical", op, { location: locOf(ctx), inferredType: "boolean", children: operands.map((o) => o.node) })
    };
  }

  private assertLogical(type: SemanticType, loc: SourceLocation, op: string): void {
    if (!isLogicalOperand(type)) {
      this.report("SEM004", "error", loc, `El operador '${op}' requiere operandos boolean; se recibió '${displayType(type)}'.`);
    }
  }

  private visitEquality(ctx: EqualityExpressionContext): ExprResult {
    const operands = ctx.relationalExpression().map((e) => this.visitRelational(e));
    if (operands.length === 1) return operands[0];

    let acc = operands[0];
    const opsTexts = ctx.children!.filter((c) => c.text === "==" || c.text === "!=").map((c) => c.text);
    for (let i = 1; i < operands.length; i++) {
      const op = opsTexts[i - 1] as "==" | "!=";
      const right = operands[i];
      if (!isComparable(acc.type, right.type, op)) {
        this.report(
          "SEM004",
          "error",
          locOf(ctx),
          `No se puede comparar '${displayType(acc.type)}' ${op} '${displayType(right.type)}'.`
        );
      }
      acc = {
        type: T.boolean,
        node: createSemanticNode("equality", op, { location: locOf(ctx), inferredType: "boolean", children: [acc.node, right.node] })
      };
    }
    return acc;
  }

  private visitRelational(ctx: RelationalExpressionContext): ExprResult {
    const operands = ctx.additiveExpression().map((e) => this.visitAdditive(e));
    if (operands.length === 1) return operands[0];

    let acc = operands[0];
    const opsTexts = ctx.children!.filter((c) => ["<", "<=", ">", ">="].includes(c.text)).map((c) => c.text);
    for (let i = 1; i < operands.length; i++) {
      const op = opsTexts[i - 1] as "<" | "<=" | ">" | ">=";
      const right = operands[i];
      if (!isComparable(acc.type, right.type, op)) {
        this.report(
          "SEM004",
          "error",
          locOf(ctx),
          `El operador '${op}' requiere operandos numéricos; se recibió '${displayType(acc.type)}' y '${displayType(right.type)}'.`
        );
      }
      acc = {
        type: T.boolean,
        node: createSemanticNode("relational", op, { location: locOf(ctx), inferredType: "boolean", children: [acc.node, right.node] })
      };
    }
    return acc;
  }

  private visitAdditive(ctx: AdditiveExpressionContext): ExprResult {
    const operands = ctx.multiplicativeExpression().map((e) => this.visitMultiplicative(e));
    if (operands.length === 1) return operands[0];

    let acc = operands[0];
    const opsTexts = ctx.children!.filter((c) => c.text === "+" || c.text === "-").map((c) => c.text);
    for (let i = 1; i < operands.length; i++) {
      const op = opsTexts[i - 1] as "+" | "-";
      const right = operands[i];
      acc = this.combineAdditive(acc, right, op, ctx);
    }
    return acc;
  }

  private combineAdditive(left: ExprResult, right: ExprResult, op: "+" | "-", ctx: ParserRuleContext): ExprResult {
    if (op === "+") {
      // `+` acepta números (con promoción integer -> float) o
      // concatenación de strings (string + string, o string + cualquier
      // tipo imprimible se documenta como no soportado para mantener el
      // sistema de tipos simple y predecible).
      if (left.type.kind === "primitive" && left.type.name === "string" && right.type.kind === "primitive" && right.type.name === "string") {
        return {
          type: T.string,
          node: createSemanticNode("additive", "+", { location: locOf(ctx), inferredType: "string", children: [left.node, right.node] })
        };
      }
      const numeric = numericResult(left.type, right.type);
      if (numeric) {
        return {
          type: numeric,
          node: createSemanticNode("additive", "+", { location: locOf(ctx), inferredType: displayType(numeric), children: [left.node, right.node] })
        };
      }
      if (!isAdditiveOperand(left.type) || !isAdditiveOperand(right.type)) {
        this.report(
          "SEM004",
          "error",
          locOf(ctx),
          `El operador '+' no admite operandos de tipo '${displayType(left.type)}' y '${displayType(right.type)}'.`
        );
      } else {
        this.report(
          "SEM004",
          "error",
          locOf(ctx),
          `No se puede combinar '${displayType(left.type)}' y '${displayType(right.type)}' con '+'.`
        );
      }
      return { type: T.error, node: createSemanticNode("additive", "+", { location: locOf(ctx), inferredType: "error", children: [left.node, right.node] }) };
    }

    const numeric = numericResult(left.type, right.type);
    if (!numeric) {
      this.report(
        "SEM004",
        "error",
        locOf(ctx),
        `El operador '-' requiere operandos numéricos; se recibió '${displayType(left.type)}' y '${displayType(right.type)}'.`
      );
      return { type: T.error, node: createSemanticNode("additive", "-", { location: locOf(ctx), inferredType: "error", children: [left.node, right.node] }) };
    }
    return { type: numeric, node: createSemanticNode("additive", "-", { location: locOf(ctx), inferredType: displayType(numeric), children: [left.node, right.node] }) };
  }

  private visitMultiplicative(ctx: MultiplicativeExpressionContext): ExprResult {
    const operands = ctx.unaryExpression().map((e) => this.visitUnary(e));
    if (operands.length === 1) return operands[0];

    let acc = operands[0];
    const opsTexts = ctx.children!.filter((c) => ["*", "/", "%"].includes(c.text)).map((c) => c.text);
    for (let i = 1; i < operands.length; i++) {
      const op = opsTexts[i - 1] as "*" | "/" | "%";
      const right = operands[i];
      const numeric = numericResult(acc.type, right.type);
      if (!numeric) {
        if (isMeaninglessOperand(acc.type) || isMeaninglessOperand(right.type)) {
          this.report(
            "SEM004",
            "error",
            locOf(ctx),
            `El operador '${op}' no tiene sentido sobre '${displayType(acc.type)}' y '${displayType(right.type)}'.`
          );
        } else {
          this.report(
            "SEM004",
            "error",
            locOf(ctx),
            `El operador '${op}' requiere operandos numéricos; se recibió '${displayType(acc.type)}' y '${displayType(right.type)}'.`
          );
        }
        acc = { type: T.error, node: createSemanticNode("multiplicative", op, { location: locOf(ctx), inferredType: "error", children: [acc.node, right.node] }) };
        continue;
      }
      acc = { type: numeric, node: createSemanticNode("multiplicative", op, { location: locOf(ctx), inferredType: displayType(numeric), children: [acc.node, right.node] }) };
    }
    return acc;
  }

  private visitUnary(ctx: UnaryExpressionContext): ExprResult {
    if (ctx.primaryExpression()) return this.visitPrimary(ctx.primaryExpression()!);

    const operand = this.visitUnary(ctx.unaryExpression()!);
    const loc = locOf(ctx);
    const opText = ctx.MINUS() ? "-" : "!";

    if (opText === "-") {
      if (!isAbsorbing(operand.type) && (operand.type.kind !== "primitive" || !["integer", "float"].includes(operand.type.name))) {
        this.report("SEM004", "error", loc, `El operador unario '-' requiere un operando numérico; se recibió '${displayType(operand.type)}'.`);
        return { type: T.error, node: createSemanticNode("unary", "-", { location: loc, children: [operand.node] }) };
      }
      return { type: operand.type, node: createSemanticNode("unary", "-", { location: loc, inferredType: displayType(operand.type), children: [operand.node] }) };
    }

    this.assertLogical(operand.type, loc, "!");
    return { type: T.boolean, node: createSemanticNode("unary", "!", { location: loc, inferredType: "boolean", children: [operand.node] }) };
  }

  private visitPrimary(ctx: PrimaryExpressionContext): ExprResult {
    if (ctx.literalExpression()) return this.visitLiteral(ctx.literalExpression()!);
    if (ctx.leftHandSide()) return this.visitLeftHandSide(ctx.leftHandSide()!, false);
    return this.visitExpression(ctx.expression()!);
  }

  private visitLiteral(ctx: LiteralExpressionContext): ExprResult {
    const loc = locOf(ctx);
    if (ctx.IntegerLiteral()) return { type: T.integer, node: createSemanticNode("literal", ctx.text, { location: loc, inferredType: "integer" }) };
    if (ctx.FloatLiteral()) return { type: T.float, node: createSemanticNode("literal", ctx.text, { location: loc, inferredType: "float" }) };
    if (ctx.StringLiteral()) return { type: T.string, node: createSemanticNode("literal", ctx.text, { location: loc, inferredType: "string" }) };
    if (ctx.TRUE() || ctx.FALSE()) return { type: T.boolean, node: createSemanticNode("literal", ctx.text, { location: loc, inferredType: "boolean" }) };
    if (ctx.NULL()) return { type: T.null, node: createSemanticNode("literal", "null", { location: loc, inferredType: "null" }) };
    return this.visitArrayLiteral(ctx.arrayLiteral()!);
  }

  private visitArrayLiteral(ctx: ArrayLiteralContext): ExprResult {
    const elements = ctx.expression().map((e) => this.visitExpression(e));
    const loc = locOf(ctx);

    if (elements.length === 0) {
      return { type: T.array(T.unknown), node: createSemanticNode("array-literal", "[]", { location: loc, inferredType: "unknown[]" }) };
    }

    const merged = commonType(elements.map((e) => e.type));
    if (!merged) {
      this.report("SEM017", "error", loc, "Los elementos del arreglo tienen tipos incompatibles entre sí.");
    }
    const elementType = merged ?? T.error;
    const arrayType = T.array(elementType);
    return {
      type: arrayType,
      node: createSemanticNode("array-literal", `[${displayType(elementType)}; ${elements.length}]`, {
        location: loc,
        inferredType: displayType(arrayType),
        children: elements.map((e) => e.node)
      })
    };
  }

  /**
   * visitLeftHandSide
   *
   * Resuelve una cadena `atom suffix*` de izquierda a derecha, acumulando
   * el tipo tras cada sufijo (llamada, índice, acceso a miembro). Cuando
   * `asAssignmentTarget` es true, se valida que el resultado final sea
   * "asignable" (variable, campo o índice de arreglo), no una llamada.
   */
  private visitLeftHandSide(ctx: LeftHandSideContext, asAssignmentTarget: boolean): ExprResult {
    let current = this.visitPrimaryAtom(ctx.primaryAtom());
    let currentClassName: string | null = current.type.kind === "instance" ? current.type.className : null;
    let lastWasCall = false;

    for (const suffix of ctx.suffixOperator()) {
      const result = this.visitSuffix(suffix, current, currentClassName);
      current = result.result;
      currentClassName = result.newClassName;
      lastWasCall = result.wasCall;
    }

    if (asAssignmentTarget && lastWasCall) {
      this.report("SEM003", "error", locOf(ctx), "No se puede asignar a el resultado de una llamada.");
    }

    return current;
  }

  private visitPrimaryAtom(ctx: PrimaryAtomContext): ExprResult {
    const loc = locOf(ctx);

    if (ctx.THIS()) {
      const symbol = this.scopes.resolve("this");
      if (!symbol) {
        this.report("SEM013", "error", loc, "'this' solo puede usarse dentro de un método de una clase.");
        return { type: T.error, node: createSemanticNode("this", "this", { location: loc, inferredType: "error" }) };
      }
      this.scopes.addReference(symbol.id, loc);
      return { type: symbol.type, node: createSemanticNode("this", "this", { location: loc, inferredType: displayType(symbol.type) }), symbol };
    }

    if (ctx.NEW()) {
      const className = ctx.Identifier()!.text;
      const info = this.classInfoMap.get(className);
      const args = ctx.arguments() ? ctx.arguments()!.expression().map((e) => this.visitExpression(e)) : [];

      if (!info) {
        this.report("SEM014", "error", loc, `'${className}' no es una clase declarada.`, { symbol: className });
        return { type: T.error, node: createSemanticNode("new", `new ${className}(...)`, { location: loc, inferredType: "error", children: args.map((a) => a.node) }) };
      }

      const constructor = lookupMethod(this.classInfoMap, className, "constructor");
      this.checkArguments(constructor?.params, args, loc, `el constructor de '${className}'`);

      return {
        type: T.instance(className),
        node: createSemanticNode("new", `new ${className}(...)`, { location: loc, inferredType: className, children: args.map((a) => a.node) })
      };
    }

    const name = ctx.Identifier()!.text;
    const symbol = this.scopes.resolve(name);
    if (!symbol) {
      this.report("SEM001", "error", loc, `'${name}' no está declarado.`, { symbol: name });
      return { type: T.error, node: createSemanticNode("identifier", name, { location: loc, inferredType: "error" }) };
    }

    this.scopes.addReference(symbol.id, loc);
    this.markCaptureIfNeeded(symbol);

    if (symbol.kind === "variable" && !symbol.initialized) {
      this.report("SEM001", "warning", loc, `'${name}' se usa antes de ser inicializado.`, { symbol: name });
    }

    return {
      type: symbol.type,
      node: createSemanticNode("identifier", name, { location: loc, inferredType: displayType(symbol.type), symbolId: symbol.id }),
      symbol
    };
  }

  /** Si `symbol` fue declarado en un ámbito de función distinto de la
   * función léxica actual, se marca como "capturado" (closure). */
  private markCaptureIfNeeded(symbol: SymbolEntry): void {
    const currentFuncScope = this.funcScopeStack[this.funcScopeStack.length - 1];
    if (!currentFuncScope) return;
    const declaredFuncScope = this.scopes.enclosingFunctionScope(symbol.scopeId);
    if (declaredFuncScope && declaredFuncScope.id !== currentFuncScope && symbol.kind !== "function" && symbol.kind !== "class") {
      this.scopes.markCaptured(symbol.id);
    }
  }

  private visitSuffix(
    ctx: SuffixOperatorContext,
    current: ExprResult,
    currentClassName: string | null
  ): { result: ExprResult; newClassName: string | null; wasCall: boolean } {
    const loc = locOf(ctx);

    // Llamada: (arguments?)
    if (ctx.LPAREN()) {
      const args = ctx.arguments() ? ctx.arguments()!.expression().map((e) => this.visitExpression(e)) : [];
      if (!isFunctionType(current.type)) {
        if (!isAbsorbing(current.type)) {
          this.report("SEM014", "error", loc, `'${displayType(current.type)}' no es invocable.`);
        }
        return {
          result: { type: T.error, node: createSemanticNode("call", "(...)", { location: loc, inferredType: "error", children: [current.node, ...args.map((a) => a.node)] }) },
          newClassName: null,
          wasCall: true
        };
      }
      this.checkArguments(current.type.params.map((p, i) => ({ name: `arg${i}`, type: p })), args, loc, "la función");
      const returnType = current.type.returnType;
      return {
        result: {
          type: returnType,
          node: createSemanticNode("call", "(...)", { location: loc, inferredType: displayType(returnType), children: [current.node, ...args.map((a) => a.node)] })
        },
        newClassName: returnType.kind === "instance" ? returnType.className : null,
        wasCall: true
      };
    }

    // Índice: [expression]
    if (ctx.LBRACKET()) {
      const indexResult = this.visitExpression(ctx.expression()!);
      if (indexResult.type.kind !== "primitive" || indexResult.type.name !== "integer") {
        if (!isAbsorbing(indexResult.type)) {
          this.report("SEM015", "error", loc, `El índice de un arreglo debe ser integer; se recibió '${displayType(indexResult.type)}'.`);
        }
      }
      if (!isArrayType(current.type)) {
        if (!isAbsorbing(current.type)) {
          this.report("SEM016", "error", loc, `No se puede indexar un valor de tipo '${displayType(current.type)}'.`);
        }
        return {
          result: { type: T.error, node: createSemanticNode("index", "[...]", { location: loc, inferredType: "error", children: [current.node, indexResult.node] }) },
          newClassName: null,
          wasCall: false
        };
      }
      const elementType = current.type.element;
      return {
        result: {
          type: elementType,
          node: createSemanticNode("index", "[...]", { location: loc, inferredType: displayType(elementType), children: [current.node, indexResult.node] })
        },
        newClassName: elementType.kind === "instance" ? elementType.className : null,
        wasCall: false
      };
    }

    // Acceso a miembro: .Identifier
    const memberName = ctx.Identifier()!.text;
    if (!currentClassName) {
      if (!isAbsorbing(current.type)) {
        this.report("SEM012", "error", loc, `No se puede acceder a '.${memberName}' sobre un valor de tipo '${displayType(current.type)}'.`, {
          symbol: memberName
        });
      }
      return {
        result: { type: T.error, node: createSemanticNode("member", `.${memberName}`, { location: loc, inferredType: "error", children: [current.node] }) },
        newClassName: null,
        wasCall: false
      };
    }

    const field = lookupField(this.classInfoMap, currentClassName, memberName);
    if (field) {
      return {
        result: {
          type: field.type,
          node: createSemanticNode("member", `.${memberName}`, { location: loc, inferredType: displayType(field.type), children: [current.node] }),
          mutableTarget: field.mutable,
          targetLabel: `.${memberName}`
        },
        newClassName: field.type.kind === "instance" ? field.type.className : null,
        wasCall: false
      };
    }

    const method = lookupMethod(this.classInfoMap, currentClassName, memberName);
    if (method) {
      const fnType = T.fn(method.params.map((p) => p.type), method.returnType);
      return {
        result: {
          type: fnType,
          node: createSemanticNode("member", `.${memberName}`, { location: loc, inferredType: displayType(fnType), children: [current.node] }),
          mutableTarget: false,
          targetLabel: `.${memberName}`
        },
        newClassName: null,
        wasCall: false
      };
    }

    this.report("SEM012", "error", loc, `La clase '${currentClassName}' no tiene un miembro '${memberName}'.`, { symbol: memberName });
    return {
      result: { type: T.error, node: createSemanticNode("member", `.${memberName}`, { location: loc, inferredType: "error", children: [current.node] }) },
      newClassName: null,
      wasCall: false
    };
  }

  private checkArguments(
    params: { name: string; type: SemanticType }[] | undefined,
    args: ExprResult[],
    loc: SourceLocation,
    description: string
  ): void {
    if (!params) {
      if (args.length > 0) {
        // Sin firma conocida (p. ej. clase sin constructor explícito): no
        // se valida cantidad/tipo de argumentos, solo se visitan.
      }
      return;
    }
    if (params.length !== args.length) {
      this.report(
        "SEM006",
        "error",
        loc,
        `${description} espera ${params.length} argumento(s) pero se pasaron ${args.length}.`
      );
      return;
    }
    for (let i = 0; i < params.length; i++) {
      if (!isAssignable(params[i].type, args[i].type, (c, p) => this.isSubclass(c, p))) {
        this.report(
          "SEM007",
          "error",
          loc,
          `El argumento ${i + 1} de ${description} debe ser de tipo '${displayType(params[i].type)}'; se recibió '${displayType(args[i].type)}'.`
        );
      }
    }
  }
}

export { isInstanceType };
