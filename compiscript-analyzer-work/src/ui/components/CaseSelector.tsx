import { AlertCircle, AlertOctagon, BrainCircuit, CheckCircle, Edit3 } from "lucide-react";
import type { ReactNode } from "react";
import { exampleCase } from "../../lib/examples";
import type { AnalysisMode } from "../../lib/types";

interface CaseSelectorProps {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  includeSemantic?: boolean;
}

interface CaseOption {
  id: AnalysisMode;
  label: string;
  icon: ReactNode;
  className: string;
  description: string;
}

const baseCases: CaseOption[] = [
  {
    id: "valid",
    label: "Entrada válida",
    icon: <CheckCircle size={15} />,
    className: "case-green",
    description: "Programa válido con funciones, clases, arreglos y control de flujo."
  },
  {
    id: "lexical",
    label: "Errores léxicos",
    icon: <AlertCircle size={15} />,
    className: "case-red",
    description: exampleCase.lexicalErrorDescription
  },
  {
    id: "syntax",
    label: "Errores sintácticos",
    icon: <AlertOctagon size={15} />,
    className: "case-orange",
    description: exampleCase.syntaxErrorDescription
  }
];

const semanticCase: CaseOption = {
  id: "semantic-error",
  label: "Errores semánticos",
  icon: <BrainCircuit size={15} />,
  className: "case-purple",
  description: exampleCase.semanticErrorDescription
};

const customCase: CaseOption = {
  id: "custom",
  label: "Archivo propio",
  icon: <Edit3 size={15} />,
  className: "case-blue",
  description: "Escribe, pega o selecciona tu propio archivo .cps."
};

export function CaseSelector({ value, onChange, includeSemantic = false }: CaseSelectorProps) {
  const cases = includeSemantic
    ? [...baseCases, semanticCase, customCase]
    : [...baseCases, customCase];
  const active = cases.find((item) => item.id === value);

  return (
    <div className="selector-group">
      <p className="selector-label">Caso de análisis</p>
      <div className="selector-row">
        {cases.map((item) => (
          <button
            key={item.id}
            className={`case-btn ${item.className} ${value === item.id ? "case-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
      {active && <p className="selector-desc">{active.description}</p>}
    </div>
  );
}
