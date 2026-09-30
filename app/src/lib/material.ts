import type { Recurso } from "@prisma/client";
import { incrustable, type Incrustado, type TipoRecurso } from "@/lib/recursos";
import { estadoAccesibilidad, leerTranscripcion, type Transcripcion } from "@/lib/transcripcion";

/** Lo que necesita la pantalla para mostrar un recurso, sin rutas internas. */
export type RecursoVista = {
  id: string;
  titulo: string;
  contexto: string;
  tipo: TipoRecurso;
  alerta: boolean;
  /** Dirección externa cuando no se puede incrustar. */
  enlace: string | null;
  incrustado: Incrustado | null;
  tieneArchivo: boolean;
  transcripcion: Transcripcion | null;
  /** Lo que le falta para que lo vean los estudiantes, o `null` si nada. */
  pendiente: string | null;
};

export function vistaDeRecurso(r: Recurso): RecursoVista {
  return {
    id: r.id,
    titulo: r.titulo,
    contexto: r.contexto,
    tipo: r.tipo,
    alerta: r.alerta,
    enlace: r.enlace,
    incrustado: r.enlace ? incrustable(r.enlace) : null,
    tieneArchivo: Boolean(r.archivo),
    transcripcion: r.transcripcion ? (leerTranscripcion(r.transcripcion).transcripcion ?? null) : null,
    pendiente: estadoAccesibilidad(r).pendiente,
  };
}
