# Pruebas de distribución y recuperación de errores

Esta carpeta contiene entradas diseñadas para comprobar que el analizador continúa
después de errores independientes y que controla diagnósticos secundarios o en
cascada.

## Archivos

- `lexer_errors.cps`: contiene exclusivamente símbolos no reconocidos. Incluye el
  fragmento contiguo `###` para comprobar que se agrupa en un solo diagnóstico.
- `parser_errors.cps`: contiene únicamente errores de estructura, principalmente
  delimitadores faltantes. No debe producir errores léxicos.
- `lexer_parser_alternating_errors.cps`: intercala un error léxico y uno sintáctico
  en secciones consecutivas para comprobar que ambas fases continúan hasta la
  sentencia final.

## Ejecución

Desde la raíz del proyecto:

```bash
npx tsx src/cli/run.ts examples/error_distribution/lexer_errors.cps
npx tsx src/cli/run.ts examples/error_distribution/parser_errors.cps
npx tsx src/cli/run.ts examples/error_distribution/lexer_parser_alternating_errors.cps
```

Los tres comandos deben terminar con código de salida `1`, porque las entradas son
intencionalmente incorrectas. Esto representa un rechazo esperado y no un fallo
inesperado del programa.

## Resultados verificados

| Archivo | Tokens | Errores léxicos | Errores sintácticos | Total |
| --- | ---: | ---: | ---: | ---: |
| `lexer_errors.cps` | 39 | 3 | 0 | 3 |
| `parser_errors.cps` | 64 | 0 | 7 | 7 |
| `lexer_parser_alternating_errors.cps` | 72 | 4 | 4 | 8 |

Estos conteos corresponden a la versión actual de la gramática. El fragmento `###`
se reporta como un único error léxico y los cuatro errores sintácticos del caso mixto
corresponden a omisiones deliberadas, no a repeticiones inmediatas de los símbolos
inválidos.

## Qué observar

1. Los diagnósticos incluyen fase, línea, columna, símbolo y mensaje en español.
2. El lexer conserva tokens ubicados después de los símbolos inválidos.
3. El parser reporta más de un error mediante recuperación.
4. Los errores léxicos inmediatos no deberían aparecer otra vez como errores
   sintácticos derivados en la misma posición.
5. El caso alternado debe reportar errores de ambas fases y alcanzar `print(e);`.
