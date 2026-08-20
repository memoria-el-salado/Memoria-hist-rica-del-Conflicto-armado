"use client";

import { useActionState, useRef } from "react";
import { BotonRestablecer } from "@/components/boton-restablecer";
import { FormularioUsuario, type Entrega } from "@/components/formulario-usuario";
import { crearEstudiante, restablecerEstudiante } from "./actions";

type Estudiante = {
  id: string;
  nombre: string;
  usuario: string;
  iniciales: string;
  subpoblacion: string | null;
  /** Sigue con la contraseña provisional: todavía no ha entrado a elegir la suya. */
  provisional: boolean;
  avance: number;
  creadoEn: string;
};

export function GestionEstudiantes({
  estudiantes,
  sugerencia,
}: {
  estudiantes: Estudiante[];
  sugerencia: string;
}) {
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

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
            <span className="text-[13px] font-extrabold">Estudiantes del grupo</span>
            <span className="text-[11px] font-bold text-suave">{estudiantes.length}</span>
          </div>

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
                className="flex items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3.5 last:border-b-0"
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
                    {e.subpoblacion ? ` · ${e.subpoblacion}` : ""} · alta el {e.creadoEn}
                  </div>
                </div>
                <div className="w-24 flex-none">
                  <div className="mb-1 text-right text-[10.5px] font-bold text-tenue">
                    {e.avance}%
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EAE4]">
                    <div className="h-full bg-primario" style={{ width: `${e.avance}%` }} />
                  </div>
                </div>
                <BotonRestablecer id={e.id} nombre={e.nombre} accion={restablecerEstudiante} />
              </div>
            ))
          )}
        </div>

        <FormularioUsuario
          sugerencia={sugerencia}
          conSubpoblacion
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
