import { mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * El almacén de archivos: los PDF que sube el administrador y el material
 * multimedia que suben los docentes.
 *
 * En un equipo local los archivos viven en `app/almacen/`. En la nube esa
 * carpeta no sirve: cada visita levanta una función nueva y lo que se escriba
 * en su disco desaparece con ella, así que el PDF subido por la mañana ya no
 * está por la tarde.
 *
 * Cuando están definidas las tres variables de Supabase se usa su depósito
 * privado; si falta cualquiera de ellas se escribe en disco, que es lo que
 * hace falta para ejecutar el proyecto en el propio equipo.
 *
 * Todo se direcciona por una ruta relativa al depósito, como
 * `documentos/<id>.pdf` o `recursos/<id>.mp3`.
 */

const RAIZ_DISCO = path.join(process.cwd(), "almacen");
const PREFIJO = "documentos";

/**
 * Solo se aceptan rutas con la forma que genera la propia aplicación: una
 * carpeta, un identificador y una extensión. Así ninguna ruta que llegue de
 * fuera puede salirse del depósito ni de la carpeta local.
 */
const RUTA = /^[a-z]+\/[0-9a-z-]{8,64}\.[a-z0-9]{2,5}$/;

export function rutaValida(ruta: string): boolean {
  return RUTA.test(ruta);
}

function exigirRuta(ruta: string): string {
  if (!rutaValida(ruta)) throw new Error(`Ruta de almacén no válida: ${ruta}`);
  return ruta;
}

const rutaDocumento = (id: string) => `${PREFIJO}/${id}.pdf`;

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
  return d ? `${d.nombre}/${rutaDocumento(id)}` : `almacen/${rutaDocumento(id)}`;
}

/** Dónde está el archivo en disco, para servirlo en un equipo local. */
export function rutaEnDisco(ruta: string): string {
  return path.join(RAIZ_DISCO, exigirRuta(ruta));
}

function direccion(d: Deposito, ruta: string): string {
  return `${d.url}/storage/v1/object/${d.nombre}/${exigirRuta(ruta)}`;
}

/**
 * La llave `service_role` salta las reglas de acceso del depósito, que es
 * justo lo que hace falta aquí: quién puede abrir cada archivo se decide en
 * `/api/documentos/[id]` y `/api/recursos/[id]`, con la sesión del usuario
 * delante.
 */
function cabeceras(d: Deposito): Record<string, string> {
  return { Authorization: `Bearer ${d.llave}`, apikey: d.llave };
}

/**
 * Toda petición a Supabase pasa por aquí. Si la red se corta antes de que llegue
 * la respuesta, se reintenta una vez: sin esto, una subida de 16 MB que sí llegó
 * al depósito se daba por perdida por un corte al leerla. Un error que responde
 * el propio Supabase (un 400, un 404) no se reintenta: repetirlo daría lo mismo.
 */
async function pedir(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    await new Promise((r) => setTimeout(r, 800));
    return fetch(url, init);
  }
}

async function fallo(res: Response, verbo: string): Promise<Error> {
  const detalle = await res.text().catch(() => "");
  return new Error(`No se pudo ${verbo} en Supabase Storage (${res.status}). ${detalle}`.trim());
}

// ---------------------------------------------------------------------------
// Operaciones por ruta

/**
 * Autoriza al navegador a subir un archivo directamente al depósito.
 *
 * Vercel corta cualquier petición a partir de 4,5 MB, y una guía completa del
 * CNMH o un audio de testimonio pesan bastante más. Con esta dirección firmada
 * el archivo va del navegador a Supabase sin pasar por el servidor de la
 * aplicación, y la llave `service_role` nunca sale de aquí: la firma solo sirve
 * para escribir ese archivo, una vez.
 *
 * Devuelve `null` cuando se guarda en disco: ahí no hay a dónde subir directo.
 */
export async function firmarSubida(ruta: string): Promise<string | null> {
  const d = deposito();
  if (!d) return null;

  const res = await pedir(`${d.url}/storage/v1/object/upload/sign/${d.nombre}/${exigirRuta(ruta)}`, {
    method: "POST",
    headers: cabeceras(d),
    cache: "no-store",
  });
  if (!res.ok) throw await fallo(res, "preparar la subida");

  const { url }: { url: string } = await res.json();
  return `${d.url}/storage/v1${url}`;
}

/**
 * Tamaño y tipo de un archivo, sin descargarlo. `null` si no existe. Sirve para
 * comprobar lo que el navegador subió antes de registrarlo.
 */
export async function infoArchivo(ruta: string): Promise<{ tamano: number; tipo: string } | null> {
  const d = deposito();

  if (!d) {
    try {
      const s = await stat(rutaEnDisco(ruta));
      return { tamano: s.size, tipo: "" };
    } catch {
      return null;
    }
  }

  const res = await pedir(direccion(d, ruta), { method: "HEAD", headers: cabeceras(d), cache: "no-store" });
  if (!res.ok) return null;
  return {
    tamano: Number(res.headers.get("content-length") ?? 0),
    tipo: res.headers.get("content-type") ?? "",
  };
}

/**
 * Dirección temporal para que el navegador lea el archivo directamente del
 * depósito, que sigue siendo privado: sin la firma responde 400. Admite
 * peticiones por rangos, así que se puede avanzar y retroceder en un audio o un
 * video sin descargarlo entero. `null` cuando se guarda en disco.
 */
export async function urlDeLectura(ruta: string, segundos: number): Promise<string | null> {
  const d = deposito();
  if (!d) return null;

  const res = await pedir(`${d.url}/storage/v1/object/sign/${d.nombre}/${exigirRuta(ruta)}`, {
    method: "POST",
    headers: { ...cabeceras(d), "content-type": "application/json" },
    body: JSON.stringify({ expiresIn: segundos }),
    cache: "no-store",
  });
  if (!res.ok) throw await fallo(res, "firmar la lectura");

  const { signedURL }: { signedURL: string } = await res.json();
  return `${d.url}/storage/v1${signedURL}`;
}

/** Guarda un archivo, sustituyéndolo si ya existía. */
export async function guardarArchivo(ruta: string, bytes: Uint8Array<ArrayBuffer>, tipo: string): Promise<void> {
  const d = deposito();

  if (!d) {
    const destino = rutaEnDisco(ruta);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, bytes);
    return;
  }

  const res = await pedir(direccion(d, ruta), {
    method: "POST",
    headers: { ...cabeceras(d), "content-type": tipo, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw await fallo(res, "guardar el archivo");
}

/** Devuelve el archivo. Lanza si ya no está: quien llama decide qué responder. */
export async function leerArchivo(ruta: string): Promise<Uint8Array<ArrayBuffer>> {
  const d = deposito();

  if (!d) return new Uint8Array(await readFile(rutaEnDisco(ruta)));

  const res = await pedir(direccion(d, ruta), { headers: cabeceras(d), cache: "no-store" });
  if (!res.ok) throw await fallo(res, "leer el archivo");

  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Borra un archivo. No falla si ya no existe: la ficha de la base es lo que
 * manda, y un archivo perdido no debe impedir borrarla.
 */
export async function eliminarArchivo(ruta: string): Promise<void> {
  const d = deposito();

  if (!d) {
    await unlink(rutaEnDisco(ruta)).catch(() => {});
    return;
  }

  await pedir(direccion(d, ruta), { method: "DELETE", headers: cabeceras(d) }).catch(() => null);
}

/** Identificadores de los archivos de una carpeta, para buscar huérfanos. */
async function listarCarpeta(carpeta: string, extension: string): Promise<string[]> {
  const d = deposito();

  if (!d) {
    try {
      const archivos = await readdir(path.join(RAIZ_DISCO, carpeta));
      return archivos.filter((a) => a.endsWith(extension)).map((a) => path.basename(a, extension));
    } catch {
      return [];
    }
  }

  const res = await pedir(`${d.url}/storage/v1/object/list/${d.nombre}`, {
    method: "POST",
    headers: { ...cabeceras(d), "content-type": "application/json" },
    body: JSON.stringify({ prefix: `${carpeta}/`, limit: 1000, offset: 0 }),
    cache: "no-store",
  });
  if (!res.ok) throw await fallo(res, "listar el almacén");

  const entradas: Array<{ name: string; id: string | null }> = await res.json();
  return entradas
    .filter((e) => e.id !== null && e.name.endsWith(extension))
    .map((e) => path.basename(e.name, extension));
}

// ---------------------------------------------------------------------------
// Documentos PDF, por identificador. Es la forma en que los usa el importador.

/** Guarda el PDF, sustituyéndolo si ya existía uno con ese identificador. */
export function guardarDocumento(id: string, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  return guardarArchivo(rutaDocumento(id), bytes, "application/pdf");
}

/** Autoriza al navegador a subir un PDF directamente al depósito. */
export function firmarSubidaDocumento(id: string): Promise<string | null> {
  return firmarSubida(rutaDocumento(id));
}

/** Devuelve el PDF. Lanza si ya no está. */
export function leerDocumento(id: string): Promise<Uint8Array<ArrayBuffer>> {
  return leerArchivo(rutaDocumento(id));
}

/** Borra el PDF. No falla si ya no existe. */
export function eliminarDocumento(id: string): Promise<void> {
  return eliminarArchivo(rutaDocumento(id));
}

/** Identificadores de los PDF que hay en el almacén, para buscar huérfanos. */
export function listarDocumentos(): Promise<string[]> {
  return listarCarpeta(PREFIJO, ".pdf");
}

/** Nombres (sin carpeta) de los archivos de recursos, para buscar huérfanos. */
export async function listarRecursos(): Promise<string[]> {
  const nombres = await Promise.all(
    ["mp3", "m4a", "aac", "ogg", "wav", "webm", "mp4", "mov", "jpg", "jpeg", "png", "gif", "pdf"].map(async (x) =>
      (await listarCarpeta("recursos", `.${x}`)).map((id) => `${id}.${x}`)
    )
  );
  return [...new Set(nombres.flat())];
}

/**
 * Si el depósito de Supabase es público, cualquiera puede descargar los
 * archivos por su dirección directa y se salta la comprobación de rol de
 * `/api/documentos/[id]`. Devuelve `null` cuando se está guardando en disco.
 */
export async function depositoEsPublico(): Promise<boolean | null> {
  const d = deposito();
  if (!d) return null;

  const res = await pedir(`${d.url}/storage/v1/bucket/${d.nombre}`, {
    headers: cabeceras(d),
    cache: "no-store",
  });

  if (!res.ok) throw await fallo(res, "consultar el depósito");

  const ficha: { public: boolean } = await res.json();
  return ficha.public;
}
