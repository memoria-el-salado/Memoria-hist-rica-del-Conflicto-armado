"use client";

import { useState, useTransition } from "react";
import { repartirEquitativo, revisarPesos } from "@/lib/progreso";
import { guardarPesos } from "./actions";

/**
 * Reparto de los 100 puntos del curso entre los ejes.
 *
 * El docente decide cuánto pesa cada eje; dentro de cada uno, sus sesiones
 * publicadas se reparten ese peso a partes iguales. Así el avance refleja la
 * importancia real de cada bloque y no trata igual un eje introductorio que
 * uno central.
 */

export type EjePeso = {
  id: string;
  numero: number;
  nombre: string;
  peso: number;
  publicadas: number;
};

export function RepartoPesos({ ejes }: { ejes: EjePeso[] }) {
  const [pesos, setPesos] = useState<Record<string, number>>(
    Object.fromEntries(ejes.map((e) => [e.id, e.peso]))
  );
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const valores = ejes.map((e) => pesos[e.id] ?? 0);
  const revision = revisarPesos(valores);
  const sinCambios = ejes.every((e) => (pesos[e.id] ?? 0) === e.peso);

  function fijar(id: string, texto: string) {
    const numero = Math.max(0, Math.min(100, Math.round(Number(texto) || 0)));
    setPesos((previo) => ({ ...previo, [id]: numero }));
    setMensaje(null);
  }

  function equitativo() {
    const reparto = repartirEquitativo(ejes.length);
    setPesos(Object.fromEntries(ejes.map((e, i) => [e.id, reparto[i]])));
    setMensaje(null);
  }

  function guardar() {
    iniciarGuardado(async () => {
      setMensaje(await guardarPesos({ pesos: ejes.map((e) => ({ ejeId: e.id, peso: pesos[e.id] ?? 0 })) }));
    });
  }

  if (ejes.length === 0) {
    return (
      <div className="rounded-xl border border-borde bg-superficie p-5">
        <div className="text-[11px] font-bold tracking-[.12em] text-primario">PESO DE CADA EJE</div>
        <p className="mt-2.5 text-[12.5px] leading-[1.6] text-tenue">
          No hay ningún módulo activo todavía. Cuando la administración importe uno, aquí podrás
          repartir el peso de sus ejes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[.12em] text-primario">PESO DE CADA EJE</span>
        <button
          onClick={equitativo}
          className="cursor-pointer text-[11px] font-semibold text-apagado hover:text-primario"
        >
          Repartir por igual
        </button>
      </div>

      <p className="mt-2 text-[12px] leading-[1.6] text-suave">
        Reparte 100 puntos entre los ejes según lo que pese cada uno en tu curso. Dentro de cada eje,
        sus sesiones publicadas valen lo mismo entre sí.
      </p>

      <div className="mt-3.5 grid grid-cols-1 gap-2">
        {ejes.map((eje) => (
          <div key={eje.id} className="flex items-center gap-3">
            <label htmlFor={`peso-${eje.id}`} className="min-w-0 flex-1">
              <span
                title={eje.nombre}
                className="block truncate text-[12.5px] font-semibold text-tinta-media"
              >
                <span className="text-primario">Eje {eje.numero}</span> · {eje.nombre}
              </span>
              <span className="text-[10.5px] text-suave">
                {eje.publicadas === 0
                  ? "sin sesiones publicadas"
                  : `${eje.publicadas} ${eje.publicadas === 1 ? "sesión publicada" : "sesiones publicadas"}`}
                {eje.publicadas > 0 && (pesos[eje.id] ?? 0) > 0
                  ? ` · ${((pesos[eje.id] ?? 0) / eje.publicadas).toFixed(1)}% cada una`
                  : ""}
              </span>
            </label>
            <div className="flex flex-none items-center gap-1">
              <input
                id={`peso-${eje.id}`}
                type="number"
                min={0}
                max={100}
                value={pesos[eje.id] ?? 0}
                onChange={(e) => fijar(eje.id, e.target.value)}
                className="w-[68px] rounded-lg border border-borde-campo bg-superficie-suave px-2 py-1.5 text-right text-[13px]"
              />
              <span className="text-[12px] font-bold text-suave">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-[#F1EBE5] pt-3">
        <span className="text-[12px] font-semibold text-tinta-media">Total repartido</span>
        <span
          className="text-[15px] font-extrabold"
          style={{ color: revision.valida ? "#177575" : "#C0392B" }}
        >
          {revision.suma}%
        </span>
      </div>
      <p
        className="mt-1 text-[11.5px] font-semibold"
        style={{ color: revision.valida ? "#177575" : "#C0392B" }}
      >
        {revision.mensaje}
      </p>

      <button
        onClick={guardar}
        disabled={guardando || !revision.valida || sinCambios}
        className="mt-3 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar reparto"}
      </button>

      {mensaje?.ok && (
        <div role="status" className="mt-2 text-[11.5px] font-semibold text-secundario-fuerte">
          {mensaje.ok}
        </div>
      )}
      {mensaje?.error && (
        <div role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">
          {mensaje.error}
        </div>
      )}
    </div>
  );
}
