"use client";

import { useTransition } from "react";
import Link from "next/link";
import { esGuiada, SE_PLANTEA } from "@/lib/actividades";
import { ACTIVIDADES } from "@/lib/importador-pdf";
import { alternarPublicacion } from "./actions";
import { RepartoPesos, type EjePeso } from "./reparto-pesos";
import { AlertasCuidado } from "./alertas-cuidado";
import { SolicitudesAcompanamiento, type SolicitudVista } from "./solicitudes-acompanamiento";

type Sesion = {
  id: string;
  codigo: string;
  titulo: string;
  eje: string;
  publicada: boolean;
  alertaCuidado: boolean;
  textoAlerta: string | null;
  pantalla: string;
  /** Si el docente ya planteó el dilema o la pregunta de esta sesión. */
  planteada: boolean;
};

type Props = {
  /** Selector del curso por el que se filtra el panel. */
  filtro: React.ReactNode;
  /** De quién habla el panel: "en tu grupo" o "en 10A · 2026". */
  ambito: string;
  promedioGlobal: number;
  /** Año del curso elegido, o el actual. */
  ciclo: number;
  /** Promedio del grupo en cada competencia ciudadana. */
  competencias: { id: string; nombre: string; porcentaje: number }[];
  /** Trabajos de los estudiantes que esperan comentario. */
  porRevisar: number;
  barras: { label: string; valor: number }[];
  subpoblaciones: { nombre: string; porcentaje: number; color: string }[];
  /** Estudiantes en grupos de menos de cinco, que no se muestran. */
  subpoblacionesOcultas: number;
  totalEstudiantes: number;
  ejes: EjePeso[];
  sesiones: Sesion[];
  solicitudes: SolicitudVista[];
};

/** Lo que el docente hace en la página de cada sesión. */
function textoEnlace(s: Sesion): string {
  if (esGuiada(s.pantalla) && SE_PLANTEA[s.pantalla]) {
    if (s.planteada) return "Ver el planteamiento";
    return s.pantalla === "dilema" ? "Plantear el dilema a tus estudiantes →" : "Plantear la pregunta de investigación →";
  }
  if (!ACTIVIDADES.some((a) => a.valor === s.pantalla && a.valor !== "zona")) return "Ver las anotaciones →";
  return "Abrir la sesión";
}

const COLORES_BARRA = ["#D95D39", "#E4886A", "#1B8A8A", "#EBB035", "#E4886A", "#177575"];

export function PanelDocente({
  filtro,
  ambito,
  promedioGlobal,
  ciclo,
  competencias,
  porRevisar,
  barras,
  subpoblaciones,
  subpoblacionesOcultas,
  totalEstudiantes,
  ejes,
  sesiones,
  solicitudes,
}: Props) {
  const [, iniciarTransicion] = useTransition();

  return (
    <div className="animar-aparecer">
      <h1 className="mb-1 text-[24px] font-extrabold tracking-[-.02em]">Panel del Docente</h1>
      <p className="mb-5 text-[13.5px] text-tenue">
        Seguimiento de la Ruta Pedagógica y bienestar emocional del grupo.
      </p>
      {filtro}

      {/* min-w-0 en las columnas: sin él, un nombre de eje largo ensancha su
          columna y estruja la de al lado en vez de recortarse. */}
      <div className="rejilla-panel-ancha">
        <div className="grid min-w-0 grid-cols-1 gap-[18px]">
          <div className="rounded-xl border border-borde bg-superficie p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[.12em] text-primario">PROGRESO COLECTIVO</span>
              <span className="rounded-full bg-[#F5E3DC] px-2.5 py-1 text-[10.5px] font-bold text-primario-fuerte">
                Ciclo {ciclo}
              </span>
            </div>
            <div className="mb-1 mt-2.5 text-[34px] font-extrabold tracking-[-.03em]">
              {promedioGlobal}% Completado
            </div>
            <div className="mb-[18px] text-[11.5px] text-suave">
              {totalEstudiantes === 0
                ? `Sin estudiantes ${ambito} todavía`
                : `${totalEstudiantes} ${totalEstudiantes === 1 ? "estudiante" : "estudiantes"} ${ambito}`}
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

          <section aria-labelledby="titulo-competencias-grupo" className="rounded-xl border border-borde bg-superficie p-5">
            <h2 id="titulo-competencias-grupo" className="text-[11px] font-bold tracking-[.12em] text-secundario-fuerte">
              COMPETENCIAS DEL GRUPO
            </h2>
            <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {competencias.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="font-semibold text-tinta-media">{c.nombre}</span>
                    <span className="font-extrabold">{c.porcentaje}%</span>
                  </div>
                  <div className="mt-1.5 h-[7px] overflow-hidden rounded-[9px] bg-[#F0EAE4]">
                    <div className="h-full bg-secundario" style={{ width: `${c.porcentaje}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-suave">
              Promedio de las actividades publicadas que trabajan cada competencia, según la guía.
            </p>
          </section>

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
                      {" · "}
                      {(ACTIVIDADES.find((a) => a.valor === s.pantalla)?.etiqueta ?? s.pantalla).toUpperCase()}
                      {s.alertaCuidado && " · CON ALERTA DE CUIDADO"}
                    </div>
                    <Link
                      href={`/docente/sesiones/${s.id}`}
                      aria-label={`${textoEnlace(s)}: sesión ${s.codigo}`}
                      className={`mt-1 inline-block text-[11.5px] font-bold no-underline hover:underline ${
                        esGuiada(s.pantalla) && SE_PLANTEA[s.pantalla] && !s.planteada ? "text-primario-fuerte" : "text-secundario-fuerte"
                      }`}
                    >
                      {textoEnlace(s)}
                    </Link>
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

        <div className="grid min-w-0 grid-cols-1 content-start gap-[18px]">
          <SolicitudesAcompanamiento solicitudes={solicitudes} />

          <Link
            href="/docente/revision?pendientes=1"
            className="flex items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-5 py-4 text-tinta no-underline hover:border-primario"
          >
            <span>
              <span className="block text-[11px] font-bold tracking-[.12em] text-tenue">REVISIÓN</span>
              <span className="mt-1 block text-[13px] font-semibold">
                {porRevisar === 0
                  ? "No hay trabajos esperando tu comentario."
                  : `${porRevisar} ${porRevisar === 1 ? "trabajo espera" : "trabajos esperan"} tu comentario`}
              </span>
            </span>
            <span aria-hidden="true" className="text-primario">→</span>
          </Link>

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
            {subpoblacionesOcultas > 0 && (
              <p className="mt-3 text-[11px] leading-snug text-suave">
                {subpoblacionesOcultas} en grupos de menos de cinco: no se muestran, para proteger su identidad.
              </p>
            )}
          </div>

          <AlertasCuidado sesiones={sesiones} />

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
