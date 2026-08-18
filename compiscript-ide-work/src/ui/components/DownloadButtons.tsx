import { BrainCircuit, Download, FileCode2, FileJson, FileText, Table } from "lucide-react";
import {
  downloadText,
  parseTreeToText,
  resultToJson,
  semanticReportToText,
  symbolsToCsv,
  tokensToCsv
} from "../../lib/downloads";
import { grammarSource } from "../../lib/examples";
import type { AnalyzeResult } from "../../lib/types";

interface DownloadButtonsProps {
  result: AnalyzeResult;
  inputText: string;
}

export function DownloadButtons({ result, inputText }: DownloadButtonsProps) {
  const downloads = [
    {
      label: "Gramática .g4",
      icon: <FileCode2 size={15} />,
      color: "dl-cyan",
      action: () => downloadText("Compiscript.g4", grammarSource)
    },
    {
      label: "Entrada .cps",
      icon: <FileText size={15} />,
      color: "dl-blue",
      action: () => downloadText("entrada_compiscript.cps", inputText)
    },
    {
      label: "Tokens CSV",
      icon: <Table size={15} />,
      color: "dl-yellow",
      action: () => downloadText("tokens_compiscript.csv", tokensToCsv(result.tokens), "text/csv;charset=utf-8")
    },
    {
      label: "Tokens JSON",
      icon: <FileJson size={15} />,
      color: "dl-yellow",
      action: () => downloadText("tokens_compiscript.json", JSON.stringify(result.tokens, null, 2), "application/json")
    },
    ...(result.mode !== "lexer"
      ? [{
          label: "Árbol sintáctico .txt",
          icon: <FileText size={15} />,
          color: "dl-purple",
          action: () => downloadText("arbol_sintactico_compiscript.txt", parseTreeToText(result))
        }]
      : []),
    ...(result.mode === "semantic" && result.semantic.status === "completed"
      ? [
          {
            label: "Reporte semántico",
            icon: <BrainCircuit size={15} />,
            color: "dl-cyan",
            action: () => downloadText("reporte_semantico_compiscript.txt", semanticReportToText(result))
          },
          {
            label: "Símbolos CSV",
            icon: <Table size={15} />,
            color: "dl-purple",
            action: () => downloadText("tabla_simbolos_compiscript.csv", symbolsToCsv(result), "text/csv;charset=utf-8")
          },
          {
            label: "Semántica JSON",
            icon: <FileJson size={15} />,
            color: "dl-green",
            action: () => downloadText("semantica_compiscript.json", JSON.stringify(result.semantic, null, 2), "application/json")
          }
        ]
      : []),
    {
      label: "Resultado JSON",
      icon: <FileJson size={15} />,
      color: "dl-green",
      action: () => downloadText("resultado_compiscript.json", resultToJson(result), "application/json")
    }
  ];

  return (
    <div className="download-section">
      <p className="download-title">
        <Download size={15} />
        Evidencia y exportaciones
      </p>
      <div className="download-grid">
        {downloads.map((dl) => (
          <button key={dl.label} className={`dl-btn ${dl.color}`} onClick={dl.action}>
            {dl.icon}
            {dl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
