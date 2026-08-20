"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CENTRO_COLOMBIA } from "@/lib/datos-geograficos";

// Leaflet necesita el DOM, así que el mapa solo se carga en el navegador.
const MapaReal = dynamic(() => import("@/components/mapa-real").then((m) => m.MapaReal), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] w-full items-center justify-center rounded-xl border border-borde bg-[#F4EFE8] text-[13px] text-tenue">
      Cargando el mapa...
    </div>
  ),
});

type Sesion = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string | null;
  tipo: string;
  pantalla: string;
  publicada: boolean;
  tieneContenido: boolean;
  subsecciones: { codigo: string; titulo: string }[];
};

type Eje = {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  objetivoGeneral: string | null;
  esPreambulo: boolean;
  tono: string;
  progreso: number;
  sesiones: Sesion[];
};

type Props = {
  ejes: Eje[];
  estaciones: { id: string; nombre: string; lat: number; lon: number; activo: boolean }[];
  casosSinUbicar: number;
  indicadores: { nombre: string; valor: number; color: string }[];
  equidad: number | null;
};

export function MapaViaje({ ejes, estaciones, indicadores, equidad, casosSinUbicar }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const ejeAbierto = ejes.find((e) => e.id === abierto) ?? null;

  return (
    <div className="animar-aparecer">
      <div className="mb-6 grid items-end gap-[18px] lg:grid-cols-2">
        <div>
          <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">TU VIAJE</div>
          <h1 className="mb-1.5 mt-2 text-[30px] font-extrabold tracking-[-.02em]">
            Mapa del Viaje por la Memoria
          </h1>
          <p className="max-w-[560px] text-[14px] leading-[1.65] text-apagado">
            {ejes.length > 0
              ? `Tu ruta pedagógica tiene ${ejes.length} ${ejes.length === 1 ? "eje" : "ejes"}, organizados como estaciones de un viaje cronológico. Abre cada estación para ver sus sesiones.`
              : "Aquí aparecerá tu ruta pedagógica cuando el docente publique las sesiones del módulo."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {indicadores.map((c) => (
            <div key={c.nombre} className="rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[10px] font-bold tracking-[.08em] text-suave">{c.nombre}</div>
              <div className="text-[22px] font-extrabold tracking-[-.02em]" style={{ color: c.color }}>
                {c.valor}
              </div>
            </div>
          ))}
          {equidad !== null && (
            <div className="col-span-3 rounded-[10px] border border-borde bg-superficie p-3">
              <div className="text-[10px] font-bold tracking-[.08em] text-suave">
                ÍNDICE DE EQUIDAD DEL SIMULADOR
              </div>
              <div className="text-[22px] font-extrabold tracking-[-.02em] text-secundario-fuerte">
                {equidad}%
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                <div className="h-full bg-secundario" style={{ width: `${equidad}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-[18px]">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[10px] font-extrabold tracking-[.12em] text-tenue">
            CASOS DE ESTUDIO · COLOMBIA
          </span>
          {casosSinUbicar > 0 && (
            <span className="text-[11px] text-suave">
              {casosSinUbicar} {casosSinUbicar === 1 ? "caso sin ubicar" : "casos sin ubicar"} en el mapa
            </span>
          )}
        </div>

        {estaciones.length > 0 ? (
          <MapaReal
            centro={CENTRO_COLOMBIA}
            zoom={5}
            alto={280}
            etiquetaAccesible="Mapa de Colombia con los casos de estudio de la plataforma."
            mostrarContornoPais
            puntos={estaciones.map((e) => ({
              id: e.id,
              lat: e.lat,
              lon: e.lon,
              etiqueta: e.nombre,
              destacado: e.activo,
            }))}
          />
        ) : (
          <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-borde bg-superficie text-[12.5px] text-tenue">
            Todavía no hay casos de estudio ubicados en el mapa
          </div>
        )}
      </div>

      {ejes.length === 0 && (
        <div className="rounded-[13px] border border-dashed border-borde bg-superficie px-6 py-12 text-center">
          <div className="text-[15px] font-bold">Tu ruta pedagógica todavía no está disponible</div>
          <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-[1.65] text-apagado">
            El administrador debe crear el módulo a partir de una guía del CNMH y el docente publicar
            sus sesiones. En cuanto lo haga, verás aquí los ejes del viaje por la memoria.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ejes.map((e) => {
          const estado = e.progreso === 100 ? "COMPLETO" : e.progreso > 0 ? "EN CURSO" : "SIN INICIAR";
          const activo = abierto === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setAbierto(activo ? null : e.id)}
              aria-expanded={activo}
              className={`cursor-pointer rounded-[13px] border border-borde bg-superficie p-[18px] text-left transition-all ${
                activo ? "-translate-y-0.5 shadow-[0_10px_26px_rgba(120,70,45,.12)]" : "shadow-[0_1px_2px_rgba(0,0,0,.03)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div
                  className="flex h-[34px] min-w-[34px] items-center justify-center rounded-[9px] px-2 text-[14px] font-extrabold text-white"
                  style={{ background: e.tono }}
                >
                  {e.esPreambulo ? "0" : e.numero}
                </div>
                <div
                  className="rounded-full px-[9px] py-1 text-[9.5px] font-extrabold tracking-[.08em]"
                  style={{
                    background: e.progreso === 100 ? "#E5F1F0" : e.progreso > 0 ? "#FDF4F0" : "#F3F0EC",
                    color: e.progreso === 100 ? "#177575" : e.progreso > 0 ? "#B8482A" : "#A79E96",
                  }}
                >
                  {estado}
                </div>
              </div>
              <div className="mt-3.5 text-[17px] font-bold tracking-[-.01em]">{e.nombre}</div>
              <p className="mb-3.5 mt-1.5 min-h-[58px] text-[12.5px] leading-[1.6] text-[#7C736C]">
                {e.descripcion}
              </p>
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                  <div className="h-full" style={{ width: `${e.progreso}%`, background: e.tono }} />
                </div>
                <span className="text-[11px] font-bold text-tenue">{e.progreso}%</span>
              </div>
              <div className="mt-3 border-t border-dashed border-borde pt-3 text-[11.5px] text-suave">
                {e.sesiones.length} {e.sesiones.length === 1 ? "sesión" : "sesiones"} ·{" "}
                {e.sesiones.filter((s) => s.publicada).length} publicadas
              </div>
            </button>
          );
        })}
      </div>

      {ejeAbierto && (
        <div className="animar-aparecer mt-[22px] rounded-[14px] border border-borde bg-superficie p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">
                {ejeAbierto.esPreambulo ? "PREÁMBULO" : `EJE ${ejeAbierto.numero}`}
              </div>
              <h2 className="mt-1.5 max-w-[640px] text-[22px] font-extrabold tracking-[-.02em]">
                {ejeAbierto.nombre}
              </h2>
              {ejeAbierto.objetivoGeneral && (
                <p className="mt-2 max-w-[640px] text-[12.5px] leading-[1.65] text-apagado">
                  <span className="font-bold text-tenue">Objetivo general · </span>
                  {ejeAbierto.objetivoGeneral}
                </p>
              )}
            </div>
            <button
              onClick={() => setAbierto(null)}
              className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[13px] py-2 text-[12px] font-semibold text-apagado"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-[18px] grid gap-2.5">
            {ejeAbierto.sesiones.map((s) => (
              <div
                key={s.codigo}
                className="flex items-start gap-3.5 rounded-[10px] border border-borde bg-superficie-suave px-[15px] py-[13px]"
              >
                <div className="w-[34px] flex-none pt-0.5 text-[12px] font-extrabold text-primario-fuerte">
                  {s.codigo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{s.titulo}</div>
                  <div className="text-[11px] tracking-[.06em] text-suave">{s.tipo}</div>
                  {s.objetivo && (
                    <p className="mt-1.5 text-[11.5px] leading-[1.6] text-[#7C736C]">{s.objetivo}</p>
                  )}
                  {s.subsecciones.length > 0 && (
                    <ul className="mt-2 grid gap-1 border-l-2 border-borde pl-3">
                      {s.subsecciones.map((sub) => (
                        <li key={sub.codigo} className="text-[11.5px] leading-[1.5] text-apagado">
                          <span className="font-bold text-suave">{sub.codigo}</span> {sub.titulo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {s.publicada ? (
                  <Link
                    href={`/estudiante/sesion/${s.id}`}
                    className="mt-0.5 flex-none rounded-lg border border-primario px-3.5 py-2 text-[12px] font-bold text-primario-fuerte no-underline hover:bg-primario-tinte hover:no-underline"
                  >
                    Abrir
                  </Link>
                ) : (
                  <span
                    title="El docente aún no ha publicado esta sesión"
                    className="mt-0.5 flex-none rounded-lg border border-borde px-3.5 py-2 text-[12px] font-bold text-suave"
                  >
                    No publicada
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
