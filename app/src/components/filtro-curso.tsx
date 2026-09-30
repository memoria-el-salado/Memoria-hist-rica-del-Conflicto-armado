"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Elige el curso por el que se filtra la pantalla. El curso va en la
 * dirección (`?curso=`), así que la vista filtrada se puede recargar o
 * compartir con otro docente del mismo curso sin perder el filtro.
 */
export function FiltroCurso({ cursos, elegido }: { cursos: { id: string; etiqueta: string }[]; elegido: string | null }) {
  const router = useRouter();
  const ruta = usePathname();
  if (!cursos.length) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <label htmlFor="filtro-curso" className="text-[10.5px] font-bold tracking-[.12em] text-tenue">
        CURSO
      </label>
      <select
        id="filtro-curso"
        value={elegido ?? ""}
        onChange={(e) => router.push(e.target.value ? `${ruta}?curso=${e.target.value}` : ruta)}
        className="rounded-lg border border-borde-campo bg-superficie px-3 py-1.5 text-[12.5px] font-semibold"
      >
        <option value="">Todos mis estudiantes</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
