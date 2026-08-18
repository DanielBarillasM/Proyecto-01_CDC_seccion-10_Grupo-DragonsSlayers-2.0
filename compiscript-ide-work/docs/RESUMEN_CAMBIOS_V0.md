# Resumen de cierre del proyecto entregado por V0

## Integración funcional

- Se conectó la fase semántica al flujo principal de la UI.
- Se convirtió el análisis semántico en la vista principal del Proyecto 1.
- Se preservaron los modos del Laboratorio 1: lexer y parser.
- Se implementó un Visitor ANTLR real (`AbstractParseTreeVisitor` + `CompiscriptVisitor`).
- Se reinician IDs de diagnósticos/nodos entre ejecuciones.
- Se eliminan diagnósticos semánticos duplicados idénticos.

## Correcciones semánticas

- registro de campos y métodos en la tabla de símbolos;
- validación de inicializadores de campos;
- validación de inicializadores de `for`;
- validación de la condición cuando el `for` contiene una sola expresión opcional;
- detección de funciones duplicadas aunque exista hoisting;
- hoisting local de funciones y clases;
- validación de reasignación de campos `const`;
- detección de colisión entre campo y método de una clase;
- referencias adelantadas, recursión y closures;
- advertencias de código inalcanzable posteriores a terminadores.

## UI / UX

- pestaña `IDE semántico`;
- diagnósticos semánticos con código, severidad, ubicación y sugerencia;
- editor con números de línea, posición del cursor y atajo `Ctrl/Cmd + Enter`;
- pipeline visual `Lexer → Parser → Semántica`;
- diagnósticos semánticos buscables y filtrables;
- tabla de símbolos filtrable por búsqueda, clase de símbolo y ámbito;
- árbol de ámbitos;
- métricas semánticas;
- árbol semántico anotado;
- caso demostrativo de errores exclusivamente semánticos;
- cabecera, avisos y documentación adaptados al Proyecto 1;
- estilos responsive para las nuevas vistas.

## Herramientas y evidencia

- CLI con `--mode lexer|parser|semantic` y modo semántico por defecto;
- exportación de reporte semántico TXT;
- exportación de tabla de símbolos CSV;
- exportación semántica JSON;
- ejemplos `valid_complete.cps` y `semantic_errors.cps`;
- 62 tests semánticos definidos para casos válidos/fallidos y regresiones (73 pruebas en total en `src/__tests__`);
- documentación de arquitectura, decisiones semánticas y auditoría de la versión de V0;
- se conserva `SEM023` para distinguir uso antes de inicialización de un identificador inexistente (`SEM001`);
- los constructores implícitos sin declaración explícita aceptan cero argumentos y reportan `SEM006` si se invocan con parámetros;
- las comparaciones con `null` solo son compatibles con referencias, arreglos u otro `null`, no con primitivos.

## Verificación en este entorno

Se verificó la sintaxis de todos los archivos TypeScript/TSX y la resolución de importaciones relativas. No se ejecutó `npm test` porque este entorno no pudo descargar todas las dependencias desde npm (`EAI_AGAIN`). La instalación incompleta de `node_modules` fue eliminada antes de empaquetar el proyecto.
