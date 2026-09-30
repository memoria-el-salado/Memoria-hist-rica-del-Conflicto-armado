"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Debate, HiloVista, MensajeVista } from "@/lib/debate";
import { LIMITES, type Postura } from "@/lib/foros";
import { publicarMensaje } from "./acciones";

type Accion = (id: string) => Promise<{ ok?: unknown; error?: string }>;

/** Controles que solo recibe el docente, que media el debate. */
export type Mediacion = { destacar: Accion; retirar: Accion };

const ESTILO_BANDO: Record<Postura | "DOCENTE", { borde: string; fondo: string; texto: string; etiqueta: string }> = {
  A: { borde: "border-l-secundario", fondo: "bg-secundario-tinte", texto: "text-secundario-fuerte", etiqueta: "ROL A" },
  B: { borde: "border-l-terciario", fondo: "bg-terciario-tinte", texto: "text-terciario-fuerte", etiqueta: "ROL B" },
  DOCENTE: { borde: "border-l-primario", fondo: "bg-primario-tinte", texto: "text-primario-fuerte", etiqueta: "MEDIACIÓN" },
};

function estiloDe(m: MensajeVista) {
  return ESTILO_BANDO[m.esDocente ? "DOCENTE" : (m.postura ?? "A")];
}

export function DebateForo({
  debate,
  volver,
  mediacion,
}: {
  debate: Debate;
  volver: string;
  mediacion?: Mediacion;
}) {
  const { foro, hilos, miPostura, conteo } = debate;
  const esDocente = Boolean(mediacion);

  return (
    <div className="animar-aparecer max-w-[920px]">
      <Link href={volver} className="text-[11.5px] font-bold text-tenue hover:text-primario">
        ← Todos los debates
      </Link>

      <div className="mt-2 text-[10.5px] font-bold tracking-[.14em] text-primario">
        CU08 · DEBATE{foro.sesion ? ` · SESIÓN ${foro.sesion.toUpperCase()}` : ""}
      </div>
      <h1 className="mb-1.5 mt-2 max-w-[760px] text-[24px] font-extrabold leading-tight tracking-[-.02em]">
        {foro.pregunta}
      </h1>
      <p className="mb-4 text-[12.5px] text-apagado">
        Fuentes obligatorias: <span className="font-semibold text-tinta-media">{foro.fuentes}</span>
        {!foro.abierto && (
          <span className="ml-2 rounded-full border border-borde-campo px-2 py-0.5 text-[10px] font-extrabold tracking-[.07em] text-suave">
            FORO CERRADO
          </span>
        )}
      </p>

      <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
        {(["A", "B"] as const).map((p) => {
          const estilo = ESTILO_BANDO[p];
          const mio = miPostura === p;
          return (
            <div
              key={p}
              className={`rounded-[9px] border px-3.5 py-3 ${estilo.fondo} ${mio ? "border-current " + estilo.texto : "border-borde"}`}
            >
              <div className={`flex items-center justify-between text-[10px] font-bold tracking-[.1em] ${estilo.texto}`}>
                <span>{estilo.etiqueta}</span>
                <span>
                  {conteo[p]} {conteo[p] === 1 ? "estudiante" : "estudiantes"}
                </span>
              </div>
              <div className="mt-1 text-[13.5px] font-semibold text-tinta">{p === "A" ? foro.rolA : foro.rolB}</div>
              {mio && <div className={`mt-1.5 text-[11px] font-bold ${estilo.texto}`}>Tu rol en este debate</div>}
            </div>
          );
        })}
      </div>

      {debate.puedeEscribir ? (
        <Redactor foroId={foro.id} esDocente={esDocente} miPostura={miPostura} />
      ) : (
        <div className="mb-5 rounded-xl border border-borde bg-superficie-suave p-4 text-[12.5px] text-apagado">
          El docente cerró este debate. Puedes leer los argumentos, pero ya no admite mensajes nuevos.
        </div>
      )}

      <h2 className="mb-3 mt-6 text-[13px] font-extrabold tracking-[.05em] text-tinta-media">
        ARGUMENTOS ({hilos.length})
      </h2>
      {hilos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borde-campo p-5 text-[13px] text-apagado">
          Todavía no hay argumentos. {debate.puedeEscribir ? "Abre el debate con el primero." : ""}
        </p>
      ) : (
        <div className="grid gap-3">
          {hilos.map((h) => (
            <Hilo key={h.id} hilo={h} foroId={foro.id} puedeResponder={debate.puedeEscribir} mediacion={mediacion} />
          ))}
        </div>
      )}
    </div>
  );
}

function Redactor({
  foroId,
  esDocente,
  miPostura,
}: {
  foroId: string;
  esDocente: boolean;
  miPostura: Postura | null;
}) {
  const [texto, setTexto] = useState("");
  const [fuente, setFuente] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const res = await publicarMensaje(foroId, { texto, fuente: esDocente ? null : fuente });
      if (res.error) return setError(res.error);
      setError("");
      setTexto("");
      setFuente("");
    });
  }

  const campo = "w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]";

  return (
    <form onSubmit={enviar} className="rounded-xl border border-borde bg-superficie p-4">
      <label htmlFor="argumento" className="text-[10px] font-bold tracking-[.12em] text-tenue">
        {esDocente
          ? "INTERVENCIÓN DE LA MEDIACIÓN"
          : `TU ARGUMENTO · ${miPostura ? ESTILO_BANDO[miPostura].etiqueta : ""}`}
      </label>
      <textarea
        id="argumento"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        maxLength={LIMITES.maximo}
        placeholder={
          esDocente
            ? "Orienta la discusión, pide que se contrasten fuentes o señala un buen argumento…"
            : "Defiende tu posición con razones. ¿Qué dice la fuente que la respalda?"
        }
        className={`${campo} mt-1.5 resize-y`}
      />
      {!esDocente && (
        <>
          <label htmlFor="fuente" className="mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue">
            FUENTE EN QUE TE APOYAS
          </label>
          <input
            id="fuente"
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            placeholder="ej. Ley 135 de 1961, artículo 1 · Guía del CNMH, sesión 1.3.1"
            className={`${campo} mt-1.5`}
          />
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="cursor-pointer rounded-lg bg-primario-fuerte px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
        >
          {pendiente ? "Publicando..." : esDocente ? "Publicar intervención" : "Publicar argumento"}
        </button>
        {!esDocente && (
          <span className="text-[11px] text-suave">
            Al menos {LIMITES.argumentoMinimo} caracteres y la fuente que lo respalda.
          </span>
        )}
      </div>
      {error && (
        <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
          {error}
        </div>
      )}
    </form>
  );
}

function Hilo({
  hilo,
  foroId,
  puedeResponder,
  mediacion,
}: {
  hilo: HiloVista;
  foroId: string;
  puedeResponder: boolean;
  mediacion?: Mediacion;
}) {
  const [respondiendo, setRespondiendo] = useState(false);

  return (
    <article className="rounded-xl border border-borde bg-superficie">
      <Mensaje mensaje={hilo} mediacion={mediacion} esArgumento />
      {hilo.respuestas.length > 0 && (
        <div className="grid gap-2 border-t border-borde px-4 py-3 sm:pl-10">
          {hilo.respuestas.map((r) => (
            <Mensaje key={r.id} mensaje={r} mediacion={mediacion} />
          ))}
        </div>
      )}
      {puedeResponder && (
        <div className="border-t border-borde px-4 py-2.5 sm:pl-10">
          {respondiendo ? (
            <Respuesta foroId={foroId} respuestaAId={hilo.id} alTerminar={() => setRespondiendo(false)} />
          ) : (
            <button
              onClick={() => setRespondiendo(true)}
              className="cursor-pointer text-[11.5px] font-bold text-primario hover:text-primario-fuerte"
            >
              Responder
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Mensaje({
  mensaje,
  mediacion,
  esArgumento = false,
}: {
  mensaje: MensajeVista;
  mediacion?: Mediacion;
  esArgumento?: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const estilo = estiloDe(mensaje);

  return (
    <div
      className={`border-l-[3px] ${estilo.borde} ${esArgumento ? "rounded-xl px-4 py-3.5" : "rounded-md bg-superficie-suave px-3 py-2.5"}`}
      aria-label={`Mensaje de ${mensaje.autor}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="font-bold text-tinta">{mensaje.propio ? "Tú" : mensaje.autor}</span>
        <span className={`font-bold tracking-[.06em] ${estilo.texto}`}>{estilo.etiqueta}</span>
        <span className="text-suave">{mensaje.fecha}</span>
        {mensaje.destacado && (
          <span className="rounded-full bg-terciario-tinte px-2 py-0.5 text-[10px] font-extrabold tracking-[.05em] text-terciario-fuerte">
            ★ DESTACADO POR EL DOCENTE
          </span>
        )}
      </div>
      <p className={`mt-1.5 whitespace-pre-line leading-relaxed text-tinta ${esArgumento ? "text-[13.5px]" : "text-[13px]"}`}>
        {mensaje.texto}
      </p>
      {mensaje.fuente && (
        <p className="mt-1.5 text-[11.5px] text-apagado">
          <span className="font-bold">Fuente:</span> {mensaje.fuente}
        </p>
      )}
      {mediacion && (
        <div className="mt-2 flex gap-3 text-[11px] font-bold">
          <button
            disabled={pendiente}
            onClick={() => iniciar(async () => void (await mediacion.destacar(mensaje.id)))}
            className="cursor-pointer text-terciario-fuerte hover:underline disabled:opacity-50"
          >
            {mensaje.destacado ? "Quitar destacado" : "Destacar"}
          </button>
          <button
            disabled={pendiente}
            onClick={() => {
              const aviso = esArgumento
                ? "¿Retirar este argumento del debate? Se retiran también sus respuestas."
                : "¿Retirar esta respuesta del debate?";
              if (confirm(aviso)) iniciar(async () => void (await mediacion.retirar(mensaje.id)));
            }}
            className="cursor-pointer text-peligro hover:underline disabled:opacity-50"
          >
            Retirar
          </button>
        </div>
      )}
    </div>
  );
}

function Respuesta({
  foroId,
  respuestaAId,
  alTerminar,
}: {
  foroId: string;
  respuestaAId: string;
  alTerminar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const res = await publicarMensaje(foroId, { texto, respuestaAId });
          if (res.error) return setError(res.error);
          alTerminar();
        });
      }}
    >
      <label htmlFor={`respuesta-${respuestaAId}`} className="sr-only">
        Tu respuesta
      </label>
      <textarea
        id={`respuesta-${respuestaAId}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        autoFocus
        maxLength={LIMITES.maximo}
        placeholder="Responde a este argumento…"
        className="w-full resize-y rounded-lg border border-borde-campo bg-superficie px-3 py-2 text-[13px]"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="cursor-pointer rounded-md bg-primario-fuerte px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60"
        >
          {pendiente ? "Enviando..." : "Responder"}
        </button>
        <button type="button" onClick={alTerminar} className="cursor-pointer text-[11.5px] font-bold text-tenue">
          Cancelar
        </button>
        {error && (
          <span role="alert" className="text-[11.5px] font-semibold text-peligro">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
