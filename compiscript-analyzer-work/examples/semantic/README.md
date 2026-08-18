# Casos de prueba semánticos

- `valid_complete.cps`: programa léxica, sintáctica y semánticamente válido. Incluye funciones, recursión, closure, clases, herencia, `this`, arreglos, `foreach`, `for`, `switch`, `try/catch` y promoción `integer -> float`.
- `semantic_errors.cps`: conserva sintaxis válida, pero provoca deliberadamente diagnósticos de tipos, nombres, llamadas, retorno, código inalcanzable, miembros, arreglos y control de flujo.

Ejecutar desde la raíz:

```bash
npm run cli:semantic-valid
npm run cli:semantic-errors
```
