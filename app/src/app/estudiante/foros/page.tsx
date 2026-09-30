import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "@/lib/debate";
import { prisma } from "@/lib/prisma";

export default async function ForosEstudiantePage() {
  const quien = await quienSoy();
  if (!quien?.creadoPorId) redirect("/login");

  // Los debates que abrió su docente: la misma cadena con la que se creó su cuenta.
  const foros = await prisma.foro.findMany({
    where: { autorId: quien.creadoPorId },
    orderBy: [{ abierto: "desc" }, { creadoEn: "desc" }],
    include: {
      sesion: { select: { codigo: true } },
      participantes: { where: { userId: quien.id }, select: { postura: true } },
      _count: { select: { mensajes: true } },
    },
  });

  return (
    <div className="animar-aparecer max-w-[860px]">
      <div className="text-[10.5px] font-bold tracking-[.14em] text-primario">CU08 · CONTRASTE DE FUENTES</div>
      <h1 className="mb-1.5 mt-2 text-[26px] font-extrabold tracking-[-.02em]">Debates</h1>
      <p className="mb-5 max-w-[620px] text-[13.5px] leading-[1.65] text-apagado">
        En cada debate asumes uno de dos roles y defiendes tu posición con argumentos apoyados en
        documentos históricos. Tu docente lo media.
      </p>

      {foros.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borde-campo p-5 text-[13px] text-apagado">
          Tu docente todavía no ha abierto ningún debate.
        </p>
      ) : (
        <div className="grid gap-3">
          {foros.map((f) => {
            const postura = f.participantes[0]?.postura;
            return (
              <Link
                key={f.id}
                href={`/estudiante/foros/${f.id}`}
                className="block rounded-xl border border-borde bg-superficie p-[18px] transition-colors hover:border-primario/40"
              >
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-[.07em]">
                  <span className={f.abierto ? "text-secundario-fuerte" : "text-suave"}>
                    {f.abierto ? "ABIERTO" : "CERRADO"}
                  </span>
                  {f.sesion && <span className="text-tenue">SESIÓN {f.sesion.codigo}</span>}
                  <span className="text-tenue">
                    {f._count.mensajes} {f._count.mensajes === 1 ? "MENSAJE" : "MENSAJES"}
                  </span>
                </div>
                <div className="mt-1.5 text-[15px] font-bold">{f.pregunta}</div>
                <div className="mt-2 text-[12px] text-apagado">
                  {postura
                    ? `Tu rol: ${postura === "A" ? f.rolA : f.rolB}`
                    : `${f.rolA} frente a ${f.rolB}`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
