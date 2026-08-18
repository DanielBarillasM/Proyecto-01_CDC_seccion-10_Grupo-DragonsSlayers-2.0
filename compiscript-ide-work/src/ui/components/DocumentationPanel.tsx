import { SEMANTIC_CODE_CATALOG } from "../../semantic/diagnostics";

export function DocumentationPanel() {
  return (
    <div className="doc-content">
      <h4>Flujo de ejecución</h4>
      <ol className="doc-list">
        <li>Abre <strong>IDE semántico</strong> y selecciona un caso o carga un archivo <code>.cps</code>.</li>
        <li>El lexer generado por ANTLR tokeniza toda la entrada y recolecta diagnósticos léxicos.</li>
        <li>Si la tokenización permite continuar, el parser construye el CST desde <code>program()</code>.</li>
        <li>Si no hay errores léxicos ni sintácticos, el visitor semántico valida tipos y nombres.</li>
        <li>La aplicación muestra diagnósticos, símbolos, ámbitos, referencias, closures y árboles.</li>
      </ol>

      <h4>Arquitectura de la fase semántica</h4>
      <p>
        <code>declarationVisitor.ts</code> realiza la recolección inicial de clases, herencia,
        campos y firmas de métodos. <code>semanticVisitor.ts</code> recorre el CST válido,
        consulta <code>ScopeManager</code>, aplica <code>typeSystem.ts</code>, produce diagnósticos
        estables y construye el árbol semántico anotado. <code>flowAnalysis.ts</code> cubre retornos
        y código inalcanzable.
      </p>

      <h4>Tabla de símbolos y ámbitos</h4>
      <p>
        La tabla registra variables, constantes, parámetros, funciones, clases, campos, métodos y
        variables de <code>catch</code>. Cada símbolo conserva tipo, mutabilidad, inicialización,
        ámbito, ubicación de declaración, referencias y si fue capturado por un closure. Los ámbitos
        forman un árbol global con nodos de función, clase, bloque, ciclo, switch y catch.
      </p>

      <h4>Catálogo de diagnósticos semánticos</h4>
      <div className="table-scroll">
        <table className="doc-table">
          <thead><tr><th>Código</th><th>Regla</th></tr></thead>
          <tbody>
            {Object.entries(SEMANTIC_CODE_CATALOG).map(([code, description]) => (
              <tr key={code}><td><code>{code}</code></td><td>{description}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Cobertura principal</h4>
      <ul className="doc-list">
        <li>Operadores aritméticos, lógicos, relacionales, igualdad y ternarios.</li>
        <li>Compatibilidad de asignaciones, constantes e inferencia básica de variables/arreglos.</li>
        <li>Resolución de identificadores, shadowing entre ámbitos y redeclaración local.</li>
        <li>Firmas de funciones, cantidad/tipo de argumentos, retornos, recursión y closures.</li>
        <li><code>break</code>, <code>continue</code>, <code>return</code> y detección de código inalcanzable.</li>
        <li>Clases, herencia, constructores, <code>this</code>, campos y métodos heredados.</li>
        <li>Arreglos homogéneos, acceso por índice y <code>foreach</code>.</li>
      </ul>

      <h4>Comandos</h4>
      <pre className="doc-code">{`npm install
npm run generate
npm run check
npm test
npm run build
npm run dev

# CLI semántica (modo por defecto)
npm run cli -- examples/semantic/valid_complete.cps --mode semantic
npm run cli -- examples/semantic/semantic_errors.cps --mode semantic

# Solo fases anteriores
npm run cli -- examples/compiscript/valid.cps --mode parser
npm run cli -- examples/compiscript/valid.cps --mode lexer`}</pre>

      <div className="doc-note">
        <strong>Decisiones de diseño:</strong> consulta <code>docs/DECISIONES_SEMANTICAS.md</code>
        para las diferencias entre la gramática base y los requerimientos semánticos, incluida la
        incorporación de <code>float</code> y la política de <code>switch</code>.
      </div>
    </div>
  );
}
