import { AlertCircle, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { AnalyzeError, AnalyzeResult } from "../../lib/types";

interface ErrorPanelProps {
  result: AnalyzeResult;
}

export function ErrorPanel({ result }: ErrorPanelProps) {
  const { lexicalErrors, syntaxErrors } = result;
  const hasErrors = lexicalErrors.length > 0 || syntaxErrors.length > 0;

  if (!hasErrors) {
    return (
      <div className="error-none">
        <CheckCircle2 size={22} />
        <div>
          <strong>Sin errores léxicos ni sintácticos</strong>
          <p>La entrada fue procesada correctamente por el lexer y el parser de ANTLR.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="error-panel">
      {lexicalErrors.length > 0 && (
        <ErrorGroup
          title="Errores léxicos"
          subtitle="Caracteres o lexemas no reconocidos por el lexer"
          errors={lexicalErrors}
          variant="lexer"
        />
      )}

      {syntaxErrors.length > 0 && (
        <ErrorGroup
          title="Errores sintácticos"
          subtitle="Secuencias de tokens que no cumplen la gramática"
          errors={syntaxErrors}
          variant="parser"
        />
      )}
    </div>
  );
}

interface ErrorGroupProps {
  title: string;
  subtitle: string;
  errors: AnalyzeError[];
  variant: "lexer" | "parser";
}

function ErrorGroup({ title, subtitle, errors, variant }: ErrorGroupProps) {
  return (
    <div className={`error-group error-${variant}`}>
      <div className="error-group-header">
        {variant === "lexer" ? <AlertCircle size={16} /> : <AlertOctagon size={16} />}
        <div>
          <strong>{title}</strong>
          <span className="error-subtitle">{subtitle}</span>
        </div>
        <span className="error-count">{errors.length}</span>
      </div>

      <ul className="error-list">
        {errors.map((err, idx) => (
          <ErrorItem key={`${err.source}-${err.line}-${err.column}-${idx}`} error={err} />
        ))}
      </ul>
    </div>
  );
}

function ErrorItem({ error }: { error: AnalyzeError }) {
  return (
    <li className="error-item">
      <div className="error-item-location">
        <span className="error-source">{error.source === "lexer" ? "LEX" : "SYN"}</span>
        <span className="error-pos">
          Línea {error.line}, columna {error.column}
        </span>
        {error.offendingSymbol && (
          <code className="error-symbol">{JSON.stringify(error.offendingSymbol)}</code>
        )}
      </div>
      <p className="error-msg">{error.message}</p>
    </li>
  );
}
