"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { crearCaso, eliminarCaso } from "./actions";

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVO: "ACTIVO",
  EN_CURADURIA: "EN CURADURÍA",
  BORRADOR: "BORRADOR",
};

type Caso = {
  id: string;
  nombre: string;
  depto: string;
  estado: string;
  version: string;
  ejes: string[];
  sesiones: number;
  recursos: number;
};

type Props = {
  casos: Caso[];
  ejesBase: { numero: number; nombre: string }[];
};

export function ModulosGeograficos({ casos, ejesBase }: Props) {
  const [seleccionados, setSeleccionados] = useState<number[]>(ejesBase.map((e) => e.numero));
  const formRef = useRef<HTMLFormElement>(null);
  const [borrando, iniciarBorrado] = useTransition();
  const [mensajeBorrado, setMensajeBorrado] = useState<{ ok?: string; error?: string } | null>(null);

  /**
   * Elimina un módulo. Se avisa de lo que arrastra consigo, porque con él se va
   * el trabajo que los estudiantes hicieran en sus sesiones.
   */
  function borrar(id: string, nombre: string, sesiones: number) {
    const aviso =
      `¿Eliminar el módulo "${nombre}"?\n\n` +
      `Se borran sus ${sesiones} sesiones y todo el trabajo que los estudiantes ` +
      "hayan hecho en ellas. El PDF de origen no se toca.";
    if (!confirm(aviso)) return;

    iniciarBorrado(async () => setMensajeBorrado(await eliminarCaso(id)));
  }

  const [estado, accion, pendiente] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await crearCaso(prev, formData);
      if (res.ok) {
        formRef.current?.reset();
        setSeleccionados(ejesBase.map((e) => e.numero));
      }
      return res;
    },
    null as { ok?: string; error?: string } | null
  );

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU09 · MANTENIBILIDAD</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Escalabilidad de Módulos Geográficos
      </h1>
      <p className="mb-5 max-w-[660px] text-[13.5px] leading-[1.65] text-apagado">
        Añade nuevos casos de estudio reutilizando la arquitectura modular: cada caso hereda los ejes, las
        plantillas de sesión y los componentes de actividad.
      </p>

      <div className="rejilla-panel-ancha">
        <div className="grid gap-3">
          {casos.map((c) => (
            <div key={c.id} className="rounded-xl border border-borde bg-superficie p-[18px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-bold">{c.nombre}</div>
                  <div className="mt-0.5 text-[11.5px] text-suave">{c.depto}</div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[9.5px] font-extrabold tracking-[.07em]"
                  style={{
                    background: c.estado === "ACTIVO" ? "#E5F1F0" : "#FDF8EF",
                    color: c.estado === "ACTIVO" ? "#177575" : "#A8791C",
                  }}
                >
                  {ETIQUETA_ESTADO[c.estado] ?? c.estado}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.ejes.map((e) => (
                  <span
                    key={e}
                    className="rounded-full border border-borde px-2.5 py-[3px] text-[10.5px] font-semibold text-[#7C736C]"
                  >
                    {e}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-[18px] text-[11.5px] text-tenue">
                <span>
                  Recursos: <strong className="text-tinta">{c.recursos}</strong>
                </span>
                <span>
                  Sesiones: <strong className="text-tinta">{c.sesiones}</strong>
                </span>
                <span>
                  Versión módulo: <strong className="text-tinta">{c.version}</strong>
                </span>
                <button
                  onClick={() => borrar(c.id, c.nombre, c.sesiones)}
                  disabled={borrando}
                  className="ml-auto cursor-pointer rounded-md border border-borde-campo px-2.5 py-1.5 text-[11.5px] font-semibold text-apagado hover:border-peligro hover:text-peligro disabled:opacity-60"
                >
                  {borrando ? "Eliminando..." : "Eliminar módulo"}
                </button>
              </div>
            </div>
          ))}

          {mensajeBorrado?.ok && (
            <div role="status" className="text-[11.5px] font-semibold text-secundario-fuerte">
              {mensajeBorrado.ok}
            </div>
          )}
          {mensajeBorrado?.error && (
            <div role="alert" className="text-[11.5px] font-semibold text-peligro">
              {mensajeBorrado.error}
            </div>
          )}
        </div>

        <form ref={formRef} action={accion} className="rounded-xl border border-borde bg-superficie p-5">
          <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
            NUEVO CASO DE ESTUDIO
          </div>

          <label htmlFor="nombre" className="mt-3.5 block text-[10px] font-bold tracking-[.12em] text-tenue">
            CORREGIMIENTO O MUNICIPIO
          </label>
          <input
            id="nombre"
            name="nombre"
            placeholder="ej. Bojayá"
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <label htmlFor="depto" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
            DEPARTAMENTO
          </label>
          <input
            id="depto"
            name="depto"
            placeholder="ej. Chocó"
            className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
          />

          <div className="mt-3 text-[10px] font-bold tracking-[.12em] text-tenue">EJES HEREDADOS</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ejesBase.map((e) => {
              const activo = seleccionados.includes(e.numero);
              return (
                <label
                  key={e.numero}
                  className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
                  style={
                    activo
                      ? { background: "#1B8A8A", borderColor: "#1B8A8A", color: "#fff" }
                      : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
                  }
                >
                  <input
                    type="checkbox"
                    name="ejes"
                    value={e.numero}
                    checked={activo}
                    onChange={() =>
                      setSeleccionados((prev) =>
                        activo ? prev.filter((n) => n !== e.numero) : [...prev, e.numero]
                      )
                    }
                    className="sr-only"
                  />
                  {e.nombre}
                </label>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={pendiente}
            className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {pendiente ? "Generando..." : "Generar módulo"}
          </button>

          {estado?.ok && (
            <div role="status" className="mt-2.5 text-[11.5px] font-semibold text-secundario-fuerte">
              {estado.ok}
            </div>
          )}
          {estado?.error && (
            <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
              {estado.error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
