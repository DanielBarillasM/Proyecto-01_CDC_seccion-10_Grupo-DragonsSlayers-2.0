import { BookOpen, BrainCircuit, Layers, Search, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { ProjectView } from "../../lib/types";

const tabs: Array<{
  id: ProjectView;
  label: string;
  sublabel: string;
  icon: ReactNode;
  color: string;
}> = [
  {
    id: "semantic",
    label: "IDE semántico",
    sublabel: "Lexer + parser + semántica",
    icon: <BrainCircuit size={16} />,
    color: "tab-cyan"
  },
  {
    id: "parser",
    label: "Análisis sintáctico",
    sublabel: "Lexer + parser",
    icon: <Layers size={16} />,
    color: "tab-purple"
  },
  {
    id: "lexer",
    label: "Solo lexer",
    sublabel: "Tokens y errores léxicos",
    icon: <Search size={16} />,
    color: "tab-blue"
  },
  {
    id: "docs",
    label: "Documentación",
    sublabel: "Arquitectura y cobertura",
    icon: <BookOpen size={16} />,
    color: "tab-yellow"
  }
];

export function ProjectTabs({ active, onChange }: {
  active: ProjectView;
  onChange: (view: ProjectView) => void;
}) {
  return (
    <nav className="project-tabs" aria-label="Secciones del analizador">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${tab.color} ${active === tab.id ? "tab-active" : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-text">
            <span className="tab-label">{tab.label}</span>
            <span className="tab-sublabel">{tab.sublabel}</span>
          </span>
          {active === tab.id && <Zap size={12} className="tab-active-indicator" />}
        </button>
      ))}
    </nav>
  );
}
