import Link from "next/link";

/**
 * Los debates que el docente abrió sobre esta sesión. La guía plantea debates
 * entre posturas en varias sesiones (los dos modelos del campo, 1.3); el foro
 * vive en Debates, y desde la sesión se llega a él.
 */
export function DebatesDeSesion({ debates }: { debates: { id: string; pregunta: string; abierto: boolean }[] }) {
  if (!debates.length) return null;
  return (
    <section aria-labelledby="titulo-debates-sesion" className="mt-[22px] rounded-xl border border-borde bg-superficie p-5">
      <h2 id="titulo-debates-sesion" className="text-[12px] font-extrabold tracking-[.06em] text-primario-fuerte">
        DEBATE DE ESTA SESIÓN
      </h2>
      <ul className="mt-2.5 grid gap-2">
        {debates.map((d) => (
          <li key={d.id}>
            <Link
              href={`/estudiante/foros/${d.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-borde px-3.5 py-2.5 text-tinta no-underline hover:border-primario"
            >
              <span className="text-[13.5px] font-semibold">{d.pregunta}</span>
              <span className={`flex-none text-[10px] font-extrabold tracking-[.07em] ${d.abierto ? "text-secundario-fuerte" : "text-suave"}`}>
                {d.abierto ? "ABIERTO · ENTRAR" : "CERRADO · LEER"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
