"use client";

import { useActionState, useState, useTransition } from "react";
import { ACTIVIDADES, type EjeArmado } from "@/lib/importador-pdf";
import {
  analizarDocumento,
  analizarDocumentoExistente,
  crearModuloDesdeDocumento,
  eliminarDocumento,
  type ResultadoAnalisis,
} from "./actions";

type Documento = {
  id: string;
  titulo: string;
  nombreArchivo: string;
  paginas: number;
  caso: string | null;
  subidoEn: string;
};

export function ImportadorDocumento({ documentos }: { documentos: Documento[] }) {
  const [arbol, setArbol] = useState<EjeArmado[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [depto, setDepto] = useState("");
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string } | null>(null);
  const [activo, setActivo] = useState(true);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [analisisPrevio, setAnalisisPrevio] = useState<ResultadoAnalisis | null>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const [analizandoPrevio, iniciarAnalisisPrevio] = useTransition();
  const [borrando, iniciarBorrado] = useTransition();
  /** Sesión cuyo texto está desplegado para revisar; solo una a la vez. */
  const [textoAbierto, setTextoAbierto] = useState<string | null>(null);

  /** Quita un PDF del repositorio para poder volver a subir una versión nueva. */
  function borrar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar "${titulo}" del repositorio? El archivo se borra del servidor.`)) return;

    iniciarBorrado(async () => {
      const res = await eliminarDocumento(id);
      setMensaje(res);
      // Si el documento borrado era el que estaba en revisión, se cierra.
      if (res.ok && analisisPrevio?.documentoId === id) {
        setAnalisisPrevio(null);
        setArbol(null);
      }
    });
  }

  const [analisis, accionAnalizar, analizando] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const res = await analizarDocumento(prev, formData);
      if (res.arbol) {
        setArbol(res.arbol);
        setNombre("");
        setDepto("");
        setMensaje(null);
      }
      return res;
    },
    null as ResultadoAnalisis | null
  );

  function editarEje(codigo: string, titulo: string) {
    setArbol((prev) => prev!.map((e) => (e.codigo === codigo ? { ...e, titulo } : e)));
  }

  function editarSesion(ejeCodigo: string, codigo: string, titulo: string) {
    setArbol((prev) =>
      prev!.map((e) =>
        e.codigo !== ejeCodigo
          ? e
          : { ...e, sesiones: e.sesiones.map((s) => (s.codigo === codigo ? { ...s, titulo } : s)) }
      )
    );
  }

  function editarSubseccion(ejeCodigo: string, sesionCodigo: string, codigo: string, titulo: string) {
    setArbol((prev) =>
      prev!.map((e) =>
        e.codigo !== ejeCodigo
          ? e
          : {
              ...e,
              sesiones: e.sesiones.map((s) =>
                s.codigo !== sesionCodigo
                  ? s
                  : {
                      ...s,
                      subsecciones: s.subsecciones.map((x) =>
                        x.codigo === codigo ? { ...x, titulo } : x
                      ),
                    }
              ),
            }
      )
    );
  }

  function editarActividad(ejeCodigo: string, codigo: string, actividad: string) {
    setArbol((prev) =>
      prev!.map((e) =>
        e.codigo !== ejeCodigo
          ? e
          : {
              ...e,
              sesiones: e.sesiones.map((s) => (s.codigo === codigo ? { ...s, actividad } : s)),
            }
      )
    );
  }

  /**
   * El texto de la sesión: lo que leerá el estudiante. El importador lo propone
   * a partir del PDF, pero no todos los documentos numeran su cuerpo, así que
   * aquí se puede completar o corregir antes de crear el módulo.
   */
  function editarContenido(ejeCodigo: string, codigo: string, contenido: string) {
    setArbol((prev) =>
      prev!.map((e) =>
        e.codigo !== ejeCodigo
          ? e
          : {
              ...e,
              sesiones: e.sesiones.map((s) => (s.codigo === codigo ? { ...s, contenido } : s)),
            }
      )
    );
  }

  function alternarTexto(codigo: string) {
    setTextoAbierto((actual) => (actual === codigo ? null : codigo));
  }

  function quitarEje(codigo: string) {
    setArbol((prev) => prev!.filter((e) => e.codigo !== codigo));
  }

  function quitarSesion(ejeCodigo: string, codigo: string) {
    setArbol((prev) =>
      prev!.map((e) =>
        e.codigo !== ejeCodigo ? e : { ...e, sesiones: e.sesiones.filter((s) => s.codigo !== codigo) }
      )
    );
  }

  function analizarCargado(id: string) {
    iniciarAnalisisPrevio(async () => {
      const res = await analizarDocumentoExistente(id);
      setAnalisisPrevio(res);
      setMensaje(res.error ? { error: res.error } : null);
      if (res.arbol) {
        setArbol(res.arbol);
        setNombre("");
        setDepto("");
      }
    });
  }

  function confirmar() {
    const vigente = analisisPrevio?.arbol ? analisisPrevio : analisis;
    if (!vigente?.documentoId || !arbol) return;
    iniciarGuardado(async () => {
      const res = await crearModuloDesdeDocumento({
        documentoId: vigente.documentoId,
        nombre,
        depto,
        activo,
        lat: lat.trim() ? Number(lat) : null,
        lon: lon.trim() ? Number(lon) : null,
        arbol,
      });
      setMensaje(res);
      if (res.ok) {
        setArbol(null);
        setAnalisisPrevio(null);
      }
    });
  }

  const vigente = analisisPrevio?.arbol ? analisisPrevio : analisis;
  const totalSesiones = arbol?.reduce((s, e) => s + e.sesiones.length, 0) ?? 0;
  const totalSubsecciones =
    arbol?.reduce((s, e) => s + e.sesiones.reduce((t, x) => t + x.subsecciones.length, 0), 0) ?? 0;

  const claseCampo =
    "w-full rounded-md border border-borde-campo bg-superficie px-2.5 py-1.5 text-[13px]";

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">
        CU09 · CREACIÓN DE MÓDULOS
      </div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">
        Importar módulo desde un documento
      </h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Construye la ruta pedagógica a partir de una guía en PDF. Puedes analizar uno de los
        documentos ya cargados (abajo) o subir uno nuevo. El sistema detecta los ejes, las sesiones y
        las subsecciones por su numeración, y tú revisas la estructura y asignas la actividad de cada
        sesión antes de crear el módulo.
      </p>

      <form action={accionAnalizar} className="mb-[18px] rounded-xl border border-borde bg-superficie p-5">
        <label htmlFor="archivo" className="text-[10px] font-bold tracking-[.12em] text-tenue">
          SUBIR UN DOCUMENTO NUEVO
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="flex-1 rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primario-tinte file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-primario-fuerte"
          />
          <button
            type="submit"
            disabled={analizando}
            className="cursor-pointer rounded-lg bg-primario-fuerte px-[18px] py-2.5 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {analizando ? "Analizando..." : "Analizar documento"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-suave">
          El PDF debe tener texto seleccionable. Si está escaneado como imagen, primero necesita OCR.
        </p>
        {analisis?.error && (
          <div role="alert" className="mt-2.5 text-[11.5px] font-semibold text-peligro">
            {analisis.error}
          </div>
        )}
      </form>

      {arbol && vigente?.documentoId && (
        <div className="animar-aparecer rounded-xl border border-borde bg-superficie p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-[12.5px] font-extrabold tracking-[.05em] text-primario-fuerte">
                REVISA LA ESTRUCTURA DETECTADA
              </div>
              <div className="mt-1 text-[11.5px] text-suave">
                {vigente.tituloDocumento} · {vigente.paginas} páginas · {arbol.length} ejes,{" "}
                {totalSesiones} sesiones, {totalSubsecciones} subsecciones
              </div>
            </div>
            <button
              onClick={() => {
                setArbol(null);
                setAnalisisPrevio(null);
              }}
              className="cursor-pointer rounded-lg border border-borde-campo px-3 py-1.5 text-[12px] font-semibold text-apagado"
            >
              Descartar
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-terciario-borde bg-terciario-tinte px-3.5 py-2.5 text-[11.5px] leading-[1.6] text-[#7C736C]">
            La detección es automática y el PDF suele traer títulos partidos en columnas. Corrige aquí lo
            que haga falta y elimina lo que no corresponda: nada se guarda hasta que confirmes.
          </div>

          <div className="mt-4 grid gap-3">
            {arbol.map((eje) => (
              <div key={eje.codigo} className="rounded-[10px] border border-borde bg-superficie-suave p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primario text-[12px] font-extrabold text-white">
                    {eje.codigo}
                  </span>
                  <label className="sr-only" htmlFor={`eje-${eje.codigo}`}>
                    Título del eje {eje.codigo}
                  </label>
                  <input
                    id={`eje-${eje.codigo}`}
                    value={eje.titulo}
                    onChange={(e) => editarEje(eje.codigo, e.target.value)}
                    className={`${claseCampo} font-bold`}
                  />
                  <button
                    onClick={() => quitarEje(eje.codigo)}
                    aria-label={`Quitar el eje ${eje.codigo}`}
                    className="cursor-pointer rounded-md border border-borde-campo px-2.5 py-1.5 text-[11px] font-bold text-tenue hover:border-peligro hover:text-peligro"
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-2.5 grid gap-2 pl-4">
                  {eje.sesiones.map((sesion) => (
                    <div key={sesion.codigo} className="border-l-2 border-borde pl-3">
                      <div className="flex items-center gap-2">
                        <span className="w-9 flex-none text-[11px] font-extrabold text-primario-fuerte">
                          {sesion.codigo}
                        </span>
                        <label className="sr-only" htmlFor={`ses-${sesion.codigo}`}>
                          Título de la sesión {sesion.codigo}
                        </label>
                        <input
                          id={`ses-${sesion.codigo}`}
                          value={sesion.titulo}
                          onChange={(e) => editarSesion(eje.codigo, sesion.codigo, e.target.value)}
                          className={claseCampo}
                        />
                        <button
                          onClick={() => quitarSesion(eje.codigo, sesion.codigo)}
                          aria-label={`Quitar la sesión ${sesion.codigo}`}
                          className="cursor-pointer rounded-md border border-borde-campo px-2 py-1.5 text-[11px] text-tenue hover:border-peligro hover:text-peligro"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-9">
                        <label
                          htmlFor={`act-${sesion.codigo}`}
                          className="text-[10px] font-bold tracking-[.1em] text-suave"
                        >
                          ACTIVIDAD
                        </label>
                        <select
                          id={`act-${sesion.codigo}`}
                          value={sesion.actividad}
                          onChange={(e) => editarActividad(eje.codigo, sesion.codigo, e.target.value)}
                          className="rounded-md border border-borde-campo bg-superficie px-2 py-1 text-[12px]"
                        >
                          {ACTIVIDADES.map((a) => (
                            <option key={a.valor} value={a.valor}>
                              {a.etiqueta}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => alternarTexto(sesion.codigo)}
                          className="cursor-pointer text-[11px] font-semibold text-apagado hover:text-primario"
                        >
                          {textoAbierto === sesion.codigo ? "Ocultar texto" : "Texto de la sesión"}
                        </button>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={
                            sesion.contenido.trim().length >= 200
                              ? { background: "#E5F1F0", color: "#177575" }
                              : { background: "#FBF1DC", color: "#8A6410" }
                          }
                        >
                          {sesion.contenido.trim().length} car
                        </span>
                      </div>

                      {textoAbierto === sesion.codigo && (
                        <div className="mt-2 pl-9">
                          <label className="sr-only" htmlFor={`txt-${sesion.codigo}`}>
                            Texto de la sesión {sesion.codigo}
                          </label>
                          <textarea
                            id={`txt-${sesion.codigo}`}
                            value={sesion.contenido}
                            onChange={(e) => editarContenido(eje.codigo, sesion.codigo, e.target.value)}
                            placeholder="Pega aquí el texto que leerá el estudiante en esta sesión."
                            className="h-[180px] w-full resize-y rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[12.5px] leading-[1.6]"
                          />
                          <p className="mt-1 text-[11px] leading-[1.5] text-suave">
                            Es lo que el estudiante lee al abrir la actividad. El importador lo saca
                            del PDF cuando el documento numera sus apartados; si quedó vacío o
                            incompleto, complétalo aquí antes de crear el módulo.
                          </p>
                        </div>
                      )}

                      {sesion.subsecciones.length > 0 && (
                        <div className="mt-1.5 grid gap-1.5 pl-9">
                          {sesion.subsecciones.map((sub) => (
                            <div key={sub.codigo} className="flex items-center gap-2">
                              <span className="w-11 flex-none text-[10.5px] font-bold text-suave">
                                {sub.codigo}
                              </span>
                              <label className="sr-only" htmlFor={`sub-${sub.codigo}`}>
                                Título de la subsección {sub.codigo}
                              </label>
                              <input
                                id={`sub-${sub.codigo}`}
                                value={sub.titulo}
                                onChange={(e) =>
                                  editarSubseccion(eje.codigo, sesion.codigo, sub.codigo, e.target.value)
                                }
                                className={`${claseCampo} text-[12px]`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 border-t border-borde pt-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                NOMBRE DEL CASO DE ESTUDIO
              </label>
              <input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. El Salado"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label htmlFor="depto" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                DEPARTAMENTO O REGIÓN
              </label>
              <input
                id="depto"
                value={depto}
                onChange={(e) => setDepto(e.target.value)}
                placeholder="ej. Bolívar · Montes de María"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="lat" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                LATITUD (OPCIONAL)
              </label>
              <input
                id="lat"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="ej. 9.62"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label htmlFor="lon" className="text-[10px] font-bold tracking-[.12em] text-tenue">
                LONGITUD (OPCIONAL)
              </label>
              <input
                id="lon"
                inputMode="decimal"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="ej. -75.13"
                className="mt-1.5 w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]"
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-suave">
            Si indicas las coordenadas, el caso aparece ubicado en el mapa de Colombia del estudiante.
          </p>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-borde bg-superficie-suave px-3.5 py-3">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[12.5px] leading-[1.55] text-apagado">
              <strong className="font-bold text-tinta">Activar este módulo</strong> como la ruta
              pedagógica que ven los estudiantes. Solo un módulo puede estar activo a la vez.
            </span>
          </label>

          <button
            onClick={confirmar}
            disabled={guardando}
            className="mt-3 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
          >
            {guardando ? "Creando módulo..." : "Crear módulo con esta estructura"}
          </button>
        </div>
      )}

      {mensaje?.ok && (
        <div role="status" className="mt-4 rounded-lg border border-secundario-borde bg-secundario-tinte px-4 py-3 text-[12.5px] font-semibold text-secundario-fuerte">
          {mensaje.ok}
        </div>
      )}
      {mensaje?.error && (
        <div role="alert" className="mt-4 rounded-lg border border-primario-borde bg-primario-tinte px-4 py-3 text-[12.5px] font-semibold text-peligro">
          {mensaje.error}
        </div>
      )}

      <div className="mt-6">
        <div className="text-[11px] font-bold tracking-[.12em] text-tenue">DOCUMENTOS FUENTE</div>
        <div className="mt-2.5 overflow-hidden rounded-xl border border-borde bg-superficie">
          {documentos.length === 0 && (
            <p className="px-4 py-6 text-center text-[12.5px] text-tenue">
              Todavía no se ha importado ningún documento.
            </p>
          )}
          {documentos.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{d.titulo}</div>
                <div className="text-[11px] text-suave">
                  {d.nombreArchivo} · {d.paginas} páginas · {d.subidoEn}
                </div>
              </div>
              {d.caso ? (
                <span className="rounded-full bg-secundario-tinte px-2.5 py-1 text-[10.5px] font-bold text-secundario-fuerte">
                  {d.caso}
                </span>
              ) : (
                <span className="rounded-full bg-[#F3F0EC] px-2.5 py-1 text-[10.5px] font-bold text-suave">
                  Sin módulo
                </span>
              )}
              <button
                onClick={() => analizarCargado(d.id)}
                disabled={analizandoPrevio}
                className="cursor-pointer rounded-md bg-primario-fuerte px-2.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
              >
                {analizandoPrevio ? "Analizando..." : "Analizar"}
              </button>
              <a
                href={`/api/documentos/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-borde-campo px-2.5 py-1.5 text-[11.5px] font-semibold text-apagado no-underline hover:border-primario hover:text-primario hover:no-underline"
              >
                Ver PDF
              </a>
              <button
                onClick={() => borrar(d.id, d.titulo)}
                disabled={borrando}
                title={
                  d.caso
                    ? "Elimina antes el módulo que se creó con este documento"
                    : "Quitar del repositorio para volver a subirlo"
                }
                className="cursor-pointer rounded-md border border-borde-campo px-2.5 py-1.5 text-[11.5px] font-semibold text-apagado hover:border-peligro hover:text-peligro disabled:opacity-60"
              >
                {borrando ? "..." : "Eliminar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
