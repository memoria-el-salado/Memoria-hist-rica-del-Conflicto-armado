"use client";

import { useTransition } from "react";
import type { Requisito } from "@/lib/transcripcion";
import { ejecutarAuditoria } from "./actions";

type Fila = {
  id: string;
  titulo: string;
  detalle: string;
  requisito: Requisito;
  alternativa: boolean;
  sincronizada: boolean;
  descripcion: boolean;
  visible: boolean;
  pendiente: string | null;
};

type Props = {
  filas: Fila[];
  ultimaRevision: string;
};

function Estado({ ok, si, no }: { ok: boolean | null; si: string; no: string }) {
  if (ok === null) return <span className="text-[10.5px] font-bold text-[#CFC7C0]">NO APLICA</span>;
  return (
    <span className={`text-[10.5px] font-extrabold tracking-[.05em] ${ok ? "text-secundario-fuerte" : "text-peligro"}`}>
      {ok ? si : no}
    </span>
  );
}

export function AuditoriaAccesibilidad({ filas, ultimaRevision }: Props) {
  const [pendiente, iniciarTransicion] = useTransition();

  const accesibles = filas.filter((f) => f.alternativa && f.descripcion).length;
  const porcentaje = filas.length ? Math.round((accesibles / filas.length) * 100) : 100;
  const ocultos = filas.filter((f) => !f.visible).length;
  const color = porcentaje >= 90 ? "#177575" : porcentaje >= 70 ? "#A8791C" : "#C0392B";

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU10 · CALIDAD</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Validación de Accesibilidad Universal
      </h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Cada recurso se valida con sus propios datos. Un audio necesita transcripción (WCAG 1.2.1) y un video
        subido, subtítulos sincronizados (WCAG 1.2.2); mientras falten, los estudiantes no lo ven. Lo corrige
        el docente que lo cargó.
      </p>

      <div className="mb-[18px] flex flex-wrap gap-3.5">
        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[10px] font-bold tracking-[.12em] text-tenue">RECURSOS ACCESIBLES</div>
          <div className="text-[30px] font-extrabold tracking-[-.03em]" style={{ color }}>
            {porcentaje}%
          </div>
          <div className="mt-2 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]">
            <div className="h-full" style={{ width: `${porcentaje}%`, background: color }} />
          </div>
        </div>

        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[10px] font-bold tracking-[.12em] text-tenue">RECURSOS VALIDADOS</div>
          <div className="text-[30px] font-extrabold tracking-[-.03em]">{filas.length}</div>
          <div className="mt-1.5 text-[11.5px] text-suave">
            {ocultos ? `${ocultos} sin publicar hasta que se corrijan` : "Todos visibles para los estudiantes"}
          </div>
        </div>

        <div className="flex min-w-[180px] flex-1 flex-col justify-center rounded-xl border border-borde bg-superficie p-[18px]">
          <button
            onClick={() => iniciarTransicion(async () => { await ejecutarAuditoria(); })}
            disabled={pendiente}
            className="cursor-pointer rounded-lg bg-secundario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-secundario disabled:opacity-60"
          >
            {pendiente ? "Validando..." : "Ejecutar validación"}
          </button>
          <div className="mt-2 text-center text-[11px] text-suave">Última validación: {ultimaRevision}</div>
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borde-campo p-5 text-[13px] text-apagado">
          Todavía no hay recursos multimedia cargados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.8fr] gap-2.5 border-b border-[#F1EBE5] bg-superficie-suave px-[18px] py-3 text-[10px] font-bold tracking-[.1em] text-suave">
              <span>CONTENIDO</span>
              <span>ALTERNATIVA</span>
              <span>SINCRONÍA</span>
              <span>ESTUDIANTES</span>
              <span>QUÉ FALTA</span>
            </div>
            {filas.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.8fr] items-center gap-2.5 border-b border-[#F7F2ED] px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[13px] font-bold">{f.titulo}</div>
                  <div className="text-[11px] text-suave">{f.detalle}</div>
                </div>
                <Estado
                  ok={f.requisito === "ninguno" ? f.descripcion : f.alternativa}
                  si={f.requisito === "ninguno" ? "DESCRITO" : "CUMPLE"}
                  no="FALTA"
                />
                {/* Solo falta si el recurso la exige: un video subido. */}
                <Estado
                  ok={f.requisito === "ninguno" ? null : f.sincronizada || f.requisito === "texto"}
                  si={f.sincronizada ? "SINCRONIZADA" : "NO REQUERIDA"}
                  no="FALTA"
                />
                <Estado ok={f.visible} si="LO VEN" no="NO LO VEN" />
                <span className="text-[11.5px] text-apagado">{f.pendiente ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
