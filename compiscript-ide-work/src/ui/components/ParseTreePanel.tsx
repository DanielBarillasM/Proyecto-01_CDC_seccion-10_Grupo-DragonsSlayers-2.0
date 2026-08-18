import { Copy, Download, GitBranch } from "lucide-react";
import { useState } from "react";
import { downloadText, parseTreeToText } from "../../lib/downloads";
import type { AnalyzeResult, TreeNode } from "../../lib/types";

interface ParseTreePanelProps {
  result: AnalyzeResult;
}

export function ParseTreePanel({ result }: ParseTreePanelProps) {
  const [view, setView] = useState<"text" | "visual">("visual");
  const [copied, setCopied] = useState(false);

  const hasTree = result.parseTreeText.trim().length > 0 && result.parseTreeText !== "—";

  function handleCopy() {
    navigator.clipboard.writeText(result.formattedParseTree).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    downloadText("arbol_compiscript.txt", parseTreeToText(result));
  }

  return (
    <div className="parse-tree-panel">
      <div className="parse-tree-header">
        <div className="parse-tree-title">
          <GitBranch size={16} />
          <div>
            <span className="parse-tree-name">Árbol de parseo</span>
            <span className="parse-tree-desc">
              Estructura reconocida por el parser generado de Compiscript
            </span>
          </div>
        </div>
        <div className="parse-tree-actions">
          <div className="view-toggle">
            <button
              className={view === "visual" ? "view-btn active" : "view-btn"}
              onClick={() => setView("visual")}
            >
              Visual
            </button>
            <button
              className={view === "text" ? "view-btn active" : "view-btn"}
              onClick={() => setView("text")}
            >
              Texto
            </button>
          </div>
          <button className="btn-icon" onClick={handleCopy}>
            <Copy size={13} />
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button className="btn-icon" onClick={handleDownload}>
            <Download size={13} />
            .txt
          </button>
        </div>
      </div>

      {!hasTree ? (
        <div className="panel-empty">
          <GitBranch size={24} />
          <p>
            {result.lexicalErrors.length > 0
              ? "No se puede generar el árbol de parseo porque hay errores léxicos."
              : "No se generó árbol de parseo."}
          </p>
        </div>
      ) : view === "text" ? (
        <pre className="tree-text">{result.formattedParseTree}</pre>
      ) : (
        <div className="tree-visual-scroll">
          <div className="tree-visual">
            {result.parseTreeNodes.map((node, i) => (
              <TreeNodeVisual key={i} node={node} depth={0} />
            ))}
          </div>
        </div>
      )}

      <div className="parse-tree-theory">
        <strong>Análisis sintáctico de Compiscript:</strong>
        <span>
          {" "}ANTLR genera el parser a partir de Compiscript.g4 y produce este árbol incluso cuando
          debe recuperarse de errores sintácticos.
        </span>
      </div>
    </div>
  );
}

// ──── Árbol visual ────────────────────────────────────────────────────────────

interface TreeNodeVisualProps {
  node: TreeNode;
  depth: number;
}

function TreeNodeVisual({ node, depth }: TreeNodeVisualProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isLeaf = node.children.length === 0;
  const isRule = !isLeaf && node.label.match(/^[a-z]/);
  const isToken = isLeaf;

  const nodeClass = isToken
    ? "tree-node tree-token"
    : isRule
    ? "tree-node tree-rule"
    : "tree-node tree-keyword";

  return (
    <div className="tree-node-wrapper" style={{ marginLeft: depth > 0 ? "1.5rem" : 0 }}>
      <div
        className={nodeClass}
        onClick={() => !isLeaf && setCollapsed((c) => !c)}
        role={isLeaf ? undefined : "button"}
        tabIndex={isLeaf ? undefined : 0}
        onKeyDown={(e) => {
          if (!isLeaf && (e.key === "Enter" || e.key === " ")) setCollapsed((c) => !c);
        }}
      >
        {!isLeaf && (
          <span className="tree-chevron">{collapsed ? "+" : "−"}</span>
        )}
        <span className="tree-label">{node.label}</span>
        {!isLeaf && !collapsed && (
          <span className="tree-child-count">{node.children.length}</span>
        )}
      </div>

      {!isLeaf && !collapsed && (
        <div className="tree-children">
          {node.children.map((child, i) => (
            <TreeNodeVisual key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
