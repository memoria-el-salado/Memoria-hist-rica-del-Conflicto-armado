import { prisma } from "@/lib/prisma";
import { ImportadorDocumento } from "./importador-documento";

export default async function ImportarPage() {
  const documentos = await prisma.documentoFuente.findMany({
    orderBy: { subidoEn: "asc" },
    include: { caso: { select: { nombre: true } } },
  });

  return (
    <ImportadorDocumento
      documentos={documentos.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        nombreArchivo: d.nombreArchivo,
        paginas: d.paginas,
        caso: d.caso?.nombre ?? null,
        subidoEn: d.subidoEn.toLocaleDateString("es-CO", { dateStyle: "medium" }),
      }))}
    />
  );
}
