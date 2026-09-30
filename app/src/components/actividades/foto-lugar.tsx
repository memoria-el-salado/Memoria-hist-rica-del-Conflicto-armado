"use client";

import { useState } from "react";
import { LIMITES_MARCA, validarAdjunto } from "@/lib/cartografia";

export type Foto = { blob: Blob; url: string };

/**
 * Reduce la foto en el navegador: la de un teléfono pesa varios megas, y en la
 * conexión de un colegio rural subirla entera tarda. A 1600 px de lado se sigue
 * reconociendo el lugar y pesa unos cientos de kilobytes.
 */
async function reducirFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LIMITES_MARCA.fotoLado / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/jpeg", 0.82)
  );
}

export function FotoLugar({
  foto,
  onCambio,
  etiqueta = "Añadir una foto del lugar",
  id = "foto-lugar",
}: {
  foto: Foto | null;
  onCambio: (f: Foto | null) => void;
  etiqueta?: string;
  id?: string;
}) {
  const [error, setError] = useState("");
  const [preparando, setPreparando] = useState(false);

  async function elegir(archivo: File | undefined) {
    setError("");
    if (!archivo) return;
    setPreparando(true);
    let blob: Blob;
    try {
      blob = await reducirFoto(archivo);
    } catch {
      // Si el navegador no sabe abrirla, se intenta con el archivo tal cual.
      blob = archivo;
    }
    setPreparando(false);
    const problema = validarAdjunto("foto", { mime: blob.type, tamano: blob.size });
    if (problema) return setError(problema);
    if (foto) URL.revokeObjectURL(foto.url);
    onCambio({ blob, url: URL.createObjectURL(blob) });
  }

  function quitar() {
    if (foto) URL.revokeObjectURL(foto.url);
    onCambio(null);
  }

  return (
    <div className="grid gap-2">
      {foto ? (
        <div className="flex items-center gap-3 rounded-lg border border-borde bg-superficie-suave p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local, sin optimizar */}
          <img src={foto.url} alt="Vista previa de la foto" className="h-16 w-20 flex-none rounded-md object-cover" />
          <div className="min-w-0 flex-1 text-[11.5px] text-apagado">
            Foto lista · {Math.max(1, Math.round(foto.blob.size / 1024))} KB
          </div>
          <button type="button" onClick={quitar} className="cursor-pointer text-[11.5px] font-bold text-apagado hover:text-peligro">
            Quitar foto
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-borde-campo px-4 py-2.5 text-[12.5px] font-bold text-apagado hover:border-primario hover:text-primario">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
          {preparando ? "Preparando la foto..." : etiqueta}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="sr-only"
            onChange={(e) => {
              void elegir(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-[11.5px] font-semibold text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}
