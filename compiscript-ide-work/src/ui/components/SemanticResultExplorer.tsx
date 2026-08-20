import { useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Braces,
  CircleAlert,
  Database,
  FolderTree,
  GitBranch,
  ListChecks,
  Network,
  TriangleAlert
} from "lucide-react";
import type { AnalyzeResult } from "../../lib/types";
import { ParseTreePanel } from "./ParseTreePanel";
import { ScopeTreePanel } from "./ScopeTreePanel";
import { SemanticDiagnosticsPanel } from "./SemanticDiagnosticsPanel";
import { SemanticTreePanel } from "./SemanticTreePanel";
import { SymbolTablePanel } from "./SymbolTablePanel";

type ExplorerView = "overview" | "diagnostics" | "symbols" | "scopes" | "trees";

interface ExplorerTab {
  id: ExplorerView;
  label: string;
  description: string;
  icon: ReactNode;
  count?: number;
}

export function SemanticResultExplorer({ result }: { result: AnalyzeResult }) {
  const [active, setActive] = useState<ExplorerView>(
    result.semantic.diagnostics.length > 0 ? "diagnostics" : "overview"
  );

  const tabs: ExplorerTab[] = [
    { id: "overview", label: "Resumen", description: "Estado general", icon: <Activity size={16} /> },
    {
      id: "diagnostics",
      label: "Diagnósticos",
      description: "Errores y advertencias",
      icon: <ListChecks size={16} />,
      count: result.semantic.diagnostics.length
    },
    {
      id: "symbols",
      label: "Símbolos",
      description: "Declaraciones y referencias",
      icon: <Database size={16} />,
      count: result.semantic.symbols.length
    },
    {
      id: "scopes",
      label: "Ámbitos",
      description: "Jerarquía léxica",
      icon: <FolderTree size={16} />,
      count: result.semantic.scopes.length
    },
    { id: "trees", label: "Árboles", description: "Semántico y CST", icon: <Network size={16} /> }
  ];

  return (
    <section className="result-explorer" aria-label="Explorador de resultados semánticos">
      <div className="result-explorer-header">
        <div>
          <span className="guide-kicker">Explorador</span>
          <h3>Comprende el resultado por capas</h3>
          <p>Cada pestaña presenta una parte del estado producido por el mismo recorrido semántico.</p>
        </div>
        <div className={`analysis-health ${result.accepted ? "analysis-health-ok" : "analysis-health-error"}`}>
          {result.accepted ? "Análisis consistente" : "Requiere correcciones"}
        </div>
      </div>

      <div className="explorer-layout">
        <nav className="explorer-tabs" aria-label="Vistas del resultado">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`explorer-tab ${active === tab.id ? "explorer-tab-active" : ""}`}
              onClick={() => setActive(tab.id)}
              aria-pressed={active === tab.id}
            >
              <span className="explorer-tab-icon">{tab.icon}</span>
              <span className="explorer-tab-copy">
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
              {tab.count !== undefined && <span className="explorer-tab-count">{tab.count}</span>}
            </button>
          ))}
        </nav>

        <div className="explorer-content">
          {active === "overview" && <SemanticOverview result={result} />}
          {active === "diagnostics" && <SemanticDiagnosticsPanel result={result} />}
          {active === "symbols" && <SymbolTablePanel result={result} />}
          {active === "scopes" && <ScopeTreePanel result={result} />}
          {active === "trees" && (
            <div className="tree-explorer-grid">
              <div className="explorer-subpanel">
                <div className="explorer-subpanel-heading"><GitBranch size={16} /><strong>Árbol semántico anotado</strong></div>
                <SemanticTreePanel result={result} />
              </div>
              <div className="explorer-subpanel">
                <div className="explorer-subpanel-heading"><Braces size={16} /><strong>Árbol de parseo ANTLR</strong></div>
                <ParseTreePanel result={result} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SemanticOverview({ result }: { result: AnalyzeResult }) {
  const { semantic } = result;
  const topDiagnostics = semantic.diagnostics.slice(0, 3);
  return (
    <div className="semantic-overview">
      <div className="overview-metric-grid">
        <OverviewMetric label="Símbolos" value={semantic.metrics.symbolCount} detail="entradas registradas" />
        <OverviewMetric label="Ámbitos" value={semantic.metrics.scopeCount} detail="entornos enlazados" />
        <OverviewMetric label="Referencias" value={semantic.metrics.referenceCount} detail="usos resueltos" />
        <OverviewMetric label="Closures" value={semantic.metrics.capturedVariableCount} detail="variables capturadas" />
      </div>

      <div className="overview-grid">
        <article className="overview-card">
          <span className="overview-card-icon"><CircleAlert size={18} /></span>
          <div>
            <h4>Lectura recomendada</h4>
            <p>{semantic.errors.length > 0
              ? "Comienza por los errores. Corrige primero nombres y tipos para reducir diagnósticos derivados."
              : semantic.warnings.length > 0
                ? "El programa no tiene errores, pero conviene revisar las advertencias de flujo e inicialización."
                : "El programa superó las tres fases. Revisa símbolos y ámbitos para explicar cómo se resolvió."}</p>
          </div>
        </article>

        <article className="overview-card overview-card-accent">
          <span className="overview-card-icon"><TriangleAlert size={18} /></span>
          <div>
            <h4>Diagnósticos destacados</h4>
            {topDiagnostics.length === 0
              ? <p>No se produjeron diagnósticos semánticos.</p>
              : <ul>{topDiagnostics.map((diagnostic) => (
                <li key={diagnostic.id}><code>{diagnostic.code}</code><span>L{diagnostic.line}:C{diagnostic.column}</span>{diagnostic.message}</li>
              ))}</ul>}
          </div>
        </article>
      </div>
    </div>
  );
}

function OverviewMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="overview-metric">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}
