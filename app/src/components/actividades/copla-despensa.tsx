"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { guardarDespensa } from "@/app/estudiante/sesion/[id]/acciones-despensa";
import { LIMITES_COPLA, LUGARES, MINIMO_UBICACIONES, PRODUCTOS, validarCopla, type LugarVotado } from "@/lib/copla";
import { CabeceraSesion, TextoSesion, type DatosSesion } from "./cabecera-sesion";

const MapaReal = dynamic(() => import("@/components/mapa-real").then((m) => m.MapaReal), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-borde bg-[#F4EFE8] text-[13px] text-tenue">
      Cargando el mapa...
    </div>
  ),
});

const nombreProducto = (id: string) => PRODUCTOS.find((p) => p.id === id)?.nombre ?? id;
const nombreLugar = (id: string) => LUGARES.find((l) => l.id === id)?.nombre ?? id;

/** Centro de los Montes de María, entre El Carmen de Bolívar y Ovejas. */
const CENTRO_MONTES: [number, number] = [9.72, -75.15];

export type ResumenCurso = { total: number; productos: { productoId: string; lugares: LugarVotado[] }[] };

/**
 * La copla «Tierra de abundancia» y su mapa: el estudiante ubica en los
 * Montes de María lo que produce cada lugar, según la copla, y explica por qué
 * a la región le dicen «la despensa del Caribe».
 *
 * Los productos se arrastran hasta un lugar o, sin arrastrar —con el dedo o
 * con el teclado—, se elige el producto y después el lugar.
 */
export function CoplaDespensa({
  sesion,
  previa,
  curso,
}: {
  sesion: DatosSesion;
  previa: { ubicaciones: Record<string, string>; texto: string; versos: string } | null;
  curso: ResumenCurso | null;
}) {
  const [ubicaciones, setUbicaciones] = useState<Record<string, string>>(previa?.ubicaciones ?? {});
  const [elegido, setElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState(previa?.texto ?? "");
  const [versos, setVersos] = useState(previa?.versos ?? "");
  const [anuncio, setAnuncio] = useState("");
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const sinUbicar = PRODUCTOS.filter((p) => !ubicaciones[p.id]);
  const ubicadas = Object.keys(ubicaciones).length;

  function ubicar(producto: string, lugar: string) {
    setUbicaciones((u) => ({ ...u, [producto]: lugar }));
    setElegido(null);
    setAnuncio(`${nombreProducto(producto)} ubicado en ${nombreLugar(lugar)}.`);
  }

  function quitar(producto: string) {
    setUbicaciones((u) => Object.fromEntries(Object.entries(u).filter(([p]) => p !== producto)));
    setAnuncio(`${nombreProducto(producto)} vuelve a los productos por ubicar.`);
  }

  function guardar() {
    const error = validarCopla({ ubicaciones, texto, versos });
    if (error) return setEstado({ error });
    iniciar(async () => setEstado(await guardarDespensa({ sesionId: sesion.id, ubicaciones, texto, versos })));
  }

  const ficha = (id: string, dentro?: string) => (
    <span
      key={id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
      className="inline-flex items-center gap-1 rounded-full border border-terciario-borde bg-terciario-tinte py-1 pl-2.5 pr-1 text-[11.5px] font-bold text-terciario-fuerte"
    >
      {nombreProducto(id)}
      {dentro && (
        <button
          type="button"
          onClick={() => quitar(id)}
          aria-label={`Quitar ${nombreProducto(id)} de ${nombreLugar(dentro)}`}
          className="cursor-pointer rounded-full px-1 text-[12px] leading-none hover:text-peligro"
        >
          ×
        </button>
      )}
    </span>
  );

  return (
    <div className="animar-aparecer max-w-[1180px]">
      <CabeceraSesion sesion={sesion} />
      <p className="mb-4 max-w-[760px] text-[13.5px] leading-[1.7] text-apagado">
        Escucha y lee la copla «Tierra de abundancia» —el audio está en el material de esta sesión, más abajo—.
        Después, de acuerdo con lo que cuenta, ubica en los Montes de María lo que se produce en cada lugar.
      </p>

      <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid content-start gap-[18px]">
          <TextoSesion sesion={sesion} />
          <MapaReal
            centro={CENTRO_MONTES}
            zoom={9}
            alto={360}
            etiquetaAccesible="Mapa de los Montes de María con los lugares de la copla. La lista de lugares, al lado, permite hacer lo mismo sin el mapa."
            puntos={LUGARES.filter((l) => l.coordenada).map((l) => {
              const aqui = PRODUCTOS.filter((p) => ubicaciones[p.id] === l.id).map((p) => p.nombre);
              return {
                id: l.id,
                lat: l.coordenada![0],
                lon: l.coordenada![1],
                etiqueta: aqui.length ? `${l.nombre}: ${aqui.join(", ")}` : l.nombre,
                destacado: aqui.length > 0,
              };
            })}
          />
        </div>

        <div className="grid content-start gap-3.5">
          <section aria-labelledby="titulo-productos" className="rounded-xl border border-borde bg-superficie p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="titulo-productos" className="text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">
                PRODUCTOS Y OFICIOS POR UBICAR
              </h2>
              <span className="text-[11px] font-bold text-suave">
                {ubicadas} ubicados · mínimo {MINIMO_UBICACIONES}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-tenue">
              Arrastra cada uno hasta su lugar, o tócalo y luego pulsa el lugar.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {sinUbicar.length === 0 && <span className="text-[12px] text-tenue">Ya ubicaste todos.</span>}
              {sinUbicar.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                  onClick={() => setElegido((x) => (x === p.id ? null : p.id))}
                  aria-pressed={elegido === p.id}
                  className={`cursor-grab rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                    elegido === p.id ? "border-secundario bg-secundario text-white" : "border-terciario-borde bg-terciario-tinte text-terciario-fuerte"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="titulo-lugares" className="rounded-xl border border-borde bg-superficie p-4">
            <h2 id="titulo-lugares" className="text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">
              LUGARES DE LOS MONTES DE MARÍA
            </h2>
            <ul className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {LUGARES.map((l) => {
                const aqui = PRODUCTOS.filter((p) => ubicaciones[p.id] === l.id);
                return (
                  <li
                    key={l.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const producto = e.dataTransfer.getData("text/plain");
                      if (PRODUCTOS.some((p) => p.id === producto)) ubicar(producto, l.id);
                    }}
                    className={`rounded-lg border px-2.5 py-2 ${elegido ? "border-dashed border-secundario" : "border-borde"}`}
                  >
                    <button
                      type="button"
                      disabled={!elegido}
                      onClick={() => elegido && ubicar(elegido, l.id)}
                      aria-label={elegido ? `Ubicar ${nombreProducto(elegido)} en ${l.nombre}` : l.nombre}
                      className="w-full text-left disabled:cursor-default enabled:cursor-pointer"
                    >
                      <span className="block text-[12.5px] font-bold">{l.nombre}</span>
                      {l.detalle && <span className="block text-[10.5px] text-suave">{l.detalle}</span>}
                    </button>
                    {aqui.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{aqui.map((p) => ficha(p.id, l.id))}</div>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="titulo-despensa" className="rounded-xl border border-borde bg-superficie p-4">
            <h2 id="titulo-despensa" className="text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">
              ¿POR QUÉ LA DESPENSA DEL CARIBE?
            </h2>
            <label htmlFor="despensa" className="mt-1 block text-[11.5px] text-tenue">
              A partir de tu mapa, explica por qué se dice que los Montes de María son «la despensa del Caribe».
            </label>
            <textarea
              id="despensa"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={LIMITES_COPLA.respuestaMaxima}
              className="mt-2 h-28 w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px] leading-[1.7]"
            />
            <label htmlFor="versos" className="mt-3 block text-[11.5px] text-tenue">
              <strong className="text-apagado">Para ir más allá (opcional):</strong> compón uno o dos versos sobre lo
              que se produce y se celebra en tu región.
            </label>
            <textarea
              id="versos"
              value={versos}
              onChange={(e) => setVersos(e.target.value)}
              maxLength={LIMITES_COPLA.versosMaximo}
              className="mt-2 h-20 w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 font-serif text-[13px] leading-[1.7]"
            />
            <button
              type="button"
              onClick={guardar}
              disabled={pendiente}
              className="mt-3 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-50"
            >
              {pendiente ? "Guardando..." : previa ? "Actualizar mi mapa y mi respuesta" : "Guardar mi mapa y mi respuesta"}
            </button>
            {estado?.ok && (
              <div role="status" className="mt-2 text-[11.5px] font-semibold text-secundario-fuerte">
                {estado.ok}
              </div>
            )}
            {estado?.error && (
              <div role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">
                {estado.error}
              </div>
            )}
          </section>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {curso && (
        <section aria-labelledby="titulo-curso" className="mt-[18px] rounded-xl border border-secundario-borde bg-secundario-tinte p-5">
          <h2 id="titulo-curso" className="text-[12px] font-extrabold tracking-[.06em] text-secundario-fuerte">
            CÓMO LO UBICÓ TU CURSO
          </h2>
          <p className="mt-1 text-[11.5px] text-[#3F6E6C]">
            {curso.total === 1 ? "Por ahora solo está tu mapa." : `${curso.total} mapas guardados.`} Úsalo para la puesta
            en común: donde no coinciden, vale la pena volver a escuchar la copla.
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {curso.productos.map((p) => (
              <div key={p.productoId} className="flex gap-2 text-[12px]">
                <dt className="w-[130px] flex-none font-bold text-tinta-media">{nombreProducto(p.productoId)}</dt>
                <dd className="text-[#3F6E6C]">{p.lugares.map((l) => `${nombreLugar(l.lugarId)} (${l.cuantos})`).join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
