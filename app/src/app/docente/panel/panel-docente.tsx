"use client";

import { useActionState, useTransition } from "react";
import { activarProtocolo, alternarPublicacion } from "./actions";
import { RepartoPesos, type EjePeso } from "./reparto-pesos";

type Sesion = {
  id: string;
  codigo: string;
  titulo: string;
  eje: string;
  publicada: boolean;
  alertaCuidado: boolean;
};

type Props = {
  promedioGlobal: number;
  barras: { label: string; valor: number }[];
  subpoblaciones: { nombre: string; porcentaje: number; color: string }[];
  totalEstudiantes: number;
  ejes: EjePeso[];
  sesiones: Sesion[];
};

const COLORES_BARRA = ["#D95D39", "#E4886A", "#1B8A8A", "#EBB035", "#E4886A", "#177575"];

export function PanelDocente({
  promedioGlobal,
  barras,
  subpoblaciones,
  totalEstudiantes,
  ejes,
  sesiones,
}: Props) {
  const [, iniciarTransicion] = useTransition();
  const [estado, accionProtocolo, pendienteProtocolo] = useActionState(
    activarProtocolo,
    null as { ok?: string; error?: string } | null
  );

  const sensibles = sesiones.filter((s) => s.alertaCuidado || /masacre|dolor|éxodo|desplaza/i.test(s.titulo));

  return (
    <div className="animar-aparecer">
      <h1 className="mb-1 text-[24px] font-extrabold tracking-[-.02em]">Panel del Docente</h1>
      <p className="mb-5 text-[13.5px] text-tenue">
        Seguimiento de la Ruta Pedagógica y bienestar emocional del grupo.
      </p>

      {/* min-w-0 en las columnas: sin él, un nombre de eje largo ensancha su
          columna y estruja la de al lado en vez de recortarse. */}
      <div className="rejilla-panel-ancha">
        <div className="grid min-w-0 grid-cols-1 gap-[18px]">
          <div className="rounded-xl border border-borde bg-superficie p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[.12em] text-primario">PROGRESO COLECTIVO</span>
              <span className="rounded-full bg-[#F5E3DC] px-2.5 py-1 text-[10.5px] font-bold text-primario-fuerte">
                Ciclo 2026
              </span>
            </div>
            <div className="mb-1 mt-2.5 text-[34px] font-extrabold tracking-[-.03em]">
              {promedioGlobal}% Completado
            </div>
            <div className="mb-[18px] text-[11.5px] text-suave">
              {totalEstudiantes === 0
                ? "Sin estudiantes en el grupo todavía"
                : `${totalEstudiantes} ${totalEstudiantes === 1 ? "estudiante" : "estudiantes"} en tu grupo`}
            </div>
            <div
              className="grid h-[130px] items-end gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.max(barras.length, 1)}, minmax(0,1fr))` }}
            >
              {barras.map((b, i) => (
                <div key={b.label} className="flex h-full flex-col justify-end gap-[7px]">
                  <div
                    className="rounded-t-md"
                    style={{
                      height: `${Math.max(b.valor, 3)}%`,
                      background: COLORES_BARRA[i % COLORES_BARRA.length],
                    }}
                    title={`${b.label}: ${b.valor}%`}
                  />
                  <div className="text-center text-[9.5px] font-bold text-suave">{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
              <span className="text-[13px] font-extrabold">Gestión de Sesiones</span>
              <span className="text-[11px] font-bold text-suave">
                {sesiones.filter((s) => s.publicada).length} de {sesiones.length} publicadas
              </span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {sesiones.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3.5 border-b border-[#F7F2ED] px-[18px] py-3.5"
                >
                  <div className="w-[34px] text-[13px] font-extrabold text-[#DCD3CB]">{s.codigo}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{s.titulo}</div>
                    <div className="text-[10.5px] tracking-[.06em] text-suave">
                      {s.eje}
                      {s.alertaCuidado && " · CON ALERTA DE CUIDADO"}
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-suave">
                    {s.publicada ? "PUBLICADA" : "BORRADOR"}
                  </span>
                  <button
                    role="switch"
                    aria-checked={s.publicada}
                    aria-label={`${s.publicada ? "Despublicar" : "Publicar"} la sesión ${s.codigo}`}
                    onClick={() => iniciarTransicion(async () => { await alternarPublicacion(s.id); })}
                    className="flex h-[22px] w-10 cursor-pointer rounded-full p-0.5"
                    style={{
                      background: s.publicada ? "#D95D39" : "#E1DAD3",
                      justifyContent: s.publicada ? "flex-end" : "flex-start",
                    }}
                  >
                    <span className="block h-[18px] w-[18px] rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-[18px]">
          <div className="rounded-xl border border-borde bg-superficie p-5">
            <div className="text-[11px] font-bold tracking-[.12em] text-tenue">SUB-POBLACIONES</div>
            {totalEstudiantes === 0 && (
              <p className="mt-3 text-[12px] leading-[1.6] text-tenue">
                Todavía no has creado estudiantes. Hazlo desde <strong>Mis Estudiantes</strong> y aquí
                verás cómo se distribuye tu grupo.
              </p>
            )}
            <div className="mt-3.5 grid gap-3.5">
              {subpoblaciones.map((s) => (
                <div key={s.nombre}>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-semibold text-tinta-media">{s.nombre}</span>
                    <span className="font-extrabold">{s.porcentaje}%</span>
                  </div>
                  <div className="mt-1.5 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                    <div className="h-full" style={{ width: `${s.porcentaje}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            action={accionProtocolo}
            className="rounded-xl border border-primario-borde bg-primario-tinte p-5"
          >
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[.1em] text-primario-fuerte">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              <span>ALERTAS DE CUIDADO</span>
            </div>
            <p className="mb-3.5 mt-2.5 text-[12px] leading-[1.65] text-[#7C736C]">
              Ofrecemos herramientas para mantener un entorno seguro ante contenidos emocionalmente retadores.
            </p>
            <label htmlFor="sesionId" className="text-[10px] font-bold tracking-[.1em] text-tenue">
              APLICAR ALERTA A
            </label>
            <select
              id="sesionId"
              name="sesionId"
              defaultValue=""
              className="mt-1.5 w-full rounded-lg border border-[#E9D3C9] bg-superficie px-3 py-2.5 text-[13px]"
            >
              <option value="">Seleccionar sesión...</option>
              {sensibles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} {s.titulo}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pendienteProtocolo}
              className="mt-2.5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2.5 text-[11.5px] font-bold tracking-[.06em] text-white hover:bg-primario-hover disabled:opacity-60"
            >
              {pendienteProtocolo ? "ACTIVANDO..." : "ACTIVAR PROTOCOLO DE APOYO"}
            </button>
            {estado?.ok && (
              <div role="status" className="mt-2.5 text-[11.5px] font-semibold text-secundario-fuerte">
                {estado.ok}
              </div>
            )}
            {estado?.error && (
              <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
                {estado.error}
              </div>
            )}
          </form>

          <RepartoPesos ejes={ejes} />

          <div className="rounded-xl border border-borde bg-superficie p-5">
            <div className="text-[11px] font-bold tracking-[.12em] text-tenue">
              RECOMENDACIÓN DE CUIDADO
            </div>
            <p className="mt-2.5 text-[12.5px] leading-[1.7] text-apagado">
              Antes de abrir una sesión marcada con alerta de cuidado, conviene anunciarla, acordar
              una señal para pausar y recordar al grupo que nadie está obligado a continuar. Al
              cerrar, deja un momento para hablar de cómo quedaron.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
