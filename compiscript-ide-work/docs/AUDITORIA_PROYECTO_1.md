# Auditoría del Proyecto 1 — Compiscript Semantic IDE

Este documento resume la revisión aplicada sobre la versión recibida de V0 (`compiscript-ide.zip`). La prioridad fue conservar la arquitectura real React + Vite + TypeScript + Electron, recuperar requisitos académicos que habían regresado y mejorar la UI únicamente sobre datos producidos por el compilador.

## Resumen ejecutivo

La entrega de V0 contenía dos líneas de trabajo mezcladas: la aplicación real en `src/` seguía usando Vite, pero aparecieron también `app/`, `components/` y `lib/` con restos de una generación tipo Next.js que no participaban en el build. A la vez, varias correcciones semánticas previamente necesarias habían sido sustituidas por versiones más simples. Se eliminó el código muerto de V0 y se restauró/corrigió el pipeline semántico sin reemplazar lexer, parser, Electron, CLI ni ANTLR.

## Hallazgos y correcciones

| Severidad | Área | Problema observado | Corrección aplicada | Evidencia/regresión |
|---|---|---|---|---|
| Crítica | Arquitectura | Existían carpetas `app/`, `components/` y `lib/` tipo Next.js aunque `package.json` ejecuta Vite y no contiene Next.js. | Se retiraron esos artefactos muertos y se mantiene una sola arquitectura: `src/` + Vite + Electron. | Revisión de estructura y scripts de `package.json`. |
| Crítica | ANTLR | La versión recibida describía el recorrido semántico como manual y había perdido el despacho Visitor real. | `SemanticAnalyzer` vuelve a extender `AbstractParseTreeVisitor`, implementar `CompiscriptVisitor` y entrar mediante `accept(visitor)` para programa/instrucciones. | Pruebas semánticas y revisión estática de `semanticVisitor.ts`. |
| Alta | Ámbitos | Se había perdido el hoisting local de funciones/clases dentro de bloques/funciones. | Se realiza predeclaración por ámbito antes de analizar cuerpos. | Casos de recursión, llamadas adelantadas y funciones anidadas. |
| Alta | Tabla de símbolos | Campos y métodos de clase no quedaban representados correctamente como símbolos del ámbito de clase. | Se registran `field` y `method` con tipo, mutabilidad, declaración y firma. | Tests de tabla de símbolos y vista `SymbolTablePanel`. |
| Alta | Clases | Inicializadores de campos tipados podían no validarse por una condición imposible/incompleta. | Se valida asignabilidad de cada inicializador y se infiere el tipo cuando no existe anotación. | Regresión de inicializador incompatible. |
| Alta | Clases | Se había debilitado la detección de colisiones campo/método y reasignación de campos `const`. | Se validan miembros contra ambos mapas y se propaga metadata de asignabilidad en accesos por `.`. | Tests de colisión y asignación a campo constante. |
| Alta | `for` | El caso de una sola expresión opcional no distinguía condición de actualización y podía omitir la validación booleana. | Se utiliza la posición respecto al segundo `;` del encabezado para distinguir ambas formas. | Tests de condición única y `for (; ; update)`. |
| Alta | `for` | El inicializador con anotación explícita no siempre verificaba compatibilidad. | Se aplica la misma regla `isAssignable` usada por las declaraciones ordinarias. | Test de inicialización incompatible en `for`. |
| Media | Asignaciones | La gramática permite `leftHandSide = ...`; por ello `new A() = ...` podía llegar a semántica y no quedar rechazado al no ser llamada por sufijo ni símbolo. | El resultado directo de `new` se marca explícitamente como destino no asignable (`SEM003`), manteniendo válidos `new A().campo = ...` si el campo lo permite. | Nueva regresión de destino de asignación. |
| Media | Diagnósticos | IDs internos podían variar entre ejecuciones y podían aparecer diagnósticos idénticos duplicados. | Se reinician contadores por análisis y se deduplican diagnósticos equivalentes. | Test de IDs deterministas. |
| Media | Variables | Uso antes de inicialización se confundía conceptualmente con identificador inexistente en iteraciones previas. | Se conserva `SEM023` como warning específico; `SEM001` queda únicamente para nombre no declarado. | Test dedicado `SEM023`. |
| Media | Variables | La primera asignación `x = valor` a una variable declarada sin inicializador podía disparar falsamente `SEM023` al resolver el lado izquierdo. | El lookup del identificador suprime el warning solo cuando es el destino directo de la asignación; lecturas reales siguen reportándolo. | Regresión `let x; x = 10; print(x);`. |
| Media | Tipos / `null` | La comparación de igualdad con `null` era demasiado permisiva y podía aceptar primitivos. | `null` solo es comparable con `null`, arreglos o instancias; no con `integer`, `float`, `boolean` o `string`. | Nuevo test de comparación `null`. |
| Media | Constructores | Una clase sin constructor explícito no rechazaba argumentos extra. | Se modela constructor implícito de aridad cero; `new A(1)` genera `SEM006`. | Nuevo test de constructor implícito. |
| Media | UI/UX | La interfaz no comunicaba de forma suficientemente directa las fases del compilador y el editor carecía de ayudas básicas de IDE. | Se agrega pipeline visible, gutter, posición de cursor, `Ctrl/Cmd + Enter`, filtros de diagnósticos y filtros avanzados de símbolos. | Componentes UI conectados al `AnalyzeResult` real. |
| Media | Documentación | El README recibido volvió a describir esencialmente el Laboratorio 1 y faltaban documentos del Proyecto 1. | README y documentación de arquitectura/decisiones vuelven a reflejar el compilador semántico actual. | `README.md`, `ARQUITECTURA_PROYECTO_1.md`, `DECISIONES_SEMANTICAS.md`. |

## Decisiones teóricas conservadas

### `float`

Se mantiene como extensión explícita porque el requisito semántico lo menciona aunque la gramática base no lo incluya. La gramática activa contiene `FLOAT_TYPE` y `FloatLiteral`, y permite promoción segura `integer -> float`.

### `switch`

Se mantiene el discriminante escalar (`integer`, `float`, `string`, `boolean`) porque el ejemplo oficial usa `switch (x)` con `case 1`, en vez de forzarlo a boolean por una frase ambigua del enunciado.

### `break`

Se acepta dentro de bucles y `switch`; `continue` solo dentro de bucles. Esta decisión es coherente con el comportamiento de lenguajes de la familia TypeScript/C y está documentada.

### Fases y cascadas

Si existen errores léxicos o sintácticos, la semántica queda `skipped`. No se recorren contextos recuperados por ANTLR para fabricar errores semánticos derivados.

## Estado de las pruebas

- 62 pruebas semánticas definidas en `src/__tests__/semantic/semanticAnalyzer.test.ts`.
- 73 declaraciones de prueba en total bajo `src/__tests__`.
- Se añadieron regresiones para `SEM023`, `for` con actualización única, constructor implícito y comparabilidad de `null`.
- La sintaxis de los 44 archivos `.ts/.tsx` fue revisada mediante la API de TypeScript (`transpileModule`) sin diagnósticos sintácticos.
- En este entorno no se debe afirmar que Vitest/build pasaron hasta que `npm install` pueda completar las dependencias. Ejecutar localmente la secuencia indicada en el README.

## Archivos generados de ANTLR

No se editaron manualmente para corregir la semántica. Se verificó que los generados presentes contienen las reglas activas `FloatLiteral`, `FLOAT_TYPE` y `forInitializer`, coherentes con `src/grammars/Compiscript.g4`.
