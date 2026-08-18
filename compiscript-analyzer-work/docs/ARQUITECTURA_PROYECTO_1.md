# Arquitectura — Compiscript Semantic IDE

## Vista general

```text
.cps
 │
 ▼
ANTLRInputStream
 │
 ▼
CompiscriptLexer ───────────────► tokens + errores léxicos
 │
 ▼
CommonTokenStream
 │
 ▼
CompiscriptParser.program() ────► CST + errores sintácticos
 │
 │ (solo si lexer/parser son válidos)
 ▼
collectClassInfo()
 │
 ▼
SemanticAnalyzer
 ├── ScopeManager ──────────────► tabla de símbolos + árbol de ámbitos
 ├── typeSystem.ts ─────────────► compatibilidad e inferencia de tipos
 ├── flowAnalysis.ts ───────────► retornos + código inalcanzable
 ├── diagnostics.ts ────────────► SEM001..SEM021
 └── ast.ts ────────────────────► árbol semántico anotado
 │
 ▼
AnalyzeResult
 │
 ├── React UI
 ├── CLI
 └── exportaciones JSON / CSV / TXT
```

## Módulos relevantes

### `src/lib/analyze.ts`
Orquesta las tres fases. La salida es un único `AnalyzeResult`, por lo que UI, CLI y pruebas consumen exactamente el mismo pipeline.

### `src/semantic/declarationVisitor.ts`
Hace una prepasada de declaraciones de clases y resuelve información necesaria para herencia, campos, métodos y firmas.

### `src/semantic/semanticVisitor.ts`
Recorrido semántico principal. Resuelve símbolos, valida reglas, anota tipos y produce el árbol semántico.

### `src/semantic/scopes.ts`
Implementa `ScopeManager`, responsable de crear entornos anidados, declarar/resolver símbolos y registrar referencias/capturas.

### `src/semantic/typeSystem.ts`
Centraliza reglas de asignabilidad, comparabilidad, operadores y promociones numéricas.

### `src/semantic/diagnostics.ts`
Define códigos estables, severidad y estructura serializable de los diagnósticos.

### `src/ui/`
Presenta editor, lexer/parser heredados del Laboratorio 1 y las nuevas vistas de diagnósticos, símbolos, ámbitos, métricas y árbol semántico.

## Invariantes

1. El lexer siempre puede ejecutarse de forma independiente.
2. El parser solo opera después de tokenizar, pero conserva la recuperación de errores de ANTLR.
3. La semántica solo corre cuando no existen errores léxicos/sintácticos.
4. La UI no implementa reglas semánticas: solo representa `AnalyzeResult`.
5. La CLI usa el mismo `analyzeInput()` que la UI.
6. La tabla de símbolos es parte del resultado de la fase semántica, no un estado paralelo de la interfaz.

## Pruebas

La batería semántica se encuentra en:

```text
src/__tests__/semantic/semanticAnalyzer.test.ts
```

Incluye programas válidos, cobertura de `SEM001` a `SEM021` y regresiones específicas para campos/métodos, `for`, constantes de clase, ámbitos y determinismo de diagnósticos.
