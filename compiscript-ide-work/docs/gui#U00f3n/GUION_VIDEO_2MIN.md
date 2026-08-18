# Guion de video — versión de 2 minutos

Analizador de Compiscript — DragonsSlayers 2.0 (Hugo Barillas, Ernesto Ascencio)

Condensado del guion oficial de 9:40 (`GUION_VIDEO_LABORATORIO_01.tex`). Mantiene
lo exigible por la rúbrica: teoría breve, ANTLR, los cuatro casos de complejidad
baja y media (0/0, 3/0, 0/3, 2/2), ubicación línea/columna, mensajes en español,
tokens/árbol, pruebas automatizadas y el alcance sin ejecución/semántica.

Duración objetivo: **2:00**. Ritmo rápido, sin pausas largas entre escenas.

## Distribución del tiempo

| Tiempo | Escena | Responsable |
| --- | --- | --- |
| 00:00–00:10 | Presentación | Hugo |
| 00:10–00:25 | Teoría y ANTLR | Ernesto |
| 00:25–00:35 | Interfaz y carga de archivos `.cps` | Hugo |
| 00:35–00:55 | Complejidad baja: 4 casos | Hugo |
| 00:55–01:15 | Complejidad media: 4 casos | Ernesto |
| 01:15–01:35 | Diagnósticos, tokens y árbol | Ernesto |
| 01:35–01:50 | Pruebas automatizadas y CLI | Hugo |
| 01:50–02:00 | Alcance y cierre | Hugo y Ernesto |

Antes de grabar: tener `npm run dev` corriendo en `http://localhost:3000`, la
pestaña **Análisis completo** activa, y una terminal aparte lista con
`npm test` y `npm run cli -- <archivo>` sin ejecutar todavía. Tener los ocho
archivos de `examples/rubric/{low,medium}` visibles en el explorador para
arrastrarlos o abrirlos rápido con el selector **Cargar .cps**.

## Guion por escenas

**Escena 1 — Presentación (00:00–00:10) — Hugo**

En pantalla, paso a paso:
1. Cara al frente o cámara sobre la portada (nombre del laboratorio, "ANTLR 4" y "TypeScript" visibles).
2. Al segundo 8, cortar a la app ya cargada en `localhost:3000` mostrando el encabezado **Analizador de Compiscript** y el badge **Archivos .cps**.

> "Hola, somos Hugo y Ernesto, grupo DragonsSlayers 2.0. Este es nuestro analizador léxico y sintáctico de Compiscript, construido con ANTLR 4 y TypeScript."

**Escena 2 — Teoría y ANTLR (00:10–00:25) — Ernesto**

En pantalla, paso a paso:
1. Abrir el editor de código y mostrar `src/grammars/Compiscript.g4` (hacer scroll breve por las reglas del parser, sin detenerse a leer).
2. Cambiar a la carpeta `src/generated/` y señalar con el cursor `CompiscriptLexer.ts` y `CompiscriptParser.ts` (no abrirlos, solo mostrar que existen y son generados).
3. Volver a la pestaña del navegador.

> "El lexer convierte el código en tokens; el parser valida la gramática y construye el árbol de parseo. ANTLR genera ambos automáticamente a partir de nuestra gramática, compartida entre la web, la consola y Electron."

**Escena 3 — Interfaz y carga de archivos (00:25–00:35) — Hugo**

En pantalla, paso a paso:
1. En la pestaña **Análisis completo**, señalar con el cursor el panel **Configuración del análisis** y el selector **Caso de análisis**.
2. Hacer clic en **Cargar .cps** y elegir `examples/rubric/low/valid.cps` desde el explorador de archivos del sistema operativo (debe verse el diálogo nativo de selección abrirse y cerrarse).
3. Confirmar que el encabezado del editor cambia a "Archivo Compiscript — valid.cps".

> "Desde la interfaz cargamos cualquier archivo punto cps, o lo escribimos directamente, y lo analizamos con un clic."

**Escena 4 — Complejidad baja (00:35–00:55) — Hugo**

En pantalla, paso a paso (repetir carga→clic→resultado cuatro veces, ~5s cada una):
1. Con `low/valid.cps` ya cargado, clic en **Analizar con ANTLR**; señalar el resumen "0 léxicos / 0 sintácticos" en el panel de resultados.
2. **Cargar .cps** → `low/lexer_errors.cps` → **Analizar con ANTLR**; señalar el panel **Errores léxicos** con el conteo "3".
3. **Cargar .cps** → `low/parser_errors.cps` → **Analizar con ANTLR**; señalar el conteo "0 léxicos / 3 sintácticos".
4. **Cargar .cps** → `low/lexer_parser_errors.cps` → **Analizar con ANTLR**; señalar el conteo "2 léxicos / 2 sintácticos".

> "Con complejidad baja probamos cuatro casos: uno válido, aceptado sin errores; uno con tres errores léxicos; uno con tres errores sintácticos; y uno con dos de cada tipo. El análisis siempre continúa hasta el final del archivo."

**Escena 5 — Complejidad media (00:55–01:15) — Ernesto**

En pantalla, paso a paso:
1. **Cargar .cps** → `medium/valid.cps` → **Analizar con ANTLR**. En el editor, resaltar con el cursor (sin hablar de cada línea) el arreglo `notas`, las clases `Estudiante` y `Profesor`, las instancias `new Estudiante(...)` / `new Profesor(...)`, y las llamadas `sumar(...)` / `mostrarCurso(...)`.
2. Repetir la misma secuencia de la escena 4 con los otros tres archivos de `medium/`: `lexer_errors.cps` (3/0), `parser_errors.cps` (0/3), `lexer_parser_errors.cps` (2/2), señalando cada conteo en el panel de resultados.

> "Complejidad media agrega arreglos, dos clases, sus instancias y funciones. Repetimos la misma matriz: válido, solo léxico, solo sintáctico y mixto, siempre con la ubicación exacta de cada error."

**Escena 6 — Diagnósticos, tokens y árbol (01:15–01:35) — Ernesto**

En pantalla, paso a paso:
1. Con `medium/lexer_parser_errors.cps` aún analizado, en el panel **Errores léxicos y sintácticos** hacer clic/hover sobre un error y hacer zoom (digital o acercar cámara) a una fila completa para que se lean fase, línea, columna, símbolo y mensaje.
2. Clic en la pestaña/sección **Tokens** o **Tokens identificados**; recorrer 2–3 segundos las columnas Tipo de token, Texto, Línea, Col y Canal.
3. Clic en **Árbol de parseo**; mostrar el árbol expandido brevemente (no navegar nodo por nodo).

> "Cada error indica fase, línea, columna, símbolo y una explicación en español, sin mensajes internos de ANTLR. También mostramos la tabla de tokens y el árbol de parseo completo."

**Escena 7 — Pruebas y CLI (01:35–01:50) — Hugo**

En pantalla, paso a paso:
1. Cortar a la terminal. Ejecutar `npm test` y dejar correr hasta ver "3 archivos aprobados" y "24 pruebas aprobadas" en pantalla completa de terminal.
2. Ejecutar `npm run cli -- examples/rubric/medium/lexer_parser_errors.cps` y dejar ver la salida coloreada con los errores y el resumen final en consola.

> "Todo esto está probado: veinticuatro pruebas automatizadas y una CLI que reutiliza el mismo motor de análisis."

**Escena 8 — Alcance y cierre (01:50–02:00) — Hugo y Ernesto**

En pantalla, paso a paso:
1. Volver al navegador o a la portada final con el texto "Análisis léxico y sintáctico — sin ejecución ni semántica" visible en pantalla.
2. Cámara al frente para el cierre de ambos.

> Hugo: "El alcance es estrictamente léxico y sintáctico, sin ejecutar Compiscript."
> Ernesto: "Gracias por ver nuestro proyecto."

## Checklist rápido

- [ ] Duración ensayada ≤ 2:00.
- [ ] Se muestran los ocho archivos de `examples/rubric` (baja y media).
- [ ] Se ven los conteos 0/0, 3/0, 0/3 y 2/2 en ambos niveles.
- [ ] Se muestra línea, columna, fase, símbolo y mensaje en español.
- [ ] Se ejecuta `npm test`: 3 archivos y 24 pruebas aprobadas.
- [ ] Se menciona el alcance sin semántica ni ejecución de Compiscript.
