<div align="center">

# Compiscript Semantic IDE

### Proyecto 1 · Análisis léxico, sintáctico y semántico con ANTLR 4

![Compiscript](https://img.shields.io/badge/Compiscript-.cps-A78BFA?style=for-the-badge)
![ANTLR](https://img.shields.io/badge/ANTLR-4-EF7B4D?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white)

Evolución del **Laboratorio 1** hacia un IDE para la fase de **análisis semántico de Compiscript**. El proyecto conserva el lexer/parser generado por ANTLR y añade sistema de tipos, ámbitos, tabla de símbolos, funciones, clases, closures, flujo de control, arreglos, diagnósticos y visualización del árbol semántico.

</div>

---

## Información académica

| Campo | Información |
| --- | --- |
| Universidad | Universidad del Valle de Guatemala |
| Carrera | Ingeniería en Ciencias de la Computación |
| Curso | Construcción de Compiladores — CC-3032 |
| Sección | 10 |
| Catedrático | Ing. Carlos Valdéz |
| Entrega | Proyecto 1 — Fase de análisis semántico |
| Grupo | DragonsSlayers 2.0 |

### Integrantes

| Estudiante | Carné |
| --- | ---: |
| Pablo Daniel Barillas Moreno | 22193 |
| Hugo Daniel Barillas Ajín | 23556 |
| Ernesto Ascencio | 23009 |

---

## Qué implementa

### Pipeline del compilador

```text
archivo .cps
   ↓
Lexer ANTLR
   ↓
CommonTokenStream
   ↓
Parser ANTLR / CST
   ↓
Prepasada de declaraciones
   ↓
Analizador semántico
   ├── sistema de tipos
   ├── resolución de nombres y ámbitos
   ├── funciones / recursión / closures
   ├── control de flujo
   ├── clases / herencia / this / new
   ├── arreglos e índices
   ├── código inalcanzable
   └── tabla de símbolos
   ↓
Diagnósticos + símbolos + ámbitos + árbol semántico
```

La fase semántica se omite deliberadamente si existen errores léxicos o sintácticos, evitando cascadas de diagnósticos sobre un CST recuperado o incompleto.

### IDE

La interfaz incluye:

- editor para archivos `.cps`;
- casos válidos, léxicos, sintácticos y semánticos;
- modo lexer independiente;
- vista del parser y árbol de parseo;
- diagnósticos semánticos con códigos `SEM001`–`SEM021`;
- tabla de símbolos filtrable;
- árbol de ámbitos;
- métricas de símbolos, referencias y closures;
- árbol semántico anotado con tipos;
- exportaciones TXT, CSV y JSON;
- documentación técnica embebida.

---

## Reglas semánticas cubiertas

### Tipos

- operaciones numéricas con `integer` y `float`;
- concatenación `string + string`;
- operadores lógicos para `boolean`;
- comparaciones compatibles;
- asignaciones e inicializadores;
- promoción `integer -> float`;
- constantes no reasignables;
- arreglos homogéneos.

### Ámbitos y nombres

- ámbito global y ámbitos anidados;
- entornos de función, clase, bloque, ciclo, `switch` y `catch`;
- identificadores no declarados;
- redeclaración en el mismo ámbito;
- referencias y shadowing léxico;
- variables capturadas por closures.

### Funciones

- firmas y parámetros;
- cantidad y tipo posicional de argumentos;
- retorno compatible;
- recursión;
- funciones anidadas;
- referencias adelantadas mediante hoisting local de funciones/clases.

### Flujo

- condiciones booleanas en `if`, `while`, `do-while` y `for`;
- `break` dentro de ciclos o `switch`;
- `continue` dentro de ciclos;
- `return` solo dentro de funciones;
- detección de código inalcanzable.

### Clases y arreglos

- campos y métodos;
- constructores;
- herencia;
- `this`;
- acceso a miembros existentes;
- campos `const`;
- índice `integer`;
- acceso únicamente sobre arreglos;
- tipo del iterador de `foreach`.

---

## Códigos de diagnóstico

| Código | Regla |
| --- | --- |
| SEM001 | Identificador no declarado |
| SEM002 | Redeclaración en el mismo ámbito |
| SEM003 | Asignación/inicialización incompatible |
| SEM004 | Operador aplicado a tipos inválidos |
| SEM005 | Condición no booleana |
| SEM006 | Cantidad de argumentos incorrecta |
| SEM007 | Argumento incompatible |
| SEM008 | Retorno incompatible |
| SEM009 | `return` fuera de función |
| SEM010 | `break` fuera de bucle/switch |
| SEM011 | `continue` fuera de bucle |
| SEM012 | Miembro inexistente |
| SEM013 | Uso inválido de `this` |
| SEM014 | Clase/constructor/invocación inválida |
| SEM015 | Índice no entero |
| SEM016 | Valor no indexable |
| SEM017 | Arreglo heterogéneo |
| SEM018 | Código inalcanzable |
| SEM019 | Parámetro duplicado |
| SEM020 | Herencia inválida/circular |
| SEM021 | `switch` incompatible |

---

## Estructura relevante

```text
src/
├── grammars/
│   └── Compiscript.g4
├── generated/                 # lexer/parser generados por ANTLR
├── lib/
│   ├── analyze.ts             # orquestador del pipeline
│   ├── antlrErrors.ts
│   ├── downloads.ts
│   ├── examples.ts
│   └── types.ts
├── semantic/
│   ├── ast.ts
│   ├── declarationVisitor.ts
│   ├── diagnostics.ts
│   ├── flowAnalysis.ts
│   ├── scopes.ts
│   ├── semanticTypes.ts
│   ├── semanticVisitor.ts
│   ├── symbols.ts
│   └── typeSystem.ts
├── ui/
│   ├── App.tsx
│   └── components/
└── __tests__/
    └── semantic/
        └── semanticAnalyzer.test.ts

examples/
└── semantic/
    ├── valid_complete.cps
    └── semantic_errors.cps

docs/
├── ARQUITECTURA_PROYECTO_1.md
└── DECISIONES_SEMANTICAS.md
```

---

## Instalación y ejecución

### Requisitos de desarrollo

- Node.js 20 o superior recomendado;
- npm;
- Java disponible si se regenerará la gramática con ANTLR.

```bash
npm install
npm run generate
npm run check
npm test
npm run dev
```

La interfaz se levanta por defecto en el puerto configurado por Vite (`3000` en el script del proyecto).

### Build web

```bash
npm run build
npm run preview
```

### Electron

```bash
npm run desktop
```

Para generar artefactos Windows:

```bash
npm run exe:portable
npm run exe:installer
```

---

## CLI

El modo por defecto de la CLI es `semantic`.

```bash
npm run cli -- examples/semantic/valid_complete.cps
npm run cli -- examples/semantic/semantic_errors.cps --mode semantic
npm run cli -- examples/compiscript/valid.cps --mode parser
npm run cli -- examples/compiscript/valid.cps --mode lexer
```

Atajos:

```bash
npm run cli:semantic-valid
npm run cli:semantic-errors
```

La CLI muestra diagnósticos por fase y, en modo semántico, un resumen de la tabla de símbolos.

---

## Pruebas

```bash
npm test
```

La batería `src/__tests__/semantic/semanticAnalyzer.test.ts` incluye:

1. programas semánticamente válidos;
2. cobertura de los códigos `SEM001` a `SEM021`;
3. pruebas de tabla de símbolos y ámbitos;
4. regresiones de campos/métodos de clase;
5. validación de inicializadores de `for` y campos;
6. condición de `for` con expresión única;
7. reasignación de campos `const`;
8. determinismo de IDs de diagnóstico.

---

## Decisiones importantes

Existen dos diferencias relevantes entre las fuentes del enunciado:

1. los requisitos semánticos mencionan `float`, aunque la gramática base no lo incluía; el proyecto lo incorpora explícitamente;
2. los requisitos agrupan `switch` entre las estructuras con “condición booleana”, mientras los ejemplos del lenguaje utilizan discriminantes escalares como enteros; el proyecto conserva el comportamiento mostrado por Compiscript y valida compatibilidad de los `case`.

La explicación completa está en [`docs/DECISIONES_SEMANTICAS.md`](docs/DECISIONES_SEMANTICAS.md).

---

## Documentación

- [`docs/ARQUITECTURA_PROYECTO_1.md`](docs/ARQUITECTURA_PROYECTO_1.md): arquitectura y responsabilidades.
- [`docs/DECISIONES_SEMANTICAS.md`](docs/DECISIONES_SEMANTICAS.md): políticas semánticas y diferencias entre fuentes.
- `examples/semantic/`: programas preparados para demostrar éxito y fallos de la fase semántica.

---

## Nota sobre código generado

Los archivos de `src/generated/` provienen de ANTLR. Si se modifica `src/grammars/Compiscript.g4`, deben regenerarse con:

```bash
npm run generate
```

No deben editarse manualmente.
