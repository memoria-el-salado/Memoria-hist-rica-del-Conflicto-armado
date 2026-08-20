"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { CENTRO_EL_SALADO } from "@/lib/datos-geograficos";
import { guardarMarca } from "@/app/estudiante/sesion/[id]/actions";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";

// Leaflet necesita el DOM, así que el mapa solo se carga en el navegador.
const MapaReal = dynamic(() => import("@/components/mapa-real").then((m) => m.MapaReal), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-borde bg-[#F4EFE8] text-[13px] text-tenue">
      Cargando el mapa...
    </div>
  ),
});

const SENSACIONES = [
  "Olor a leña",
  "Sabor a café",
  "Sonido de gaita",
  "Recuerdo de infancia",
  "Tierra mojada",
  "Voces de familia",
];

type Marca = {
  id: string;
  lugar: string;
  relato: string;
  audio: string;
  tags: string[];
  lat: number;
  lon: number;
  autor: string;
};

export function CartografiaSocial({
  sesion,
  marcas,
}: {
  sesion: DatosSesion;
  marcas: Marca[];
}) {
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [lugar, setLugar] = useState("");
  const [relato, setRelato] = useState("");
  const [sensaciones, setSensaciones] = useState<string[]>([]);
  const [grabando, setGrabando] = useState(false);
  const [grabado, setGrabado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [ok, setOk] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function marcarPunto(lat: number, lon: number) {
    setPin({ lat, lon });
    setMensaje("");
  }

  function sembrar() {
    if (!pin) {
      setOk(false);
      return setMensaje("Primero marca un punto en el mapa.");
    }
    iniciarTransicion(async () => {
      const res = await guardarMarca({
        sesionId: sesion.id,
        lugar,
        relato,
        tags: sensaciones,
        lat: pin.lat,
        lon: pin.lon,
        conAudio: grabado,
      });
      if (res.error) {
        setOk(false);
        setMensaje(res.error);
        return;
      }
      setOk(true);
      setMensaje(res.ok!);
      setPin(null);
      setLugar("");
      setRelato("");
      setSensaciones([]);
      setGrabado(false);
    });
  }

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <p className="mb-5 max-w-[720px] text-[13.5px] leading-[1.65] text-apagado">
        Marca en el mapa un lugar significativo y describe qué olores, sabores y recuerdos te evoca.
        Lo que sitúes aquí queda en la cartografía de esta sesión.
      </p>

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div>
          <MapaReal
            centro={CENTRO_EL_SALADO}
            zoom={12}
            alto={420}
            etiquetaAccesible="Mapa de los Montes de María. Haz clic para marcar un lugar significativo."
            onClick={marcarPunto}
            puntos={marcas.map((m) => ({
              id: m.id,
              lat: m.lat,
              lon: m.lon,
              etiqueta: m.lugar,
            }))}
            provisional={pin ? { ...pin, etiqueta: lugar || "Nuevo lugar" } : null}
          />

          {!pin && (
            <p className="mt-2 text-center text-[11.5px] text-tenue">
              Haz clic en el mapa para marcar tu lugar significativo.
            </p>
          )}

          <div className="mt-3.5 grid gap-2.5">
            {marcas.map((m) => (
              <div key={m.id} className="rounded-[10px] border border-borde bg-superficie px-4 py-3.5">
                <div className="flex justify-between gap-2.5">
                  <div className="text-[14px] font-bold">{m.lugar}</div>
                  <div className="text-[11px] text-suave">{m.audio}</div>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-[1.6] text-apagado">{m.relato}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {m.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-secundario-borde bg-secundario-tinte px-2 py-[3px] text-[10.5px] font-bold tracking-[.04em] text-secundario-fuerte"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto text-[10.5px] text-suave">{m.autor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-borde bg-superficie p-5">
          <div className="text-[12.5px] font-extrabold tracking-[.06em] text-primario-fuerte">
            NUEVO LUGAR SIGNIFICATIVO
          </div>

          <div className="mt-3.5 text-[10px] font-bold tracking-[.12em] text-tenue">
            COORDENADA SELECCIONADA
          </div>
          <div className="mt-1.5 rounded-lg border border-dashed border-borde-campo px-3 py-2.5 text-[12px] text-apagado">
            {pin
              ? `Lat ${pin.lat.toFixed(5)}  ·  Lon ${pin.lon.toFixed(5)}`
              : "Sin coordenada · haz clic en el mapa"}
          </div>

          <label htmlFor="lugar" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
            NOMBRE DEL LUGAR
          </label>
          <input
            id="lugar"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="ej. El patio de mi abuela"
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <label htmlFor="relato" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
            ¿QUÉ OLORES, SABORES Y RECUERDOS TE EVOCA?
          </label>
          <textarea
            id="relato"
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            placeholder="Escribe tu relato personal..."
            className="mt-1.5 h-24 w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <div className="mt-3.5 text-[10px] font-bold tracking-[.12em] text-tenue">SENSACIONES</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SENSACIONES.map((s) => {
              const activo = sensaciones.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={activo}
                  onClick={() =>
                    setSensaciones((prev) => (activo ? prev.filter((x) => x !== s) : [...prev, s]))
                  }
                  className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
                  style={
                    activo
                      ? { background: "#1B8A8A", borderColor: "#1B8A8A", color: "#fff" }
                      : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              if (grabando) {
                setGrabando(false);
                setGrabado(true);
              } else {
                setGrabando(true);
                setGrabado(false);
              }
            }}
            className="mt-3.5 w-full cursor-pointer rounded-lg border px-4 py-2.5 text-[12.5px] font-bold"
            style={
              grabando
                ? { borderColor: "#C0392B", background: "#FDF0EE", color: "#C0392B" }
                : { borderColor: "#1B8A8A", background: "transparent", color: "#177575" }
            }
          >
            {grabando ? "■  Detener grabación" : grabado ? "✓  Audio grabado (0:18)" : "●  Grabar relato en audio"}
          </button>

          <button
            onClick={sembrar}
            disabled={pendiente}
            className="mt-2.5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {pendiente ? "Sembrando..." : "Sembrar en el mapa"}
          </button>

          {mensaje && (
            <div
              role="status"
              className={`mt-2.5 text-[11.5px] font-semibold ${ok ? "text-secundario-fuerte" : "text-peligro"}`}
            >
              {mensaje}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
