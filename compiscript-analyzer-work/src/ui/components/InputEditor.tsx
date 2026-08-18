import { Download, Play, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { downloadText } from "../../lib/downloads";
import type { AnalysisMode } from "../../lib/types";

interface InputEditorProps {
  value: string;
  mode: AnalysisMode;
  isRunning?: boolean;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
}

export function InputEditor({
  value,
  mode,
  isRunning = false,
  onChange,
  onAnalyze,
  onClear
}: InputEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const lineCount = value.split("\n").length;
  const isEmpty = value.trim().length === 0;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".cps")) {
      setFileError("El archivo seleccionado debe tener extensión .cps.");
      event.target.value = "";
      return;
    }
    setFileError(null);
    setFileName(file.name);
    onChange(await file.text());
    event.target.value = "";
  }

  function handleClear() {
    setFileName(null);
    setFileError(null);
    onClear();
  }

  return (
    <div className="input-editor">
      <div className="editor-header">
        <span className="editor-title">Archivo Compiscript {fileName && `— ${fileName}`}</span>
        <span className="editor-meta">
          {lineCount} {lineCount === 1 ? "línea" : "líneas"} · {value.length} caracteres
        </span>
      </div>

      {isEmpty && (
        <div className="editor-warning">
          La entrada está vacía. Selecciona un caso o carga un archivo Compiscript.
        </div>
      )}
      {fileError && <div className="analyze-error">{fileError}</div>}

      <textarea
        className="input-area"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'// Escribe código Compiscript aquí\nlet mensaje: string = "Hola";\nprint(mensaje);'}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />

      <div className="editor-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".cps,text/plain"
          onChange={handleFile}
          hidden
        />
        <button className="btn-primary" onClick={onAnalyze} disabled={isEmpty || isRunning}>
          <Play size={16} />
          {isRunning ? "Analizando…" : "Ejecutar análisis"}
        </button>
        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Cargar .cps
        </button>
        <button
          className="btn-secondary"
          onClick={() => downloadText(`compiscript_${mode}.cps`, value)}
        >
          <Download size={16} /> Descargar .cps
        </button>
        <button className="btn-ghost" onClick={handleClear}>
          <RotateCcw size={16} /> Limpiar
        </button>
      </div>
    </div>
  );
}
