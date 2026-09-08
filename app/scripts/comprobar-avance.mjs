/**
 * Comprueba que el avance sale del trabajo hecho y responde al peso que el
 * docente dio a cada eje. Recalcula antes y después de completar una sesión.
 *
 *   node scripts/comprobar-avance.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { progresoDeEje, progresoDelCurso, sesionCompletada, TRABAJO_VACIO } from "../src/lib/progreso.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

/** Repite el cálculo del servidor a partir de la base, sin pasar por la web. */
async function avance(userId) {
  const ejes = await prisma.eje.findMany({
    where: { caso: { activo: true } },
    orderBy: { orden: "asc" },
    include: { sesiones: { orderBy: { orden: "asc" } } },
  });

  const ids = ejes.flatMap((e) => e.sesiones.map((s) => s.id));
  const [anotaciones, marcas, flores, entradas, respuestas, simulaciones] = await Promise.all([
    prisma.anotacion.findMany({ where: { autorId: userId, sesionId: { in: ids } } }),
    prisma.marcaCartografia.findMany({ where: { autorId: userId, sesionId: { in: ids } } }),
    prisma.florJardin.findMany({ where: { autorId: userId, sesionId: { in: ids } } }),
    prisma.entradaDiario.findMany({ where: { autorId: userId, sesionId: { in: ids } } }),
    prisma.respuestaActividad.findMany({ where: { userId, sesionId: { in: ids } } }),
    prisma.simulacion.findMany({ where: { userId, sesionId: { in: ids }, validadaEn: { not: null } } }),
  ]);

  const trabajo = new Map();
  const casilla = (id) => {
    if (!trabajo.has(id)) trabajo.set(id, { ...TRABAJO_VACIO });
    return trabajo.get(id);
  };
  for (const a of anotaciones) casilla(a.sesionId).anotaciones += 1;
  for (const m of marcas) casilla(m.sesionId).marcas += 1;
  for (const f of flores) casilla(f.sesionId).flores += 1;
  for (const e of entradas) if (e.sesionId) casilla(e.sesionId).entradasDiario += 1;
  for (const r of respuestas) casilla(r.sesionId).respondio = true;
  for (const s of simulaciones) casilla(s.sesionId).simulacionValidada = true;

  const porEje = ejes.map((eje) => ({
    numero: eje.numero,
    peso: eje.peso,
    progreso: progresoDeEje(
      eje.sesiones.map((s) => ({
        publicada: s.publicada,
        completada: sesionCompletada(s.pantalla, trabajo.get(s.id) ?? TRABAJO_VACIO),
      }))
    ),
  }));

  return { total: progresoDelCurso(porEje), ejes: porEje };
}

async function main() {
  const maria = await prisma.user.findUnique({ where: { usuario: "maria.estrada" } });
  const sara = await prisma.user.findUnique({ where: { usuario: "sara.narvaez" } });

  const ejes = await prisma.eje.findMany({
    where: { caso: { activo: true } },
    orderBy: { orden: "asc" },
    select: { numero: true, peso: true },
  });
  console.log("Reparto del docente:", ejes.map((e) => `Eje ${e.numero}=${e.peso}%`).join("  "));
  console.log("Suma:", ejes.reduce((s, e) => s + e.peso, 0), "\n");

  const antesMaria = await avance(maria.id);
  const antesSara = await avance(sara.id);
  console.log(`María (con trabajo hecho):  ${antesMaria.total}%  · eje 1 al ${antesMaria.ejes[0].progreso}%`);
  console.log(`Sara  (sin trabajo hecho):  ${antesSara.total}%  · eje 1 al ${antesSara.ejes[0].progreso}%`);

  // Sara completa la cartografía de la 1.1: debe subir, y solo ella.
  const uno = await prisma.sesion.findFirst({
    where: { codigo: "1.1", publicada: true, eje: { caso: { activo: true } } },
  });
  const marca = await prisma.marcaCartografia.create({
    data: {
      autorId: sara.id,
      sesionId: uno.id,
      lugar: "El camino a la escuela",
      relato: "Comprobación automática.",
      audio: "Sin audio",
      tags: [],
      lat: 9.62,
      lon: -75.13,
    },
  });

  const despuesSara = await avance(sara.id);
  const despuesMaria = await avance(maria.id);
  console.log(`\nSara marca un lugar en la sesión 1.1 (actividad de cartografía):`);
  console.log(`  Sara:  ${antesSara.total}% → ${despuesSara.total}%  · eje 1: ${antesSara.ejes[0].progreso}% → ${despuesSara.ejes[0].progreso}%`);
  console.log(`  María: ${antesMaria.total}% → ${despuesMaria.total}%  (no debe moverse)`);

  await prisma.marcaCartografia.delete({ where: { id: marca.id } });
  const restaurada = await avance(sara.id);

  const correcto =
    despuesSara.total > antesSara.total &&
    despuesMaria.total === antesMaria.total &&
    restaurada.total === antesSara.total;

  console.log(`\nAl deshacer, Sara vuelve a ${restaurada.total}%`);
  console.log(correcto ? "\nCorrecto: el avance sigue al trabajo real." : "\nREVISAR");
}

main().finally(() => prisma.$disconnect());
