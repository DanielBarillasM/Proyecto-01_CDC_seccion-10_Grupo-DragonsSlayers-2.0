import {
  AlertCircle,
  AlertOctagon,
  BrainCircuit,
  CheckCircle2,
  Database,
  FolderTree,
  Hash,
  MinusCircle,
  TriangleAlert,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import type { AnalyzeResult } from "../../lib/types";

interface ResultStatusProps {
  result: AnalyzeResult;
}

type PhaseState = "ok" | "warning" | "error" | "skipped" | "not-run";

export function ResultStatus({ result }: ResultStatusProps) {
  const { accepted, summary } = result;
  const isLexerMode = result.mode === "lexer";
  const isSemanticMode = result.mode === "semantic";

  const resultLabel = isLexerMode
    ? accepted ? "ACEPTADO LÉXICAMENTE" : "RECHAZADO LÉXICAMENTE"
    : isSemanticMode
      ? accepted ? "PROGRAMA SEMÁNTICAMENTE VÁLIDO" : "PROGRAMA CON DIAGNÓSTICOS SEMÁNTICOS"
      : accepted ? "ARCHIVO SINTÁCTICAMENTE CORRECTO" : "ARCHIVO CON ERRORES";

  const lexerState: PhaseState = summary.lexicalErrorCount > 0 ? "error" : "ok";
  const parserState: PhaseState = isLexerMode
    ? "not-run"
    : summary.syntaxErrorCount > 0
      ? "error"
      : summary.lexicalErrorCount > 0
        ? "warning"
        : "ok";
  const semanticState: PhaseState = !isSemanticMode
    ? "not-run"
    : result.semantic.status === "skipped"
      ? "skipped"
      : summary.semanticErrorCount > 0
        ? "error"
        : summary.semanticWarningCount > 0
          ? "warning"
          : "ok";

  return (
    <div className="result-status-wrapper">
      <div className={`result-banner ${accepted ? "result-accepted" : "result-rejected"}`}>
        <div className="result-banner-icon">
          {accepted ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
        </div>
        <div className="result-banner-text">
          <h2>{resultLabel}</h2>
          <p>{result.explanation}</p>
        </div>
      </div>

      <div className="phase-pipeline" aria-label="Estado de las fases de compilación">
        <PhaseStep label="Lexer" state={lexerState} detail={`${summary.lexicalErrorCount} errores`} />
        <span className="phase-arrow" aria-hidden="true">→</span>
        <PhaseStep
          label="Parser"
          state={parserState}
          detail={isLexerMode ? "no solicitado" : `${summary.syntaxErrorCount} errores`}
        />
        <span className="phase-arrow" aria-hidden="true">→</span>
        <PhaseStep
          label="Semántica"
          state={semanticState}
          detail={!isSemanticMode
            ? "no solicitada"
            : result.semantic.status === "skipped"
              ? "omitida"
              : `${summary.semanticErrorCount} errores · ${summary.semanticWarningCount} warnings`}
        />
      </div>

      <div className={`summary-cards ${isLexerMode ? "summary-cards-lexer" : ""} ${isSemanticMode ? "summary-cards-semantic" : ""}`}>
        <SummaryCard label="Tokens" value={summary.tokenCount} icon={<Hash size={16} />} color="blue" />
        <SummaryCard
          label="Errores léxicos"
          value={summary.lexicalErrorCount}
          icon={<AlertCircle size={16} />}
          color={summary.lexicalErrorCount > 0 ? "red" : "green"}
        />
        {!isLexerMode && (
          <SummaryCard
            label="Errores sintácticos"
            value={summary.syntaxErrorCount}
            icon={<AlertOctagon size={16} />}
            color={summary.syntaxErrorCount > 0 ? "orange" : "green"}
          />
        )}
        {isSemanticMode && (
          <>
            <SummaryCard
              label="Errores semánticos"
              value={summary.semanticErrorCount}
              icon={<BrainCircuit size={16} />}
              color={summary.semanticErrorCount > 0 ? "red" : "green"}
            />
            <SummaryCard
              label="Advertencias"
              value={summary.semanticWarningCount}
              icon={<TriangleAlert size={16} />}
              color={summary.semanticWarningCount > 0 ? "orange" : "green"}
            />
            <SummaryCard label="Símbolos" value={summary.symbolCount} icon={<Database size={16} />} color="purple" />
            <SummaryCard label="Ámbitos" value={summary.scopeCount} icon={<FolderTree size={16} />} color="purple" />
          </>
        )}
        {!isLexerMode && !isSemanticMode && (
          <SummaryCard
            label="Total errores"
            value={summary.totalErrorCount}
            icon={<XCircle size={16} />}
            color={summary.totalErrorCount > 0 ? "red" : "green"}
          />
        )}
      </div>
    </div>
  );
}

function PhaseStep({ label, state, detail }: { label: string; state: PhaseState; detail: string }) {
  return (
    <div className={`phase-step phase-${state}`}>
      <span className="phase-state-icon" aria-hidden="true">
        {state === "ok" && <CheckCircle2 size={15} />}
        {state === "warning" && <TriangleAlert size={15} />}
        {state === "error" && <XCircle size={15} />}
        {(state === "skipped" || state === "not-run") && <MinusCircle size={15} />}
      </span>
      <span className="phase-step-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
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
