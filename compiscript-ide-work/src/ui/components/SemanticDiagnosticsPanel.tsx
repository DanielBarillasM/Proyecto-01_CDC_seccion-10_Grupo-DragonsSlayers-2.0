import { AlertTriangle, CheckCircle2, CircleAlert, Filter, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SEMANTIC_CODE_CATALOG } from "../../semantic/diagnostics";
import type { SemanticDiagnostic } from "../../semantic/diagnostics";
import type { AnalyzeResult } from "../../lib/types";

interface SemanticDiagnosticsPanelProps {
  result: AnalyzeResult;
}

type DiagnosticFilter = "all" | "error" | "warning";

export function SemanticDiagnosticsPanel({ result }: SemanticDiagnosticsPanelProps) {
  const { semantic } = result;
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<DiagnosticFilter>("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return semantic.diagnostics.filter((diagnostic) => {
      if (severity !== "all" && diagnostic.severity !== severity) return false;
      if (!normalized) return true;
      return [
        diagnostic.code,
        SEMANTIC_CODE_CATALOG[diagnostic.code],
        diagnostic.message,
        diagnostic.symbol ?? "",
        diagnostic.hint ?? ""
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [query, semantic.diagnostics, severity]);

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
    <div>
      <div className="semantic-toolbar diagnostic-toolbar">
        <span className="semantic-count"><Filter size={14} /> {semantic.diagnostics.length} diagnósticos</span>
        <div className="diagnostic-controls">
          <label className="semantic-search diagnostic-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar SEM, símbolo o mensaje"
              aria-label="Buscar diagnósticos semánticos"
            />
          </label>
          <select
            className="semantic-select"
            value={severity}
            onChange={(event) => setSeverity(event.target.value as DiagnosticFilter)}
            aria-label="Filtrar diagnósticos por severidad"
          >
            <option value="all">Todos</option>
            <option value="error">Errores</option>
            <option value="warning">Warnings</option>
          </select>
        </div>
      </div>

      <div className="semantic-diagnostics">
        {filtered.map((diagnostic) => <DiagnosticCard key={diagnostic.id} diagnostic={diagnostic} />)}
      </div>
      {filtered.length === 0 && <p className="semantic-filter-empty">No hay diagnósticos que coincidan con los filtros.</p>}
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
          <div className="semantic-meta-row"><span>Símbolo</span><code>{diagnostic.symbol}</code></div>
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
