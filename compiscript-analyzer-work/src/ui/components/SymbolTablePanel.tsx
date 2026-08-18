import { Database, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { displayType } from "../../semantic/semanticTypes";
import type { AnalyzeResult } from "../../lib/types";

interface SymbolTablePanelProps {
  result: AnalyzeResult;
}

export function SymbolTablePanel({ result }: SymbolTablePanelProps) {
  const [query, setQuery] = useState("");
  const symbols = result.semantic.symbols;
  const scopeNameById = useMemo(
    () => new Map(result.semantic.scopes.map((scope) => [scope.id, scope.name])),
    [result.semantic.scopes]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return symbols;
    return symbols.filter((symbol) =>
      [symbol.name, symbol.kind, displayType(symbol.type), scopeNameById.get(symbol.scopeId) ?? ""]
        .some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query, symbols, scopeNameById]);

  if (result.semantic.status !== "completed") {
    return <div className="panel-empty"><Database size={24} /><p>La tabla de símbolos se genera durante el análisis semántico.</p></div>;
  }

  if (symbols.length === 0) {
    return <div className="panel-empty"><Database size={24} /><p>No se registraron símbolos.</p></div>;
  }

  return (
    <div className="symbol-table-panel">
      <div className="semantic-toolbar">
        <span className="semantic-count"><Database size={14} /> {symbols.length} símbolos</span>
        <label className="semantic-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nombre, tipo o ámbito"
          />
        </label>
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
                <td>
                  <span className="scope-chip" title={symbol.scopeId}>
                    {scopeNameById.get(symbol.scopeId) ?? symbol.scopeId}
                  </span>
                </td>
                <td>
                  <div className="symbol-flags">
                    <span className={symbol.mutable ? "flag flag-muted" : "flag flag-const"}>
                      {symbol.mutable ? "mutable" : "const"}
                    </span>
                    <span className={symbol.initialized ? "flag flag-ok" : "flag flag-warning"}>
                      {symbol.initialized ? "inicializado" : "sin inicializar"}
                    </span>
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
      {filtered.length === 0 && <p className="semantic-filter-empty">No hay símbolos que coincidan con el filtro.</p>}
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
