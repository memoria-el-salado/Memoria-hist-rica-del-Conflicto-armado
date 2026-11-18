import Link from "next/link";
import { notFound } from "next/navigation";
import { sugerirActividad } from "@/lib/importador-pdf";
import { prisma } from "@/lib/prisma";
import { CartillasModulo } from "./cartillas-modulo";
import { EditorActividades } from "./editor-actividades";

export default async function ActividadesDelModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caso = await prisma.caso.findUnique({
    where: { id },
    include: {
      documentos: { select: { id: true, titulo: true, soloDocentes: true } },
      cartillas: { include: { documento: { select: { id: true, titulo: true, soloDocentes: true } } } },
      ejes: {
        orderBy: { orden: "asc" },
        include: {
          sesiones: {
            orderBy: { orden: "asc" },
            include: { subsecciones: { orderBy: { orden: "asc" }, select: { titulo: true } } },
          },
        },
      },
    },
  });
  if (!caso) notFound();

  const vinculadas = caso.cartillas.map((c) => c.documento);
  const yaEstan = new Set([...caso.documentos, ...vinculadas].map((d) => d.id));
  const disponibles = (
    await prisma.documentoFuente.findMany({ orderBy: { subidoEn: "asc" }, select: { id: true, titulo: true, soloDocentes: true } })
  ).filter((d) => !yaEstan.has(d.id));

  return (
    <div className="animar-aparecer max-w-[1000px]">
      <Link href="/admin/casos" className="text-[0.71875rem] font-semibold text-apagado no-underline hover:text-primario-texto">
        ← Módulos geográficos
      </Link>
      <div className="mt-2 text-[0.65625rem] font-bold tracking-[.14em] text-primario-texto">CU09 · ACTIVIDADES DE LAS SESIONES</div>
      <h1 className="mb-1.5 mt-2 text-[1.625rem] font-extrabold tracking-[-.02em]">{caso.nombre}</h1>
      <p className="mb-5 max-w-[720px] text-[0.84375rem] leading-[1.65] text-apagado">
        Cambia la actividad de una sesión sin volver a importar el módulo. Lo que los estudiantes ya hicieron se
        conserva; el avance pasa a medirse con el criterio de la nueva actividad. La columna «Sugerida» es lo que
        el importador propone hoy a partir de los títulos.
      </p>
      <CartillasModulo casoId={caso.id} fuente={caso.documentos} vinculadas={vinculadas} disponibles={disponibles} />
      <EditorActividades
        casoId={caso.id}
        ejes={caso.ejes.map((e) => ({
          id: e.id,
          numero: e.numero,
          nombre: e.nombre,
          sesiones: e.sesiones.map((s) => ({
            id: s.id,
            codigo: s.codigo,
            titulo: s.titulo,
            pantalla: s.pantalla,
            publicada: s.publicada,
            sugerida: sugerirActividad(s.titulo, s.subsecciones.map((x) => x.titulo)),
          })),
        }))}
      />
    </div>
  );
}
