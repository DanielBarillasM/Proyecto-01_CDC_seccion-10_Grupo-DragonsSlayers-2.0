import { useMemo, useState } from "react";
import { CaseSelector } from "./components/CaseSelector";
import { CompilerGuide } from "./components/CompilerGuide";
import { DocumentationPanel } from "./components/DocumentationPanel";
import { DownloadButtons } from "./components/DownloadButtons";
import { ErrorPanel } from "./components/ErrorPanel";
import { GrammarViewer } from "./components/GrammarViewer";
import { Header } from "./components/Header";
import { InputEditor } from "./components/InputEditor";
import { ProjectTabs } from "./components/ProjectTabs";
import { ResultStatus } from "./components/ResultStatus";
import { SemanticResultExplorer } from "./components/SemanticResultExplorer";
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
      setResult(analyzeInput(inputValue, "semantic"));
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
      <ProjectTabs active={activeTab} onChange={handleTabChange} />

      {activeTab === "semantic" && (
        <div className="tab-content">
          <SectionIntro
            title="IDE de análisis semántico"
            badge="Proyecto 1"
            badgeColor="badge-cyan"
            description="Ejecuta el pipeline completo de Compiscript: lexer, parser y análisis semántico con sistema de tipos, ámbitos, funciones, clases, control de flujo, tabla de símbolos y árbol semántico anotado."
          />

          <div className="semantic-workbench">
            <aside className="workbench-sidebar">
              <CompilerGuide />
              <section className="workbench-case-card">
                <div className="workbench-section-label">Entrada de demostración</div>
                <CaseSelector value={mode} onChange={handleModeChange} includeSemantic />
              </section>
              <details className="grammar-drawer">
                <summary>Consultar gramática activa</summary>
                <div className="grammar-drawer-content"><GrammarViewer /></div>
              </details>
            </aside>

            <section className="panel workbench-editor-panel">
              <div className="panel-header">
                <div>
                  <span className="guide-kicker">Área de trabajo</span>
                  <h3>Editor Compiscript</h3>
                </div>
                <span className="panel-subtitle">Escribe o carga un archivo .cps y ejecuta las tres fases</span>
              </div>
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

              {result.semantic.status === "completed" && (
                <SemanticResultExplorer result={result} />
              )}

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
