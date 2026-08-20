/**
 * Compara los documentos del repositorio para distinguir la guía del docente de
 * la del estudiante: cuentan las marcas de lenguaje propias de cada una.
 *
 *   npx tsx scripts/comparar-pdf.ts <archivo.pdf> [...]
 */
import { readFile } from "fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

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

function contar(texto: string, patrones: RegExp[]) {
  return patrones.reduce((total, p) => total + (texto.match(p)?.length ?? 0), 0);
}

async function main() {
  for (const archivo of process.argv.slice(2)) {
    const bytes = new Uint8Array(await readFile(archivo));
    const pdf = await getDocumentProxy(bytes.slice());
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const docente = contar(text, DE_DOCENTE);
    const estudiante = contar(text, DE_ESTUDIANTE);

    console.log(`\n=== ${archivo.split(/[\\/]/).pop()} ===`);
    console.log(`  ${totalPages} páginas · ${text.length} caracteres`);
    console.log(`  marcas de guía docente:    ${docente}`);
    console.log(`  marcas de guía estudiante: ${estudiante}`);
    console.log(
      `  → parece la guía ${docente > estudiante ? "DEL DOCENTE" : "DEL ESTUDIANTE"}`
    );
  }
}

main();
