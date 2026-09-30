import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeVerRecurso } from "@/lib/recursos";
import { aWebVtt, estadoAccesibilidad, leerTranscripcion } from "@/lib/transcripcion";

/**
 * Los subtítulos del recurso en WebVTT, para la pista `<track>` del reproductor.
 * Los mismos permisos que el propio archivo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();
  if (!sesion?.user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const recurso = await prisma.recurso.findUnique({
    where: { id },
    include: { eje: { select: { caso: { select: { activo: true } } } }, sesion: { select: { publicada: true } } },
  });
  if (!recurso) return NextResponse.json({ error: "El recurso no existe." }, { status: 404 });

  const visible = puedeVerRecurso(sesion.user.rol, {
    casoActivo: recurso.eje.caso.activo,
    sesionPublicada: recurso.sesion?.publicada ?? null,
    accesible: estadoAccesibilidad(recurso).visibleParaEstudiantes,
  });
  if (!visible) return NextResponse.json({ error: "Este recurso no está disponible." }, { status: 403 });

  const transcripcion = recurso.transcripcion ? leerTranscripcion(recurso.transcripcion).transcripcion : null;
  if (!transcripcion?.sincronizada) {
    return NextResponse.json({ error: "Este recurso no tiene subtítulos con tiempos." }, { status: 404 });
  }

  return new NextResponse(aWebVtt(transcripcion.cues), {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
