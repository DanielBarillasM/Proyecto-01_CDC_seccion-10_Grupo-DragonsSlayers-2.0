import {
  AlertCircle,
  AlertOctagon,
  BrainCircuit,
  CheckCircle2,
  Database,
  FolderTree,
  Hash,
  TriangleAlert,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import type { AnalyzeResult } from "../../lib/types";

interface ResultStatusProps {
  result: AnalyzeResult;
}

export function ResultStatus({ result }: ResultStatusProps) {
  const { accepted, summary } = result;
  const isLexerMode = result.mode === "lexer";
  const isSemanticMode = result.mode === "semantic";

  const resultLabel = isLexerMode
    ? accepted ? "ACEPTADO LÉXICAMENTE" : "RECHAZADO LÉXICAMENTE"
    : isSemanticMode
      ? accepted ? "PROGRAMA SEMÁNTICAMENTE VÁLIDO" : "PROGRAMA CON DIAGNÓSTICOS SEMÁNTICOS"
      : accepted ? "ARCHIVO SINTÁCTICAMENTE CORRECTO" : "ARCHIVO CON ERRORES";

  return (
    <div className="result-status-wrapper">
      <div className={`result-banner ${accepted ? "result-accepted" : "result-rejected"}`}>
        <div className="result-banner-icon">
          {accepted ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
        </div>
        <div className="result-banner-text">
          <h2>{resultLabel}</h2>
          <p>{result.explanation}</p>
        </div>
      </div>

      <div className={`summary-cards ${isLexerMode ? "summary-cards-lexer" : ""} ${isSemanticMode ? "summary-cards-semantic" : ""}`}>
        <SummaryCard
          label="Tokens"
          value={summary.tokenCount}
          icon={<Hash size={18} />}
          color="blue"
        />
        <SummaryCard
          label="Errores léxicos"
          value={summary.lexicalErrorCount}
          icon={<AlertCircle size={18} />}
          color={summary.lexicalErrorCount > 0 ? "red" : "green"}
        />
        {!isLexerMode && (
          <SummaryCard
            label="Errores sintácticos"
            value={summary.syntaxErrorCount}
            icon={<AlertOctagon size={18} />}
            color={summary.syntaxErrorCount > 0 ? "orange" : "green"}
          />
        )}
        {isSemanticMode && (
          <>
            <SummaryCard
              label="Errores semánticos"
              value={summary.semanticErrorCount}
              icon={<BrainCircuit size={18} />}
              color={summary.semanticErrorCount > 0 ? "red" : "green"}
            />
            <SummaryCard
              label="Advertencias"
              value={summary.semanticWarningCount}
              icon={<TriangleAlert size={18} />}
              color={summary.semanticWarningCount > 0 ? "orange" : "green"}
            />
            <SummaryCard
              label="Símbolos"
              value={summary.symbolCount}
              icon={<Database size={18} />}
              color="purple"
            />
            <SummaryCard
              label="Ámbitos"
              value={summary.scopeCount}
              icon={<FolderTree size={18} />}
              color="purple"
            />
          </>
        )}
        {!isLexerMode && !isSemanticMode && (
          <SummaryCard
            label="Total errores"
            value={summary.totalErrorCount}
            icon={<XCircle size={18} />}
            color={summary.totalErrorCount > 0 ? "red" : "green"}
          />
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: "blue" | "purple" | "green" | "red" | "orange";
}

function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  return (
    <div className={`summary-card summary-${color}`}>
      <div className="summary-icon">{icon}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  );
}
