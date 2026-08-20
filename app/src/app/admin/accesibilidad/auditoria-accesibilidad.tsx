"use client";

import { useTransition } from "react";
import { corregirHallazgo, ejecutarAuditoria } from "./actions";

type Fila = {
  id: string;
  titulo: string;
  descripcion: string;
  transcripcion: boolean;
  contraste: boolean;
  responsivo: boolean;
};

type Props = {
  filas: Fila[];
  ultimaRevision: string;
};

export function AuditoriaAccesibilidad({ filas, ultimaRevision }: Props) {
  const [pendiente, iniciarTransicion] = useTransition();

  const totalChecks = filas.length * 3;
  const aprobados = filas.reduce(
    (s, f) => s + (f.transcripcion ? 1 : 0) + (f.contraste ? 1 : 0) + (f.responsivo ? 1 : 0),
    0
  );
  const porcentaje = totalChecks ? Math.round((aprobados / totalChecks) * 100) : 100;
  const conHallazgos = filas.filter((f) => !f.transcripcion || !f.contraste || !f.responsivo).length;
  const color = porcentaje >= 90 ? "#177575" : porcentaje >= 70 ? "#A8791C" : "#C0392B";

  const estilo = (ok: boolean) =>
    `text-[10.5px] font-extrabold tracking-[.05em] ${ok ? "text-secundario-fuerte" : "text-peligro"}`;

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU10 · CALIDAD</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Validación de Accesibilidad Universal
      </h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        El sistema verifica que todo contenido audiovisual tenga alternativas textuales sincronizadas,
        contraste suficiente y comportamiento responsivo para zonas con infraestructura limitada.
      </p>

      <div className="mb-[18px] flex flex-wrap gap-3.5">
        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[10px] font-bold tracking-[.12em] text-tenue">CUMPLIMIENTO GLOBAL</div>
          <div className="text-[30px] font-extrabold tracking-[-.03em]" style={{ color }}>
            {porcentaje}%
          </div>
          <div className="mt-2 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]">
            <div className="h-full" style={{ width: `${porcentaje}%`, background: color }} />
          </div>
        </div>

        <div className="min-w-[180px] flex-1 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[10px] font-bold tracking-[.12em] text-tenue">RECURSOS AUDITADOS</div>
          <div className="text-[30px] font-extrabold tracking-[-.03em]">{filas.length}</div>
          <div className="mt-1.5 text-[11.5px] text-suave">
            {conHallazgos ? `${conHallazgos} con hallazgos abiertos` : "Sin hallazgos abiertos"}
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
          <div className="mt-2 text-center text-[11px] text-suave">
            Última validación: {ultimaRevision}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] gap-2.5 border-b border-[#F1EBE5] bg-superficie-suave px-[18px] py-3 text-[10px] font-bold tracking-[.1em] text-suave">
            <span>CONTENIDO</span>
            <span>TRANSCRIPCIÓN</span>
            <span>CONTRASTE</span>
            <span>RESPONSIVO</span>
            <span>ACCIÓN</span>
          </div>
          {filas.map((f) => {
            const falla = !f.transcripcion || !f.contraste || !f.responsivo;
            return (
              <div
                key={f.id}
                className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr] items-center gap-2.5 border-b border-[#F7F2ED] px-[18px] py-3.5"
              >
                <div>
                  <div className="text-[13px] font-bold">{f.titulo}</div>
                  <div className="text-[11px] text-suave">{f.descripcion}</div>
                </div>
                <span className={estilo(f.transcripcion)}>{f.transcripcion ? "CUMPLE" : "FALTA"}</span>
                <span className={estilo(f.contraste)}>{f.contraste ? "CUMPLE" : "BAJO"}</span>
                <span className={estilo(f.responsivo)}>{f.responsivo ? "CUMPLE" : "FALLA"}</span>
                {falla ? (
                  <button
                    onClick={() => iniciarTransicion(async () => { await corregirHallazgo(f.id); })}
                    disabled={pendiente}
                    className="cursor-pointer justify-self-start rounded-[7px] border border-primario bg-primario-tinte px-3 py-1.5 text-[11px] font-bold text-primario-fuerte disabled:opacity-60"
                  >
                    Corregir
                  </button>
                ) : (
                  <span className="justify-self-start px-3 py-1.5 text-[11px] font-bold text-[#CFC7C0]">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
