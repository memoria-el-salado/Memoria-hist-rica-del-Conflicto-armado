"use client";

import { useActionState } from "react";
import { LIMITES_CURSO } from "@/lib/cursos";
import { crearCurso } from "./actions";

export function NuevoCurso({ anio }: { anio: number }) {
  const [estado, accion, pendiente] = useActionState(crearCurso, null as { ok?: string; error?: string } | null);

  return (
    <form action={accion} className="self-start rounded-xl border border-borde bg-superficie p-5">
      <div className="text-[0.78125rem] font-extrabold tracking-[.05em] text-primario-fuerte">NUEVO CURSO</div>

      <label htmlFor="nombre-curso" className="mt-3.5 block text-[0.625rem] font-bold tracking-[.12em] text-tenue">
        NOMBRE
      </label>
      <input
        id="nombre-curso"
        name="nombre"
        placeholder="ej. Grado 10A"
        maxLength={LIMITES_CURSO.nombreMaximo}
        className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[0.8125rem]"
      />

      <label htmlFor="anio-curso" className="mt-3 block text-[0.625rem] font-bold tracking-[.12em] text-tenue">
        AÑO LECTIVO
      </label>
      <input
        id="anio-curso"
        name="anio"
        type="number"
        defaultValue={anio}
        min={LIMITES_CURSO.anioMinimo}
        max={anio + 1}
        className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[0.8125rem]"
      />

      <button
        type="submit"
        disabled={pendiente}
        className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[0.8125rem] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
      >
        {pendiente ? "Creando..." : "Crear curso"}
      </button>
      {estado?.ok && (
        <div role="status" className="mt-2.5 text-[0.71875rem] font-semibold text-secundario-fuerte">
          {estado.ok}
        </div>
      )}
      {estado?.error && (
        <div role="alert" className="mt-2.5 text-[0.71875rem] font-semibold text-peligro">
          {estado.error}
        </div>
      )}
    </form>
  );
}
