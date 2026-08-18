import { Braces, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AnalyzeResult } from "../../lib/types";
import type { SemanticTreeNode } from "../../semantic/ast";

interface SemanticTreePanelProps {
  result: AnalyzeResult;
}

export function SemanticTreePanel({ result }: SemanticTreePanelProps) {
  if (result.semantic.status !== "completed") {
    return <div className="panel-empty"><Braces size={24} /><p>El árbol semántico anotado se genera después de validar el CST.</p></div>;
  }

  if (result.semantic.semanticTree.length === 0) {
    return <div className="panel-empty"><Braces size={24} /><p>No hay nodos semánticos para mostrar.</p></div>;
  }

  return (
    <div className="semantic-tree">
      {result.semantic.semanticTree.map((node) => (
        <SemanticNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function SemanticNode({ node, depth }: { node: SemanticTreeNode; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 3);
  const hasChildren = node.children.length > 0;

  return (
    <div className="semantic-tree-node-wrap" style={{ marginLeft: depth === 0 ? 0 : "1rem" }}>
      <button
        className={`semantic-tree-node ${node.diagnostics.length > 0 ? "semantic-tree-node-diagnostic" : ""}`}
        onClick={() => hasChildren && setCollapsed((value) => !value)}
      >
        <span className="semantic-tree-chevron">
          {hasChildren ? (collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />) : <span className="scope-leaf-dot" />}
        </span>
        <span className="semantic-node-kind">{node.kind}</span>
        <strong>{node.label}</strong>
        {node.inferredType && <code className="semantic-node-type">{node.inferredType}</code>}
        {node.location && <span className="semantic-node-location">L{node.location.line}:C{node.location.column}</span>}
        {node.diagnostics.map((code) => <span className="semantic-node-diagnostic-code" key={`${node.id}-${code}`}>{code}</span>)}
      </button>
      {!collapsed && hasChildren && (
        <div className="semantic-tree-children">
          {node.children.map((child) => (
            <SemanticNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
