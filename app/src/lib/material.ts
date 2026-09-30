import type { Recurso } from "@prisma/client";
import { incrustable, type Incrustado, type TipoRecurso } from "@/lib/recursos";

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
  };
}
