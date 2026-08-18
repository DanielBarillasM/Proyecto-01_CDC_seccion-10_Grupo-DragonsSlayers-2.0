import { Database, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { displayType } from "../../semantic/semanticTypes";
import type { SymbolKind } from "../../semantic/symbols";
import type { AnalyzeResult } from "../../lib/types";

interface SymbolTablePanelProps {
  result: AnalyzeResult;
}

type KindFilter = "all" | SymbolKind;

export function SymbolTablePanel({ result }: SymbolTablePanelProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [scopeId, setScopeId] = useState("all");
  const symbols = result.semantic.symbols;
  const scopes = result.semantic.scopes;
  const scopeNameById = useMemo(() => new Map(scopes.map((scope) => [scope.id, scope.name])), [scopes]);

  const kinds = useMemo(
    () => Array.from(new Set(symbols.map((symbol) => symbol.kind))).sort(),
    [symbols]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return symbols.filter((symbol) => {
      if (kind !== "all" && symbol.kind !== kind) return false;
      if (scopeId !== "all" && symbol.scopeId !== scopeId) return false;
      if (!normalized) return true;
      return [
        symbol.name,
        symbol.kind,
        displayType(symbol.type),
        scopeNameById.get(symbol.scopeId) ?? "",
        symbol.parentClass ?? ""
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [kind, query, scopeId, symbols, scopeNameById]);

  if (result.semantic.status !== "completed") {
    return <div className="panel-empty"><Database size={24} /><p>La tabla de símbolos se genera durante el análisis semántico.</p></div>;
  }

  if (symbols.length === 0) {
    return <div className="panel-empty"><Database size={24} /><p>No se registraron símbolos.</p></div>;
  }

  return (
    <div className="symbol-table-panel">
      <div className="semantic-toolbar">
        <span className="semantic-count"><Database size={14} /> {filtered.length}/{symbols.length} símbolos</span>
        <div className="symbol-filter-controls">
          <label className="semantic-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, tipo o ámbito"
              aria-label="Buscar en la tabla de símbolos"
            />
          </label>
          <label className="compact-filter-label">
            <Filter size={13} aria-hidden="true" />
            <select className="semantic-select" value={kind} onChange={(event) => setKind(event.target.value as KindFilter)}>
              <option value="all">Todos los símbolos</option>
              {kinds.map((item) => <option key={item} value={item}>{kindLabel(item)}</option>)}
            </select>
          </label>
          <select className="semantic-select" value={scopeId} onChange={(event) => setScopeId(event.target.value)} aria-label="Filtrar por ámbito">
            <option value="all">Todos los ámbitos</option>
            {scopes.map((scope) => (
              <option key={scope.id} value={scope.id}>{scope.name} · {scope.kind}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-scroll semantic-table-scroll">
        <table className="data-table semantic-symbol-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Clase</th>
              <th>Tipo</th>
              <th>Ámbito</th>
              <th>Estado</th>
              <th>Refs.</th>
              <th>Declaración</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((symbol) => (
              <tr key={symbol.id}>
                <td><code className="symbol-name">{symbol.name}</code></td>
                <td><span className={`symbol-kind symbol-kind-${symbol.kind}`}>{kindLabel(symbol.kind)}</span></td>
                <td><code className="symbol-type">{displayType(symbol.type)}</code></td>
                <td><span className="scope-chip" title={symbol.scopeId}>{scopeNameById.get(symbol.scopeId) ?? symbol.scopeId}</span></td>
                <td>
                  <div className="symbol-flags">
                    <span className={symbol.mutable ? "flag flag-muted" : "flag flag-const"}>{symbol.mutable ? "mutable" : "const"}</span>
                    <span className={symbol.initialized ? "flag flag-ok" : "flag flag-warning"}>{symbol.initialized ? "inicializado" : "sin inicializar"}</span>
                    {symbol.captured && <span className="flag flag-captured">closure</span>}
                  </div>
                </td>
                <td className="td-num">{symbol.references.length}</td>
                <td className="td-num">L{symbol.declaration.line}:C{symbol.declaration.column}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="semantic-filter-empty">No hay símbolos que coincidan con los filtros.</p>}
    </div>
  );
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    variable: "variable",
    constant: "constante",
    parameter: "parámetro",
    function: "función",
    class: "clase",
    field: "campo",
    method: "método",
    catch: "catch"
  };
  return labels[kind] ?? kind;
}
