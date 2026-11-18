import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ESTADOS_MENSAJE, estadoDeMensajes, registroDeMensajes, type EstadoMensaje } from "@/lib/cuidado";
import { fechaYHora } from "@/lib/fechas";
import { CasoMensaje } from "./caso-mensaje";

const ETIQUETA: Record<EstadoMensaje, string> = { pendientes: "Por atender", atendidos: "Atendidos", todos: "Todos" };

/**
 * El registro de los mensajes que los estudiantes le envían al docente cuando
 * no se sienten bien para continuar. No es un chat: el docente solo los lee,
 * como casos, para buscar al estudiante y acompañarlo en persona; después deja
 * constancia de que lo atendió.
 */
export default async function MensajesPage({ searchParams }: { searchParams: Promise<{ estado?: string | string[] }> }) {
  const sesion = await auth();
  const docenteId = sesion!.user.id;
  const estado = estadoDeMensajes((await searchParams).estado);

  const solicitudes = await prisma.solicitudAcompanamiento.findMany({
    where: { docenteId },
    include: {
      estudiante: { select: { nombre: true, curso: { select: { nombre: true, anio: true } }, grupo: { select: { nombre: true } } } },
      sesion: { select: { id: true, codigo: true, titulo: true } },
    },
  });
  const { casos, pendientes, atendidos } = registroDeMensajes(solicitudes, estado);
  const total = { pendientes, atendidos, todos: pendientes + atendidos };

  return (
    <div className="animar-aparecer max-w-[860px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario-texto">CU06 · ACOMPAÑAMIENTO</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Mensajes de tus estudiantes</h1>
      <p className="mb-5 max-w-[680px] text-[13.5px] leading-[1.65] text-apagado">
        Cuando un estudiante no se siente bien para continuar una sesión, puede escribirte desde ella. Aquí queda el
        registro de esos mensajes. No es un chat: cada uno es un caso para que busques al estudiante y lo acompañes en
        lo que necesite. Cuando lo hayas hecho, márcalo como atendido.
      </p>

      <nav aria-label="Filtrar mensajes" className="mb-4 flex flex-wrap gap-2">
        {ESTADOS_MENSAJE.map((e) => (
          <Link
            key={e}
            href={e === "pendientes" ? "/docente/mensajes" : `/docente/mensajes?estado=${e}`}
            aria-current={e === estado ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold no-underline ${
              e === estado
                ? "border-primario-fuerte bg-primario-fuerte text-white"
                : "border-borde bg-superficie text-apagado hover:border-primario hover:text-primario-texto"
            }`}
          >
            {ETIQUETA[e]} ({total[e]})
          </Link>
        ))}
      </nav>

      {casos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borde bg-superficie px-5 py-8 text-center text-[13px] leading-[1.6] text-tenue">
          {estado === "pendientes"
            ? "No tienes mensajes por atender."
            : estado === "atendidos"
              ? "Todavía no has marcado ningún mensaje como atendido."
              : "Ningún estudiante te ha escrito todavía. Si alguno lo hace desde una sesión, el mensaje aparecerá aquí."}
        </p>
      ) : (
        <ol className="grid gap-3">
          {casos.map((c) => (
            <CasoMensaje
              key={c.id}
              caso={{
                id: c.id,
                numero: c.numero,
                estudiante: c.estudiante.nombre,
                aula: [
                  c.estudiante.curso ? `${c.estudiante.curso.nombre} · ${c.estudiante.curso.anio}` : null,
                  c.estudiante.grupo ? `grupo ${c.estudiante.grupo.nombre}` : null,
                ]
                  .filter(Boolean)
                  .join(", ") || null,
                sesion: c.sesion ? { id: c.sesion.id, nombre: `${c.sesion.codigo} ${c.sesion.titulo}` } : null,
                mensaje: c.mensaje,
                recibido: fechaYHora(c.creadoEn),
                atendido: c.atendidaEn ? fechaYHora(c.atendidaEn) : null,
              }}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
