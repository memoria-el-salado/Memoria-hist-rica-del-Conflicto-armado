import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PanelDocente } from "./panel-docente";

export default async function PanelPage() {
  const sesion = await auth();

  const [sesiones, progresos, estudiantes] = await Promise.all([
    prisma.sesion.findMany({
      where: { eje: { caso: { activo: true } } },
      orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
      include: { eje: { select: { numero: true, nombre: true } } },
    }),
    prisma.progresoEje.findMany({
      where: { user: { creadoPorId: sesion!.user.id } },
      include: { eje: { select: { numero: true } } },
    }),
    // El panel refleja al grupo del propio docente.
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: sesion!.user.id },
      select: { id: true, subpoblacion: true },
    }),
  ]);

  const promedioGlobal = progresos.length
    ? Math.round(progresos.reduce((s, p) => s + p.porcentaje, 0) / progresos.length)
    : 0;

  // Avance promedio por eje, que alimenta las barras del panel.
  const porEje = new Map<number, number[]>();
  for (const p of progresos) {
    const lista = porEje.get(p.eje.numero) ?? [];
    lista.push(p.porcentaje);
    porEje.set(p.eje.numero, lista);
  }
  const barras = [...porEje.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, valores]) => ({
      label: `EJE ${numero}`,
      valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
    }));

  const grupos = new Map<string, number>();
  for (const e of estudiantes) {
    const clave = e.subpoblacion ?? "Sin vínculo directo";
    grupos.set(clave, (grupos.get(clave) ?? 0) + 1);
  }
  const colores = ["#D95D39", "#1B8A8A", "#EBB035", "#177575"];
  // Sin estudiantes no hay porcentajes que calcular.
  const subpoblaciones = estudiantes.length
    ? [...grupos.entries()].map(([nombre, n], i) => ({
        nombre,
        porcentaje: Math.round((n / estudiantes.length) * 100),
        color: colores[i % colores.length],
      }))
    : [];

  return (
    <PanelDocente
      promedioGlobal={promedioGlobal}
      barras={barras}
      subpoblaciones={subpoblaciones}
      totalEstudiantes={estudiantes.length}
      sesiones={sesiones.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        titulo: s.titulo,
        eje: `EJE ${s.eje.numero} · ${s.eje.nombre.toUpperCase()}`,
        publicada: s.publicada,
        alertaCuidado: s.alertaCuidado,
      }))}
    />
  );
}
