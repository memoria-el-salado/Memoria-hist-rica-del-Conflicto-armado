"use client";

import { useState, useTransition } from "react";
import { ReproductorRecurso } from "@/components/recursos/reproductor-recurso";
import type { RecursoVista } from "@/lib/material";
import { definicionDe, MAXIMO_RECURSO, TIPOS_RECURSO, type TipoRecurso } from "@/lib/recursos";
import { subirConProgreso } from "@/lib/subir-con-progreso";
import type { Requisito } from "@/lib/transcripcion";
import {
  alternarAlertaRecurso,
  cargarRecurso,
  descartarSubida,
  eliminarRecurso,
  guardarTranscripcion,
  prepararSubidaRecurso,
  subirRecursoLocal,
} from "./actions";

type Recurso = {
  id: string;
  titulo: string;
  contexto: string;
  eje: string;
  sesion: string | null;
  tipo: TipoRecurso;
  alerta: boolean;
  /** Solo quien lo cargó puede cambiarlo o retirarlo. */
  propio: boolean;
  vista: RecursoVista;
  requisito: Requisito;
  /** Lo guardado, para editarlo. Solo llega en los recursos propios. */
  transcripcionTexto: string | null;
};

type Documento = {
  id: string;
  titulo: string;
  paginas: number;
  /** El estudiante no puede abrirlo: es material de preparación del docente. */
  soloDocentes: boolean;
};

type Eje = { id: string; label: string; sesiones: { id: string; label: string }[] };

type Props = {
  recursos: Recurso[];
  ejes: Eje[];
  documentos: Documento[];
};

const campo = "mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]";
const rotulo = "mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue";

export function GestionContenido({ recursos, ejes, documentos }: Props) {
  return (
    <div className="animar-aparecer">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU06 · LCMS</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Gestión de Contenido Multimedia
      </h1>
      <p className="mb-5 max-w-[640px] text-[13.5px] leading-[1.65] text-apagado">
        Carga testimonios, coplas, imágenes y recortes de prensa en los módulos temáticos. El estudiante los
        encuentra dentro de la sesión. Todo recurso exige contexto histórico, y puedes activar una Alerta de
        Cuidado antes de contenidos emocionalmente retadores.
      </p>

      {documentos.length > 0 && (
        <div className="mb-5 rounded-xl border border-borde bg-superficie p-[18px]">
          <div className="text-[10.5px] font-bold tracking-[.12em] text-tenue">
            GUÍAS DEL MÓDULO ACTIVO
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-suave">
            Los documentos de los que salió la ruta pedagógica. Los marcados como material del
            docente no aparecen en la pantalla del estudiante.
          </p>
          <div className="mt-3 grid gap-2">
            {documentos.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-3 rounded-[10px] border border-borde bg-superficie-suave px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold">{d.titulo}</span>
                    {d.soloDocentes ? (
                      <span className="rounded-full bg-[#EDE7F6] px-2 py-0.5 text-[10px] font-bold text-[#5B4B8A]">
                        Solo docentes
                      </span>
                    ) : (
                      <span className="rounded-full bg-secundario-tinte px-2 py-0.5 text-[10px] font-bold text-secundario-fuerte">
                        Visible para estudiantes
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-suave">{d.paginas} páginas</div>
                </div>
                <a
                  href={`/api/documentos/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-borde-campo bg-superficie px-2.5 py-1.5 text-[11.5px] font-semibold text-apagado no-underline hover:border-primario hover:text-primario hover:no-underline"
                >
                  Abrir PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rejilla-panel-ancha">
        <ListaRecursos recursos={recursos} />
        <NuevoRecurso ejes={ejes} />
      </div>
    </div>
  );
}

function EstadoAccesible({ r }: { r: Recurso }) {
  if (r.requisito === "ninguno") return null;
  if (r.vista.pendiente) {
    return (
      <div className="mt-2 rounded-md border border-primario-borde bg-primario-tinte px-2.5 py-1.5 text-[11px] text-primario-fuerte">
        <span className="font-extrabold tracking-[.05em]">NO LO VEN LOS ESTUDIANTES · </span>
        {r.vista.pendiente}
      </div>
    );
  }
  return (
    <div className="mt-2 text-[10px] font-extrabold tracking-[.06em] text-secundario-fuerte">
      {r.vista.transcripcion?.sincronizada ? "TRANSCRIPCIÓN SINCRONIZADA" : "TRANSCRIPCIÓN EN TEXTO"}
    </div>
  );
}

function EditorTranscripcion({ r, alTerminar }: { r: Recurso; alTerminar: () => void }) {
  const [texto, setTexto] = useState(r.transcripcionTexto ?? "");
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const id = `transcripcion-${r.id}`;

  return (
    <div className="mt-3 rounded-lg border border-borde bg-superficie-suave p-3">
      <label htmlFor={id} className="text-[10px] font-bold tracking-[.12em] text-tenue">
        TRANSCRIPCIÓN
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-apagado">
        {r.requisito === "sincronizada"
          ? "Se mostrará como subtítulos: escribe cada línea con el minuto en que se dice."
          : "Basta el texto. Si pones el minuto al principio de cada línea, el estudiante podrá seguirla mientras escucha."}
        {" "}También puedes cargar un archivo WebVTT (.vtt) o de texto.
      </p>
      <textarea
        id={id}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        placeholder={"0:00 Nosotros vivíamos de la tierra.\n0:07 El tabaco se secaba en los caneyes."}
        className="mt-2 w-full resize-y rounded-lg border border-borde-campo bg-superficie px-3 py-2 font-mono text-[12px]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer text-[11.5px] font-bold text-primario">
          Cargar archivo…
          <input
            type="file"
            accept=".vtt,.txt,text/vtt,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setTexto(await f.text());
            }}
          />
        </label>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const res = await guardarTranscripcion(r.id, texto);
              setEstado(res);
              if (res.ok) alTerminar();
            })
          }
          className="cursor-pointer rounded-md bg-primario-fuerte px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-60"
        >
          {pendiente ? "Guardando..." : "Guardar transcripción"}
        </button>
      </div>
      {estado?.error && (
        <div role="alert" className="mt-2 text-[11.5px] font-semibold text-peligro">
          {estado.error}
        </div>
      )}
    </div>
  );
}

function ListaRecursos({ recursos }: { recursos: Recurso[] }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [pendiente, iniciar] = useTransition();

  if (!recursos.length) {
    return (
      <div className="rounded-xl border border-dashed border-borde-campo bg-superficie p-5 text-[13px] text-apagado">
        Todavía no hay recursos en el módulo activo. Carga el primero con el formulario.
      </div>
    );
  }

  return (
    <div className="grid content-start gap-2.5">
      {aviso && (
        <p role="status" className="text-[11.5px] font-semibold text-apagado">
          {aviso}
        </p>
      )}
      {recursos.map((r) => (
        <article key={r.id} className="rounded-xl border border-borde bg-superficie p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold">{r.titulo}</div>
              <div className="mt-0.5 text-[11px] text-suave">
                {r.eje}
                {r.sesion ? ` · Sesión ${r.sesion}` : " · Todo el eje"}
              </div>
            </div>
            <span className="rounded-full border border-borde px-2.5 py-[3px] text-[10.5px] font-bold tracking-[.05em] text-[#7C736C]">
              {definicionDe(r.tipo).etiqueta}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-apagado">{r.contexto}</p>
          <EstadoAccesible r={r} />

          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] font-bold">
            <button
              onClick={() => setAbierto((a) => (a === r.id ? null : r.id))}
              aria-expanded={abierto === r.id}
              className="cursor-pointer text-primario hover:text-primario-fuerte"
            >
              {abierto === r.id ? "Ocultar" : "Ver"}
            </button>
            {r.propio && r.requisito !== "ninguno" && (
              <button
                onClick={() => setEditando((a) => (a === r.id ? null : r.id))}
                aria-expanded={editando === r.id}
                className="cursor-pointer text-primario hover:text-primario-fuerte"
              >
                Transcripción
              </button>
            )}
            {r.propio ? (
              <>
                <button
                  aria-pressed={r.alerta}
                  aria-label={`${r.alerta ? "Desactivar" : "Activar"} alerta de cuidado en ${r.titulo}`}
                  disabled={pendiente}
                  onClick={() => iniciar(async () => void (await alternarAlertaRecurso(r.id)))}
                  className="cursor-pointer rounded-full border px-2.5 py-[3px] text-[9.5px] font-extrabold tracking-[.06em] disabled:opacity-60"
                  style={
                    r.alerta
                      ? { borderColor: "#D95D39", background: "#FDF4F0", color: "#B8482A" }
                      : { borderColor: "#E4DDD6", background: "#fff", color: "#A79E96" }
                  }
                >
                  ALERTA {r.alerta ? "ACTIVA" : "INACTIVA"}
                </button>
                <button
                  disabled={pendiente}
                  onClick={() => {
                    if (!confirm(`¿Retirar "${r.titulo}" del módulo? Se borra también su archivo.`)) return;
                    iniciar(async () => {
                      const res = await eliminarRecurso(r.id);
                      setAviso(res.ok ?? res.error ?? "");
                    });
                  }}
                  className="cursor-pointer text-peligro hover:underline disabled:opacity-60"
                >
                  Retirar
                </button>
              </>
            ) : (
              r.alerta && <span className="text-[10px] font-extrabold tracking-[.06em] text-primario-fuerte">ALERTA ACTIVA</span>
            )}
          </div>

          {editando === r.id && (
            <EditorTranscripcion
              r={r}
              alTerminar={() => {
                setEditando(null);
                setAviso("Transcripción guardada.");
              }}
            />
          )}

          {abierto === r.id && (
            <div className="mt-3">
              <ReproductorRecurso recurso={r.vista} conAviso={false} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function NuevoRecurso({ ejes }: { ejes: Eje[] }) {
  const [titulo, setTitulo] = useState("");
  const [ejeId, setEjeId] = useState(ejes[0]?.id ?? "");
  const [sesionId, setSesionId] = useState("");
  const [tipo, setTipo] = useState<TipoRecurso>("AUDIO");
  const [modo, setModo] = useState<"archivo" | "enlace">("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enlace, setEnlace] = useState("");
  const [contexto, setContexto] = useState("");
  const [alerta, setAlerta] = useState(false);
  const [porcentaje, setPorcentaje] = useState<number | null>(null);
  const [estado, setEstado] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [formulario, setFormulario] = useState(0);

  const def = definicionDe(tipo);
  // Un simulador siempre se enlaza: no hay archivo que subir.
  const soloEnlace = def.extensiones.length === 0;
  const origen = soloEnlace ? "enlace" : modo;
  const sesiones = ejes.find((e) => e.id === ejeId)?.sesiones ?? [];

  function limpiar() {
    setTitulo("");
    setSesionId("");
    setArchivo(null);
    setEnlace("");
    setContexto("");
    setAlerta(false);
    setFormulario((n) => n + 1);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado(null);

    // Lo que se puede comprobar aquí se comprueba antes de subir nada.
    if (!titulo.trim()) return setEstado({ error: "El recurso necesita un título." });
    if (!contexto.trim()) return setEstado({ error: "El contexto histórico es obligatorio para publicar." });
    if (origen === "archivo" && !archivo) return setEstado({ error: "Selecciona un archivo." });

    iniciar(async () => {
      const datos = { titulo, contexto, ejeId, sesionId: sesionId || null, tipo, alerta };

      if (origen === "enlace") {
        const res = await cargarRecurso({ ...datos, origen: { clase: "enlace", enlace } });
        setEstado(res);
        if (res.ok) limpiar();
        return;
      }

      const f = archivo!;
      const prep = await prepararSubidaRecurso({ nombre: f.name, tipo: f.type, tamano: f.size }, tipo);
      if (prep.error) return setEstado({ error: prep.error });

      setPorcentaje(0);
      let subido: boolean;
      if (prep.url) {
        subido = await subirConProgreso(prep.url, f, prep.mime!, setPorcentaje);
      } else {
        const fd = new FormData();
        fd.append("archivo", f);
        subido = Boolean((await subirRecursoLocal(prep.ruta!, fd)).ok);
      }
      setPorcentaje(null);
      if (!subido) return setEstado({ error: "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo." });

      const res = await cargarRecurso({ ...datos, origen: { clase: "archivo", id: prep.id!, ruta: prep.ruta! } });
      if (res.error) await descartarSubida(prep.ruta!);
      setEstado(res);
      if (res.ok) limpiar();
    });
  }

  const pestaña = (activa: boolean) =>
    `flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[11.5px] font-bold ${
      activa ? "bg-superficie text-primario-fuerte shadow-sm" : "text-tenue"
    }`;

  return (
    <form key={formulario} onSubmit={enviar} className="h-fit rounded-xl border border-borde bg-superficie p-5">
      <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">NUEVO RECURSO</div>

      <label htmlFor="titulo" className={rotulo}>
        TÍTULO
      </label>
      <input
        id="titulo"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="ej. Copla: Tierra de abundancia"
        className={campo}
      />

      <label htmlFor="ejeId" className={rotulo}>
        EJE TEMÁTICO
      </label>
      <select
        id="ejeId"
        value={ejeId}
        onChange={(e) => {
          setEjeId(e.target.value);
          setSesionId("");
        }}
        className={campo}
      >
        {ejes.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </select>

      <label htmlFor="sesionId" className={rotulo}>
        SESIÓN
      </label>
      <select id="sesionId" value={sesionId} onChange={(e) => setSesionId(e.target.value)} className={campo}>
        <option value="">Todo el eje</option>
        {sesiones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <label htmlFor="tipo" className={rotulo}>
        TIPO
      </label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRecurso)} className={campo}>
        {TIPOS_RECURSO.map((t) => (
          <option key={t.valor} value={t.valor}>
            {t.etiqueta}
          </option>
        ))}
      </select>

      {!soloEnlace && (
        <div role="tablist" aria-label="Origen del recurso" className="mt-3 flex gap-1 rounded-lg bg-superficie-suave p-1">
          <button type="button" role="tab" aria-selected={modo === "archivo"} onClick={() => setModo("archivo")} className={pestaña(modo === "archivo")}>
            Subir archivo
          </button>
          <button type="button" role="tab" aria-selected={modo === "enlace"} onClick={() => setModo("enlace")} className={pestaña(modo === "enlace")}>
            Pegar enlace
          </button>
        </div>
      )}

      {origen === "archivo" ? (
        <>
          <label htmlFor="archivo" className={rotulo}>
            ARCHIVO ({def.extensiones.join(", ")} · hasta {Math.round(MAXIMO_RECURSO / 1048576)} MB)
          </label>
          <input
            id="archivo"
            type="file"
            accept={[...def.mimes, ...def.extensiones.map((x) => `.${x}`)].join(",")}
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className={`${campo} file:mr-3 file:rounded-md file:border-0 file:bg-primario-tinte file:px-3 file:py-1 file:text-[12px] file:font-bold file:text-primario-fuerte`}
          />
        </>
      ) : (
        <>
          <label htmlFor="enlace" className={rotulo}>
            ENLACE
          </label>
          <input
            id="enlace"
            value={enlace}
            onChange={(e) => setEnlace(e.target.value)}
            placeholder={tipo === "VIDEO" ? "https://www.youtube.com/watch?v=…" : "https://…"}
            className={campo}
          />
          {tipo === "VIDEO" && (
            <p className="mt-1 text-[11px] text-suave">Los videos de YouTube y Vimeo se ven dentro de la sesión.</p>
          )}
        </>
      )}

      <label htmlFor="contexto" className={rotulo}>
        CONTEXTO HISTÓRICO (OBLIGATORIO)
      </label>
      <textarea
        id="contexto"
        value={contexto}
        onChange={(e) => setContexto(e.target.value)}
        placeholder="Procedencia, año y advertencias del recurso. En una imagen, describe lo que se ve."
        className={`${campo} h-[76px] resize-y`}
      />

      <button
        type="button"
        aria-pressed={alerta}
        onClick={() => setAlerta((a) => !a)}
        className="mt-3.5 w-full cursor-pointer rounded-lg border px-4 py-2.5 text-[12px] font-bold"
        style={
          alerta
            ? { borderColor: "#D95D39", background: "#FDF4F0", color: "#B8482A" }
            : { borderColor: "#E4DDD6", background: "#fff", color: "#8C8279" }
        }
      >
        Alerta de cuidado: {alerta ? "ACTIVADA" : "desactivada"}
      </button>

      <button
        type="submit"
        disabled={pendiente}
        className="mt-2.5 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
      >
        {porcentaje !== null ? `Subiendo ${porcentaje} %` : pendiente ? "Cargando..." : "Cargar al módulo"}
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
  );
}
