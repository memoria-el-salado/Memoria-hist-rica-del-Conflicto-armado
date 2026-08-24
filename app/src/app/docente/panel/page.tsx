import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiantes, promedioDelGrupo } from "@/lib/avance";
import { PanelDocente } from "./panel-docente";

export default async function PanelPage() {
  const sesion = await auth();

  const [sesiones, ejes, estudiantes] = await Promise.all([
    prisma.sesion.findMany({
      where: { eje: { caso: { activo: true } } },
      orderBy: [{ eje: { orden: "asc" } }, { orden: "asc" }],
      include: { eje: { select: { numero: true, nombre: true } } },
    }),
    prisma.eje.findMany({
      where: { caso: { activo: true } },
      orderBy: { orden: "asc" },
      select: { id: true, numero: true, nombre: true, peso: true },
    }),
    // El panel refleja al grupo del propio docente.
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: sesion!.user.id },
      select: { id: true, subpoblacion: true },
    }),
  ]);

  // El avance sale del trabajo que los estudiantes han producido, no de un
  // número guardado que habría que mantener al día.
  const avances = await avanceDeEstudiantes(estudiantes.map((e) => e.id));
  const lista = [...avances.values()];

  const barras = ejes.map((eje) => {
    const valores = lista.map((a) => a.ejes.find((x) => x.ejeId === eje.id)?.progreso ?? 0);
    return {
      label: `EJE ${eje.numero}`,
      valor: valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : 0,
    };
  });

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

  const publicadasPorEje = new Map<string, number>();
  for (const s of sesiones) {
    if (!s.publicada) continue;
    const eje = ejes.find((e) => e.numero === s.eje.numero);
    if (eje) publicadasPorEje.set(eje.id, (publicadasPorEje.get(eje.id) ?? 0) + 1);
  }

  return (
    <PanelDocente
      promedioGlobal={promedioDelGrupo(lista)}
      barras={barras}
      subpoblaciones={subpoblaciones}
      totalEstudiantes={estudiantes.length}
      ejes={ejes.map((e) => ({
        id: e.id,
        numero: e.numero,
        nombre: e.nombre,
        peso: e.peso,
        publicadas: publicadasPorEje.get(e.id) ?? 0,
      }))}
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
