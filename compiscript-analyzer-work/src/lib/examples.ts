import grammarText from "../grammars/Compiscript.g4?raw";

export interface ExampleCase {
  title: string;
  badge: string;
  description: string;
  validInput: string;
  lexicalErrorInput: string;
  syntaxErrorInput: string;
  semanticErrorInput: string;
  lexicalErrorDescription: string;
  syntaxErrorDescription: string;
  semanticErrorDescription: string;
}

export const exampleCase: ExampleCase = {
  title: "Compiscript",
  badge: "CPS",
  description:
    "Subconjunto de TypeScript con variables, funciones, arreglos, clases y estructuras de control.",
  validInput: `const PI: integer = 314;

function factorial(n: integer): integer {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

class Animal {
  let nombre: string;

  function constructor(nombre: string) {
    this.nombre = nombre;
  }
}

class Perro : Animal {
  function hablar(): string {
    return this.nombre + " ladra.";
  }
}

let notas: integer[] = [90, 85, 100];
let perro: Perro = new Perro("Toby");

foreach (nota in notas) {
  if (nota < 60) continue;
  print(nota);
}

try {
  print(perro.nombre);
} catch (err) {
  print("Error: " + err);
}`,
  lexicalErrorInput: `let primero: integer = 10 @ 2;
let segundo: integer = 20 # 4;
print(primero);`,
  syntaxErrorInput: `let nombre: string = "Compiscript"
const total: integer = 10

if (total > 5 {
  print(nombre)
}

while (total < 20) {
  total = total + 1
}`,
  semanticErrorInput: `let total: integer = "texto";
let activo: boolean = true;
let calculo: integer = activo - 1;

if (total) {
  print(total);
}

function sumar(a: integer, b: integer): integer {
  return a + b;
}

sumar(1);
sumar(1, "dos");
print(noExiste);

function retornoIncorrecto(): integer {
  return "texto";
  print("inalcanzable");
}

class Persona {
  let nombre: string;
  const codigo: integer = 1;

  function constructor(nombre: string) {
    this.nombre = nombre;
  }
}

let persona: Persona = new Persona("Ana");
print(persona.edad);
persona.codigo = 2;

let numeros: integer[] = [1, 2, 3];
print(numeros["cero"]);
print(total[0]);
let mezcla = [1, "dos", true];

print(this);
let fantasma = new NoExiste();

break;
continue;
return 1;`,
  lexicalErrorDescription:
    "Contiene los caracteres no reconocidos '@' y '#'; el lexer debe reportar ambos y continuar.",
  syntaxErrorDescription:
    "Contiene varios delimitadores y puntos y coma faltantes; el parser debe recuperarse y reportar más de un error.",
  semanticErrorDescription:
    "Es sintácticamente válido, pero contiene usos no declarados, incompatibilidades de tipos, llamadas inválidas, accesos inexistentes, control de flujo incorrecto y otras reglas semánticas que deben diagnosticarse."
};

export const grammarSource = grammarText;

export const grammarDescription =
  "Gramática de Compiscript usada para generar el lexer y parser TypeScript reales mediante ANTLR 4.";
