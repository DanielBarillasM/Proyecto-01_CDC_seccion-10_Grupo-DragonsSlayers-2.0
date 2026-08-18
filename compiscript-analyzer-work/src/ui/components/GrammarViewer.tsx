import { Copy, Download } from "lucide-react";
import { useState } from "react";
import { downloadText } from "../../lib/downloads";
import { grammarDescription, grammarSource } from "../../lib/examples";

export function GrammarViewer() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(grammarSource);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grammar-viewer">
      <div className="grammar-toolbar">
        <div>
          <strong>Compiscript.g4</strong>
          <span className="grammar-desc">{grammarDescription}</span>
        </div>
        <div className="grammar-actions">
          <button className="btn-ghost" onClick={handleCopy}>
            <Copy size={15} /> {copied ? "Copiada" : "Copiar"}
          </button>
          <button className="btn-ghost" onClick={() => downloadText("Compiscript.g4", grammarSource)}>
            <Download size={15} /> .g4
          </button>
        </div>
      </div>
      <pre className="code-block grammar-code"><code>{grammarSource}</code></pre>
    </div>
  );
}
