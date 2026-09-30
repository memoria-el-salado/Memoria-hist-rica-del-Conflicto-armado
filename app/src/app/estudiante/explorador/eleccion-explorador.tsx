"use client";

import { useState, useTransition } from "react";
import { AvatarExplorador } from "@/components/explorador";
import { EXPLORADORES, type Explorador } from "@/lib/exploradores";
import { elegirExplorador } from "./actions";

/**
 * La primera entrada del estudiante (mockup de la página 10): elige el
 * explorador que lo acompañará en el viaje. Se puede cambiar después.
 */
export function EleccionExplorador({ nombre, actual }: { nombre: string; actual: string | null }) {
  const [elegido, setElegido] = useState<Explorador | null>((actual as Explorador) ?? null);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  return (
    <div className="animar-aparecer mx-auto max-w-[640px] py-6">
      <h1 className="text-center text-[26px] font-extrabold tracking-[-.02em] text-primario-fuerte">
        {actual ? "Cambia tu explorador" : `¡Bienvenido a Memoria El Salado${nombre ? `, ${nombre}` : ""}!`}
      </h1>
      <p className="mx-auto mt-2 max-w-[460px] text-center text-[13.5px] leading-[1.65] text-apagado">
        Antes de empezar, elige el explorador que te acompañará en el viaje por la memoria.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!elegido) return setError("Elige uno de los cuatro exploradores.");
          iniciar(async () => {
            const r = await elegirExplorador(elegido);
            if (r?.error) setError(r.error);
          });
        }}
        className="mt-6 rounded-2xl border border-borde bg-superficie p-6"
      >
        <fieldset>
          <legend className="text-[14px] font-extrabold">Elige tu explorador</legend>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EXPLORADORES.map((e) => (
              <label
                key={e.id}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-colors ${
                  elegido === e.id ? "border-primario bg-primario-tinte" : "border-transparent hover:border-borde-campo"
                }`}
              >
                <input type="radio" name="explorador" value={e.id} checked={elegido === e.id} onChange={() => setElegido(e.id)} className="sr-only" />
                <AvatarExplorador tipo={e.id} tamano={84} />
                <span className="text-[11px] font-extrabold tracking-[.1em]">{e.nombre.toUpperCase()}</span>
                <span className="text-[11px] leading-snug text-tenue">{e.lema}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-3 text-[12px] font-semibold text-peligro">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pendiente}
          className="mt-5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[14px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
        >
          {pendiente ? "Guardando..." : "Continuar al mapa →"}
        </button>
      </form>
    </div>
  );
}
