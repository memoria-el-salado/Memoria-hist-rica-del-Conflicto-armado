"use client";

import { useMemo, useState, useTransition } from "react";
import {
  COSTO_SUBSIDIO,
  HECTAREAS_MAX_POR_FAMILIA,
  HECTAREAS_TOTALES,
  PRESUPUESTO_TOTAL,
  calcularEquidad,
  calcularTotales,
  validarDistribucion,
  type Asignacion,
  type Criterio,
  type Familia,
  type Subsidio,
} from "@/lib/simulador";
import { guardarSimulacion, reiniciarSimulacion } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");

const SUBSIDIOS: { valor: Subsidio; label: string; color: string }[] = [
  { valor: "RIEGO", label: `Riego ${pesos(COSTO_SUBSIDIO.RIEGO)}`, color: "#1B8A8A" },
  { valor: "AGRICULTURA", label: `Agricultura ${pesos(COSTO_SUBSIDIO.AGRICULTURA)}`, color: "#EBB035" },
];

type Props = {
  sesion: DatosSesion;
  familias: Familia[];
  iniciales: Record<string, Asignacion>;
};

export function SimuladorTierras({ sesion, familias, iniciales }: Props) {
  const [asignaciones, setAsignaciones] = useState(iniciales);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [pendiente, iniciarTransicion] = useTransition();

  const totales = useMemo(() => calcularTotales(familias, asignaciones), [familias, asignaciones]);
  const equidad = useMemo(() => calcularEquidad(familias, asignaciones), [familias, asignaciones]);

  function ajustar(id: string, delta: number) {
    setAsignaciones((prev) => {
      const actual = prev[id] ?? { hectareas: 0, subsidio: "NINGUNO" as Subsidio };
      return {
        ...prev,
        [id]: {
          ...actual,
          hectareas: Math.max(0, Math.min(HECTAREAS_MAX_POR_FAMILIA, actual.hectareas + delta)),
        },
      };
    });
  }

  function alternarSubsidio(id: string, valor: Subsidio) {
    setAsignaciones((prev) => {
      const actual = prev[id] ?? { hectareas: 0, subsidio: "NINGUNO" as Subsidio };
      return {
        ...prev,
        [id]: { ...actual, subsidio: actual.subsidio === valor ? "NINGUNO" : valor },
      };
    });
  }

  function validar() {
    setCriterios(validarDistribucion(familias, asignaciones));
    iniciarTransicion(async () => {
      await guardarSimulacion({ sesionId: sesion.id, asignaciones });
    });
  }

  function reiniciar() {
    const vacio: Record<string, Asignacion> = {};
    for (const f of familias) vacio[f.id] = { hectareas: 0, subsidio: "NINGUNO" };
    setAsignaciones(vacio);
    setCriterios([]);
    iniciarTransicion(async () => {
      await reiniciarSimulacion(sesion.id);
    });
  }

  const excedePresupuesto = totales.gasto > PRESUPUESTO_TOTAL;
  const kpi = (color: string, fondo: string) => ({
    borderColor: color,
    background: fondo,
    color,
  });

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <p className="max-w-[620px] text-[13.5px] leading-[1.65] text-apagado">
            Eres facilitador de la Reforma Agraria. Reparte {HECTAREAS_TOTALES} hectáreas entre{" "}
            {familias.length} familias administrando un presupuesto de {pesos(PRESUPUESTO_TOTAL)} en subsidios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <div className="min-w-[104px] rounded-[10px] border px-3.5 py-2.5" style={kpi("#1B8A8A", "#F1F7F6")}>
            <div className="text-[9.5px] font-bold tracking-[.1em] opacity-75">HECTÁREAS</div>
            <div className="text-[20px] font-extrabold">
              {totales.hectareas} / {HECTAREAS_TOTALES}
            </div>
          </div>
          <div
            className="min-w-[104px] rounded-[10px] border px-3.5 py-2.5"
            style={kpi(excedePresupuesto ? "#C0392B" : "#B8482A", excedePresupuesto ? "#FDF0EE" : "#FDF4F0")}
          >
            <div className="text-[9.5px] font-bold tracking-[.1em] opacity-75">PRESUPUESTO</div>
            <div className="text-[20px] font-extrabold">{pesos(PRESUPUESTO_TOTAL - totales.gasto)}</div>
          </div>
          <div
            className="min-w-[104px] rounded-[10px] border px-3.5 py-2.5"
            style={kpi(equidad >= 70 ? "#177575" : "#A8791C", equidad >= 70 ? "#F1F7F6" : "#FDF8EF")}
          >
            <div className="text-[9.5px] font-bold tracking-[.1em] opacity-75">EQUIDAD</div>
            <div className="text-[20px] font-extrabold">{equidad}%</div>
          </div>
        </div>
      </div>

      <div className="mt-[22px] rejilla-panel-ancha">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-[#F1EBE5] px-4 py-[13px]">
            <span className="text-[12px] font-extrabold tracking-[.05em]">
              FAMILIAS PENDIENTES ({familias.length - totales.atendidas})
            </span>
            <button
              onClick={reiniciar}
              className="cursor-pointer rounded-[7px] border border-borde-campo bg-superficie px-[11px] py-1.5 text-[11px] font-semibold text-apagado"
            >
              Reiniciar
            </button>
          </div>
          <div className="grid max-h-[560px] gap-2.5 overflow-auto p-3">
            {familias.map((f) => {
              const a = asignaciones[f.id] ?? { hectareas: 0, subsidio: "NINGUNO" as Subsidio };
              const marcas = [
                f.cabezaMujer ? "Mujer cabeza de familia" : null,
                f.etnica ? "Comunidad étnica" : null,
                f.retornada ? "Retornada" : null,
              ].filter(Boolean);
              return (
                <div
                  key={f.id}
                  className="rounded-[10px] border px-[15px] py-[13px]"
                  style={{
                    borderColor: a.hectareas > 0 ? "#CFE6E4" : "#EDE7E1",
                    background: a.hectareas > 0 ? "#F7FBFA" : "#fff",
                  }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-[13.5px] font-bold">{f.nombre}</div>
                      <div className="mt-[3px] text-[11px] text-tenue">
                        {f.personas} personas · {f.menores} menores
                        {marcas.length ? ` · ${marcas.join(" · ")}` : ""}
                      </div>
                    </div>
                    <div
                      className="rounded-full px-2 py-[3px] text-[9.5px] font-extrabold tracking-[.06em]"
                      style={{
                        background: f.prioridad === "ALTA" ? "#FDF4F0" : "#F3F0EC",
                        color: f.prioridad === "ALTA" ? "#B8482A" : "#A79E96",
                      }}
                    >
                      {f.prioridad}
                    </div>
                  </div>
                  <div className="mt-[11px] flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-borde-campo bg-superficie-suave px-1.5 py-1">
                      <button
                        onClick={() => ajustar(f.id, -5)}
                        aria-label={`Quitar 5 hectáreas a ${f.nombre}`}
                        className="h-6 w-6 cursor-pointer rounded-md bg-[#F0EAE4] font-extrabold text-apagado"
                      >
                        −
                      </button>
                      <span className="min-w-[56px] text-center text-[12.5px] font-bold">
                        {a.hectareas} ha
                      </span>
                      <button
                        onClick={() => ajustar(f.id, 5)}
                        aria-label={`Añadir 5 hectáreas a ${f.nombre}`}
                        className="h-6 w-6 cursor-pointer rounded-md bg-[#F5E3DC] font-extrabold text-primario-fuerte"
                      >
                        +
                      </button>
                    </div>
                    {SUBSIDIOS.map((s) => {
                      const activo = a.subsidio === s.valor;
                      return (
                        <button
                          key={s.valor}
                          aria-pressed={activo}
                          onClick={() => alternarSubsidio(f.id, s.valor)}
                          className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
                          style={
                            activo
                              ? { background: s.color, borderColor: s.color, color: "#fff" }
                              : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
                          }
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3.5 xl:sticky xl:top-2.5">
          <div className="rounded-xl border border-borde bg-superficie p-[18px]">
            <div className="mb-3.5 text-[12px] font-extrabold tracking-[.05em]">
              MAPA DE PREDIOS · VEREDA EL SALADO
            </div>
            <div className="grid grid-cols-4 gap-[7px]">
              {Array.from({ length: 12 }, (_, i) => {
                const fertil = i % 3 !== 2;
                const usado = totales.hectareas > i * 17;
                return (
                  <div
                    key={i}
                    className="flex h-[46px] items-center justify-center rounded-[7px] border text-[8.5px] font-extrabold tracking-[.06em]"
                    style={{
                      borderColor: usado ? "#D95D39" : fertil ? "#1B8A8A" : "#EBB035",
                      background: usado ? "#E9D9D2" : fertil ? "#CFE6E4" : "#F6E3C6",
                      color: usado ? "#B8482A" : fertil ? "#177575" : "#8A6516",
                    }}
                  >
                    {fertil ? "FÉRTIL" : "ÁRIDA"}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3.5 text-[11px] text-tenue">
              <span className="flex items-center gap-1.5">
                <span className="h-[11px] w-[11px] rounded-[3px] border border-secundario bg-secundario-borde" />
                Fértil
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[11px] w-[11px] rounded-[3px] border border-terciario bg-[#F6E3C6]" />
                Árida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[11px] w-[11px] rounded-[3px] border border-primario bg-[#E9D9D2]" />
                Asignada
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-borde bg-superficie p-[18px]">
            <div className="text-[12px] font-extrabold tracking-[.05em]">DISTRIBUCIÓN</div>
            <div className="mt-3 flex justify-between text-[11px] text-tenue">
              <span>Hectáreas asignadas</span>
              <span className="font-bold text-tinta">
                {totales.hectareas} / {HECTAREAS_TOTALES} ha
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
              <div
                className="h-full bg-secundario"
                style={{ width: `${Math.min(100, (totales.hectareas / HECTAREAS_TOTALES) * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-tenue">
              <span>Presupuesto usado</span>
              <span className="font-bold text-tinta">
                {pesos(totales.gasto)} / {pesos(PRESUPUESTO_TOTAL)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, (totales.gasto / PRESUPUESTO_TOTAL) * 100)}%`,
                  background: excedePresupuesto ? "#C0392B" : "#D95D39",
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-tenue">
              <span>Familias atendidas</span>
              <span className="font-bold text-tinta">
                {totales.atendidas} de {familias.length}
              </span>
            </div>
            <button
              onClick={validar}
              disabled={pendiente}
              className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
            >
              {pendiente ? "Guardando..." : "Validar distribución"}
            </button>
          </div>

          <div className="rounded-xl border border-borde bg-superficie p-[18px]">
            <div className="text-[12px] font-extrabold tracking-[.05em]">CRITERIOS DE VALIDACIÓN</div>
            <div className="mt-3 grid gap-2.5" aria-live="polite">
              {(criterios.length
                ? criterios
                : [
                    {
                      color: "#A79E96",
                      titulo: "Sin validar",
                      detalle:
                        'Asigna hectáreas y subsidios, luego pulsa "Validar distribución" para ver el dictamen del sistema.',
                    },
                  ]
              ).map((c) => (
                <div key={c.titulo} className="flex items-start gap-2.5">
                  <span
                    className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full"
                    style={{ background: c.color }}
                  />
                  <div>
                    <div className="text-[12.5px] font-bold" style={{ color: c.color }}>
                      {c.titulo}
                    </div>
                    <div className="text-[11.5px] leading-[1.55] text-[#7C736C]">{c.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-terciario-borde bg-terciario-tinte p-4">
            <div className="flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.1em] text-terciario-fuerte">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>NOTA DEL ARCHIVO</span>
            </div>
            <p className="mt-2 text-[12px] italic leading-[1.65] text-[#7C736C]">
              &quot;La tierra no está en el mercado productivo: es el centro de la dignidad del campesino.&quot;
              Testimonio recopilado en el Archivo Vivo de El Salado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
