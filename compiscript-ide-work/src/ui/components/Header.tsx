import { Braces, Code2, Database, GitBranch, GraduationCap, ShieldCheck } from "lucide-react";

const capabilities = [
  { label: "ANTLR 4", icon: <Braces size={14} /> },
  { label: "TypeScript", icon: <Code2 size={14} /> },
  { label: "Tabla de símbolos", icon: <Database size={14} /> },
  { label: "Ámbitos léxicos", icon: <GitBranch size={14} /> }
];

export function Header() {
  return (
    <header className="hero hero-refined">
      <div className="hero-brand-mark" aria-hidden="true">
        <span>CS</span>
      </div>

      <div className="hero-content">
        <p className="eyebrow"><GraduationCap size={15} /> Construcción de Compiladores · Proyecto 1</p>
        <h1>Compiscript <span>Semantic IDE</span></h1>
        <p className="subtitle">
          Un laboratorio visual para recorrer el código fuente desde los tokens hasta los tipos,
          símbolos y ámbitos que le dan significado.
        </p>
        <div className="hero-capability-row">
          {capabilities.map((item) => (
            <span key={item.label}>{item.icon}{item.label}</span>
          ))}
        </div>
      </div>

      <div className="hero-status-card">
        <span className="hero-status-icon"><ShieldCheck size={20} /></span>
        <div>
          <small>Motor activo</small>
          <strong>Pipeline de tres fases</strong>
          <p>Lexer, parser y visitor semántico conectados al mismo resultado verificable.</p>
        </div>
      </div>
    </header>
  );
}
