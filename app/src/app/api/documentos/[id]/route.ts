import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { leerDocumento } from "@/lib/almacen";
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

  // Las guías para maestros contienen las respuestas y las orientaciones de la
  // sesión: el estudiante no debe poder abrirlas ni escribiendo la dirección.
  if (documento.soloDocentes && sesion.user.rol === "ESTUDIANTE") {
    return NextResponse.json(
      { error: "Este documento es material del docente." },
      { status: 403 }
    );
  }

  // El archivo se pide por el identificador de la ficha, nunca por lo que
  // haya escrito el usuario en la dirección.
  try {
    const archivo = await leerDocumento(documento.id);
    return new NextResponse(archivo, {
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
