import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Los documentos fuente se guardan fuera de la carpeta pública y se sirven
 * solo a usuarios autenticados, según el principio de acceso controlado
 * de la política de datos del proyecto.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const documento = await prisma.documentoFuente.findUnique({ where: { id } });
  if (!documento) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  // La ruta se reconstruye desde el identificador, nunca desde la entrada del usuario.
  const ruta = path.join(process.cwd(), "almacen", "documentos", `${documento.id}.pdf`);

  try {
    const archivo = await readFile(ruta);
    return new NextResponse(new Uint8Array(archivo), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(documento.nombreArchivo)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  }
}
