import { Info, ShieldCheck } from "lucide-react";

export function AcademicNotice() {
  return (
    <div className="notice-stack">
      <div className="notice notice-cyan">
        <ShieldCheck size={18} />
        <div>
          <strong>Pipeline por fases con diagnósticos independientes</strong>
          <p>
            El lexer recolecta errores, el parser usa recuperación de ANTLR y el análisis semántico
            se ejecuta únicamente sobre un árbol sintáctico válido para evitar diagnósticos en cascada.
          </p>
        </div>
      </div>
      <div className="notice notice-yellow">
        <Info size={18} />
        <div>
          <strong>Alcance del Proyecto 1</strong>
          <p>
            La herramienta valida tipos, ámbitos, funciones, closures, control de flujo, clases,
            objetos, arreglos y código inalcanzable. Además construye la tabla de símbolos y una
            representación visual del árbol sintáctico y del árbol semántico anotado.
          </p>
        </div>
      </div>
    </div>
  );
}
