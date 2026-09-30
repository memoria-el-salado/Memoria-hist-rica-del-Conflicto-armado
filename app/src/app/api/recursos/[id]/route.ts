import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { almacenEnUso, rutaEnDisco, urlDeLectura } from "@/lib/almacen";
import { prisma } from "@/lib/prisma";
import { puedeVerRecurso } from "@/lib/recursos";

/** Lo que dura la dirección firmada: da para ver un video largo con pausas. */
const VIGENCIA = 3 * 60 * 60;

/**
 * Sirve el archivo de un recurso a quien puede verlo.
 *
 * No devuelve el archivo: redirige a una dirección firmada del depósito, que
 * caduca en unas horas. Así el depósito sigue siendo privado, el navegador puede
 * pedir el audio o el video por partes para avanzar y retroceder, y un video de
 * 50 MB no pasa por la función de Vercel.
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
  });
  if (!visible) return NextResponse.json({ error: "Este recurso no está disponible." }, { status: 403 });

  if (!recurso.archivo) {
    return recurso.enlace
      ? NextResponse.redirect(recurso.enlace)
      : NextResponse.json({ error: "El recurso no tiene archivo." }, { status: 404 });
  }

  if (almacenEnUso() === "Supabase Storage") {
    const firmada = await urlDeLectura(recurso.archivo, VIGENCIA).catch(() => null);
    if (!firmada) {
      return NextResponse.json({ error: "No se pudo abrir el archivo. Inténtalo de nuevo." }, { status: 503 });
    }
    const respuesta = NextResponse.redirect(firmada, 302);
    respuesta.headers.set("Cache-Control", "private, no-store");
    return respuesta;
  }

  // En un equipo local, sin depósito, se sirve desde el disco.
  try {
    const archivo = await readFile(rutaEnDisco(recurso.archivo));
    return new NextResponse(new Uint8Array(archivo), {
      headers: { "Content-Type": recurso.mime ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  }
}
