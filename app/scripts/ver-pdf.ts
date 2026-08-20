/**
 * Vuelca lo que el importador ve dentro de un PDF: el texto extraído y la
 * estructura que detecta. Sirve para afinar la extracción con documentos
 * reales antes de crear módulos con ellos.
 *
 *   npx tsx scripts/ver-pdf.ts <archivo.pdf> [--texto] [--seccion 1.2]
 */
import { readFile } from "fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { armarArbol, detectarEstructura } from "../src/lib/importador-pdf";

const [archivo, ...opciones] = process.argv.slice(2);
if (!archivo) {
  console.error("Indica la ruta de un PDF.");
  process.exit(1);
}

const seccionPedida = opciones.includes("--seccion")
  ? opciones[opciones.indexOf("--seccion") + 1]
  : null;

async function main() {
  const bytes = new Uint8Array(await readFile(archivo));
  const pdf = await getDocumentProxy(bytes.slice());
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  console.log(`Páginas: ${totalPages} · caracteres: ${text.length}`);

  if (opciones.includes("--texto")) {
    console.log("\n===== PRIMERAS 120 LÍNEAS =====");
    console.log(text.split(/\r?\n/).slice(0, 120).join("\n"));
  }

  const estructura = detectarEstructura(text);
  console.log(`\nTítulo detectado: ${estructura.titulo}`);

  if (seccionPedida) {
    const el = estructura.elementos.find((e) => e.codigo === seccionPedida);
    console.log(`\n===== ${seccionPedida} · ${el?.titulo} =====`);
    console.log(el?.contenido || "(sin contenido)");
    return;
  }

  console.log(`Elementos: ${estructura.elementos.length}`);
  for (const el of estructura.elementos) {
    console.log(
      `  ${el.nivel.padEnd(10)} ${el.codigo.padEnd(7)} ${String(el.contenido.length).padStart(5)} car · ${el.titulo.slice(0, 62)}`
    );
  }

  const arbol = armarArbol(estructura.elementos);
  console.log(`\nÁrbol: ${arbol.length} ejes`);
  for (const eje of arbol) {
    console.log(`  Eje ${eje.codigo} · ${eje.titulo.slice(0, 70)}`);
    for (const s of eje.sesiones) {
      console.log(`     ${s.codigo} [${s.actividad}] ${s.titulo.slice(0, 60)}`);
    }
  }
}

main();
