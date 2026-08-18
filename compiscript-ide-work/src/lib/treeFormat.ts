import { ParserRuleContext } from "antlr4ts";
import type { ParseTree } from "antlr4ts/tree/ParseTree";
import type { TreeNode } from "./types";

/**
 * prettyPrintLispTree
 *
 * Convierte el árbol en formato Lisp de ANTLR (toStringTree)
 * en texto indentado legible, estilo:
 *
 *   program
 *     statement
 *       MOVE  move
 *       NUM   10
 *       SEMI  ;
 */
export function formatLispTree(tree: string): string {
  if (!tree.trim()) return "— (árbol vacío)";

  const tokens = tree
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let indent = 0;
  const lines: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (token === "(") {
      if (current.trim()) {
        lines.push("  ".repeat(indent) + current.trim());
      }
      current = "";
      indent += 1;
    } else if (token === ")") {
      if (current.trim()) {
        lines.push("  ".repeat(indent) + current.trim());
        current = "";
      }
      indent = Math.max(0, indent - 1);
    } else {
      current += current ? ` ${token}` : token;
    }
  }

  if (current.trim()) lines.push("  ".repeat(indent) + current.trim());
  return lines.join("\n") || "— (árbol vacío)";
}

/** Nombre anterior conservado para integraciones externas. */
export const prettyPrintLispTree = formatLispTree;

/**
 * parseLispTreeToNodes
 *
 * Convierte el árbol Lisp de ANTLR en una estructura TreeNode[]
 * que puede renderizarse visualmente en la UI.
 */
export function parseLispTreeToNodes(tree: string): TreeNode[] {
  if (!tree.trim()) return [];

  // Tokenizer simple
  const tokens: string[] = [];
  let i = 0;
  while (i < tree.length) {
    if (tree[i] === "(" || tree[i] === ")") {
      tokens.push(tree[i]);
      i++;
    } else if (/\s/.test(tree[i])) {
      i++;
    } else {
      let word = "";
      while (i < tree.length && tree[i] !== "(" && tree[i] !== ")" && !/\s/.test(tree[i])) {
        word += tree[i];
        i++;
      }
      if (word) tokens.push(word);
    }
  }

  // Parser de S-expressions
  function parseNode(pos: number): { node: TreeNode; next: number } {
    if (pos >= tokens.length) {
      return { node: { label: "?", children: [] }, next: pos };
    }

    if (tokens[pos] === "(") {
      // (label child1 child2 ...)
      pos++; // skip (
      const label = tokens[pos] ?? "node";
      pos++;
      const children: TreeNode[] = [];
      while (pos < tokens.length && tokens[pos] !== ")") {
        if (tokens[pos] === "(") {
          const result = parseNode(pos);
          children.push(result.node);
          pos = result.next;
        } else {
          children.push({ label: tokens[pos], children: [] });
          pos++;
        }
      }
      pos++; // skip )
      return { node: { label, children }, next: pos };
    } else {
      const label = tokens[pos];
      return { node: { label, children: [] }, next: pos + 1 };
    }
  }

  const roots: TreeNode[] = [];
  let pos = 0;
  while (pos < tokens.length) {
    const result = parseNode(pos);
    roots.push(result.node);
    pos = result.next;
  }
  return roots;
}

/** Serializa los nodos visuales como texto indentado. */
export function stringifyTreeNodes(nodes: TreeNode[]): string {
  const lines: string[] = [];

  function visit(node: TreeNode, depth: number): void {
    lines.push(`${"  ".repeat(depth)}${node.label}`);
    node.children.forEach((child) => visit(child, depth + 1));
  }

  nodes.forEach((node) => visit(node, 0));
  return lines.join("\n");
}

/**
 * Convierte directamente el ParseTree de ANTLR a nodos visuales.
 * Esta ruta evita ambigüedades del formato Lisp cuando un token literal es "(" o ")".
 */
export function parseAntlrTreeToNodes(tree: ParseTree, ruleNames: string[]): TreeNode[] {
  function visit(node: ParseTree): TreeNode {
    const label = node instanceof ParserRuleContext
      ? (ruleNames[node.ruleIndex] ?? `rule_${node.ruleIndex}`)
      : (node.text || "ε");

    const children: TreeNode[] = [];
    for (let index = 0; index < node.childCount; index += 1) {
      children.push(visit(node.getChild(index)));
    }

    return { label, children };
  }

  return [visit(tree)];
}
