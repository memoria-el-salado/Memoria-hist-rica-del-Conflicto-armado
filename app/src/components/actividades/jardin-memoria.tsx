"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  descartarImagenFlor,
  prepararImagenFlor,
  retirarFlor,
  sembrarMemoria,
  subirImagenFlorLocal,
} from "@/app/estudiante/sesion/[id]/acciones-jardin";
import {
  CREACIONES,
  esImagen,
  esTexto,
  ETIQUETA_CREACION,
  LIMITES_FLOR,
  textoAlternativo,
  validarFlor,
  type Creacion,
} from "@/lib/jardin";
import { subirConProgreso } from "@/lib/subir-con-progreso";
import { CabeceraSesion, type DatosSesion } from "./cabecera-sesion";
import { FotoLugar, type Foto } from "./foto-lugar";
import { LienzoDibujo } from "./lienzo-dibujo";

const ICONOS: Record<string, string> = {
  FLOR: "M12 21V11M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 15c-3 0-5-2-5-4",
  HOJA: "M11 20A7 7 0 0 1 4 13c0-6 8-9 16-9 0 8-3 16-9 16zM4 21c3-6 6-9 10-11",
  SEMILLA: "M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z",
  MANO: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10V6a2 2 0 1 0-4 0v10a6 6 0 0 0 12 0v-3",
};

/** Marca pequeña sobre la flor que dice qué creación la acompaña. */
const MARCA_CREACION: Partial<Record<Creacion, string>> = {
  CARTA: "Carta",
  POEMA: "Poema",
  DIBUJO: "Dibujo",
  FOTO: "Obra",
};

const EPOCAS = [
  { valor: "ANTES_1997", label: "Antes de 1997" },
  { valor: "ENTRE_1997_2000", label: "1997 - 2000" },
  { valor: "RETORNO", label: "Retorno (2002 - hoy)" },
];

const PIEZAS = [
  { valor: "FLOR", label: "Flor" },
  { valor: "HOJA", label: "Hoja" },
  { valor: "SEMILLA", label: "Semilla" },
  { valor: "MANO", label: "Mano" },
];

type Flor = {
  id: string;
  nombre: string;
  legado: string;
  epoca: string;
  pieza: string;
  tono: string;
  altura: number;
  creacion: Creacion;
  texto: string | null;
  conImagen: boolean;
  descripcion: string | null;
  /** Quién la sembró; null en las flores curadas por el archivo. */
  autor: string | null;
  propia: boolean;
};

const etiquetaEpoca = (valor: string) => EPOCAS.find((e) => e.valor === valor)?.label ?? valor;

export function JardinMemoria({ sesion, flores }: { sesion: DatosSesion; flores: Flor[] }) {
  const [sembrando, setSembrando] = useState(false);
  const [filtro, setFiltro] = useState("TODAS");
  const [abierta, setAbierta] = useState<Flor | null>(null);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);

  const visibles = flores.filter((f) => filtro === "TODAS" || f.epoca === filtro);

  return (
    <div className="animar-aparecer">
      <CabeceraSesion sesion={sesion} />

      <p className="max-w-[720px] text-[13.5px] leading-[1.7] text-apagado">
        Cada pieza que siembres honra una vida y un legado, y puede llevar una carta, un poema o un dibujo
        tuyo. Lo que siembres lo verán tus compañeros de curso, con tu nombre, en cuanto lo siembres.
      </p>

      <div className="my-5 flex flex-wrap justify-center gap-2.5">
        <button
          onClick={() => setSembrando((s) => !s)}
          aria-expanded={sembrando}
          className="cursor-pointer rounded-lg bg-primario-fuerte px-[18px] py-[11px] text-[13px] font-bold text-white hover:bg-primario-hover"
        >
          {sembrando ? "Cerrar formulario" : "Sembrar una Memoria"}
        </button>
        {[{ valor: "TODAS", label: "Todas" }, ...EPOCAS].map((f) => {
          const activo = filtro === f.valor;
          return (
            <button
              key={f.valor}
              aria-pressed={activo}
              onClick={() => setFiltro(f.valor)}
              className="cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold"
              style={
                activo
                  ? { background: "#B8482A", borderColor: "#B8482A", color: "#fff" }
                  : { background: "#fff", borderColor: "#E4DDD6", color: "#7C736C" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {aviso && (
        <div
          role={aviso.error ? "alert" : "status"}
          className={`mx-auto mb-4 max-w-[720px] text-center text-[12.5px] font-semibold ${aviso.error ? "text-peligro" : "text-secundario-fuerte"}`}
        >
          {aviso.error ?? aviso.ok}
        </div>
      )}

      {sembrando && (
        <FormularioFlor
          sesionId={sesion.id}
          onCerrar={() => setSembrando(false)}
          onSembrada={(ok) => {
            setAviso({ ok });
            setSembrando(false);
            setFiltro("TODAS");
          }}
        />
      )}

      <div className="min-h-[330px] rounded-[14px] border border-borde bg-[linear-gradient(180deg,#FBF7F1_0%,#F4EEE6_100%)] px-6 pb-8 pt-7">
        <ul className="grid grid-cols-2 gap-[18px] md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          {visibles.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setAbierta(f)}
                aria-haspopup="dialog"
                aria-label={`${f.nombre}${MARCA_CREACION[f.creacion] ? `, con ${MARCA_CREACION[f.creacion]!.toLowerCase()}` : ""}. Abrir`}
                className="flex w-full cursor-pointer flex-col items-center rounded-xl pb-2 text-center hover:bg-white/60 focus-visible:bg-white/60"
              >
                <span
                  className="w-0.5"
                  style={{ height: f.altura, background: "linear-gradient(180deg,rgba(200,170,120,0) 0%,#C9A96E 100%)" }}
                />
                <span
                  className="animar-mecer relative flex h-[46px] w-[46px] items-center justify-center rounded-xl shadow-[0_6px_14px_rgba(120,80,50,.16)]"
                  style={{ background: f.tono }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICONOS[f.pieza] ?? ICONOS.FLOR} />
                  </svg>
                  {MARCA_CREACION[f.creacion] && (
                    <span className="absolute -right-3 -top-2 rounded-full border border-white bg-tinta px-1.5 py-px text-[8.5px] font-bold text-white">
                      {MARCA_CREACION[f.creacion]}
                    </span>
                  )}
                </span>
                <span className="mt-2.5 text-[12.5px] font-bold">{f.nombre}</span>
                <span className="mt-[3px] max-w-[190px] text-[11px] leading-[1.5] text-[#7C736C]">{f.legado}</span>
                <span className="mt-1.5 text-[9.5px] font-bold tracking-[.08em] text-suave">{etiquetaEpoca(f.epoca).toUpperCase()}</span>
              </button>
            </li>
          ))}
          {visibles.length === 0 && (
            <li className="col-span-full py-10 text-center text-[13px] text-tenue">No hay memorias sembradas en esta época todavía.</li>
          )}
        </ul>
      </div>

      <DetalleFlor
        flor={abierta}
        onCerrar={() => setAbierta(null)}
        onRetirada={(texto) => {
          setAbierta(null);
          setAviso({ ok: texto });
        }}
      />

      <div className="mt-[22px] rounded-xl border border-borde bg-superficie p-6">
        <h2 className="inline-block border-b-2 border-secundario pb-1 text-[18px] font-extrabold text-secundario-fuerte">
          Instrucciones del Sembrado
        </h2>
        <div className="mt-[18px] grid gap-[22px] sm:grid-cols-2">
          <div>
            <div className="text-[10.5px] font-bold tracking-[.1em] text-primario">1. EL ACTO DE RECORDAR</div>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-apagado">
              Haz clic en una flor para leer la carta o el poema que la acompaña, o para ver el dibujo que
              alguien hizo en memoria de esa persona.
            </p>
          </div>
          <div>
            <div className="text-[10.5px] font-bold tracking-[.1em] text-primario">2. SEMBRAR LEGADO</div>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-apagado">
              Siembra una flor en memoria de alguien de El Salado y, si quieres, acompáñala con una carta, un
              poema o un dibujo. La memoria se cuida entre todas y todos.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[15px] italic text-secundario-fuerte">
        &quot;La memoria es el único jardín del que no podemos ser expulsados.&quot;
      </p>
      <div className="mt-2 text-center text-[10px] font-bold tracking-[.12em] text-suave">
        — ADAPTACIÓN LITERARIA DEL SALADO
      </div>
    </div>
  );
}

function FormularioFlor({
  sesionId,
  onCerrar,
  onSembrada,
}: {
  sesionId: string;
  onCerrar: () => void;
  onSembrada: (ok: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [legado, setLegado] = useState("");
  const [epoca, setEpoca] = useState("ANTES_1997");
  const [pieza, setPieza] = useState("FLOR");
  const [creacion, setCreacion] = useState<Creacion>("NINGUNA");
  const [texto, setTexto] = useState("");
  const [dibujo, setDibujo] = useState<Blob | null>(null);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  const imagen = creacion === "DIBUJO" ? dibujo : creacion === "FOTO" ? (foto?.blob ?? null) : null;

  function sembrar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarFlor({
      nombre,
      legado,
      creacion,
      texto: esTexto(creacion) ? texto : null,
      conImagen: Boolean(imagen),
      descripcion,
    });
    if (problema) return setError(problema);
    setError("");

    iniciar(async () => {
      let subida: { ruta: string } | null = null;
      if (imagen) {
        const prep = await prepararImagenFlor(sesionId, creacion, { mime: imagen.type, tamano: imagen.size });
        if (prep.error || !prep.ruta) return setError(prep.error ?? "No se pudo preparar la subida.");
        setProgreso("Subiendo la imagen...");
        let ok: boolean;
        if (prep.url) {
          ok = await subirConProgreso(prep.url, imagen, prep.mime!, (p) => setProgreso(`Subiendo la imagen · ${p} %`));
        } else {
          const fd = new FormData();
          fd.append("archivo", imagen);
          ok = Boolean((await subirImagenFlorLocal(sesionId, prep.ruta, fd)).ok);
        }
        if (!ok) {
          setProgreso("");
          return setError("No se pudo subir la imagen. Revisa la conexión e inténtalo de nuevo.");
        }
        subida = { ruta: prep.ruta };
      }

      setProgreso("Sembrando...");
      const res = await sembrarMemoria({
        sesionId,
        nombre,
        legado,
        epoca,
        pieza,
        creacion,
        texto: esTexto(creacion) ? texto : null,
        descripcion: esImagen(creacion) ? descripcion : null,
        imagen: subida,
      });
      setProgreso("");
      if (res.error) {
        // La imagen subida no queda huérfana en el depósito.
        if (subida) await descartarImagenFlor(subida.ruta);
        return setError(res.error);
      }
      if (foto) URL.revokeObjectURL(foto.url);
      onSembrada(res.ok!);
    });
  }

  const campo = "mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]";
  const rotulo = "text-[10px] font-bold tracking-[.12em] text-tenue";
  const chip = (activo: boolean) =>
    `cursor-pointer rounded-full border px-[11px] py-1.5 text-[11px] font-bold ${
      activo ? "border-secundario bg-secundario text-white" : "border-borde-campo bg-superficie text-[#7C736C]"
    }`;

  return (
    <form onSubmit={sembrar} className="animar-aparecer mx-auto mb-[26px] max-w-[720px] rounded-xl border border-borde bg-superficie p-[22px]">
      <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">SEMBRAR UNA MEMORIA</div>
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className={rotulo}>NOMBRE DE LA PERSONA</label>
          <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={LIMITES_FLOR.nombreMaximo} placeholder="Nombre y apellido" className={campo} />
        </div>
        <div>
          <label htmlFor="epoca" className={rotulo}>ÉPOCA</label>
          <select id="epoca" value={epoca} onChange={(e) => setEpoca(e.target.value)} className={campo}>
            {EPOCAS.map((e) => (
              <option key={e.valor} value={e.valor}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="legado" className={`${rotulo} mt-3.5 block`}>LEGADO HISTÓRICO</label>
      <textarea
        id="legado"
        value={legado}
        onChange={(e) => setLegado(e.target.value)}
        maxLength={LIMITES_FLOR.legadoMaximo}
        placeholder="ej. Gestor de la primera cancha de fútbol del corregimiento"
        className={`${campo} h-20 resize-y`}
      />

      <div className={`${rotulo} mt-3.5`} id="rotulo-pieza">PIEZA ARTÍSTICA</div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="rotulo-pieza">
        {PIEZAS.map((p) => (
          <button key={p.valor} type="button" aria-pressed={pieza === p.valor} onClick={() => setPieza(p.valor)} className={chip(pieza === p.valor)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className={`${rotulo} mt-3.5`} id="rotulo-creacion">¿LA ACOMPAÑAS CON UNA CREACIÓN TUYA?</div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="rotulo-creacion">
        {CREACIONES.map((c) => (
          <button key={c} type="button" aria-pressed={creacion === c} onClick={() => setCreacion(c)} className={chip(creacion === c)}>
            {ETIQUETA_CREACION[c]}
          </button>
        ))}
      </div>

      {esTexto(creacion) && (
        <div className="mt-3.5">
          <label htmlFor="texto-creacion" className={rotulo}>{creacion === "CARTA" ? "TU CARTA" : "TU POEMA"}</label>
          <textarea
            id="texto-creacion"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITES_FLOR.textoMaximo}
            placeholder={creacion === "CARTA" ? "Querida…" : "Escribe tus versos; los saltos de línea se respetan."}
            className={`${campo} h-40 resize-y ${creacion === "POEMA" ? "font-serif" : ""}`}
          />
        </div>
      )}

      {creacion === "DIBUJO" && (
        <div className="mt-3.5">
          <LienzoDibujo onCambio={setDibujo} />
        </div>
      )}

      {creacion === "FOTO" && (
        <div className="mt-3.5">
          <FotoLugar foto={foto} onCambio={setFoto} etiqueta="Añadir la foto de tu dibujo u obra" id="foto-obra" />
        </div>
      )}

      {esImagen(creacion) && (
        <div className="mt-3">
          <label htmlFor="descripcion-imagen" className={rotulo}>¿QUÉ MUESTRA? (OPCIONAL, PARA QUIEN NO PUEDE VERLA)</label>
          <input
            id="descripcion-imagen"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={LIMITES_FLOR.descripcionMaxima}
            placeholder="ej. La escuela con sus árboles de mango y niños jugando"
            className={campo}
          />
        </div>
      )}

      <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <button
          type="submit"
          disabled={pendiente}
          className="cursor-pointer rounded-lg bg-secundario px-[18px] py-[11px] text-[13px] font-bold text-white hover:bg-secundario-fuerte disabled:opacity-60"
        >
          {pendiente ? "Sembrando..." : "Sembrar en el jardín"}
        </button>
        <button type="button" onClick={onCerrar} className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-[18px] py-[11px] text-[13px] font-semibold text-apagado">
          Cancelar
        </button>
        {progreso && <span role="status" className="text-[11.5px] font-semibold text-apagado">{progreso}</span>}
        {error && !progreso && <span role="alert" className="text-[11.5px] font-semibold text-peligro">{error}</span>}
      </div>
    </form>
  );
}

/**
 * La flor abierta: a quién honra, su legado y la creación que la acompaña. Es
 * un <dialog> nativo, que ya atrapa el foco y se cierra con Escape.
 */
function DetalleFlor({
  flor,
  onCerrar,
  onRetirada,
}: {
  flor: Flor | null;
  onCerrar: () => void;
  onRetirada: (texto: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (flor && !d.open) d.showModal();
    if (!flor && d.open) d.close();
  }, [flor]);

  function retirar() {
    if (!flor || !confirm(`¿Retirar la flor de ${flor.nombre} del jardín?`)) return;
    iniciar(async () => {
      const res = await retirarFlor(flor.id);
      if (res.error) return setError(res.error);
      setError("");
      onRetirada(res.ok!);
    });
  }

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      aria-labelledby="titulo-flor"
      className="m-auto w-[min(640px,calc(100vw-32px))] rounded-[14px] bg-superficie p-0 text-tinta shadow-[0_24px_60px_rgba(0,0,0,.22)] backdrop:bg-[rgba(45,30,22,.42)]"
    >
      {flor && (
        <div className="max-h-[85vh] overflow-y-auto px-6 py-6">
          <div className="text-[10.5px] font-bold tracking-[.12em] text-primario">
            {etiquetaEpoca(flor.epoca).toUpperCase()}
            {flor.creacion !== "NINGUNA" && ` · ${ETIQUETA_CREACION[flor.creacion].toUpperCase()}`}
          </div>
          <h2 id="titulo-flor" className="mt-1.5 text-[21px] font-extrabold tracking-[-.02em]">
            {flor.nombre}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-apagado">{flor.legado}</p>

          {flor.texto && (
            <div
              className={`mt-4 whitespace-pre-line rounded-lg border border-borde bg-superficie-suave px-4 py-3.5 text-[14px] leading-[1.8] text-tinta-media ${
                flor.creacion === "POEMA" ? "font-serif italic" : ""
              }`}
            >
              {flor.texto}
            </div>
          )}

          {flor.conImagen && (
            // eslint-disable-next-line @next/next/no-img-element -- archivo privado servido con dirección firmada
            <img
              src={`/api/jardin/${flor.id}/imagen`}
              alt={textoAlternativo(flor)}
              className="mt-4 w-full rounded-lg border border-borde bg-white object-contain"
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[11.5px] text-suave">{flor.autor ? `Sembrada por ${flor.autor}` : "Curada por el archivo"}</span>
            <span className="flex-1" />
            {flor.propia && (
              <button onClick={retirar} disabled={pendiente} className="cursor-pointer text-[12px] font-bold text-apagado hover:text-peligro">
                Retirar mi flor
              </button>
            )}
            <button
              autoFocus
              onClick={onCerrar}
              className="cursor-pointer rounded-lg border border-borde-campo bg-superficie px-4 py-2 text-[12.5px] font-semibold text-apagado hover:border-primario hover:text-primario"
            >
              Cerrar
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">
              {error}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
