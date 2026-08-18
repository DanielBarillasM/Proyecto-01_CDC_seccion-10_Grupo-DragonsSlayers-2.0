import { Download, Hash } from "lucide-react";
import { downloadText, tokensToCsv } from "../../lib/downloads";
import type { AnalyzeResult } from "../../lib/types";

interface TokenTableProps {
  result: AnalyzeResult;
}

export function TokenTable({ result }: TokenTableProps) {
  const { tokens } = result;

  function handleDownloadCsv() {
    downloadText("tokens_compiscript.csv", tokensToCsv(tokens), "text/csv;charset=utf-8");
  }

  function handleDownloadJson() {
    downloadText("tokens_compiscript.json", JSON.stringify(tokens, null, 2), "application/json");
  }

  if (tokens.length === 0) {
    return (
      <div className="panel-empty">
        <Hash size={24} />
        <p>No se reconocieron tokens. Verifica que la entrada no esté vacía.</p>
      </div>
    );
  }

  return (
    <div className="token-table-wrapper">
      <div className="token-table-header">
        <span className="token-count">
          <Hash size={14} />
          {tokens.length} tokens reconocidos
        </span>
        <div className="token-actions">
          <button className="btn-icon" onClick={handleDownloadCsv} title="Descargar CSV">
            <Download size={13} />
            CSV
          </button>
          <button className="btn-icon" onClick={handleDownloadJson} title="Descargar JSON">
            <Download size={13} />
            JSON
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Tipo de token</th>
              <th>Texto</th>
              <th>Línea</th>
              <th>Col</th>
              <th>Canal</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={`${token.index}-${token.line}-${token.column}`}>
                <td className="td-index">{token.index}</td>
                <td>
                  <code className="token-type">{token.type}</code>
                </td>
                <td>
                  <code className="token-type">{token.typeName}</code>
                </td>
                <td>
                  <span className="token-lexeme">{JSON.stringify(token.text)}</span>
                </td>
                <td className="td-num">{token.line}</td>
                <td className="td-num">{token.column}</td>
                <td className="td-num">{token.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="token-theory">
        <strong>Análisis léxico de Compiscript:</strong>
        <span>
          {" "}El lexer generado por ANTLR transforma el archivo .cps en esta secuencia de tokens.
        </span>
      </div>
    </div>
  );
}
