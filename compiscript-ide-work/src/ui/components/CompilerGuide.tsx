import { Braces, CheckCircle2, Database, GitBranch, ScanSearch } from "lucide-react";

const phases = [
  {
    number: "01",
    title: "Análisis léxico",
    description: "Convierte caracteres en tokens y localiza símbolos no reconocidos.",
    icon: <ScanSearch size={17} />
  },
  {
    number: "02",
    title: "Análisis sintáctico",
    description: "Valida la estructura con ANTLR y construye el árbol de parseo.",
    icon: <Braces size={17} />
  },
  {
    number: "03",
    title: "Análisis semántico",
    description: "Resuelve nombres, tipos, ámbitos, flujo, funciones y clases.",
    icon: <GitBranch size={17} />
  }
];

export function CompilerGuide() {
  return (
    <section className="compiler-guide" aria-labelledby="compiler-guide-title">
      <div className="guide-heading">
        <span className="guide-kicker">Ruta de análisis</span>
        <h3 id="compiler-guide-title">Del código al significado</h3>
        <p>Ejecuta las fases en orden. Si lexer o parser fallan, la fase semántica se detiene para evitar errores derivados.</p>
      </div>

      <ol className="phase-guide-list">
        {phases.map((phase) => (
          <li key={phase.number} className="phase-guide-item">
            <span className="phase-guide-number">{phase.number}</span>
            <span className="phase-guide-icon">{phase.icon}</span>
            <span>
              <strong>{phase.title}</strong>
              <small>{phase.description}</small>
            </span>
          </li>
        ))}
      </ol>

      <div className="guide-output-card">
        <div><Database size={17} /><strong>Resultado verificable</strong></div>
        <p>Diagnósticos con ubicación, tabla de símbolos actualizada, árbol de ámbitos y árboles visuales.</p>
        <span><CheckCircle2 size={14} /> Ctrl + Enter ejecuta el análisis</span>
      </div>
    </section>
  );
}
