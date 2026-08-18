import { ChevronDown, ChevronRight, FolderTree } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalyzeResult } from "../../lib/types";
import type { ScopeInfo } from "../../semantic/scopes";

interface ScopeTreePanelProps {
  result: AnalyzeResult;
}

export function ScopeTreePanel({ result }: ScopeTreePanelProps) {
  const { scopes, scopeRootId } = result.semantic;
  const scopeMap = useMemo(() => new Map(scopes.map((scope) => [scope.id, scope])), [scopes]);
  const root = scopeRootId ? scopeMap.get(scopeRootId) : undefined;

  if (result.semantic.status !== "completed") {
    return <div className="panel-empty"><FolderTree size={24} /><p>Los ámbitos se construyen durante el análisis semántico.</p></div>;
  }

  if (!root) {
    return <div className="panel-empty"><FolderTree size={24} /><p>No se generó un árbol de ámbitos.</p></div>;
  }

  return (
    <div className="scope-tree">
      <ScopeNode scope={root} scopeMap={scopeMap} depth={0} />
    </div>
  );
}

function ScopeNode({
  scope,
  scopeMap,
  depth
}: {
  scope: ScopeInfo;
  scopeMap: Map<string, ScopeInfo>;
  depth: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const children = scope.childIds
    .map((id) => scopeMap.get(id))
    .filter((item): item is ScopeInfo => Boolean(item));

  return (
    <div className="scope-node-wrap" style={{ marginLeft: depth === 0 ? 0 : "1rem" }}>
      <button className="scope-node" onClick={() => setCollapsed((value) => !value)}>
        <span className="scope-chevron">
          {children.length > 0 ? (collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />) : <span className="scope-leaf-dot" />}
        </span>
        <span className={`scope-kind scope-kind-${scope.kind}`}>{scope.kind}</span>
        <strong>{scope.name}</strong>
        <span className="scope-symbol-count">{scope.symbolIds.length} símbolos</span>
        <code>{scope.id}</code>
      </button>
      {!collapsed && children.length > 0 && (
        <div className="scope-children">
          {children.map((child) => (
            <ScopeNode key={child.id} scope={child} scopeMap={scopeMap} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
