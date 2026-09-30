import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { almacenEnUso, rutaEnDisco, urlDeLectura } from "@/lib/almacen";
import { puedeVerMarca } from "@/lib/cartografia";
import { prisma } from "@/lib/prisma";

/** Una hora da para escuchar el relato y volver a él. */
const VIGENCIA = 60 * 60;

/**
 * La grabación o la foto de una marca, para quien puede ver la marca: sus
 * compañeros de curso y su docente. Como con los recursos, se redirige a una
 * dirección firmada que caduca; el depósito sigue siendo privado.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; clase: string }> }) {
  const sesion = await auth();
  if (!sesion?.user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id, clase } = await params;
  if (clase !== "audio" && clase !== "foto") return NextResponse.json({ error: "No existe." }, { status: 404 });

  const [quien, marca] = await Promise.all([
    prisma.user.findUnique({ where: { id: sesion.user.id }, select: { id: true, rol: true, creadoPorId: true, cursoId: true } }),
    prisma.marcaCartografia.findUnique({
      where: { id },
      select: { audioArchivo: true, audioMime: true, foto: true, autor: { select: { id: true, creadoPorId: true, cursoId: true } } },
    }),
  ]);
  if (!quien || !marca || !puedeVerMarca(quien, marca.autor)) {
    return NextResponse.json({ error: "No existe." }, { status: 404 });
  }

  const ruta = clase === "audio" ? marca.audioArchivo : marca.foto;
  if (!ruta) return NextResponse.json({ error: "Esta marca no tiene ese archivo." }, { status: 404 });

  if (almacenEnUso() === "Supabase Storage") {
    const firmada = await urlDeLectura(ruta, VIGENCIA).catch(() => null);
    if (!firmada) return NextResponse.json({ error: "No se pudo abrir el archivo." }, { status: 503 });
    const respuesta = NextResponse.redirect(firmada, 302);
    respuesta.headers.set("Cache-Control", "private, no-store");
    return respuesta;
  }

  try {
    const archivo = await readFile(rutaEnDisco(ruta));
    const FOTO: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const tipo = clase === "audio" ? (marca.audioMime ?? "audio/webm") : (FOTO[ruta.split(".").pop() ?? ""] ?? "image/jpeg");
    return new NextResponse(new Uint8Array(archivo), { headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  }
}
