import { prisma } from "@/lib/prisma";
import { ImportadorDocumento } from "./importador-documento";

export default async function ImportarPage() {
  const [documentos, casos] = await Promise.all([
    prisma.documentoFuente.findMany({
      orderBy: { subidoEn: "asc" },
      include: { caso: { select: { id: true, nombre: true } } },
    }),
    prisma.caso.findMany({ orderBy: { creadoEn: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <ImportadorDocumento
      casos={casos}
      documentos={documentos.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        nombreArchivo: d.nombreArchivo,
        paginas: d.paginas,
        casoId: d.caso?.id ?? null,
        caso: d.caso?.nombre ?? null,
        soloDocentes: d.soloDocentes,
        subidoEn: d.subidoEn.toLocaleDateString("es-CO", { dateStyle: "medium" }),
      }))}
    />
  );
}
