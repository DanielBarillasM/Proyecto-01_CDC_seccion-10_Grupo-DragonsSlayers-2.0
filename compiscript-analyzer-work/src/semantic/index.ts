// ============================================================
// PUNTO DE ENTRADA DEL MÓDULO SEMÁNTICO
// ============================================================
//
// Reexporta las piezas públicas del análisis semántico para que el resto
// de la aplicación (analyze.ts, la CLI, la UI) dependa de un único
// módulo en lugar de conocer la estructura interna de src/semantic/*.

export * from "./semanticTypes";
export * from "./typeSystem";
export * from "./symbols";
export * from "./scopes";
export * from "./diagnostics";
export * from "./ast";
export { runSemanticAnalysis, type SemanticAnalysisOutput } from "./semanticVisitor";
