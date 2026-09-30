import { notFound, redirect } from "next/navigation";
import { DebateForo } from "@/components/foro/debate";
import { cargarDebate, quienSoy } from "@/lib/debate";
import { prisma } from "@/lib/prisma";
import { alternarDestacado, retirarMensaje } from "../actions";
import { RepartoRoles } from "./reparto-roles";

export default async function DebateDocentePage({ params }: { params: Promise<{ id: string }> }) {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") redirect("/login");

  const { id } = await params;
  const debate = await cargarDebate(id, quien);
  if (!debate) notFound();

  const [estudiantes, participantes] = await Promise.all([
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: quien.id },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.participanteForo.findMany({ where: { foroId: id }, select: { userId: true, postura: true } }),
  ]);
  const postura = new Map(participantes.map((p) => [p.userId, p.postura]));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <DebateForo
        debate={debate}
        volver="/docente/foros"
        mediacion={{ destacar: alternarDestacado, retirar: retirarMensaje }}
      />
      <RepartoRoles
        foroId={id}
        abierto={debate.foro.abierto}
        rolA={debate.foro.rolA}
        rolB={debate.foro.rolB}
        estudiantes={estudiantes.map((e) => ({ ...e, postura: postura.get(e.id) ?? null }))}
      />
    </div>
  );
}
