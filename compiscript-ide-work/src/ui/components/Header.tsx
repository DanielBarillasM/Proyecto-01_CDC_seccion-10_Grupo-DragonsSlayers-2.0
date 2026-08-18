import { BrainCircuit, Code2, Cpu, Database, FileCode2, GitBranch } from "lucide-react";

const badges = [
  { label: "Compiscript", color: "badge-purple" },
  { label: "ANTLR 4", color: "badge-cyan" },
  { label: "Análisis semántico", color: "badge-green" },
  { label: "Tabla de símbolos", color: "badge-yellow" }
];

export function Header() {
  return (
    <header className="hero">
      <div className="hero-content">
        <p className="eyebrow">
          <Cpu size={14} /> Construcción de Compiladores · Proyecto 1
        </p>
        <h1>Compiscript Semantic IDE</h1>
        <p className="subtitle">
          IDE académico para analizar archivos .cps mediante un pipeline real de ANTLR:
          análisis léxico, sintáctico y semántico, con sistema de tipos, ámbitos, tabla de
          símbolos, diagnósticos y árboles de compilación.
        </p>
        <div className="badge-row">
          {badges.map((badge) => (
            <span key={badge.label} className={`badge ${badge.color}`}>{badge.label}</span>
          ))}
        </div>
      </div>

      <div className="hero-card">
        <div className="hero-card-icon"><FileCode2 size={40} /></div>
        <strong>Pipeline de compilación</strong>
        <span>La fase semántica solo se ejecuta si el lexer y el parser producen un programa estructuralmente válido.</span>
        <div className="hero-card-features">
          <div className="feature-chip"><Code2 size={12} /> Lexer + parser ANTLR</div>
          <div className="feature-chip"><BrainCircuit size={12} /> Reglas semánticas</div>
          <div className="feature-chip"><Database size={12} /> Tabla de símbolos</div>
          <div className="feature-chip"><GitBranch size={12} /> Ámbitos y árboles</div>
        </div>
      </div>
    </header>
  );
}
