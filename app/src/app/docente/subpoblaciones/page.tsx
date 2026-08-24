import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { avanceDeEstudiantes } from "@/lib/avance";
import { ReportesSubpoblaciones } from "./reportes-subpoblaciones";

const RECOMENDACIONES: Record<string, string> = {
  "Víctimas directas": "Reducir carga escrita; priorizar formatos orales.",
  "Población desplazada": "Reforzar acompañamiento en el eje 5.",
  Retornados: "Habilitar rol de mentor en foros.",
  "Sin vínculo directo": "Sumar actividades de escucha activa.",
};

export default async function SubpoblacionesPage() {
  const sesion = await auth();

  const [estudiantes, reportes] = await Promise.all([
    prisma.user.findMany({
      where: { rol: "ESTUDIANTE", creadoPorId: sesion!.user.id },
      select: {
        id: true,
        subpoblacion: true,
        entradasDiario: { select: { id: true } },
        anotaciones: { select: { id: true } },
      },
    }),
    prisma.reporteDiferenciado.findMany({ orderBy: { creadoEn: "desc" } }),
  ]);

  // El avance se deduce del trabajo hecho en cada sesión.
  const avances = await avanceDeEstudiantes(estudiantes.map((e) => e.id));

  const grupos = new Map<
    string,
    { avances: number[]; entregas: number; estudiantes: number }
  >();

  for (const e of estudiantes) {
    const clave = e.subpoblacion ?? "Sin vínculo directo";
    const actual = grupos.get(clave) ?? { avances: [], entregas: 0, estudiantes: 0 };
    actual.avances.push(avances.get(e.id)?.total ?? 0);
    actual.entregas += e.entradasDiario.length + e.anotaciones.length;
    actual.estudiantes += 1;
    grupos.set(clave, actual);
  }

  const colores = ["#D95D39", "#EBB035", "#177575", "#1B8A8A"];
  const filas = [...grupos.entries()].map(([nombre, d], i) => ({
    nombre,
    estudiantes: d.estudiantes,
    avance: d.avances.length
      ? Math.round(d.avances.reduce((s, v) => s + v, 0) / d.avances.length)
      : 0,
    entregas: d.entregas,
    color: colores[i % colores.length],
    recomendacion: RECOMENDACIONES[nombre] ?? "Revisar el diseño del curso para este grupo.",
  }));

  return (
    <ReportesSubpoblaciones
      filas={filas}
      reportes={reportes.map((r) => ({ id: r.id, resumen: r.resumen }))}
    />
  );
}
