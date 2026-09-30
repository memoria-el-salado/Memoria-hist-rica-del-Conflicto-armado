"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { BotonRestablecer } from "@/components/boton-restablecer";
import { FormularioUsuario, type Entrega } from "@/components/formulario-usuario";
import { crearEstudiante, restablecerEstudiante } from "./actions";
import { asignarCurso } from "../cursos/actions";
import { DeclaracionSubpoblacion } from "./declaracion-subpoblacion";

type Estudiante = {
  id: string;
  nombre: string;
  usuario: string;
  iniciales: string;
  subpoblacion: string | null;
  /** Fecha en que el docente registró la autorización del acudiente. */
  autorizadaEl: string | null;
  /** Sigue con la contraseña provisional: todavía no ha entrado a elegir la suya. */
  provisional: boolean;
  cursoId: string | null;
  avance: number;
  creadoEn: string;
};

export function GestionEstudiantes({
  estudiantes,
  sugerencia,
  cursos,
}: {
  estudiantes: Estudiante[];
  sugerencia: string;
  cursos: { id: string; etiqueta: string }[];
}) {
  const [moviendo, iniciar] = useTransition();
  const [avisoCurso, setAvisoCurso] = useState<{ ok?: string; error?: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion, pendiente] = useActionState(
    crearEstudiante,
    null as { ok?: string; error?: string; entrega?: Entrega } | null
  );

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">
        CU01 · GESTIÓN DE CUENTAS
      </div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Mis estudiantes</h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Da de alta a los estudiantes de tu grupo y entrégales sus credenciales. Solo verás aquí a los
        que tú hayas creado, y son los que aparecen en tu panel de seguimiento.
      </p>

      <div className="rejilla-panel">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
            <span className="text-[13px] font-extrabold">Estudiantes del grupo</span>
            <span className="text-[11px] font-bold text-suave">{estudiantes.length}</span>
          </div>
          {avisoCurso && (
            <div
              role={avisoCurso.error ? "alert" : "status"}
              className={`border-b border-[#F1EBE5] px-[18px] py-2 text-[11.5px] font-semibold ${
                avisoCurso.error ? "text-peligro" : "text-secundario-fuerte"
              }`}
            >
              {avisoCurso.error ?? avisoCurso.ok}
            </div>
          )}

          {estudiantes.length === 0 ? (
            <p className="px-5 py-10 text-center text-[12.5px] leading-[1.6] text-tenue">
              Todavía no has creado estudiantes.
              <br />
              Usa el formulario de al lado para dar de alta al primero.
            </p>
          ) : (
            estudiantes.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3.5 last:border-b-0"
              >
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-secundario text-[11px] font-extrabold text-white">
                  {e.iniciales}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-bold">{e.nombre}</span>
                    {e.provisional && (
                      <span className="rounded-full bg-[#FBF1DC] px-2 py-0.5 text-[10px] font-bold text-[#8A6410]">
                        Contraseña provisional
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-suave">
                    {e.usuario}
                    {" "}· alta el {e.creadoEn}
                  </div>
                </div>
                {cursos.length > 0 && (
                  <select
                    aria-label={`Curso de ${e.nombre}`}
                    value={e.cursoId ?? ""}
                    disabled={moviendo}
                    onChange={(ev) =>
                      iniciar(async () => setAvisoCurso(await asignarCurso(e.id, ev.target.value || null)))
                    }
                    className="max-w-[150px] rounded-lg border border-borde-campo bg-superficie-suave px-2 py-1.5 text-[12px] disabled:opacity-60"
                  >
                    <option value="">Sin curso</option>
                    {cursos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                )}
                <div className="w-24 flex-none">
                  <div className="mb-1 text-right text-[10.5px] font-bold text-tenue">
                    {e.avance}%
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EAE4]">
                    <div className="h-full bg-primario" style={{ width: `${e.avance}%` }} />
                  </div>
                </div>
                <BotonRestablecer id={e.id} nombre={e.nombre} accion={restablecerEstudiante} />
                <DeclaracionSubpoblacion estudiante={e} />
              </div>
            ))
          )}
        </div>

        <FormularioUsuario
          sugerencia={sugerencia}
          cursos={cursos.length ? cursos : undefined}
          titulo="NUEVO ESTUDIANTE"
          textoBoton="Crear estudiante"
          pendiente={pendiente}
          mensaje={estado}
          accion={accion}
          formRef={formRef}
        />
      </div>
    </div>
  );
}
