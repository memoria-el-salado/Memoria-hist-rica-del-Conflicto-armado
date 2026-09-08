import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * El almacén de los PDF que sube el administrador.
 *
 * En la instalación del colegio los archivos viven en `app/almacen/documentos/`.
 * En la nube esa carpeta no sirve: cada visita levanta una función nueva y lo
 * que se escriba en su disco desaparece con ella, así que el PDF subido por la
 * mañana ya no está por la tarde.
 *
 * Cuando están definidas las tres variables de Supabase se usa su depósito
 * privado; si falta cualquiera de ellas se escribe en disco, que es lo que
 * hace falta para ejecutar el proyecto en el propio equipo.
 */

const CARPETA = path.join(process.cwd(), "almacen", "documentos");
const PREFIJO = "documentos";

type Deposito = { url: string; llave: string; nombre: string };

function deposito(): Deposito | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const nombre = process.env.SUPABASE_BUCKET?.trim();

  if (!url || !llave || !nombre) return null;
  return { url, llave, nombre };
}

/** Cómo se está guardando ahora mismo. Lo usa `npm run humo:almacen`. */
export function almacenEnUso(): "Supabase Storage" | "disco local" {
  return deposito() ? "Supabase Storage" : "disco local";
}

/** Ubicación que se anota en la ficha del documento; no se usa para leerlo. */
export function rutaDe(id: string): string {
  const d = deposito();
  return d ? `${d.nombre}/${PREFIJO}/${id}.pdf` : `almacen/documentos/${id}.pdf`;
}

function direccion(d: Deposito, id: string): string {
  return `${d.url}/storage/v1/object/${d.nombre}/${PREFIJO}/${id}.pdf`;
}

/**
 * La llave `service_role` salta las reglas de acceso del depósito, que es
 * justo lo que hace falta aquí: quién puede abrir cada PDF se decide en
 * `/api/documentos/[id]`, con la sesión del usuario delante.
 */
function cabeceras(d: Deposito): Record<string, string> {
  return { Authorization: `Bearer ${d.llave}`, apikey: d.llave };
}

async function fallo(res: Response, verbo: string): Promise<Error> {
  const detalle = await res.text().catch(() => "");
  return new Error(`No se pudo ${verbo} en Supabase Storage (${res.status}). ${detalle}`.trim());
}

/** Guarda el PDF, sustituyéndolo si ya existía uno con ese identificador. */
export async function guardarDocumento(id: string, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  const d = deposito();

  if (!d) {
    await mkdir(CARPETA, { recursive: true });
    await writeFile(path.join(CARPETA, `${id}.pdf`), bytes);
    return;
  }

  const res = await fetch(direccion(d, id), {
    method: "POST",
    headers: { ...cabeceras(d), "content-type": "application/pdf", "x-upsert": "true" },
    body: bytes,
  });

  if (!res.ok) throw await fallo(res, "guardar el documento");
}

/** Devuelve el PDF. Lanza si ya no está: quien llama decide qué responder. */
export async function leerDocumento(id: string): Promise<Uint8Array<ArrayBuffer>> {
  const d = deposito();

  if (!d) return new Uint8Array(await readFile(path.join(CARPETA, `${id}.pdf`)));

  const res = await fetch(direccion(d, id), { headers: cabeceras(d), cache: "no-store" });
  if (!res.ok) throw await fallo(res, "leer el documento");

  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Borra el PDF. No falla si el archivo ya no existe: la ficha de la base es lo
 * que manda, y un archivo perdido no debe impedir borrarla.
 */
export async function eliminarDocumento(id: string): Promise<void> {
  const d = deposito();

  if (!d) {
    try {
      await unlink(path.join(CARPETA, `${id}.pdf`));
    } catch {
      /* ya no estaba */
    }
    return;
  }

  await fetch(direccion(d, id), { method: "DELETE", headers: cabeceras(d) }).catch(() => null);
}

/** Identificadores de los PDF que hay en el almacén, para buscar huérfanos. */
export async function listarDocumentos(): Promise<string[]> {
  const d = deposito();

  if (!d) {
    try {
      const archivos = await readdir(CARPETA);
      return archivos.filter((a) => a.endsWith(".pdf")).map((a) => path.basename(a, ".pdf"));
    } catch {
      return [];
    }
  }

  const res = await fetch(`${d.url}/storage/v1/object/list/${d.nombre}`, {
    method: "POST",
    headers: { ...cabeceras(d), "content-type": "application/json" },
    body: JSON.stringify({ prefix: `${PREFIJO}/`, limit: 1000, offset: 0 }),
    cache: "no-store",
  });

  if (!res.ok) throw await fallo(res, "listar el almacén");

  const entradas: Array<{ name: string; id: string | null }> = await res.json();
  return entradas
    .filter((e) => e.id !== null && e.name.endsWith(".pdf"))
    .map((e) => path.basename(e.name, ".pdf"));
}

/**
 * Si el depósito de Supabase es público, cualquiera puede descargar los PDF
 * por su dirección directa y se salta la comprobación de rol que hace
 * `/api/documentos/[id]`. Devuelve `null` cuando se está guardando en disco.
 */
export async function depositoEsPublico(): Promise<boolean | null> {
  const d = deposito();
  if (!d) return null;

  const res = await fetch(`${d.url}/storage/v1/bucket/${d.nombre}`, {
    headers: cabeceras(d),
    cache: "no-store",
  });

  if (!res.ok) throw await fallo(res, "consultar el depósito");

  const ficha: { public: boolean } = await res.json();
  return ficha.public;
}
