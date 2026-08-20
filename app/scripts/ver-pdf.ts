/**
 * Muestra lo que el importador ve dentro de un PDF: qué estructura reconoce,
 * cuánto texto extrae de cada apartado y a qué público va dirigido el
 * documento. Sirve para afinar una importación antes de crear el módulo.
 *
 *   npm run pdf -- <archivo.pdf>                 estructura y texto detectados
 *   npm run pdf -- <archivo.pdf> --seccion 1.2   el texto de un apartado
 *   npm run pdf -- <archivo.pdf> --texto         las primeras líneas del PDF
 *   npm run pdf -- <a.pdf> <b.pdf> --publico     de quién es cada guía
 */
import { readFile } from "fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { armarArbol, detectarEstructura } from "../src/lib/importador-pdf";

const argumentos = process.argv.slice(2);
const archivos = argumentos.filter((a) => a.toLowerCase().endsWith(".pdf"));
const opcion = (nombre: string) => argumentos.includes(`--${nombre}`);

const seccionPedida = opcion("seccion")
  ? argumentos[argumentos.indexOf("--seccion") + 1]
  : null;

/** Expresiones que solo aparecen cuando el texto se dirige a quien enseña. */
const DE_DOCENTE = [
  /este paso permite que (los|las)/gi,
  /el o la docente/gi,
  /los y las estudiantes/gi,
  /se sugiere/gi,
  /objetivo de la sesi[óo]n/gi,
  /orientaciones? (para|pedag[óo]gicas?)/gi,
  /paso \d/gi,
];

/** Expresiones que interpelan directamente a quien aprende. */
const DE_ESTUDIANTE = [
  /\bilustra\b/gi,
  /\bcalca\b/gi,
  /\bescribe tu\b/gi,
  /\bpuedes componer\b/gi,
  /\bhabla de tu\b/gi,
  /\btu (regi[óo]n|municipio|comunidad)\b/gi,
  /\bpara ti\b/gi,
];

const contar = (texto: string, patrones: RegExp[]) =>
  patrones.reduce((total, p) => total + (texto.match(p)?.length ?? 0), 0);

async function leer(archivo: string) {
  const bytes = new Uint8Array(await readFile(archivo));
  const pdf = await getDocumentProxy(bytes.slice());
  return extractText(pdf, { mergePages: true });
}

/** Decide si la guía es del estudiante o del docente, por su forma de hablar. */
async function publico(archivo: string) {
  const { text, totalPages } = await leer(archivo);
  const docente = contar(text, DE_DOCENTE);
  const estudiante = contar(text, DE_ESTUDIANTE);

  console.log(`\n=== ${archivo.split(/[\\/]/).pop()} ===`);
  console.log(`  ${totalPages} páginas · ${text.length} caracteres`);
  console.log(`  marcas de guía docente:    ${docente}`);
  console.log(`  marcas de guía estudiante: ${estudiante}`);
  console.log(`  → parece la guía ${docente > estudiante ? "DEL DOCENTE" : "DEL ESTUDIANTE"}`);
  if (docente > estudiante) {
    console.log("     Consérvala reservada al docente en la pantalla de importación.");
  }
}

async function estructura(archivo: string) {
  const { text, totalPages } = await leer(archivo);
  console.log(`Páginas: ${totalPages} · caracteres: ${text.length}`);

  if (opcion("texto")) {
    console.log("\n===== PRIMERAS 120 LÍNEAS =====");
    console.log(text.split(/\r?\n/).slice(0, 120).join("\n"));
  }

  const detectada = detectarEstructura(text);
  console.log(`\nTítulo detectado: ${detectada.titulo}`);

  if (seccionPedida) {
    const el = detectada.elementos.find((e) => e.codigo === seccionPedida);
    console.log(`\n===== ${seccionPedida} · ${el?.titulo} =====`);
    console.log(el?.contenido || "(sin contenido)");
    return;
  }

  console.log(`Elementos: ${detectada.elementos.length}`);
  for (const el of detectada.elementos) {
    console.log(
      `  ${el.nivel.padEnd(10)} ${el.codigo.padEnd(7)} ${String(el.contenido.length).padStart(5)} car · ${el.titulo.slice(0, 62)}`
    );
  }

  const arbol = armarArbol(detectada.elementos);
  console.log(`\nÁrbol: ${arbol.length} ejes`);
  for (const eje of arbol) {
    console.log(`  Eje ${eje.codigo} · ${eje.titulo.slice(0, 70)}`);
    for (const s of eje.sesiones) {
      console.log(`     ${s.codigo} [${s.actividad}] ${s.titulo.slice(0, 60)}`);
    }
  }
}

async function main() {
  if (archivos.length === 0) {
    console.error("Indica la ruta de al menos un PDF.");
    process.exit(1);
  }

  if (opcion("publico")) {
    for (const archivo of archivos) await publico(archivo);
    return;
  }

  await estructura(archivos[0]);
}

main();
