"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { duracion, LIMITES_MARCA } from "@/lib/cartografia";

export type Grabacion = { blob: Blob; segundos: number; url: string };

/** Formatos en orden de preferencia; Safari solo graba MP4. */
const FORMATOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const sinSuscripcion = () => () => {};
const puedeGrabar = () =>
  typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Graba el relato con el micrófono del equipo. Quien no puede o no quiere
 * grabar sigue teniendo el relato escrito; la grabación es una opción, no un
 * requisito.
 */
export function GrabadorRelato({
  grabacion,
  onCambio,
}: {
  grabacion: Grabacion | null;
  onCambio: (g: Grabacion | null) => void;
}) {
  // En el servidor se da por soportado; el navegador lo confirma al hidratar.
  const soportado = useSyncExternalStore(sinSuscripcion, puedeGrabar, () => true);
  const [estado, setEstado] = useState<"inactivo" | "pidiendo" | "grabando">("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState("");
  const grabador = useRef<MediaRecorder | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  // Si se sale de la página grabando, se apaga el micrófono.
  useEffect(
    () => () => {
      if (reloj.current) clearInterval(reloj.current);
      grabador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  async function empezar() {
    setError("");
    setEstado("pidiendo");
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setEstado("inactivo");
      const nombre = e instanceof DOMException ? e.name : "";
      return setError(
        nombre === "NotAllowedError"
          ? "El navegador no dio permiso para usar el micrófono. Puedes permitirlo en la barra de direcciones, o escribir tu relato."
          : "No encontramos un micrófono en este equipo. Puedes escribir tu relato."
      );
    }

    const formato = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
    const r = new MediaRecorder(flujo, formato ? { mimeType: formato } : undefined);
    const trozos: Blob[] = [];
    const inicio = Date.now();
    r.ondataavailable = (ev) => ev.data.size && trozos.push(ev.data);
    r.onstop = () => {
      if (reloj.current) clearInterval(reloj.current);
      flujo.getTracks().forEach((t) => t.stop());
      const blob = new Blob(trozos, { type: r.mimeType || formato || "audio/webm" });
      const total = Math.min((Date.now() - inicio) / 1000, LIMITES_MARCA.audioSegundos);
      setEstado("inactivo");
      if (blob.size) onCambio({ blob, segundos: total, url: URL.createObjectURL(blob) });
    };
    grabador.current = r;
    r.start(1000);
    setSegundos(0);
    setEstado("grabando");
    reloj.current = setInterval(() => {
      const transcurridos = (Date.now() - inicio) / 1000;
      setSegundos(transcurridos);
      // Al llegar al tope se detiene sola: el relato queda guardado igual.
      if (transcurridos >= LIMITES_MARCA.audioSegundos && r.state === "recording") r.stop();
    }, 250);
  }

  function detener() {
    if (grabador.current?.state === "recording") grabador.current.stop();
  }

  function quitar() {
    if (grabacion) URL.revokeObjectURL(grabacion.url);
    onCambio(null);
  }

  if (!soportado) {
    return <p className="text-[11.5px] text-tenue">Este navegador no permite grabar audio; escribe tu relato.</p>;
  }

  return (
    <div className="grid gap-2">
      {grabacion && estado === "inactivo" ? (
        <div className="rounded-lg border border-secundario-borde bg-secundario-tinte p-2.5">
          <div className="mb-1.5 text-[11px] font-bold text-secundario-fuerte">
            Relato grabado · {duracion(grabacion.segundos)}
          </div>
          <audio controls src={grabacion.url} className="w-full" aria-label="Escuchar tu relato grabado" />
          <div className="mt-1.5 flex gap-3">
            <button type="button" onClick={() => { quitar(); void empezar(); }} className="cursor-pointer text-[11.5px] font-bold text-secundario-fuerte hover:underline">
              Volver a grabar
            </button>
            <button type="button" onClick={quitar} className="cursor-pointer text-[11.5px] font-bold text-apagado hover:text-peligro">
              Quitar grabación
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={estado === "grabando" ? detener : empezar}
          disabled={estado === "pidiendo"}
          aria-pressed={estado === "grabando"}
          className={`w-full cursor-pointer rounded-lg border px-4 py-2.5 text-[12.5px] font-bold disabled:opacity-60 ${
            estado === "grabando"
              ? "border-peligro bg-[#FDF0EE] text-peligro"
              : "border-secundario bg-transparent text-secundario-fuerte"
          }`}
        >
          {estado === "grabando"
            ? `■  Detener · ${duracion(segundos)} de ${duracion(LIMITES_MARCA.audioSegundos)}`
            : estado === "pidiendo"
              ? "Pidiendo el micrófono..."
              : "●  Grabar relato en audio"}
        </button>
      )}
      {estado === "grabando" && (
        <span role="status" className="sr-only">
          Grabando. Pulsa detener cuando termines.
        </span>
      )}
      {error && (
        <p role="alert" className="text-[11.5px] font-semibold text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}
