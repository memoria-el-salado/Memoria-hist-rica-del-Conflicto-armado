"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { CENTRO_EL_SALADO } from "@/lib/datos-geograficos";
import {
  descartarAdjunto,
  guardarMarca,
  prepararAdjunto,
  retirarMarca,
  subirAdjuntoLocal,
} from "@/app/estudiante/sesion/[id]/acciones-cartografia";
import { duracion, validarMarca, type ClaseAdjunto } from "@/lib/cartografia";
import { subirConProgreso } from "@/lib/subir-con-progreso";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";
import { FotoLugar, type Foto } from "./foto-lugar";
import { GrabadorRelato, type Grabacion } from "./grabador-relato";

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
  /** Duración de la grabación, o null si el relato no se grabó. */
  audioSegundos: number | null;
  conFoto: boolean;
  tags: string[];
  lat: number;
  lon: number;
  autor: string;
  grupo: string | null;
  propia: boolean;
};

export function CartografiaSocial({
  sesion,
  marcas,
  miGrupo,
}: {
  sesion: DatosSesion;
  marcas: Marca[];
  /** Nombre del grupo de trabajo del estudiante, si tiene. */
  miGrupo: string | null;
}) {
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [lugar, setLugar] = useState("");
  const [relato, setRelato] = useState("");
  const [sensaciones, setSensaciones] = useState<string[]>([]);
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [deGrupo, setDeGrupo] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ok, setOk] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function marcarPunto(lat: number, lon: number) {
    setPin({ lat, lon });
    setMensaje("");
  }

  function avisar(texto: string, bien = false) {
    setOk(bien);
    setMensaje(texto);
  }

  /** Sube un adjunto directo al depósito; devuelve su ruta o el motivo del fallo. */
  async function subir(clase: ClaseAdjunto, blob: Blob): Promise<{ ruta: string } | { error: string }> {
    const prep = await prepararAdjunto(sesion.id, clase, { mime: blob.type, tamano: blob.size });
    if (prep.error || !prep.ruta) return { error: prep.error ?? "No se pudo preparar la subida." };
    const que = clase === "audio" ? "la grabación" : "la foto";
    setProgreso(`Subiendo ${que}...`);
    let subido: boolean;
    if (prep.url) {
      subido = await subirConProgreso(prep.url, blob, prep.mime!, (p) => setProgreso(`Subiendo ${que} · ${p} %`));
    } else {
      const fd = new FormData();
      fd.append("archivo", blob);
      subido = Boolean((await subirAdjuntoLocal(sesion.id, prep.ruta, fd)).ok);
    }
    return subido ? { ruta: prep.ruta } : { error: `No se pudo subir ${que}. Revisa la conexión e inténtalo de nuevo.` };
  }

  function sembrar() {
    if (!pin) return avisar("Primero marca un punto en el mapa.");
    const error = validarMarca({ lugar, relato, conAudio: Boolean(grabacion) });
    if (error) return avisar(error);

    iniciarTransicion(async () => {
      const subidas: string[] = [];
      const fallar = async (texto: string) => {
        // Lo que alcanzó a subirse no queda huérfano en el depósito.
        await Promise.all(subidas.map((r) => descartarAdjunto(r)));
        setProgreso("");
        avisar(texto);
      };

      let audio: { ruta: string; segundos: number } | null = null;
      if (grabacion) {
        const r = await subir("audio", grabacion.blob);
        if ("error" in r) return fallar(r.error);
        subidas.push(r.ruta);
        audio = { ruta: r.ruta, segundos: grabacion.segundos };
      }
      let fotoSubida: { ruta: string } | null = null;
      if (foto) {
        const r = await subir("foto", foto.blob);
        if ("error" in r) return fallar(r.error);
        subidas.push(r.ruta);
        fotoSubida = r;
      }

      setProgreso("Guardando el lugar...");
      const res = await guardarMarca({
        sesionId: sesion.id,
        lugar,
        relato,
        tags: sensaciones,
        lat: pin.lat,
        lon: pin.lon,
        audio,
        foto: fotoSubida,
        deGrupo,
      });
      if (res.error) return fallar(res.error);

      setProgreso("");
      avisar(res.ok!, true);
      if (grabacion) URL.revokeObjectURL(grabacion.url);
      if (foto) URL.revokeObjectURL(foto.url);
      setPin(null);
      setLugar("");
      setRelato("");
      setSensaciones([]);
      setGrabacion(null);
      setFoto(null);
      setDeGrupo(false);
    });
  }

  function retirar(m: Marca) {
    if (!confirm(`¿Retirar «${m.lugar}» de la cartografía? Se borran también su grabación y su foto.`)) return;
    iniciarTransicion(async () => {
      const res = await retirarMarca(m.id);
      avisar(res.error ?? res.ok!, Boolean(res.ok));
    });
  }

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <p className="mb-5 max-w-[720px] text-[13.5px] leading-[1.65] text-apagado">
        Marca en el mapa un lugar significativo y describe qué olores, sabores y recuerdos te evoca.
        Lo que sitúes aquí queda en la cartografía de esta sesión.
      </p>

      <div className="rejilla-panel">
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
              <article key={m.id} aria-label={m.lugar} className="rounded-[10px] border border-borde bg-superficie px-4 py-3.5">
                <div className="flex gap-3">
                  {m.conFoto && (
                    <a href={`/api/cartografia/${m.id}/foto`} target="_blank" rel="noreferrer" className="flex-none">
                      {/* eslint-disable-next-line @next/next/no-img-element -- archivo privado servido con dirección firmada */}
                      <img
                        src={`/api/cartografia/${m.id}/foto`}
                        alt={`Foto de ${m.lugar}`}
                        loading="lazy"
                        className="h-20 w-24 rounded-md object-cover"
                      />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2.5">
                      <div className="text-[14px] font-bold">{m.lugar}</div>
                      {m.grupo && (
                        <span className="rounded-full bg-terciario-tinte px-2 py-0.5 text-[10.5px] font-bold text-terciario-fuerte">
                          Grupo {m.grupo}
                        </span>
                      )}
                    </div>
                    {m.relato ? (
                      <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-[1.6] text-apagado">{m.relato}</p>
                    ) : (
                      <p className="mt-1.5 text-[12px] italic text-tenue">Relato solo en audio.</p>
                    )}
                  </div>
                </div>
                {m.audioSegundos !== null && (
                  <div className="mt-2">
                    <audio
                      controls
                      preload="none"
                      src={`/api/cartografia/${m.id}/audio`}
                      className="h-9 w-full"
                      aria-label={`Relato grabado de ${m.lugar}, ${duracion(m.audioSegundos)}`}
                    />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {m.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-secundario-borde bg-secundario-tinte px-2 py-[3px] text-[10.5px] font-bold tracking-[.04em] text-secundario-fuerte"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto text-[10.5px] text-suave">
                    {m.grupo ? `sembrado por ${m.autor}` : m.autor}
                  </span>
                  {m.propia && (
                    <button
                      onClick={() => retirar(m)}
                      disabled={pendiente}
                      aria-label={`Retirar ${m.lugar}`}
                      className="cursor-pointer text-[10.5px] font-bold text-apagado hover:text-peligro"
                    >
                      Retirar
                    </button>
                  )}
                </div>
              </article>
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

          <div className="mt-3.5 text-[10px] font-bold tracking-[.12em] text-tenue">TU RELATO EN VOZ (OPCIONAL)</div>
          <div className="mt-2">
            <GrabadorRelato grabacion={grabacion} onCambio={setGrabacion} />
          </div>

          <div className="mt-3.5 text-[10px] font-bold tracking-[.12em] text-tenue">FOTO DEL LUGAR (OPCIONAL)</div>
          <div className="mt-2">
            <FotoLugar foto={foto} onCambio={setFoto} />
          </div>

          {miGrupo && (
            <fieldset className="mt-3.5">
              <legend className="text-[10px] font-bold tracking-[.12em] text-tenue">¿DE QUIÉN ES ESTE LUGAR?</legend>
              <div className="mt-2 grid gap-1.5 text-[12.5px]">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="autoria" checked={!deGrupo} onChange={() => setDeGrupo(false)} />
                  Solo mío
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="autoria" checked={deGrupo} onChange={() => setDeGrupo(true)} />
                  De mi grupo · {miGrupo}
                </label>
              </div>
              <p className="mt-1 text-[11px] text-suave">Si lo eligieron juntos, siémbralo a nombre del grupo: contará para todos.</p>
            </fieldset>
          )}

          <button
            onClick={sembrar}
            disabled={pendiente}
            className="mt-2.5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {pendiente ? "Sembrando..." : "Sembrar en el mapa"}
          </button>

          {progreso && (
            <div role="status" className="mt-2.5 text-[11.5px] font-semibold text-apagado">
              {progreso}
            </div>
          )}
          {mensaje && !progreso && (
            <div
              role={ok ? "status" : "alert"}
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
