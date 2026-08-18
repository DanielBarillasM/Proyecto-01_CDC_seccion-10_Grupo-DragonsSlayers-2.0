// Caso 1: únicamente errores léxicos.
// El parser puede continuar porque cada símbolo inválido está dentro de
// una sentencia que, al descartar el fragmento, todavía puede recuperarse.

let primero: integer = 10 @ 2;
print(primero);

let segundo: integer = 20 ### 4;
print(segundo);

let tercero: integer = 30 $ 6;
print(tercero);

