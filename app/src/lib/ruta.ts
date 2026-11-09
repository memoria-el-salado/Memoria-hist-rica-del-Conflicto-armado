/**
 * El orden del viaje, tal como lo ve el estudiante.
 *
 * Dos docentes de ciencias sociales que probaron la plataforma pidieron más
 * secuencialidad: saber por dónde seguir y que cada sesión vaya de la
 * información a la reflexión, la actividad y la retroalimentación. Estas reglas
 * deciden la siguiente sesión y el estado de cada uno de esos cuatro pasos.
 */

export type SesionDeRuta = { id: string; codigo: string; titulo: string; publicada: boolean; completada: boolean };
export type EjeDeRuta = { id: string; nombre: string; bloqueado: boolean; sesiones: SesionDeRuta[] };

/**
 * Dónde sigue el viaje: la primera sesión publicada y sin hacer, en el orden
 * del mapa, de un eje que esté abierto para el estudiante. `null` si no queda
 * ninguna por hacer.
 */
export function siguienteDelViaje(ejes: EjeDeRuta[]): { ejeId: string; sesion: SesionDeRuta } | null {
  for (const eje of ejes) {
    if (eje.bloqueado) continue;
    const sesion = eje.sesiones.find((s) => s.publicada && !s.completada);
    if (sesion) return { ejeId: eje.id, sesion };
  }
  return null;
}

/** La sesión publicada que viene después de `actualId`, en el orden del módulo. */
export function sesionPosterior<T extends { id: string }>(publicadasEnOrden: T[], actualId: string): T | null {
  const i = publicadasEnOrden.findIndex((s) => s.id === actualId);
  return i >= 0 && i + 1 < publicadasEnOrden.length ? publicadasEnOrden[i + 1] : null;
}

export type EstadoPaso = "LISTO" | "PENDIENTE" | "INFORMATIVO";
export type PasoDeSesion = { id: "explora" | "reflexiona" | "actividad" | "retroalimentacion"; titulo: string; detalle: string; estado: EstadoPaso; ancla: string };

/**
 * Los cuatro momentos de una sesión, con lo que el estudiante encuentra en
 * cada uno: qué puede explorar, sobre qué reflexionar, si ya hizo la actividad
 * y si su docente ya le respondió.
 */
export function pasosDeSesion(datos: {
  material: number;
  tieneTexto: boolean;
  tieneDocumento: boolean;
  pregunta: boolean;
  hecha: boolean;
  comentarios: number;
}): PasoDeSesion[] {
  const explora =
    datos.material > 0
      ? `${datos.material} ${datos.material === 1 ? "recurso" : "recursos"} para leer, ver o escuchar`
      : datos.tieneTexto
        ? "El texto de la guía del CNMH"
        : datos.tieneDocumento
          ? "El apartado de la guía en PDF"
          : "Lo que tu docente presente en clase";
  return [
    { id: "explora", titulo: "Explora", detalle: explora, estado: "INFORMATIVO", ancla: "#material-sesion" },
    {
      id: "reflexiona",
      titulo: "Reflexiona",
      detalle: datos.pregunta ? "Con la pregunta orientadora" : "Sobre lo que leíste y escuchaste",
      estado: "INFORMATIVO",
      ancla: datos.pregunta ? "#pregunta-orientadora" : "#material-sesion",
    },
    {
      id: "actividad",
      titulo: "Haz la actividad",
      detalle: datos.hecha ? "Ya la hiciste; puedes volver a ella" : "Todavía no la has hecho",
      estado: datos.hecha ? "LISTO" : "PENDIENTE",
      ancla: "#actividad",
    },
    {
      id: "retroalimentacion",
      titulo: "Retroalimentación",
      detalle:
        datos.comentarios > 0
          ? `${datos.comentarios} ${datos.comentarios === 1 ? "comentario" : "comentarios"} de tu docente`
          : "Tu docente te comenta aquí",
      estado: datos.comentarios > 0 ? "LISTO" : "PENDIENTE",
      ancla: "#retroalimentacion",
    },
  ];
}
