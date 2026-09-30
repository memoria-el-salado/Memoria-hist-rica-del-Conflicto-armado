/**
 * Reglas para aceptar un PDF antes de subirlo.
 *
 * El límite depende de por dónde viaje el archivo. Directo al depósito de
 * Supabase, el tope es el de su plan gratuito por archivo. Si pasa por el
 * servidor de la aplicación —cuando se guarda en disco, en un equipo local—,
 * manda el `bodySizeLimit` de las server actions en `next.config.ts`.
 */

const MB = 1024 * 1024;

/** Supabase, plan gratuito: 50 MB por archivo. */
export const MAXIMO_DIRECTO = 50 * MB;

/** `serverActions.bodySizeLimit` en next.config.ts. */
export const MAXIMO_SERVIDOR = 25 * MB;

export type ArchivoPropuesto = { nombre: string; tipo: string; tamano: number };

/** Devuelve el motivo por el que no se acepta el archivo, o `null` si vale. */
export function validarPdf(archivo: ArchivoPropuesto, maximo: number): string | null {
  if (!archivo.nombre || archivo.tamano <= 0) return "Selecciona un archivo PDF.";

  // Algunos sistemas no informan el tipo; entonces decide la extensión.
  const esPdf = archivo.tipo === "application/pdf" || archivo.nombre.toLowerCase().endsWith(".pdf");
  if (!esPdf) return "El archivo debe ser un PDF.";

  if (archivo.tamano > maximo) {
    return `El PDF pesa ${enMegas(archivo.tamano)} y el máximo es ${enMegas(maximo)}.`;
  }
  return null;
}

export function enMegas(bytes: number): string {
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1).replace(".", ",") : Math.round(mb)} MB`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * El navegador devuelve el identificador que el servidor le dio al firmar la
 * subida. Se comprueba la forma antes de usarlo para leer del depósito, para
 * que no pueda llegar una ruta en su lugar.
 */
export function esIdentificadorDeSubida(id: string): boolean {
  return UUID.test(id);
}
