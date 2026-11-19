import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NuevoCurso } from "./nuevo-curso";

/** El año lectivo que se propone al crear un curso. */
function anioEnCurso() {
  return new Date().getFullYear();
}

export default async function CursosPage() {
  const sesion = await auth();
  const docenteId = sesion!.user.id;

  const [cursos, sinCurso] = await Promise.all([
    prisma.curso.findMany({
      where: { docenteId },
      orderBy: [{ anio: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { estudiantes: true, grupos: true } } },
    }),
    prisma.user.count({ where: { rol: "ESTUDIANTE", creadoPorId: docenteId, cursoId: null } }),
  ]);

  return (
    <div className="animar-aparecer max-w-[1020px]">
      <div className="text-[0.65625rem] font-bold tracking-[.14em] text-primario-texto">ORGANIZACIÓN · CURSOS Y GRUPOS</div>
      <h1 className="mb-1.5 mt-2 text-[1.625rem] font-extrabold tracking-[-.02em]">Mis cursos</h1>
      <p className="mb-5 max-w-[680px] text-[0.84375rem] leading-[1.65] text-apagado">
        Organiza a tus estudiantes por curso y, dentro de cada curso, en grupos de trabajo para las
        actividades colectivas. El panel, los reportes y los debates se pueden mirar curso por curso.
      </p>

      <div className="rejilla-panel">
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-center justify-between border-b border-linea px-[18px] py-[15px]">
            <span className="text-[0.8125rem] font-extrabold">Cursos</span>
            <span className="text-[0.6875rem] font-bold text-suave">{cursos.length}</span>
          </div>
          {cursos.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.78125rem] leading-[1.6] text-tenue">
              Todavía no tienes cursos.
              <br />
              Crea el primero con el formulario «Nuevo curso».
            </p>
          ) : (
            <ul>
              {cursos.map((c) => (
                <li key={c.id} className="border-b border-linea-suave last:border-b-0">
                  <Link
                    href={`/docente/cursos/${c.id}`}
                    className="flex items-center gap-3 px-[18px] py-3.5 text-tinta no-underline hover:bg-superficie-suave"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.875rem] font-bold">{c.nombre}</div>
                      <div className="text-[0.6875rem] text-suave">Año lectivo {c.anio}</div>
                    </div>
                    <span className="text-[0.71875rem] font-semibold text-apagado">
                      {c._count.estudiantes} {c._count.estudiantes === 1 ? "estudiante" : "estudiantes"} ·{" "}
                      {c._count.grupos} {c._count.grupos === 1 ? "grupo" : "grupos"}
                    </span>
                    <span aria-hidden="true" className="text-suave">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {sinCurso > 0 && (
            <p className="border-t border-linea bg-terciario-tinte px-[18px] py-3 text-[0.75rem] text-terciario-texto">
              {sinCurso === 1 ? "1 estudiante tuyo no tiene" : `${sinCurso} estudiantes tuyos no tienen`} curso. Puedes
              sumarlos desde cada curso o desde <Link href="/docente/estudiantes">Mis estudiantes</Link>.
            </p>
          )}
        </div>

        <NuevoCurso anio={anioEnCurso()} />
      </div>
    </div>
  );
}
