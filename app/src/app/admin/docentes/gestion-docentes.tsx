"use client";

import { useActionState, useRef } from "react";
import { BotonRestablecer } from "@/components/boton-restablecer";
import { FormularioUsuario, type Entrega } from "@/components/formulario-usuario";
import { crearDocente, restablecerDocente } from "./actions";

type Docente = {
  id: string;
  nombre: string;
  usuario: string;
  iniciales: string;
  estudiantes: number;
  /** Sigue con la contraseña provisional: todavía no ha entrado a elegir la suya. */
  provisional: boolean;
  creadoEn: string;
};

export function GestionDocentes({
  docentes,
  sugerencia,
}: {
  docentes: Docente[];
  sugerencia: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, accion, pendiente] = useActionState(
    crearDocente,
    null as { ok?: string; error?: string; entrega?: Entrega } | null
  );

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">
        CU01 · GESTIÓN DE CUENTAS
      </div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Docentes</h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Las cuentas siguen una cadena de responsabilidad: la administración da de alta a los docentes y
        cada docente da de alta a sus estudiantes. Nadie se registra por su cuenta.
      </p>

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
            <span className="text-[13px] font-extrabold">Docentes registrados</span>
            <span className="text-[11px] font-bold text-suave">{docentes.length}</span>
          </div>

          {docentes.length === 0 ? (
            <p className="px-5 py-10 text-center text-[12.5px] leading-[1.6] text-tenue">
              Todavía no hay docentes.
              <br />
              Crea el primero con el formulario de al lado.
            </p>
          ) : (
            docentes.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3.5 last:border-b-0"
              >
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terciario text-[11px] font-extrabold text-white">
                  {d.iniciales}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-bold">{d.nombre}</span>
                    {d.provisional && (
                      <span className="rounded-full bg-[#FBF1DC] px-2 py-0.5 text-[10px] font-bold text-[#8A6410]">
                        Contraseña provisional
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-suave">
                    {d.usuario} · alta el {d.creadoEn} · {d.estudiantes}{" "}
                    {d.estudiantes === 1 ? "estudiante" : "estudiantes"}
                  </div>
                </div>
                <BotonRestablecer id={d.id} nombre={d.nombre} accion={restablecerDocente} />
              </div>
            ))
          )}
        </div>

        <FormularioUsuario
          sugerencia={sugerencia}
          titulo="NUEVO DOCENTE"
          textoBoton="Crear docente"
          pendiente={pendiente}
          mensaje={estado}
          accion={accion}
          formRef={formRef}
        />
      </div>
    </div>
  );
}
