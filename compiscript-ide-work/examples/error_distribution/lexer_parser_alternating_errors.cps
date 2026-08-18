// Caso 3: errores léxicos y sintácticos alternados.
// Las líneas LEX contienen símbolos inválidos.
// Las líneas SYN omiten deliberadamente un delimitador.

// LEX 1: '@' no pertenece al lenguaje.
let a: integer = 1 @ 2;

// SYN 1: falta ';'.
let b: integer = 3

// LEX 2: '#' no pertenece al lenguaje.
let c: integer = 4 # 5;

// SYN 2: falta ';'.
print(c)

// LEX 3: '$' no pertenece al lenguaje.
let d: integer = 6 $ 7;

// SYN 3: falta ')' antes de la llave.
if (d > 0 {
  print(d);
}

// LEX 4: un '&' aislado no forma el operador '&&'.
let e: integer = 8 & 9;

// SYN 4: falta ';' en la asignación.
while (e < 10) {
  e = e + 1
}

// El análisis debe alcanzar esta sentencia final.
print(e);

