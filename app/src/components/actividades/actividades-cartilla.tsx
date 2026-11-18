"use client";

import { useState, useTransition } from "react";
import { guardarActividadCartilla } from "@/app/estudiante/sesion/[id]/acciones-cartilla";
import { evaluar, pasosMezclados, type ActividadVista, type Campo, type DatosCartilla, type Fuente } from "@/lib/actividades-cartilla";

export type ActividadCartillaEnSesion = {
  actividad: ActividadVista;
  apartado: { codigo: string; titulo: string };
  /** La cartilla abierta en la página de este apartado, si la desarrolla. */
  cartilla: { enlace: string; pagina: number } | null;
  previa: DatosCartilla | null;
};

/**
 * Las actividades que la cartilla propone en los apartados de la sesión, cada
 * una con su código para encontrarla en el PDF.
 */
export function ActividadesCartilla({ sesionId, actividades }: { sesionId: string; actividades: ActividadCartillaEnSesion[] }) {
  if (!actividades.length) return null;
  const hechas = actividades.filter((a) => a.previa).length;
  return (
    <section id="actividades-cartilla" aria-labelledby="titulo-actividades-cartilla" className="mt-[22px] scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-actividades-cartilla" className="text-[0.78125rem] font-extrabold tracking-[.08em] text-tinta-media">
          MÁS ACTIVIDADES DE LA CARTILLA
        </h2>
        <span className="text-[0.71875rem] font-semibold text-apagado">
          {hechas} de {actividades.length} hechas
        </span>
      </div>
      <p className="mt-1 max-w-[760px] text-[0.78125rem] leading-relaxed text-apagado">
        La cartilla propone estos ejercicios en los apartados de esta sesión. Cada uno lleva el número del apartado para que lo
        encuentres en el PDF.
      </p>
      <ol className="mt-3 grid gap-3.5">
        {actividades.map((a) => (
          <li key={a.actividad.id}>
            <TarjetaActividad sesionId={sesionId} item={a} />
          </li>
        ))}
      </ol>
    </section>
  );
}

const campoClase = "w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[0.8125rem] leading-[1.7]";

function TarjetaActividad({ sesionId, item }: { sesionId: string; item: ActividadCartillaEnSesion }) {
  const { actividad, apartado, cartilla, previa } = item;
  const base = `act-${actividad.id}`;
  const [respuestas, setRespuestas] = useState<Record<string, string>>(previa?.respuestas ?? {});
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(previa?.asignaciones ?? {});
  const [orden, setOrden] = useState<string[]>(
    previa?.orden ?? (actividad.tipo === "ordenar" ? pasosMezclados(actividad.pasos).map((p) => p.id) : [])
  );
  const [reflexion, setReflexion] = useState(previa?.reflexion ?? "");
  // Las correcciones se muestran después de guardar, no mientras se responde.
  const [corregida, setCorregida] = useState<DatosCartilla | null>(previa);
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const respuesta =
      actividad.tipo === "preguntas" ? { respuestas } : actividad.tipo === "clasificar" ? { asignaciones, reflexion } : { orden, reflexion };
    iniciar(async () => {
      const r = await guardarActividadCartilla({ sesionId, actividad: actividad.id, respuesta });
      setEstado(r);
      if (r.ok) setCorregida(actividad.tipo === "clasificar" ? { asignaciones } : actividad.tipo === "ordenar" ? { orden } : { respuestas });
    });
  }

  function mover(i: number, paso: -1 | 1) {
    const j = i + paso;
    if (j < 0 || j >= orden.length) return;
    const nuevo = [...orden];
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    setOrden(nuevo);
    setCorregida(null);
    setAnuncio(`Paso movido a la posición ${j + 1} de ${orden.length}.`);
  }

  const resultado = corregida && actividad.tipo !== "preguntas" ? evaluar(actividad, corregida) : null;

  return (
    <form onSubmit={guardar} aria-labelledby={`${base}-titulo`} className="rounded-xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primario-tinte px-2.5 py-0.5 text-[0.6875rem] font-extrabold text-primario-fuerte">{apartado.codigo}</span>
        <span className="text-[0.71875rem] font-semibold text-apagado">{apartado.titulo}</span>
        {previa && (
          <span className="rounded-full bg-secundario-tinte px-2 py-0.5 text-[0.65625rem] font-bold text-secundario-fuerte">Hecha</span>
        )}
      </div>
      <h3 id={`${base}-titulo`} className="mt-2 text-[0.9375rem] font-extrabold leading-snug">
        {actividad.titulo}
      </h3>
      <p className="mt-1 text-[0.8125rem] leading-[1.65] text-tinta-media">{actividad.consigna}</p>
      <p className="mt-1.5 text-[0.71875rem] text-apagado">
        {actividad.origen}
        {cartilla && (
          <>
            {" · "}
            <a href={cartilla.enlace} target="_blank" rel="noreferrer" className="font-bold text-secundario-fuerte">
              ver en la cartilla, página {cartilla.pagina}
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </>
        )}
      </p>

      {actividad.fuente && <BloqueFuente fuente={actividad.fuente} />}

      <div className="mt-3.5 grid gap-3">
        {actividad.tipo === "preguntas" &&
          actividad.campos.map((c) => (
            <CampoPregunta key={c.id} base={base} campo={c} valor={respuestas[c.id] ?? ""} cambiar={(v) => setRespuestas((r) => ({ ...r, [c.id]: v }))} />
          ))}

        {actividad.tipo === "clasificar" && (
          <ul className="grid gap-2">
            {actividad.tarjetas.map((t) => {
              const elegido = asignaciones[t.id] ?? "";
              const bien = corregida?.asignaciones?.[t.id] === t.categoria;
              const correcta = actividad.categorias.find((c) => c.id === t.categoria)?.nombre;
              return (
                <li key={t.id} className="rounded-lg border border-borde bg-superficie-suave p-3">
                  <p className="text-[0.8125rem] leading-relaxed text-tinta-media">{t.texto}</p>
                  {t.autor && <p className="mt-0.5 text-[0.71875rem] font-semibold text-apagado">{t.autor}</p>}
                  <label htmlFor={`${base}-${t.id}`} className="sr-only">
                    ¿A qué corresponde? {t.texto}
                  </label>
                  <select
                    id={`${base}-${t.id}`}
                    value={elegido}
                    onChange={(e) => {
                      setAsignaciones((a) => ({ ...a, [t.id]: e.target.value }));
                      setCorregida(null);
                    }}
                    className="mt-2 min-h-11 w-full rounded-lg border border-borde-campo bg-white px-3 text-[0.8125rem]"
                  >
                    <option value="">Elige…</option>
                    {actividad.categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {corregida?.asignaciones && (
                    <p className={`mt-1.5 text-[0.75rem] font-bold ${bien ? "text-secundario-fuerte" : "text-peligro"}`}>
                      {bien ? "✓ Correcto" : `✗ Corresponde a: ${correcta}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {actividad.tipo === "ordenar" && (
          <>
            <ol className="grid gap-2">
              {orden.map((id, i) => {
                const paso = actividad.pasos.find((p) => p.id === id)!;
                const bien = corregida?.orden?.[i] === actividad.pasos[i].id;
                return (
                  <li key={id} className="flex items-start gap-3 rounded-lg border border-borde bg-superficie-suave p-3">
                    <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primario-fuerte text-[0.75rem] font-extrabold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] leading-relaxed text-tinta-media">
                        <span className="sr-only">Paso {i + 1}: </span>
                        {paso.texto}
                      </p>
                      {corregida?.orden && (
                        <p className={`mt-1 text-[0.75rem] font-bold ${bien ? "text-secundario-fuerte" : "text-peligro"}`}>
                          {bien ? "✓ En su lugar" : "✗ No va aquí"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-none flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0}
                        aria-label={`Subir el paso: ${paso.texto.slice(0, 50)}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-borde bg-white text-tinta-media hover:border-primario disabled:cursor-default disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, 1)}
                        disabled={i === orden.length - 1}
                        aria-label={`Bajar el paso: ${paso.texto.slice(0, 50)}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-borde bg-white text-tinta-media hover:border-primario disabled:cursor-default disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p aria-live="polite" className="sr-only">
              {anuncio}
            </p>
          </>
        )}

        {actividad.tipo !== "preguntas" && actividad.reflexion && (
          <CampoPregunta base={base} campo={actividad.reflexion} valor={reflexion} cambiar={setReflexion} />
        )}
      </div>

      {resultado && resultado.total > 0 && (
        <p className="mt-3 rounded-lg bg-secundario-tinte px-3 py-2 text-[0.78125rem] font-bold text-secundario-fuerte">
          Acertaste {resultado.correctas} de {resultado.total}.
          {resultado.correctas < resultado.total && " Revisa los marcados, cámbialos y vuelve a guardar."}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="mt-3.5 min-h-11 cursor-pointer rounded-lg bg-primario-fuerte px-5 text-[0.8125rem] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
      >
        {pendiente ? "Guardando..." : previa || corregida ? "Actualizar" : "Guardar"}
      </button>
      {estado?.ok && (
        <p role="status" className="mt-2 text-[0.75rem] font-semibold text-secundario-fuerte">
          {estado.ok}
        </p>
      )}
      {estado?.error && (
        <p role="alert" className="mt-2 text-[0.75rem] font-semibold text-peligro">
          {estado.error}
        </p>
      )}
    </form>
  );
}

function CampoPregunta({ base, campo, valor, cambiar }: { base: string; campo: Campo; valor: string; cambiar: (v: string) => void }) {
  const id = `${base}-${campo.id}`;
  const etiqueta = (
    <>
      {campo.etiqueta}
      {campo.opcional && <span className="font-normal text-apagado"> (opcional)</span>}
    </>
  );

  if (campo.tipo === "opcion" && (campo.opciones?.length ?? 0) <= 5) {
    return (
      <fieldset>
        <legend className="text-[0.78125rem] font-bold text-tinta-media">{etiqueta}</legend>
        {campo.ayuda && <p className="mt-0.5 text-[0.71875rem] text-apagado">{campo.ayuda}</p>}
        <div className="mt-1.5 grid gap-1.5">
          {campo.opciones!.map((o) => (
            <label
              key={o}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] ${
                valor === o ? "border-secundario bg-secundario-tinte" : "border-borde"
              }`}
            >
              <input type="radio" name={id} value={o} checked={valor === o} onChange={() => cambiar(o)} />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-[0.78125rem] font-bold leading-snug text-tinta-media">
        {etiqueta}
      </label>
      {campo.ayuda && <p className="mt-0.5 text-[0.71875rem] text-apagado">{campo.ayuda}</p>}
      {campo.tipo === "opcion" ? (
        <select id={id} value={valor} onChange={(e) => cambiar(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-borde-campo bg-white px-3 text-[0.8125rem]">
          <option value="">Elige…</option>
          {campo.opciones!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <textarea id={id} value={valor} onChange={(e) => cambiar(e.target.value)} maxLength={3000} className={`${campoClase} mt-1.5 h-24 resize-y`} />
      )}
    </div>
  );
}

/** El texto o el cuadro de la cartilla que acompaña la actividad. */
function BloqueFuente({ fuente }: { fuente: Fuente }) {
  return (
    <figure className="mt-3 rounded-lg border border-terciario-borde bg-terciario-tinte p-3.5">
      <figcaption className="text-[0.6875rem] font-extrabold tracking-[.06em] text-terciario-fuerte">{fuente.titulo.toUpperCase()}</figcaption>
      {fuente.barras && (
        <ul className="mt-2.5 grid gap-2.5">
          {fuente.barras.map((b) => (
            <li key={b.etiqueta}>
              <div className="flex items-baseline justify-between gap-3 text-[0.78125rem] text-tinta-media">
                <span>{b.etiqueta}</span>
                <strong className="text-[0.9375rem]">{b.valor.toLocaleString("es-CO")} %</strong>
              </div>
              <div aria-hidden="true" className="mt-1 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-terciario-fuerte" style={{ width: `${b.valor}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {fuente.texto && <p className="mt-2 text-[0.78125rem] leading-relaxed text-tinta-media">{fuente.texto}</p>}
      <p className="mt-1.5 text-[0.6875rem] text-apagado">{fuente.referencia}</p>
    </figure>
  );
}
