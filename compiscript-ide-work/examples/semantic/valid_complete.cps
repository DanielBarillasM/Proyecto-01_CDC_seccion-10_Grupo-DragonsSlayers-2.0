// Programa semánticamente válido para demostrar el pipeline completo.
const MAXIMO: integer = 100;

function sumar(a: integer, b: integer): integer {
  return a + b;
}

function factorial(n: integer): integer {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

function crearContador(inicio: integer): integer {
  let total: integer = inicio;

  function incrementar(): integer {
    total = total + 1;
    return total;
  }

  return incrementar();
}

class Animal {
  let nombre: string;

  function constructor(nombre: string) {
    this.nombre = nombre;
  }

  function hablar(): string {
    return this.nombre;
  }
}

class Perro : Animal {
  function describir(): string {
    return this.hablar();
  }
}

let notas: integer[] = [90, 85, 100];
let promedio: float = 91;
let perro: Perro = new Perro("Toby");

foreach (nota in notas) {
  if (nota < 60) {
    continue;
  }
  print(nota);
}

for (let i: integer = 0; i < 3; i = i + 1) {
  print(i);
}

switch (MAXIMO) {
  case 100:
    print("máximo");
    break;
  default:
    print("otro");
}

try {
  print(perro.describir());
} catch (err) {
  print(err);
}

print(sumar(2, 3));
print(factorial(5));
print(crearContador(0));
print(promedio);
