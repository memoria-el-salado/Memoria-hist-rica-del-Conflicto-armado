/**
 * Comprueba el almacén de documentos antes de desplegar: guarda un archivo de
 * prueba, lo vuelve a leer, verifica que llega intacto y lo borra.
 *
 *   npm run humo:almacen
 */
import "dotenv/config";
import {
  almacenEnUso,
  depositoEsPublico,
  eliminarDocumento,
  guardarDocumento,
  leerDocumento,
  listarDocumentos,
} from "../src/lib/almacen";

const ID = "00000000-humo-0000-0000-comprobacion";
const CONTENIDO = new TextEncoder().encode("%PDF-1.4\nComprobación del almacén.\n%%EOF\n");

async function main() {
  const almacen = almacenEnUso();
  console.log(`Almacén: ${almacen}`);

  if (almacen === "disco local") {
    console.log(
      "\n  Las variables de Supabase no se están leyendo. Revisa que SUPABASE_URL,\n" +
        "  SUPABASE_SERVICE_ROLE_KEY y SUPABASE_BUCKET estén en app/.env y no en la\n" +
        "  raíz del repositorio.\n"
    );
  } else {
    console.log(`Depósito: ${process.env.SUPABASE_BUCKET}\n`);
  }

  await guardarDocumento(ID, CONTENIDO);
  console.log("  Guardar     correcto");

  const leido = await leerDocumento(ID);
  const igual =
    leido.byteLength === CONTENIDO.byteLength && leido.every((b, i) => b === CONTENIDO[i]);
  console.log(`  Leer        ${igual ? "correcto" : "REVISAR: el archivo no llegó igual"}`);

  const listado = await listarDocumentos();
  console.log(`  Listar      correcto (${listado.length} archivo${listado.length === 1 ? "" : "s"})`);

  await eliminarDocumento(ID);
  const borrado = !(await listarDocumentos()).includes(ID);
  console.log(`  Borrar      ${borrado ? "correcto" : "REVISAR: el archivo de prueba sigue ahí"}`);

  // La guía para maestros solo queda protegida si el depósito es privado: si no,
  // el estudiante la abre por su dirección directa sin pasar por la aplicación.
  const publico = await depositoEsPublico();
  if (publico === true) {
    console.log(
      "\n  ATENCIÓN: el depósito es público. Apaga «Public bucket» en Supabase\n" +
        "  (Storage → el depósito → Settings), o el material reservado al docente\n" +
        "  quedará descargable por su dirección directa.\n"
    );
  } else if (publico === false) {
    console.log("  Privado     correcto\n");
  }

  if (!igual || !borrado || publico === true) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nEl almacén no responde: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
