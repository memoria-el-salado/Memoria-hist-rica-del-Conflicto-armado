"use client";

import { useMemo, useState, useTransition, type CSSProperties, type DragEvent } from "react";
import {
  COSTO_SUBSIDIO,
  HECTAREAS_MAX_POR_FAMILIA,
  HECTAREAS_TOTALES,
  PRESUPUESTO_TOTAL,
  calcularEquidad,
  calcularTotales,
  validarDistribucion,
  type Criterio,
  type Familia,
  type Subsidio,
} from "@/lib/simulador";
import {
  LOTES,
  aAsignaciones,
  asignarLote,
  duenoDe,
  estadoDeFamilia,
  hectareasDe,
  riesgoDe,
  type Reparto,
  type Riesgo,
} from "@/lib/simulador-lotes";
import { guardarSimulacion, reiniciarSimulacion } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

/**
 * Simulador de Repartición de Tierras (CU03), con el plano del mockup de la
 * página 13: los lotes de la finca «La Esperanza» se arrastran o se tocan para
 * dárselos a las familias, y el subsidio se elige en la tarjeta de cada una.
 * Las reglas de equidad son las de `lib/simulador.ts`.
 */

const pesos = (n: number) => "$" + n.toLocaleString("es-CO");
const numero = (loteId: string) => loteId.slice(1);

const SUBSIDIOS: { valor: Subsidio; etiqueta: string }[] = [
  { valor: "NINGUNO", etiqueta: "Sin subsidio" },
  { valor: "AGRICULTURA", etiqueta: `Agricultura (${pesos(COSTO_SUBSIDIO.AGRICULTURA)})` },
  { valor: "RIEGO", etiqueta: `Riego (${pesos(COSTO_SUBSIDIO.RIEGO)})` },
];

const PRIORIDAD: Record<Familia["prioridad"], { texto: string; clase: string }> = {
  ALTA: { texto: "ALTA PRIORIDAD", clase: "bg-primario-tinte text-primario-fuerte" },
  MEDIA: { texto: "MEDIA", clase: "bg-[#F3F0EC] text-apagado" },
  BAJA: { texto: "BAJA", clase: "bg-[#F3F0EC] text-suave" },
};

const RIESGO: Record<Riesgo, { color: string; fondo: string }> = {
  BAJO: { color: "#177575", fondo: "#F1F7F6" },
  MEDIO: { color: "#8A6516", fondo: "#FDF8EF" },
  ALTO: { color: "#C0392B", fondo: "#FDF0EE" },
};

type Props = {
  sesion: DatosSesion;
  familias: Familia[];
  inicial: Reparto;
  /** Hay una simulación guardada por hectáreas, de antes del plano. */
  repartoAnterior: boolean;
};

export function SimuladorTierras({ sesion, familias, inicial, repartoAnterior }: Props) {
  const [reparto, setReparto] = useState<Reparto>(inicial);
  const [familiaElegida, setFamiliaElegida] = useState<string | null>(null);
  const [loteElegido, setLoteElegido] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [pendiente, iniciar] = useTransition();

  const asignaciones = useMemo(() => aAsignaciones(reparto), [reparto]);
  const totales = calcularTotales(familias, asignaciones);
  const equidad = calcularEquidad(familias, asignaciones);
  const riesgo = riesgoDe(familias, asignaciones);
  const duenos = duenoDe(reparto);
  const porId = new Map(familias.map((f) => [f.id, f]));
  const restante = PRESUPUESTO_TOTAL - totales.gasto;

  function cambiar(nuevo: Reparto) {
    setReparto(nuevo);
    setError("");
    setMensaje("");
    setCriterios([]);
  }

  function dar(loteId: string, familiaId: string | null) {
    const r = asignarLote(reparto, loteId, familiaId);
    if ("error" in r) return setError(r.error);
    cambiar(r.reparto);
  }

  function tocarLote(loteId: string) {
    if (familiaElegida) {
      dar(loteId, familiaElegida);
      setFamiliaElegida(null);
      return;
    }
    setLoteElegido(loteElegido === loteId ? null : loteId);
  }

  function soltar(e: DragEvent, loteId: string) {
    e.preventDefault();
    const familiaId = e.dataTransfer.getData("text/plain");
    if (porId.has(familiaId)) dar(loteId, familiaId);
  }

  function elegirSubsidio(familiaId: string, subsidio: Subsidio) {
    cambiar({ ...reparto, [familiaId]: { lotes: reparto[familiaId]?.lotes ?? [], subsidio } });
  }

  function validar() {
    setCriterios(validarDistribucion(familias, asignaciones));
    iniciar(async () => {
      const r = await guardarSimulacion({ sesionId: sesion.id, reparto });
      setMensaje(r.error ?? `Distribución guardada. Índice de equidad: ${r.equidad ?? equidad}%.`);
    });
  }

  function reiniciar() {
    cambiar({});
    setFamiliaElegida(null);
    setLoteElegido(null);
    iniciar(async () => {
      await reiniciarSimulacion(sesion.id);
    });
  }

  const elegido = LOTES.find((l) => l.id === loteElegido);

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <p className="max-w-[620px] text-[13.5px] leading-[1.65] text-apagado">
          Imagina que eres facilitador de la Reforma Agraria. Tu misión es repartir los lotes de la finca «La Esperanza»
          ({HECTAREAS_TOTALES} ha) y {pesos(PRESUPUESTO_TOTAL)} en subsidios entre las {familias.length} familias
          retornadas, con equidad según lo que cada una necesita.
        </p>
        <dl className="flex flex-wrap gap-2.5">
          <Indicador titulo="PRESUPUESTO RESTANTE" valor={pesos(restante)} color={restante < 0 ? "#C0392B" : "#B8482A"} fondo={restante < 0 ? "#FDF0EE" : "#FDF4F0"} />
          <Indicador titulo="HECTÁREAS DISPONIBLES" valor={`${HECTAREAS_TOTALES - totales.hectareas} ha`} color="#177575" fondo="#F1F7F6" />
        </dl>
      </div>

      {repartoAnterior && (
        <p className="mt-3 rounded-lg border border-terciario-borde bg-terciario-tinte px-4 py-2.5 text-[12.5px] leading-[1.6] text-tinta-media">
          Tu reparto anterior era por hectáreas sueltas. Ahora la tierra se reparte por lotes: vuelve a asignarlos y
          valida de nuevo.
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section aria-labelledby="titulo-familias" className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 id="titulo-familias" className="text-[12px] font-extrabold tracking-[.04em]">
              Familias sin tierra ({familias.length - totales.atendidas})
            </h2>
            <span className="text-[11px] italic text-suave">Arrastra para asignar</span>
          </div>
          <ul className="grid max-h-[720px] gap-2.5 overflow-auto pr-1">
            {familias.map((f) => {
              const r = reparto[f.id];
              const lotes = r?.lotes ?? [];
              const ha = hectareasDe(lotes);
              const esta = familiaElegida === f.id;
              const marcas = [f.cabezaMujer && "Mujer cabeza de hogar", f.etnica && "Comunidad étnica", f.retornada && "Retornada"].filter(Boolean);
              return (
                <li
                  key={f.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", f.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  aria-label={f.nombre}
                  className={`cursor-grab rounded-xl border bg-superficie px-3.5 py-3 ${
                    esta ? "border-primario ring-2 ring-primario-borde" : ha > 0 ? "border-secundario-borde" : "border-borde"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13.5px] font-bold">{f.nombre}</h3>
                    <span className={`flex-none rounded-full px-2 py-[3px] text-[9px] font-extrabold tracking-[.06em] ${PRIORIDAD[f.prioridad].clase}`}>
                      {PRIORIDAD[f.prioridad].texto}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-tenue">
                    {f.personas} miembros · {f.menores} menores
                    {marcas.length > 0 && <> · {marcas.join(" · ")}</>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`text-[11.5px] font-bold ${ha > 0 ? "text-secundario-fuerte" : "text-suave"}`}>
                      {ha > 0 ? `${ha} ha · lote ${lotes.map(numero).join(", ")}` : "Sin tierra"}
                    </span>
                    <button
                      type="button"
                      aria-pressed={esta}
                      onClick={() => {
                        setFamiliaElegida(esta ? null : f.id);
                        setLoteElegido(null);
                      }}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-bold ${esta ? "bg-primario-fuerte text-white" : "border border-borde-campo text-apagado hover:border-primario"}`}
                    >
                      {esta ? "Elegida" : "Elegir"}
                    </button>
                  </div>
                  <label htmlFor={`subsidio-${f.id}`} className="sr-only">
                    Subsidio para {f.nombre}
                  </label>
                  <select
                    id={`subsidio-${f.id}`}
                    value={r?.subsidio ?? "NINGUNO"}
                    onChange={(e) => elegirSubsidio(f.id, e.target.value as Subsidio)}
                    className="mt-2 w-full rounded-lg border border-borde-campo bg-superficie-suave px-2 py-1.5 text-[12px]"
                  >
                    {SUBSIDIOS.map((s) => (
                      <option key={s.valor} value={s.valor}>
                        {s.etiqueta}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid min-w-0 content-start gap-4">
          <section aria-labelledby="titulo-plano" className="rounded-2xl border border-borde bg-[#EFEAE4] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="titulo-plano" className="text-[15px] font-bold">
                  Mapa de predios: Vereda El Salado
                </h2>
                <p className="text-[11.5px] text-apagado">Subdivisiones de la finca «La Esperanza»</p>
              </div>
              <dl className="flex gap-2">
                <Indicador titulo="EQUIDAD" valor={`${equidad}%`} color={equidad >= 70 ? "#177575" : "#8A6516"} fondo="#fff" />
                <Indicador titulo="RIESGO" valor={riesgo} color={RIESGO[riesgo].color} fondo={RIESGO[riesgo].fondo} />
              </dl>
            </div>

            <p className="mt-3 text-[11.5px] leading-[1.55] text-apagado">
              Arrastra una familia a un lote, o elígela y toca el lote. También puedes tocar un lote para elegir a quién
              dárselo. Una familia puede tener varios lotes, hasta {HECTAREAS_MAX_POR_FAMILIA} ha.
            </p>

            {error && (
              <p role="alert" className="mt-2 rounded-lg bg-[#FDF0EE] px-3 py-2 text-[12px] font-semibold text-peligro">
                {error}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-8 sm:grid-rows-[repeat(5,minmax(76px,auto))]">
              {LOTES.map((l) => {
                const familia = porId.get(duenos.get(l.id) ?? "");
                const estado = familia ? estadoDeFamilia(familia, asignaciones[familia.id]) : null;
                const bien = estado && estado.tierra === "SUFICIENTE" && estado.subsidio !== "INSUFICIENTE";
                const pequeno = l.ancho === 1 && l.alto === 1;
                const posicion = { "--col": `${l.col} / span ${l.ancho}`, "--fila": `${l.fila} / span ${l.alto}` } as CSSProperties;
                return (
                  <button
                    key={l.id}
                    type="button"
                    data-lote={l.id}
                    aria-pressed={loteElegido === l.id}
                    onClick={() => tocarLote(l.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => soltar(e, l.id)}
                    style={posicion}
                    className={`relative flex min-h-[76px] min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed px-1 pb-1.5 pt-6 text-center sm:[grid-column:var(--col)] sm:[grid-row:var(--fila)] ${
                      loteElegido === l.id ? "ring-2 ring-primario" : ""
                    } ${familia ? (bien ? "border-[#2E9B5E] bg-superficie" : "border-peligro bg-superficie") : "border-[#D9CFC6] bg-[#F7F3EF] hover:border-primario"}`}
                  >
                    <span
                      className={`absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-[2px] text-[9px] font-extrabold ${
                        familia ? (bien ? "bg-[#2E9B5E] text-white" : "bg-peligro text-white") : "bg-[#E9DDD3] text-apagado"
                      }`}
                    >
                      {pequeno ? (
                        <>
                          L{numero(l.id)} · {l.hectareas}
                          <span className="sr-only"> ha</span>
                        </>
                      ) : (
                        `LOTE ${numero(l.id)} (${l.hectareas} ha)`
                      )}
                    </span>
                    {familia && estado ? (
                      <>
                        <span className="w-full truncate text-[11.5px] font-bold">{familia.nombre.replace(/^Familia /, "")}</span>
                        {/* En los lotes pequeños el estado no cabe a la vista: lo dice el borde, y el lector de pantalla lo lee. */}
                        <span className={pequeno ? "sr-only" : "grid gap-px text-[9.5px] leading-tight"}>
                          <Estado bien={estado.tierra === "SUFICIENTE"} texto={estado.tierra === "SUFICIENTE" ? "Hectáreas OK" : `Pocas ha (${estado.minimo} sugeridas)`} />
                          {estado.subsidio !== "NINGUNO" && (
                            <Estado bien={estado.subsidio === "JUSTO"} texto={estado.subsidio === "JUSTO" ? "Subsidio justo" : "Subsidio insuficiente"} />
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold tracking-[.06em] text-apagado">
                        {pequeno ? (
                          <>
                            <span aria-hidden="true">+</span>
                            <span className="sr-only">Asignar familia</span>
                          </>
                        ) : (
                          "+ ASIGNAR FAMILIA"
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {elegido && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-superficie p-3">
                <label htmlFor="familia-del-lote" className="text-[12.5px] font-bold">
                  Lote {numero(elegido.id)} ({elegido.hectareas} ha):
                </label>
                <select
                  id="familia-del-lote"
                  value={duenos.get(elegido.id) ?? ""}
                  onChange={(e) => dar(elegido.id, e.target.value || null)}
                  className="min-w-0 flex-1 rounded-lg border border-borde-campo bg-superficie-suave px-2 py-1.5 text-[12.5px]"
                >
                  <option value="">Libre</option>
                  {familias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} · {hectareasDe(reparto[f.id]?.lotes ?? [])} ha
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setLoteElegido(null)} className="cursor-pointer rounded-md border border-borde-campo px-3 py-1.5 text-[12px] font-bold text-apagado">
                  Listo
                </button>
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <section aria-labelledby="titulo-criterios" className="rounded-xl border border-borde bg-superficie p-[18px]">
              <h2 id="titulo-criterios" className="text-[11px] font-extrabold tracking-[.12em]">
                CRITERIOS DE VALIDACIÓN
              </h2>
              <ul className="mt-3 grid gap-2.5" aria-live="polite">
                {(criterios.length
                  ? criterios
                  : [{ color: "#A79E96", titulo: "Sin validar", detalle: "Reparte los lotes y los subsidios, y pulsa «Validar distribución» para ver el dictamen." }]
                ).map((c) => (
                  <li key={c.titulo} className="flex items-start gap-2.5">
                    <span className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full" style={{ background: c.color }} />
                    <div>
                      <div className="text-[12.5px] font-bold" style={{ color: c.color }}>
                        {c.titulo}
                      </div>
                      <div className="text-[11.5px] leading-[1.55] text-[#7C736C]">{c.detalle}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={validar}
                  disabled={pendiente}
                  className="cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
                >
                  {pendiente ? "Guardando..." : "Validar distribución"}
                </button>
                <button
                  type="button"
                  onClick={reiniciar}
                  disabled={pendiente}
                  className="cursor-pointer rounded-lg border border-borde-campo px-4 py-2.5 text-[12.5px] font-semibold text-apagado disabled:opacity-60"
                >
                  Reiniciar
                </button>
              </div>
              {mensaje && (
                <p role="status" className="mt-2 text-[12px] font-semibold text-secundario-fuerte">
                  {mensaje}
                </p>
              )}
            </section>

            <aside className="rounded-xl border border-terciario-borde bg-terciario-tinte p-4">
              <div className="flex items-center gap-[7px] text-[10.5px] font-bold tracking-[.1em] text-terciario-fuerte">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>NOTA DEL ARCHIVO</span>
              </div>
              <p className="mt-2 text-[12px] italic leading-[1.65] text-[#7C736C]">
                «La tierra no es solo un recurso productivo; es el cimiento de la dignidad del retorno. En El Salado, la
                repartición fue un hito de autogestión comunitaria.»
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Indicador({ titulo, valor, color, fondo }: { titulo: string; valor: string; color: string; fondo: string }) {
  return (
    <div className="min-w-[96px] rounded-[10px] border px-3.5 py-2" style={{ borderColor: color, background: fondo, color }}>
      <dt className="text-[9px] font-bold tracking-[.1em] opacity-80">{titulo}</dt>
      <dd className="text-[19px] font-extrabold">{valor}</dd>
    </div>
  );
}

function Estado({ bien, texto }: { bien: boolean; texto: string }) {
  return (
    <span className={`flex items-center justify-center gap-1 ${bien ? "text-tinta-media" : "font-bold text-peligro"}`}>
      <span className={`h-1.5 w-1.5 flex-none rounded-full ${bien ? "bg-[#2E9B5E]" : "bg-peligro"}`} aria-hidden="true" />
      {texto}
    </span>
  );
}
