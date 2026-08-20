import Link from "next/link";

/**
 * Encabezado común a todas las actividades.
 *
 * Muestra de dónde viene la sesión y, sobre todo, su contenido real: el texto
 * que el importador extrajo del documento del CNMH. Antes cada pantalla traía
 * un texto de ejemplo fijo, de modo que todas las sesiones se veían iguales;
 * ahora lo que se lee cambia con la sesión que se abre.
 */

export type DatosSesion = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string | null;
  contenido: string | null;
  preguntaOrientadora: string | null;
  alertaCuidado: boolean;
  eje: { numero: number; nombre: string; tono: string };
  subsecciones: { id: string; codigo: string; titulo: string; contenido: string | null }[];
  documento: { id: string; titulo: string } | null;
};

export function CabeceraSesion({ sesion }: { sesion: DatosSesion }) {
  return (
    <header className="mb-5">
      <Link
        href="/estudiante/mapa"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-apagado no-underline hover:text-primario"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Volver al mapa del viaje
      </Link>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white"
          style={{ background: sesion.eje.tono }}
        >
          EJE {sesion.eje.numero}
        </span>
        <span className="text-[11.5px] font-semibold text-suave">{sesion.eje.nombre}</span>
        {sesion.alertaCuidado && (
          <span className="rounded-full bg-[#FBF1DC] px-2.5 py-1 text-[10.5px] font-bold text-[#8A6410]">
            Contenido sensible
          </span>
        )}
      </div>

      <h1 className="mt-2 text-[24px] font-extrabold leading-[1.2] tracking-[-.02em]">
        <span className="text-primario">{sesion.codigo}</span> {sesion.titulo}
      </h1>

      {sesion.objetivo && (
        <p className="mt-1.5 max-w-[820px] text-[13.5px] leading-[1.65] text-apagado">
          {sesion.objetivo}
        </p>
      )}

      {sesion.preguntaOrientadora && (
        <div className="mt-3.5 rounded-xl border border-primario-borde bg-primario-tinte px-5 py-4">
          <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">
            PREGUNTA ORIENTADORA
          </div>
          <p className="mt-1.5 text-[15.5px] font-semibold leading-[1.45] text-[#5B524B]">
            {sesion.preguntaOrientadora}
          </p>
        </div>
      )}
    </header>
  );
}

/**
 * El texto de la sesión, tal como venía en el documento. Si el documento no
 * traía cuerpo para esta sesión, se dice con claridad en vez de rellenar el
 * hueco con un texto inventado.
 */
export function TextoSesion({ sesion }: { sesion: DatosSesion }) {
  const parrafos = (sesion.contenido ?? "").split(/\n{2,}/).filter((p) => p.trim());

  return (
    <article className="rounded-xl border border-borde bg-superficie px-6 py-6 sm:px-8">
      {sesion.documento && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1EBE5] pb-3">
          <span className="text-[10.5px] font-bold tracking-[.1em] text-suave">
            DOCUMENTO FUENTE
          </span>
          <a
            href={`/api/documentos/${sesion.documento.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11.5px] font-semibold text-secundario-fuerte"
          >
            {sesion.documento.titulo} · abrir PDF
          </a>
        </div>
      )}

      {parrafos.length > 0 ? (
        parrafos.map((parrafo, i) => (
          <p
            key={i}
            className="mb-3.5 text-justify text-[13.5px] leading-[1.85] text-tinta-media last:mb-0"
          >
            {parrafo}
          </p>
        ))
      ) : (
        <p className="text-[13px] leading-[1.7] text-tenue">
          El documento importado no traía texto para esta sesión: su desarrollo está en las
          subsecciones y en el trabajo de clase. Puedes abrir el PDF original desde el enlace de
          arriba.
        </p>
      )}

      {sesion.subsecciones.length > 0 && (
        <div className="mt-5 border-t border-[#F1EBE5] pt-4">
          <div className="text-[10.5px] font-bold tracking-[.12em] text-tenue">
            CONTENIDO DE LA SESIÓN
          </div>
          <ol className="mt-2.5 grid gap-2.5">
            {sesion.subsecciones.map((sub) => (
              <li key={sub.id}>
                <div className="flex gap-2 text-[13px] font-semibold text-tinta-media">
                  <span className="text-primario">{sub.codigo}</span>
                  <span>{sub.titulo}</span>
                </div>
                {sub.contenido && (
                  <p className="mt-1 text-justify text-[12.5px] leading-[1.75] text-apagado">
                    {sub.contenido.split(/\n{2,}/)[0]}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
