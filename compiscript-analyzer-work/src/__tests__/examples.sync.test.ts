import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exampleCase } from "../lib/examples";

const cases = [
  ["valid.cps", "validInput"],
  ["lexical_errors.cps", "lexicalErrorInput"],
  ["syntax_errors.cps", "syntaxErrorInput"]
] as const;

describe("ejemplos de la interfaz y archivos .cps", () => {
  it.each(cases)("mantiene sincronizado %s", (filename, property) => {
    const path = fileURLToPath(
      new URL(`../../examples/compiscript/${filename}`, import.meta.url)
    );
    expect(exampleCase[property]).toBe(readFileSync(path, "utf8").trimEnd());
  });
});
