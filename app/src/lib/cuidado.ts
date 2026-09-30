/**
 * Alertas de cuidado y acompañamiento (CU06).
 *
 * La guía para maestros pide preparar al grupo antes de los testimonios sobre la
 * masacre y el desplazamiento, y recuerda que nadie está obligado a continuar.
 * El documento de avance lo concreta en las "Alertas de Cuidado" y en un
 * protocolo de apoyo: el estudiante puede detenerse y pedir acompañamiento, y
 * ese pedido tiene que llegarle a alguien.
 */

/** Texto que se propone al activar una alerta; el docente lo puede ajustar. */
export const TEXTO_ALERTA_PREDETERMINADO =
  "Esta sesión trae testimonios sobre la masacre y el desplazamiento de El Salado, y puede remover " +
  "emociones. Tómate tu tiempo: puedes pausar, dejarla para después o hablar con tu docente. Nadie " +
  "está obligado a continuar.";

export const LIMITES_CUIDADO = { textoMinimo: 20, textoMaximo: 1200, mensajeMaximo: 1000 };

/** El texto de la alerta: lo que el estudiante lee antes del contenido. */
export function validarTextoAlerta(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length < LIMITES_CUIDADO.textoMinimo) return "Escribe qué trae la sesión y cómo cuidarse al verla.";
  if (limpio.length > LIMITES_CUIDADO.textoMaximo) return `El texto supera los ${LIMITES_CUIDADO.textoMaximo} caracteres.`;
  return null;
}

/**
 * El mensaje que acompaña una solicitud es opcional: a quien lo está pasando
 * mal no se le exige explicarse para pedir ayuda.
 */
export function limpiarMensaje(mensaje: string | null | undefined): { mensaje: string | null; error?: string } {
  const limpio = (mensaje ?? "").trim();
  if (limpio.length > LIMITES_CUIDADO.mensajeMaximo) {
    return { mensaje: null, error: `El mensaje supera los ${LIMITES_CUIDADO.mensajeMaximo} caracteres.` };
  }
  return { mensaje: limpio || null };
}

/** Minutos en que una segunda solicitud igual se entiende como la misma. */
export const MINUTOS_REPETICION = 10;

/**
 * Si el estudiante pulsa dos veces, o vuelve a pedirlo al poco, no se le
 * duplica el aviso al docente: la primera ya está esperando.
 */
export function esRepeticion(
  nueva: { sesionId: string | null; creadoEn: Date },
  pendientes: { sesionId: string | null; creadoEn: Date }[]
): boolean {
  const ventana = MINUTOS_REPETICION * 60_000;
  return pendientes.some(
    (p) => p.sesionId === nueva.sesionId && nueva.creadoEn.getTime() - p.creadoEn.getTime() < ventana
  );
}

type Solicitud = { creadoEn: Date; atendidaEn: Date | null };

/** Primero lo que espera respuesta, lo más reciente arriba; después lo atendido. */
export function ordenarSolicitudes<T extends Solicitud>(solicitudes: T[]): T[] {
  return [...solicitudes].sort((a, b) => {
    if (!a.atendidaEn !== !b.atendidaEn) return a.atendidaEn ? 1 : -1;
    return b.creadoEn.getTime() - a.creadoEn.getTime();
  });
}

/** La sesión en que está el estudiante, si la hay, a partir de la dirección. */
export function sesionDeRuta(ruta: string): string | null {
  return ruta.match(/^\/estudiante\/sesion\/([^/?#]+)/)?.[1] ?? null;
}

/**
 * Si el estudiante vuelve a escribir mientras su pedido sigue esperando, lo que
 * añade se suma al mismo pedido: el docente lo lee todo junto.
 */
export function unirMensajes(previo: string | null, nuevo: string | null): string | null {
  if (!nuevo || previo?.includes(nuevo)) return previo;
  return previo ? `${previo}\n\n${nuevo}` : nuevo;
}
