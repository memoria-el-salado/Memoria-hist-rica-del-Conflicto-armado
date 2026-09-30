"use client";

import { useState, useTransition } from "react";
import type { Postura } from "@/lib/foros";
import { alternarForo, asignarPostura, repartirRoles } from "../actions";

type Estudiante = { id: string; nombre: string; postura: Postura | null };

/** Panel del docente: quién defiende qué y si el debate sigue abierto. */
export function RepartoRoles({
  foroId,
  abierto,
  rolA,
  rolB,
  estudiantes,
}: {
  foroId: string;
  abierto: boolean;
  rolA: string;
  rolB: string;
  estudiantes: Estudiante[];
}) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState("");
  const sinRol = estudiantes.filter((e) => !e.postura).length;

  return (
    <aside className="h-fit rounded-xl border border-borde bg-superficie p-4 xl:sticky xl:top-4">
      <div className="text-[10px] font-bold tracking-[.12em] text-tenue">ROLES DEL DEBATE</div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-apagado">
        Quien entra sin rol recibe el del bando con menos gente. Puedes cambiarlo aquí.
      </p>

      {estudiantes.length === 0 ? (
        <p className="mt-3 text-[12px] text-apagado">Todavía no tienes estudiantes.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {estudiantes.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate">{e.nombre}</span>
              <label className="sr-only" htmlFor={`rol-${e.id}`}>
                Rol de {e.nombre}
              </label>
              <select
                id={`rol-${e.id}`}
                value={e.postura ?? ""}
                disabled={pendiente}
                onChange={(ev) =>
                  iniciar(async () => {
                    const res = await asignarPostura(foroId, e.id, ev.target.value as Postura);
                    setAviso(res.error ?? "");
                  })
                }
                className="rounded-md border border-borde-campo bg-superficie-suave px-1.5 py-1 text-[11.5px]"
              >
                <option value="" disabled>
                  Sin rol
                </option>
                <option value="A">A · {rolA}</option>
                <option value="B">B · {rolB}</option>
              </select>
            </li>
          ))}
        </ul>
      )}

      {sinRol > 0 && (
        <button
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const res = await repartirRoles(foroId);
              setAviso(typeof res.ok === "string" ? res.ok : (res.error ?? ""));
            })
          }
          className="mt-3 w-full cursor-pointer rounded-lg border border-primario-borde bg-primario-tinte px-3 py-2 text-[11.5px] font-bold text-primario-fuerte disabled:opacity-60"
        >
          {sinRol === 1 ? "Dar rol al estudiante que falta" : `Repartir a los ${sinRol} que faltan`}
        </button>
      )}

      <button
        disabled={pendiente}
        onClick={() => iniciar(async () => void (await alternarForo(foroId)))}
        className="mt-3 w-full cursor-pointer rounded-lg border border-borde-campo px-3 py-2 text-[11.5px] font-bold text-tinta-media hover:border-primario/40 disabled:opacity-60"
      >
        {abierto ? "Cerrar el debate" : "Reabrir el debate"}
      </button>

      {aviso && (
        <p role="status" className="mt-2 text-[11.5px] font-semibold text-apagado">
          {aviso}
        </p>
      )}
    </aside>
  );
}
