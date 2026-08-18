import { useMemo, useState } from "react";
import { AcademicNotice } from "./components/AcademicNotice";
import { CaseSelector } from "./components/CaseSelector";
import { DocumentationPanel } from "./components/DocumentationPanel";
import { DownloadButtons } from "./components/DownloadButtons";
import { ErrorPanel } from "./components/ErrorPanel";
import { GrammarViewer } from "./components/GrammarViewer";
import { Header } from "./components/Header";
import { InputEditor } from "./components/InputEditor";
import { ParseTreePanel } from "./components/ParseTreePanel";
import { ProjectTabs } from "./components/ProjectTabs";
import { ResultStatus } from "./components/ResultStatus";
import { ScopeTreePanel } from "./components/ScopeTreePanel";
import { SemanticDiagnosticsPanel } from "./components/SemanticDiagnosticsPanel";
import { SemanticTreePanel } from "./components/SemanticTreePanel";
import { SymbolTablePanel } from "./components/SymbolTablePanel";
import { TokenTable } from "./components/TokenTable";
import { analyzeInput } from "../lib/analyze";
import { exampleCase } from "../lib/examples";
import type { AnalysisMode, AnalyzeResult, ProjectView } from "../lib/types";

export function App() {
  const [activeTab, setActiveTab] = useState<ProjectView>("semantic");
  const [mode, setMode] = useState<AnalysisMode>("valid");
  const [customInput, setCustomInput] = useState<string>("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const inputValue = useMemo(() => {
    if (mode === "lexical") return exampleCase.lexicalErrorInput;
    if (mode === "syntax") return exampleCase.syntaxErrorInput;
    if (mode === "semantic-error") return exampleCase.semanticErrorInput;
    if (mode === "custom") return customInput;
    return exampleCase.validInput;
  }, [mode, customInput]);

  function handleModeChange(nextMode: AnalysisMode) {
    setMode(nextMode);
    if (nextMode === "custom" && customInput === "") {
      setCustomInput(exampleCase.validInput);
    }
    setResult(null);
    setAnalyzeError(null);
  }

  function handleInputChange(value: string) {
    setMode("custom");
    setCustomInput(value);
    setResult(null);
  }

  function handleTabChange(view: ProjectView) {
    setActiveTab(view);
    if (view !== "semantic" && mode === "semantic-error") setMode("valid");
    setResult(null);
    setAnalyzeError(null);
  }

  async function handleAnalyze() {
    setIsRunning(true);
    setAnalyzeError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const analyzerMode = activeTab === "lexer"
        ? "lexer"
        : activeTab === "semantic"
          ? "semantic"
          : "parser";
      setResult(analyzeInput(inputValue, analyzerMode));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Cannot find module") || message.includes("generated")) {
        setAnalyzeError(
          "Los archivos ANTLR generados no están disponibles. Ejecuta 'npm run generate' y reinicia el servidor."
        );
      } else {
        setAnalyzeError(`Error durante el análisis: ${message}`);
      }
    } finally {
      setIsRunning(false);
    }
  }

  function handleClear() {
    setMode("valid");
    setCustomInput("");
    setResult(null);
    setAnalyzeError(null);
  }

  return (
    <main className="shell">
      <Header />
      <AcademicNotice />
      <ProjectTabs active={activeTab} onChange={handleTabChange} />

      {activeTab === "semantic" && (
        <div className="tab-content">
          <SectionIntro
            title="IDE de análisis semántico"
            badge="Proyecto 1"
            badgeColor="badge-cyan"
            description="Ejecuta el pipeline completo de Compiscript: lexer, parser y análisis semántico con sistema de tipos, ámbitos, funciones, clases, control de flujo, tabla de símbolos y árbol semántico anotado."
          />

          <div className="config-grid">
            <section className="panel">
              <div className="panel-header">
                <h3>Editor Compiscript</h3>
                <span className="panel-subtitle">Entrada .cps para las tres fases del compilador</span>
              </div>
              <CaseSelector value={mode} onChange={handleModeChange} includeSemantic />
              <InputEditor
                value={inputValue}
                mode={mode}
                isRunning={isRunning}
                onChange={handleInputChange}
                onAnalyze={handleAnalyze}
                onClear={handleClear}
              />
              {analyzeError && <div className="analyze-error">{analyzeError}</div>}
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>Gramática ANTLR activa</h3>
                <span className="panel-subtitle">Base sintáctica sobre la que se aplican las reglas semánticas</span>
              </div>
              <GrammarViewer />
            </section>
          </div>

          {result && (
            <div className="results-section">
              <ResultStatus result={result} />

              {(result.lexicalErrors.length > 0 || result.syntaxErrors.length > 0) && (
                <section className="panel">
                  <div className="panel-header">
                    <h3>Errores previos al análisis semántico</h3>
                    <span className="panel-subtitle">La fase semántica solo se ejecuta sobre un CST válido</span>
                  </div>
                  <ErrorPanel result={result} />
                </section>
              )}

              <section className="panel">
                <div className="panel-header">
                  <h3>Diagnósticos semánticos</h3>
                  <span className="panel-subtitle">Reglas de tipos, nombres, llamadas, flujo, clases, listas y código inalcanzable</span>
                </div>
                <SemanticDiagnosticsPanel result={result} />
              </section>

              {result.semantic.status === "completed" && (
                <>
                  <section className="panel">
                    <div className="panel-header">
                      <h3>Tabla de símbolos</h3>
                      <span className="panel-subtitle">Variables, constantes, parámetros, funciones, clases, campos, métodos y referencias</span>
                    </div>
                    <SymbolTablePanel result={result} />
                  </section>

                  <div className="results-grid semantic-results-grid">
                    <section className="panel">
                      <div className="panel-header">
                        <h3>Árbol de ámbitos</h3>
                        <span className="panel-subtitle">Entornos globales, funciones, clases, bloques, ciclos, switch y catch</span>
                      </div>
                      <ScopeTreePanel result={result} />
                    </section>

                    <section className="panel semantic-metrics-panel">
                      <div className="panel-header">
                        <h3>Métricas semánticas</h3>
                        <span className="panel-subtitle">Trazabilidad del análisis y closures</span>
                      </div>
                      <div className="semantic-metric-list">
                        <MetricRow label="Símbolos registrados" value={result.semantic.metrics.symbolCount} />
                        <MetricRow label="Ámbitos creados" value={result.semantic.metrics.scopeCount} />
                        <MetricRow label="Referencias resueltas" value={result.semantic.metrics.referenceCount} />
                        <MetricRow label="Variables capturadas por closures" value={result.semantic.metrics.capturedVariableCount} />
                      </div>
                    </section>
                  </div>

                  <section className="panel">
                    <div className="panel-header">
                      <h3>Árbol semántico anotado</h3>
                      <span className="panel-subtitle">Proyección del CST con tipos inferidos, símbolos y diagnósticos</span>
                    </div>
                    <SemanticTreePanel result={result} />
                  </section>

                  <section className="panel">
                    <ParseTreePanel result={result} />
                  </section>
                </>
              )}

              <DownloadButtons result={result} inputText={inputValue} />
            </div>
          )}
        </div>
      )}

      {activeTab === "lexer" && (
        <div className="tab-content">
          <SectionIntro
            title="Lexer de Compiscript"
            badge="Modo léxico"
            badgeColor="badge-blue"
            description="Inspecciona los tokens y errores léxicos producidos por ANTLR sin ejecutar el parser ni la fase semántica."
          />

          <div className="config-grid">
            <section className="panel">
              <div className="panel-header"><h3>Configuración del análisis</h3></div>
              <CaseSelector value={mode} onChange={handleModeChange} />
              <InputEditor value={inputValue} mode={mode} isRunning={isRunning} onChange={handleInputChange} onAnalyze={handleAnalyze} onClear={handleClear} />
              {analyzeError && <div className="analyze-error">{analyzeError}</div>}
            </section>
            <section className="panel">
              <div className="panel-header"><h3>Gramática ANTLR</h3><span className="panel-subtitle">Fuente usada para generar el lexer y el parser</span></div>
              <GrammarViewer />
            </section>
          </div>

          {result && (
            <div className="results-section">
              <ResultStatus result={result} />
              <section className="panel">
                <div className="panel-header"><h3>Tokens identificados</h3><span className="panel-subtitle">Tokens reconocidos por el lexer</span></div>
                <TokenTable result={result} />
              </section>
              {result.lexicalErrors.length > 0 && (
                <section className="panel">
                  <div className="panel-header"><h3>Errores léxicos</h3></div>
                  <ErrorPanel result={result} />
                </section>
              )}
              <DownloadButtons result={result} inputText={inputValue} />
            </div>
          )}
        </div>
      )}

      {activeTab === "parser" && (
        <div className="tab-content">
          <SectionIntro
            title="Análisis léxico y sintáctico"
            badge="Lexer + parser"
            badgeColor="badge-purple"
            description="Conserva las capacidades del Laboratorio 1: tokenización, recuperación de errores sintácticos, diagnósticos en español y árbol de parseo real de ANTLR."
          />

          <div className="config-grid">
            <section className="panel">
              <div className="panel-header"><h3>Configuración del análisis</h3></div>
              <CaseSelector value={mode} onChange={handleModeChange} />
              <InputEditor value={inputValue} mode={mode} isRunning={isRunning} onChange={handleInputChange} onAnalyze={handleAnalyze} onClear={handleClear} />
              {analyzeError && <div className="analyze-error">{analyzeError}</div>}
            </section>
            <section className="panel">
              <div className="panel-header"><h3>Gramática ANTLR</h3><span className="panel-subtitle">Producciones del parser</span></div>
              <GrammarViewer />
            </section>
          </div>

          {result && (
            <div className="results-section">
              <ResultStatus result={result} />
              <div className="results-grid">
                <section className="panel"><div className="panel-header"><h3>Errores léxicos y sintácticos</h3></div><ErrorPanel result={result} /></section>
                <section className="panel"><div className="panel-header"><h3>Tokens</h3><span className="panel-subtitle">Entrada al parser</span></div><TokenTable result={result} /></section>
              </div>
              <section className="panel"><ParseTreePanel result={result} /></section>
              <DownloadButtons result={result} inputText={inputValue} />
            </div>
          )}
        </div>
      )}

      {activeTab === "docs" && (
        <div className="tab-content">
          <SectionIntro
            title="Documentación técnica"
            badge="Proyecto 1"
            badgeColor="badge-yellow"
            description="Arquitectura del compilador, reglas semánticas, tabla de símbolos, decisiones de diseño, pruebas y comandos de ejecución."
          />
          <section className="panel"><DocumentationPanel /></section>
        </div>
      )}
    </main>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="semantic-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface SectionIntroProps {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
}

function SectionIntro({ title, badge, badgeColor, description }: SectionIntroProps) {
  return (
    <div className="section-intro">
      <span className={`badge ${badgeColor}`}>{badge}</span>
      <h2>{title}</h2>
      <p className="section-desc">{description}</p>
    </div>
  );
}
