import type { PasoDeSesion } from "@/lib/ruta";

/**
 * Los cuatro momentos de la sesión, de la información a la retroalimentación.
 * Cada paso lleva a su parte de la página y dice en qué va el estudiante.
 */
export function RutaSesion({ pasos }: { pasos: PasoDeSesion[] }) {
  return (
    <nav aria-label="Ruta de la sesión" className="mt-4">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {pasos.map((p, i) => {
          const listo = p.estado === "LISTO";
          const pendiente = p.estado === "PENDIENTE";
          return (
            <li key={p.id}>
              <a
                href={p.ancla}
                className={`flex h-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-inherit no-underline transition-colors hover:border-primario hover:no-underline ${
                  listo ? "border-secundario-borde bg-secundario-tinte" : "border-borde bg-superficie"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[0.71875rem] font-extrabold ${
                    listo ? "bg-secundario text-white" : pendiente ? "border-2 border-primario text-primario-fuerte" : "bg-[#F0EAE4] text-apagado"
                  }`}
                >
                  {listo ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.78125rem] font-extrabold">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {p.titulo}
                  </span>
                  <span className="mt-0.5 block text-[0.71875rem] leading-snug text-apagado">{p.detalle}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
