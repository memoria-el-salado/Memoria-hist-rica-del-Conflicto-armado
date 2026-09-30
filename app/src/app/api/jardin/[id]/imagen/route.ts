import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { almacenEnUso, rutaEnDisco, urlDeLectura } from "@/lib/almacen";
import { prisma } from "@/lib/prisma";
import { puedeVerAporte } from "@/lib/visibilidad";

const VIGENCIA = 60 * 60;
const TIPOS: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/**
 * El dibujo o la foto de una flor, para quien puede ver la flor: los
 * compañeros de curso de quien la sembró y su docente.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();
  if (!sesion?.user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const [quien, flor] = await Promise.all([
    prisma.user.findUnique({ where: { id: sesion.user.id }, select: { id: true, rol: true, creadoPorId: true, cursoId: true } }),
    prisma.florJardin.findUnique({
      where: { id },
      select: { imagen: true, autor: { select: { id: true, creadoPorId: true, cursoId: true } } },
    }),
  ]);
  if (!quien || !flor?.imagen || !puedeVerAporte(quien, flor.autor)) {
    return NextResponse.json({ error: "No existe." }, { status: 404 });
  }

  if (almacenEnUso() === "Supabase Storage") {
    const firmada = await urlDeLectura(flor.imagen, VIGENCIA).catch(() => null);
    if (!firmada) return NextResponse.json({ error: "No se pudo abrir la imagen." }, { status: 503 });
    const respuesta = NextResponse.redirect(firmada, 302);
    respuesta.headers.set("Cache-Control", "private, no-store");
    return respuesta;
  }

  try {
    const archivo = await readFile(rutaEnDisco(flor.imagen));
    const tipo = TIPOS[flor.imagen.split(".").pop() ?? ""] ?? "image/png";
    return new NextResponse(new Uint8Array(archivo), { headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "La imagen ya no está disponible." }, { status: 404 });
  }
}
