"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LIMITES_CURSO } from "@/lib/cursos";
import { asignarCurso, asignarGrupo, crearGrupo, eliminarCurso, eliminarGrupo, repartirGrupos } from "../actions";

type Estudiante = { id: string; nombre: string; usuario: string; iniciales: string; grupoId: string | null };
type Props = {
  curso: { id: string; nombre: string; anio: number };
  grupos: { id: string; nombre: string }[];
  estudiantes: Estudiante[];
  sinCurso: { id: string; nombre: string }[];
};

/**
 * Un curso: quiénes están, en qué grupo trabaja cada uno, y los grupos. Cada
 * cambio se guarda al momento y el aviso dice qué pasó.
 */
export function CursoDetalle({ curso, grupos, estudiantes, sinCurso }: Props) {
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [aSumar, setASumar] = useState("");

  const sinGrupo = estudiantes.filter((e) => !e.grupoId).length;

  function hacer(accion: () => Promise<{ ok?: string; error?: string } | undefined>, alTerminar?: () => void) {
    iniciar(async () => {
      const r = await accion();
      if (r) setAviso(r);
      if (r?.ok) alTerminar?.();
    });
  }

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <Link href="/docente/cursos" className="text-[11.5px] font-semibold text-apagado no-underline hover:text-primario">
        ← Mis cursos
      </Link>
      <h1 className="mb-1 mt-2 text-[26px] font-extrabold tracking-[-.02em]">{curso.nombre}</h1>
      <p className="mb-4 text-[13px] text-tenue">
        Año lectivo {curso.anio} · {estudiantes.length} {estudiantes.length === 1 ? "estudiante" : "estudiantes"} ·{" "}
        {grupos.length} {grupos.length === 1 ? "grupo" : "grupos"}
      </p>

      <div aria-live="polite" className="min-h-[1px]">
        {aviso?.ok && (
          <div role="status" className="mb-3 rounded-lg bg-secundario-tinte px-3.5 py-2 text-[12px] font-semibold text-secundario-fuerte">
            {aviso.ok}
          </div>
        )}
        {aviso?.error && (
          <div role="alert" className="mb-3 rounded-lg bg-primario-tinte px-3.5 py-2 text-[12px] font-semibold text-peligro">
            {aviso.error}
          </div>
        )}
      </div>

      <div className="rejilla-panel">
        <section aria-labelledby="titulo-estudiantes" className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
            <h2 id="titulo-estudiantes" className="text-[13px] font-extrabold">Estudiantes del curso</h2>
            <span className="text-[11px] font-bold text-suave">{estudiantes.length}</span>
          </div>

          {estudiantes.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-tenue">Suma estudiantes a este curso con el selector de abajo.</p>
          ) : (
            <ul>
              {estudiantes.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-secundario text-[11px] font-extrabold text-white">
                    {e.iniciales}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{e.nombre}</div>
                    <div className="text-[11px] text-suave">{e.usuario}</div>
                  </div>
                  <select
                    id={`grupo-${e.id}`}
                    aria-label={`Grupo de ${e.nombre}`}
                    value={e.grupoId ?? ""}
                    disabled={pendiente || grupos.length === 0}
                    onChange={(ev) => hacer(() => asignarGrupo(e.id, ev.target.value || null))}
                    className="rounded-lg border border-borde-campo bg-superficie-suave px-2.5 py-1.5 text-[12.5px] disabled:opacity-60"
                  >
                    <option value="">{grupos.length ? "Sin grupo" : "Sin grupos aún"}</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={pendiente}
                    onClick={() => hacer(() => asignarCurso(e.id, null))}
                    aria-label={`Quitar a ${e.nombre} del curso`}
                    className="cursor-pointer text-[11px] font-bold text-apagado hover:text-peligro"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-[#F1EBE5] bg-superficie-suave px-[18px] py-3.5">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="sumar-estudiante" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                SUMAR AL CURSO
              </label>
              <select
                id="sumar-estudiante"
                value={aSumar}
                onChange={(e) => setASumar(e.target.value)}
                disabled={sinCurso.length === 0}
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie px-3 py-2 text-[13px] disabled:opacity-60"
              >
                <option value="">
                  {sinCurso.length ? "Estudiantes tuyos sin curso..." : "Todos tus estudiantes tienen curso"}
                </option>
                {sinCurso.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              disabled={pendiente || !aSumar}
              onClick={() => hacer(() => asignarCurso(aSumar, curso.id), () => setASumar(""))}
              className="cursor-pointer rounded-lg bg-secundario-fuerte px-4 py-2 text-[12.5px] font-bold text-white hover:bg-secundario disabled:opacity-50"
            >
              Sumar
            </button>
          </div>
        </section>

        <div className="grid content-start gap-[18px]">
          <section aria-labelledby="titulo-grupos" className="rounded-xl border border-borde bg-superficie p-5">
            <h2 id="titulo-grupos" className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
              GRUPOS DE TRABAJO
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-tenue">
              Para las actividades colectivas, como elegir juntos el lugar de la cartografía.
            </p>

            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                hacer(() => crearGrupo(curso.id, nombreGrupo), () => setNombreGrupo(""));
              }}
              className="mt-3 flex gap-2"
            >
              <label htmlFor="nombre-grupo" className="sr-only">
                Nombre del grupo nuevo
              </label>
              <input
                id="nombre-grupo"
                value={nombreGrupo}
                onChange={(e) => setNombreGrupo(e.target.value)}
                placeholder="ej. Los Robles"
                maxLength={LIMITES_CURSO.nombreMaximo}
                className="min-w-0 flex-1 rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2 text-[13px]"
              />
              <button
                type="submit"
                disabled={pendiente}
                className="cursor-pointer rounded-lg bg-primario-fuerte px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
              >
                Crear grupo
              </button>
            </form>

            {grupos.length > 0 && (
              <ul className="mt-3.5 grid grid-cols-1 gap-2">
                {grupos.map((g) => {
                  const miembros = estudiantes.filter((e) => e.grupoId === g.id);
                  return (
                    <li key={g.id} className="rounded-lg border border-borde px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{g.nombre}</span>
                        <span className="text-[11px] text-suave">{miembros.length}</span>
                        <button
                          disabled={pendiente}
                          onClick={() => hacer(() => eliminarGrupo(g.id))}
                          aria-label={`Eliminar el grupo ${g.nombre}`}
                          className="cursor-pointer text-[11px] font-bold text-apagado hover:text-peligro"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-tenue">
                        {miembros.length ? miembros.map((m) => m.nombre).join(", ") : "Sin miembros todavía"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {grupos.length > 0 && sinGrupo > 0 && (
              <button
                disabled={pendiente}
                onClick={() => hacer(() => repartirGrupos(curso.id))}
                className="mt-3 w-full cursor-pointer rounded-lg border border-secundario bg-secundario-tinte px-3 py-2 text-[12px] font-bold text-secundario-fuerte hover:bg-superficie disabled:opacity-50"
              >
                Repartir en los grupos a {sinGrupo === 1 ? "quien no tiene" : `los ${sinGrupo} que no tienen`}
              </button>
            )}
          </section>

          <section className="rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-[11px] font-bold tracking-[.12em] text-tenue">ELIMINAR EL CURSO</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-tenue">
              Se borran el curso y sus grupos. Los estudiantes no se borran: siguen siendo tuyos, sin curso.
            </p>
            <button
              disabled={pendiente}
              onClick={() => {
                if (confirm(`¿Eliminar el curso ${curso.nombre}? Sus estudiantes quedarán sin curso.`)) {
                  hacer(() => eliminarCurso(curso.id));
                }
              }}
              className="mt-2.5 cursor-pointer rounded-lg border border-peligro px-3.5 py-2 text-[12px] font-bold text-peligro hover:bg-primario-tinte disabled:opacity-50"
            >
              Eliminar curso
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
