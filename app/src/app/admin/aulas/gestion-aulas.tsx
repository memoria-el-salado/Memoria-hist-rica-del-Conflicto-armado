"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { FormularioUsuario, type Entrega } from "@/components/formulario-usuario";
import { asignarAula, asignarEstudiante, crearAula, crearEstudianteEnAula } from "./actions";

type Docente = { id: string; nombre: string; aulas: { id: string; etiqueta: string }[] };
type Aula = { id: string; etiqueta: string; docenteId: string; estudiantes: number };
type Estudiante = { id: string; nombre: string; usuario: string; destino: string; conectado: boolean };
type Aviso = { ok?: string; error?: string } | null;

const campo = "w-full rounded-lg border border-borde-campo bg-superficie-suave px-3 py-2.5 text-[13px]";
const rotulo = "mt-3 block text-[10px] font-bold tracking-[.12em] text-tenue";

/** Las opciones de aula de un estudiante: sin docente, con un docente o en una de sus aulas. */
function OpcionesDestino({ docentes }: { docentes: Docente[] }) {
  return (
    <>
      <option value="">Sin docente (no ve contenidos)</option>
      {docentes.map((d) => (
        <optgroup key={d.id} label={d.nombre}>
          <option value={`d:${d.id}`}>{d.nombre} · sin aula</option>
          {d.aulas.map((a) => (
            <option key={a.id} value={`c:${a.id}`}>
              {d.nombre} · {a.etiqueta}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function Mensaje({ aviso }: { aviso: Aviso }) {
  if (aviso?.ok) return <div role="status" className="mt-2 text-[12px] font-semibold text-secundario-fuerte">{aviso.ok}</div>;
  if (aviso?.error) return <div role="alert" className="mt-2 text-[12px] font-semibold text-peligro">{aviso.error}</div>;
  return null;
}

export function GestionAulas({
  docentes,
  aulas,
  estudiantes,
  sugerencia,
  anio,
}: {
  docentes: Docente[];
  aulas: Aula[];
  estudiantes: Estudiante[];
  sugerencia: string;
  anio: number;
}) {
  const [aviso, setAviso] = useState<Aviso>(null);
  const [pendiente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState("");
  const [estadoAula, accionAula, creandoAula] = useActionState(crearAula, null as Aviso);
  const formRef = useRef<HTMLFormElement>(null);
  const [estadoAlta, accionAlta, creando] = useActionState(
    crearEstudianteEnAula,
    null as { ok?: string; error?: string; entrega?: Entrega } | null
  );

  const nombreDocente = (id: string) => docentes.find((d) => d.id === id)?.nombre ?? "";
  const sinAula = estudiantes.filter((e) => !e.conectado).length;
  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f ? estudiantes.filter((e) => `${e.nombre} ${e.usuario}`.toLowerCase().includes(f)) : estudiantes;
  }, [estudiantes, filtro]);

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario-texto">CU01 · GESTIÓN DE CUENTAS</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Aulas y estudiantes</h1>
      <p className="mb-5 max-w-[700px] text-[13.5px] leading-[1.65] text-apagado">
        Cada estudiante trabaja en el aula de un docente: así queda conectado con él, que sigue su avance, revisa sus
        trabajos y recibe sus mensajes. Un estudiante que no está en el aula de ningún docente puede entrar a la
        plataforma, pero no ve los contenidos hasta que lo asignes.
      </p>

      <div className="rejilla-panel">
        <div className="grid min-w-0 content-start gap-5">
          <section aria-labelledby="titulo-aulas" className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="flex items-center justify-between border-b border-[#F1EBE5] px-[18px] py-[15px]">
              <h2 id="titulo-aulas" className="text-[13px] font-extrabold">Aulas</h2>
              <span className="text-[11px] font-bold text-suave">{aulas.length}</span>
            </div>
            {aulas.length === 0 ? (
              <p className="px-5 py-6 text-[12.5px] leading-[1.6] text-tenue">
                Todavía no hay aulas. Crea una con el formulario de al lado, o deja que cada docente cree las suyas en
                «Cursos y Grupos».
              </p>
            ) : (
              <ul>
                {aulas.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3 last:border-b-0">
                    <div className="min-w-0 flex-1 basis-[180px]">
                      <div className="text-[13.5px] font-bold">{a.etiqueta}</div>
                      <div className="text-[11px] text-suave">
                        {a.estudiantes} {a.estudiantes === 1 ? "estudiante" : "estudiantes"} · con {nombreDocente(a.docenteId)}
                      </div>
                    </div>
                    <select
                      aria-label={`Docente a cargo del aula ${a.etiqueta}`}
                      value={a.docenteId}
                      disabled={pendiente}
                      onChange={(ev) => iniciar(async () => setAviso(await asignarAula(a.id, ev.target.value)))}
                      className="rounded-lg border border-borde-campo bg-superficie-suave px-2.5 py-1.5 text-[12.5px] disabled:opacity-60"
                    >
                      {docentes.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="titulo-estudiantes" className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EBE5] px-[18px] py-[15px]">
              <h2 id="titulo-estudiantes" className="text-[13px] font-extrabold">Estudiantes</h2>
              <span className="text-[11px] font-bold text-suave">
                {estudiantes.length}
                {sinAula > 0 && <span className="text-peligro"> · {sinAula} sin docente</span>}
              </span>
            </div>
            <div className="border-b border-[#F7F2ED] px-[18px] py-3">
              <label htmlFor="filtro-estudiantes" className="sr-only">Buscar estudiante</label>
              <input
                id="filtro-estudiantes"
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nombre o usuario"
                className={campo}
              />
            </div>
            <div className="px-[18px]">
              <Mensaje aviso={aviso} />
            </div>
            {visibles.length === 0 ? (
              <p className="px-5 py-6 text-[12.5px] text-tenue">
                {estudiantes.length ? "Ningún estudiante coincide con la búsqueda." : "Todavía no hay estudiantes."}
              </p>
            ) : (
              <ul>
                {visibles.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 border-b border-[#F7F2ED] px-[18px] py-3 last:border-b-0">
                    <div className="min-w-0 flex-1 basis-[160px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-bold">{e.nombre}</span>
                        {!e.conectado && (
                          <span className="rounded-full bg-[#FBF1DC] px-2 py-0.5 text-[10px] font-bold text-[#8A6410]">Sin docente</span>
                        )}
                      </div>
                      <div className="text-[11px] text-suave">{e.usuario}</div>
                    </div>
                    <select
                      aria-label={`Aula de ${e.nombre}`}
                      value={e.destino}
                      disabled={pendiente}
                      onChange={(ev) => iniciar(async () => setAviso(await asignarEstudiante(e.id, ev.target.value)))}
                      className="max-w-full rounded-lg border border-borde-campo bg-superficie-suave px-2.5 py-1.5 text-[12.5px] disabled:opacity-60"
                    >
                      <OpcionesDestino docentes={docentes} />
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid min-w-0 content-start gap-5">
          <form action={accionAula} className="rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-[11px] font-extrabold tracking-[.12em] text-tinta-media">NUEVA AULA</h2>
            <label htmlFor="aula-nombre" className={rotulo}>NOMBRE</label>
            <input id="aula-nombre" name="nombre" required placeholder="Por ejemplo, 9A" className={`mt-1.5 ${campo}`} />
            <label htmlFor="aula-anio" className={rotulo}>AÑO LECTIVO</label>
            <input id="aula-anio" name="anio" type="number" required defaultValue={anio} className={`mt-1.5 ${campo}`} />
            <label htmlFor="aula-docente" className={rotulo}>DOCENTE A CARGO</label>
            <select id="aula-docente" name="docenteId" required defaultValue="" className={`mt-1.5 ${campo}`}>
              <option value="" disabled>
                Elige un docente…
              </option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creandoAula || docentes.length === 0}
              className="mt-4 w-full cursor-pointer rounded-lg bg-primario-fuerte px-4 py-3 text-[13px] font-bold text-white hover:bg-primario-hover disabled:opacity-60"
            >
              {creandoAula ? "Creando…" : "Crear aula"}
            </button>
            <Mensaje aviso={estadoAula} />
          </form>

          <FormularioUsuario
            sugerencia={sugerencia}
            titulo="NUEVO ESTUDIANTE"
            textoBoton="Crear estudiante"
            pendiente={creando}
            mensaje={estadoAlta}
            accion={accionAlta}
            formRef={formRef}
            extra={
              <>
                <label htmlFor="destino" className={rotulo}>AULA</label>
                <select id="destino" name="destino" defaultValue={docentes[0]?.aulas[0] ? `c:${docentes[0].aulas[0].id}` : docentes[0] ? `d:${docentes[0].id}` : ""} className={`mt-1.5 ${campo}`}>
                  <OpcionesDestino docentes={docentes} />
                </select>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
