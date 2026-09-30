/**
 * La campana de los mockups: qué hay de nuevo para cada quien.
 *
 * Los avisos no se guardan uno por uno: se deducen de lo que ya existe. Al
 * publicar una sesión no se escribe un aviso por estudiante; basta con saber
 * cuándo se publicó y cuándo miró cada quien la campana por última vez. Solo
 * los comentarios del docente llevan su propia marca de leído, porque se leen
 * donde está el trabajo comentado.
 */

export type TipoAviso = "COMENTARIO" | "SESION" | "ACOMPANAMIENTO" | "ENTREGA";

export type Aviso = {
  id: string;
  tipo: TipoAviso;
  texto: string;
  enlace: string;
  fecha: Date;
  nuevo: boolean;
};

/** Cuánto hacia atrás se muestran las sesiones publicadas. */
export const DIAS_SESIONES = 30;
/** Cuántos avisos caben en la campana. */
export const MAXIMO_AVISOS = 20;

type ComentarioRecibido = {
  id: string;
  creadoEn: Date;
  leidoEn: Date | null;
  docente: string;
  sesion: { id: string; codigo: string } | null;
  /** Comentario a una entrada del diario, sin sesión. */
  enDiario: boolean;
};

type SesionPublicada = { id: string; codigo: string; titulo: string; publicadaEn: Date };

const posterior = (fecha: Date, desde: Date | null) => !desde || fecha.getTime() > desde.getTime();

function ordenar(avisos: Aviso[]): Aviso[] {
  return avisos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, MAXIMO_AVISOS);
}

/** Lo nuevo para un estudiante: comentarios de su docente y sesiones recién publicadas. */
export function avisosDeEstudiante(entrada: {
  comentarios: ComentarioRecibido[];
  sesiones: SesionPublicada[];
  vistosEn: Date | null;
}): Aviso[] {
  const comentarios: Aviso[] = entrada.comentarios.map((c) => ({
    id: `comentario-${c.id}`,
    tipo: "COMENTARIO",
    texto: c.enDiario
      ? `${c.docente} respondió a una entrada de tu diario.`
      : `${c.docente} comentó tu trabajo en la sesión ${c.sesion?.codigo ?? ""}.`.replace(" .", "."),
    enlace: c.enDiario || !c.sesion ? "/estudiante/diario" : `/estudiante/sesion/${c.sesion.id}`,
    fecha: c.creadoEn,
    nuevo: !c.leidoEn,
  }));
  const sesiones: Aviso[] = entrada.sesiones.map((s) => ({
    id: `sesion-${s.id}`,
    tipo: "SESION",
    texto: `Ya puedes abrir la sesión ${s.codigo}: ${s.titulo}.`,
    enlace: `/estudiante/sesion/${s.id}`,
    fecha: s.publicadaEn,
    nuevo: posterior(s.publicadaEn, entrada.vistosEn),
  }));
  return ordenar([...comentarios, ...sesiones]);
}

type Solicitud = { id: string; estudiante: string; creadoEn: Date };
/** `sesion` es el código de la sesión, o null si es una entrada del diario personal. */
type Entrega = { id: string; estudiante: string; sesion: string | null; fecha: Date };

/**
 * Lo nuevo para un docente: los pedidos de acompañamiento que esperan (siempre
 * nuevos hasta atenderlos) y los trabajos entregados que aún no ha comentado.
 */
export function avisosDeDocente(entrada: { solicitudes: Solicitud[]; entregas: Entrega[]; vistosEn: Date | null }): Aviso[] {
  const solicitudes: Aviso[] = entrada.solicitudes.map((s) => ({
    id: `solicitud-${s.id}`,
    tipo: "ACOMPANAMIENTO",
    texto: `${s.estudiante} pidió acompañamiento.`,
    enlace: "/docente/panel#acompanamiento",
    fecha: s.creadoEn,
    nuevo: true,
  }));
  const entregas: Aviso[] = entrada.entregas.map((e) => ({
    id: `entrega-${e.id}`,
    tipo: "ENTREGA",
    texto: e.sesion ? `${e.estudiante} entregó su trabajo de la sesión ${e.sesion}.` : `${e.estudiante} compartió contigo una entrada de su diario.`,
    enlace: "/docente/revision?pendientes=1",
    fecha: e.fecha,
    nuevo: posterior(e.fecha, entrada.vistosEn),
  }));
  return ordenar([...solicitudes, ...entregas]);
}

export function contarNuevos(avisos: Aviso[]): number {
  return avisos.filter((a) => a.nuevo).length;
}
