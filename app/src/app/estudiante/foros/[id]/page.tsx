import { notFound, redirect } from "next/navigation";
import { DebateForo } from "@/components/foro/debate";
import { cargarDebate, quienSoy } from "@/lib/debate";

export default async function DebateEstudiantePage({ params }: { params: Promise<{ id: string }> }) {
  const quien = await quienSoy();
  if (!quien) redirect("/login");

  const { id } = await params;
  // El foro de otro docente no existe para este estudiante.
  const debate = await cargarDebate(id, quien);
  if (!debate) notFound();

  return <DebateForo debate={debate} volver="/estudiante/foros" />;
}
