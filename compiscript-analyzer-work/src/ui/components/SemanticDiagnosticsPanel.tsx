import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { SEMANTIC_CODE_CATALOG } from "../../semantic/diagnostics";
import type { SemanticDiagnostic } from "../../semantic/diagnostics";
import type { AnalyzeResult } from "../../lib/types";

interface SemanticDiagnosticsPanelProps {
  result: AnalyzeResult;
}

export function SemanticDiagnosticsPanel({ result }: SemanticDiagnosticsPanelProps) {
  const { semantic } = result;

  if (semantic.status === "skipped") {
    return (
      <div className="semantic-empty semantic-skipped">
        <Info size={24} />
        <div>
          <strong>Análisis semántico omitido</strong>
          <p>{semantic.skipReason}</p>
        </div>
      </div>
    );
  }

  if (semantic.status !== "completed") {
    return (
      <div className="semantic-empty">
        <Info size={24} />
        <p>Ejecuta la vista de análisis semántico para obtener diagnósticos.</p>
      </div>
    );
  }

  if (semantic.diagnostics.length === 0) {
    return (
      <div className="semantic-empty semantic-ok">
        <CheckCircle2 size={24} />
        <div>
          <strong>Sin errores semánticos</strong>
          <p>El programa cumple las reglas semánticas implementadas por el analizador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="semantic-diagnostics">
      {semantic.diagnostics.map((diagnostic) => (
        <DiagnosticCard key={diagnostic.id} diagnostic={diagnostic} />
      ))}
    </div>
  );
}

function DiagnosticCard({ diagnostic }: { diagnostic: SemanticDiagnostic }) {
  const isError = diagnostic.severity === "error";
  return (
    <article className={`semantic-diagnostic ${isError ? "semantic-diagnostic-error" : "semantic-diagnostic-warning"}`}>
      <div className="semantic-diagnostic-icon">
        {isError ? <CircleAlert size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div className="semantic-diagnostic-body">
        <div className="semantic-diagnostic-heading">
          <code className="semantic-code">{diagnostic.code}</code>
          <strong>{SEMANTIC_CODE_CATALOG[diagnostic.code]}</strong>
          <span className="semantic-location">L{diagnostic.line}:C{diagnostic.column}</span>
        </div>
        <p>{diagnostic.message}</p>
        {diagnostic.symbol && (
          <div className="semantic-meta-row">
            <span>Símbolo</span>
            <code>{diagnostic.symbol}</code>
          </div>
        )}
        {diagnostic.hint && <p className="semantic-hint">Sugerencia: {diagnostic.hint}</p>}
        {diagnostic.related?.map((related, index) => (
          <p className="semantic-related" key={`${diagnostic.id}-related-${index}`}>
            {related.message} — L{related.line}:C{related.column}
          </p>
        ))}
      </div>
    </article>
  );
}
