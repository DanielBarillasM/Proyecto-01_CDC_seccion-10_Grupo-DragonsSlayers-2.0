import { Download, Keyboard, Play, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, UIEvent } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const lineCount = value.split("\n").length;
  const isEmpty = value.trim().length === 0;
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(lineCount, 1) }, (_, index) => index + 1),
    [lineCount]
  );

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
    setCursor({ line: 1, column: 1 });
    onClear();
  }

  function updateCursor(target = textareaRef.current) {
    if (!target) return;
    const before = target.value.slice(0, target.selectionStart);
    const lines = before.split("\n");
    setCursor({ line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 });
  }

  function handleEditorScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isEmpty && !isRunning) onAnalyze();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
        updateCursor(target);
      });
    }
  }

  return (
    <div className="input-editor">
      <div className="editor-header">
        <div>
          <span className="editor-title">{fileName ?? "program.cps"}</span>
          <span className="editor-language">Compiscript</span>
        </div>
        <span className="editor-meta">
          Ln {cursor.line}, Col {cursor.column} · {lineCount} {lineCount === 1 ? "línea" : "líneas"} · {value.length} caracteres
        </span>
      </div>

      {isEmpty && (
        <div className="editor-warning">
          La entrada está vacía. Selecciona un caso o carga un archivo Compiscript.
        </div>
      )}
      {fileError && <div className="analyze-error">{fileError}</div>}

      <div className="code-editor-shell">
        <div ref={gutterRef} className="line-gutter" aria-hidden="true">
          {lineNumbers.map((line) => <span key={line}>{line}</span>)}
        </div>
        <textarea
          ref={textareaRef}
          className="input-area"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            updateCursor(event.target);
          }}
          onClick={(event) => updateCursor(event.currentTarget)}
          onKeyUp={(event) => updateCursor(event.currentTarget)}
          onKeyDown={handleKeyDown}
          onScroll={handleEditorScroll}
          placeholder={'// Escribe código Compiscript aquí\nlet mensaje: string = "Hola";\nprint(mensaje);'}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Editor de código Compiscript"
        />
      </div>

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
          disabled={isEmpty}
        >
          <Download size={16} /> Descargar
        </button>
        <button className="btn-ghost" onClick={handleClear}>
          <RotateCcw size={16} /> Restablecer
        </button>
        <span className="editor-shortcut" title="Atajo para ejecutar el análisis">
          <Keyboard size={14} /> Ctrl + Enter
        </span>
      </div>
    </div>
  );
}
