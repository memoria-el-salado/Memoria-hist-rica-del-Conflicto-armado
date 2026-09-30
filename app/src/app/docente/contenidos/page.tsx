import { redirect } from "next/navigation";
import { quienSoy } from "@/lib/debate";
import { vistaDeRecurso } from "@/lib/material";
import { prisma } from "@/lib/prisma";
import { requisitoDe } from "@/lib/transcripcion";
import { GestionContenido } from "./gestion-contenido";

export default async function ContenidosPage() {
  const quien = await quienSoy();
  if (!quien || quien.rol !== "DOCENTE") redirect("/login");

  const [recursos, ejes, documentos] = await Promise.all([
    // El material es del módulo, no de un docente: se ve todo el del módulo activo.
    prisma.recurso.findMany({
      where: { eje: { caso: { activo: true } } },
      orderBy: { creadoEn: "desc" },
      include: {
        eje: { select: { numero: true } },
        sesion: { select: { codigo: true, titulo: true } },
      },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: {
        id: true,
        numero: true,
        nombre: true,
        sesiones: { orderBy: { orden: "asc" }, select: { id: true, codigo: true, titulo: true } },
      },
    }),
    // Documentos del módulo activo. El docente ve todos, incluidas las guías
    // para maestros que el estudiante no puede abrir.
    prisma.documentoFuente.findMany({
      where: { caso: { activo: true } },
      orderBy: { subidoEn: "asc" },
    }),
  ]);

  return (
    <GestionContenido
      recursos={recursos.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        contexto: r.contexto,
        eje: `Eje ${r.eje.numero}`,
        sesion: r.sesion ? `${r.sesion.codigo} · ${r.sesion.titulo.slice(0, 50)}` : null,
        tipo: r.tipo,
        alerta: r.alerta,
        propio: r.autorId === quien.id,
        vista: vistaDeRecurso(r),
        requisito: requisitoDe(r.tipo, Boolean(r.enlace)),
        transcripcionTexto: r.autorId === quien.id ? r.transcripcion : null,
      }))}
      ejes={ejes.map((e) => ({
        id: e.id,
        label: `Eje ${e.numero} · ${e.nombre}`,
        sesiones: e.sesiones.map((s) => ({ id: s.id, label: `${s.codigo} · ${s.titulo.slice(0, 55)}` })),
      }))}
      documentos={documentos.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        paginas: d.paginas,
        soloDocentes: d.soloDocentes,
      }))}
    />
  );
}
