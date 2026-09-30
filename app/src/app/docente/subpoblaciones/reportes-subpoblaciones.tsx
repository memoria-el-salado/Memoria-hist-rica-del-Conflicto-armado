"use client";

import { useState, useTransition } from "react";
import { generarReporte } from "./actions";

type Fila = {
  nombre: string;
  estudiantes: number;
  avance: number;
  entregas: number;
  color: string;
  recomendacion: string;
};

type Props = {
  /** Selector del curso por el que se filtran los reportes. */
  filtro: React.ReactNode;
  filas: Fila[];
  /** Estudiantes de grupos de menos de cinco, que no se muestran. */
  ocultos: number;
  total: number;
  reportes: { id: string; resumen: string }[];
};

export function ReportesSubpoblaciones({ filtro, filas, ocultos, total, reportes }: Props) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="animar-aparecer max-w-[1000px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU07</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Seguimiento de Subpoblaciones
      </h1>
      <p className="mb-5 max-w-[660px] text-[13.5px] leading-[1.65] text-apagado">
        Reportes diferenciados para identificar si el diseño del curso afecta de forma distinta a los
        estudiantes según su nivel o contexto previo.
      </p>
      <div className="mb-4 flex max-w-[760px] items-start gap-2.5 rounded-[10px] border border-secundario-borde bg-secundario-tinte px-4 py-3 text-[12.5px] leading-[1.6] text-[#3F6E6C]">
        <svg className="mt-0.5 flex-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>
          Son datos sensibles de menores (Ley 1581 de 2012). Solo cuentan las subpoblaciones declaradas con la
          autorización del acudiente, que registras en <strong>Mis Estudiantes</strong>; las demás van como «Sin
          declarar». Ningún grupo de menos de cinco estudiantes se muestra.
        </span>
      </div>
      {filtro}

      <div className="mb-[18px] overflow-x-auto rounded-xl border border-borde bg-superficie">
        <div className="min-w-[720px]">
          <div className="rejilla-subpoblaciones gap-2.5 border-b border-[#F1EBE5] bg-superficie-suave px-[18px] py-3 text-[10px] font-bold tracking-[.1em] text-suave">
            <span>SUBPOBLACIÓN</span>
            <span>ESTUDIANTES</span>
            <span>AVANCE</span>
            <span>ENTREGAS</span>
            <span>RECOMENDACIÓN</span>
          </div>
          {filas.length === 0 && (
            <p className="px-[18px] py-10 text-center text-[12.5px] leading-[1.6] text-tenue">
              Todavía no tienes estudiantes en el grupo.
              <br />
              Créalos desde <strong>Mis Estudiantes</strong> para ver aquí los reportes diferenciados.
            </p>
          )}
          {ocultos > 0 && (
            <p className="border-b border-[#F7F2ED] px-[18px] py-3 text-[12px] text-tenue">
              {ocultos === 1 ? "1 estudiante está" : `${ocultos} estudiantes están`} en grupos de menos de cinco y no{" "}
              {ocultos === 1 ? "se muestra" : "se muestran"}, para que nadie pueda ser identificado. De {total} en total.
            </p>
          )}
          {filas.map((f) => (
            <div
              key={f.nombre}
              className="rejilla-subpoblaciones items-center gap-2.5 border-b border-[#F7F2ED] px-[18px] py-3.5 text-[12.5px]"
            >
              <span className="font-bold">{f.nombre}</span>
              <span className="text-apagado">{f.estudiantes}</span>
              <span className="font-extrabold" style={{ color: f.color }}>
                {f.avance}%
              </span>
              <span className="text-apagado">{f.entregas}</span>
              <span className="text-[11.5px] text-[#7C736C]">{f.recomendacion}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          iniciarTransicion(async () => {
            const res = await generarReporte();
            setAviso(res?.error ?? null);
          })
        }
        disabled={pendiente || filas.length === 0}
        className="cursor-pointer rounded-lg border border-secundario bg-transparent px-[18px] py-[11px] text-[13px] font-bold text-secundario-fuerte hover:bg-secundario-tinte disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? "Generando..." : "Generar reporte diferenciado"}
      </button>

      {aviso && (
        <div role="alert" className="mt-3 text-[11.5px] font-semibold text-peligro">
          {aviso}
        </div>
      )}

      <div className="mt-4 grid gap-2" aria-live="polite">
        {reportes.map((r) => (
          <div
            key={r.id}
            className="rounded-[9px] border border-secundario-borde bg-secundario-tinte px-[15px] py-3 text-[12.5px] text-[#3F6E6C]"
          >
            {r.resumen}
          </div>
        ))}
      </div>
    </div>
  );
}
