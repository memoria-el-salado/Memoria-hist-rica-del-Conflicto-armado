/**
 * Cuadra el módulo activo de El Salado con la cartilla del CNMH.
 *
 * La importación del PDF recortado dejó algunos títulos partidos por las
 * columnas («Asociación Nacional de»), números de página pegados al nombre de
 * un eje («… juntos 10 11»), dos subsecciones sin detectar y el Preámbulo «Me
 * cuido y nos cuidamos» fuera del módulo. Este guion lo corrige con el índice
 * de la cartilla («Mapa de viaje», página 6), copia del Eje 1 los objetivos de
 * la guía para maestros y asigna a cada sesión la actividad que le corresponde
 * según su apartado de la cartilla.
 *
 *   npm run db:respaldar
 *   npx tsx scripts/cuadrar-el-salado.ts            (muestra lo que cambiaría)
 *   npx tsx scripts/cuadrar-el-salado.ts --aplicar  (lo escribe)
 *
 * Es idempotente: si ya está cuadrado, no cambia nada. El Preámbulo se crea sin
 * publicar: lo publica el docente cuando la versión que lo conoce esté en línea.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sugerirActividad } from "../src/lib/importador-pdf";

const aplicar = process.argv.includes("--aplicar");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "", max: 2 }) });

const CARTILLA = "«El Salado, Montes de María: tierra de luchas y contrastes» (CNMH, 2018)";

/** Los nombres de los ejes, como en el índice de la cartilla. */
const EJES: Record<number, string> = {
  3: "Los dilemas que plantea la acción colectiva violenta: las transformaciones del conflicto armado en los Montes de María (finales de los sesenta-2005)",
  6: "¿Por qué retornar? Arraigos, reencuentros, solidaridades y luchas por un buen vivir juntos",
};

/** Títulos de sesión y de subsección que la importación cortó o desarmó. */
const TITULOS: Record<string, string> = {
  "2.2": "Asociación Nacional de Usuarios Campesinos, ANUC",
  "2.4.1": "La reacción de los sectores a favor del enfoque productivista: el Pacto de Chicoral",
  "3.2.2": "El surgimiento del Partido Revolucionario de los Trabajadores (PRT) y del Ejército Popular de Liberación (EPL)",
  "3.4.1": "¿Cómo surgen las autodefensas en los Montes de María?",
  "3.5.1": "Los argumentos institucionales de la Fuerza Pública en los noventa en Montes de María",
  "3.6.1": "El colectivo de Comunicaciones Montes de María Línea 21 en medio del conflicto armado",
};

/** Subsecciones que están en el índice y la importación no detectó. */
const FALTANTES: { sesion: string; codigo: string; titulo: string }[] = [
  { sesion: "2.3", codigo: "2.3.1", titulo: "Mujeres campesinas y discriminación" },
  { sesion: "6.2", codigo: "6.2.1", titulo: "¿Qué significa el retorno para los salaeros y las salaeras?" },
];

/** Del Eje 1, la guía para maestros trae el objetivo general y el de cada sesión. */
const OBJETIVO_EJE_1 =
  "Comprender que la construcción de las identidades (de estudiantes, docentes, pobladores de los Montes de María y otras regiones del país) está mediada por los arraigos y las relaciones que las personas establecemos con los territorios que habitamos, los cuales, en algunos casos, pueden llegar a ser objeto de disputas o conflictos.";
const OBJETIVOS: Record<string, string> = {
  "1.1":
    "Comprender, desde la propia experiencia cotidiana, que las identidades de las personas se desenvuelven en espacios significativos: no hay identidad posible sin arraigos espaciales y territoriales. Esos espacios a veces son motivo de conflicto con otros jóvenes. ¿Cómo han resuelto esos conflictos por los espacios?",
  "1.2":
    "Comprender los arraigos que otras personas del país, particularmente los campesinos y campesinas de los Montes de María, han construido con el territorio donde habitan, y los conflictos que allí se han desatado por el acceso, uso y titulación de la tierra.",
  "1.3":
    "Comprender que las tensiones de los años sesenta en el campo colombiano generaron dos modelos de desarrollo: uno que puso el énfasis en la redistribución de la tierra, para que los campesinos fueran propietarios, y otro centrado en la productividad y en la defensa de los derechos de propiedad.",
  "1.4":
    "Reflexionar sobre las implicaciones de hacer una reforma agraria y las posibilidades de repartir la tierra con equidad, teniendo en cuenta las necesidades, exigencias, identidades y relaciones con la tierra de las distintas personas, familias y comunidades.",
};

const PREAMBULO = {
  nombre: "Preámbulo. Me cuido y nos cuidamos",
  objetivo:
    "Construir acuerdos basados en el cuidado personal y colectivo y en el reconocimiento de la dignidad de toda persona, para acercarse con empatía y respeto a las historias de vida de otros y otras.",
  sesion: "Me cuido y nos cuidamos: construyendo acuerdos para el viaje por la memoria histórica",
};

const cambios: string[] = [];
const anotar = (t: string) => cambios.push(t);

async function main() {
  const caso = await prisma.caso.findFirst({
    where: { activo: true },
    include: { ejes: { orderBy: { orden: "asc" }, include: { sesiones: { orderBy: { orden: "asc" }, include: { subsecciones: { orderBy: { orden: "asc" } } } } } } },
  });
  if (!caso) throw new Error("No hay un módulo activo.");
  if (!/salado/i.test(caso.nombre)) throw new Error(`El módulo activo («${caso.nombre}») no es el de El Salado.`);
  console.log(`Módulo activo: ${caso.nombre}${aplicar ? "" : "  (sin aplicar: solo se muestran los cambios)"}\n`);

  for (const eje of caso.ejes) {
    const datos: { nombre?: string; descripcion?: string; objetivoGeneral?: string } = {};
    const nombre = EJES[eje.numero] ?? eje.nombre.replace(/(\s+\d{1,3})+\s*$/, "").trim();
    if (!eje.esPreambulo && nombre !== eje.nombre) datos.nombre = nombre;
    if (eje.descripcion.startsWith("Eje derivado de")) {
      datos.descripcion = eje.esPreambulo ? `Preámbulo de la cartilla ${CARTILLA}.` : `Eje temático ${eje.numero} de la cartilla ${CARTILLA}.`;
    }
    if (eje.numero === 1 && !eje.objetivoGeneral) datos.objetivoGeneral = OBJETIVO_EJE_1;
    if (Object.keys(datos).length) {
      anotar(`Eje ${eje.numero}: ${Object.keys(datos).join(", ")}${datos.nombre ? ` → «${datos.nombre}»` : ""}`);
      if (aplicar) await prisma.eje.update({ where: { id: eje.id }, data: datos });
    }

    for (const s of eje.sesiones) {
      const sDatos: { titulo?: string; objetivo?: string; pantalla?: string; tipo?: string } = {};
      if (TITULOS[s.codigo] && TITULOS[s.codigo] !== s.titulo) sDatos.titulo = TITULOS[s.codigo];
      if (OBJETIVOS[s.codigo] && !s.objetivo) sDatos.objetivo = OBJETIVOS[s.codigo];

      const titulos = s.subsecciones.map((x) => TITULOS[x.codigo] ?? x.titulo);
      const sugerida = sugerirActividad(sDatos.titulo ?? s.titulo, titulos);
      if (sugerida !== s.pantalla) {
        const trabajo = await prisma.respuestaActividad.count({ where: { sesionId: s.id } });
        sDatos.pantalla = sugerida;
        sDatos.tipo = sugerida;
        anotar(`  ${s.codigo}: actividad ${s.pantalla} → ${sugerida}${trabajo ? ` (${trabajo} respuesta(s) guardada(s) se conservan)` : ""}`);
      }
      if (sDatos.titulo) anotar(`  ${s.codigo}: título → «${sDatos.titulo}»`);
      if (sDatos.objetivo) anotar(`  ${s.codigo}: objetivo de la guía para maestros`);
      if (aplicar && Object.keys(sDatos).length) await prisma.sesion.update({ where: { id: s.id }, data: sDatos });

      for (const sub of s.subsecciones) {
        if (TITULOS[sub.codigo] && TITULOS[sub.codigo] !== sub.titulo) {
          anotar(`  ${sub.codigo}: título → «${TITULOS[sub.codigo]}»`);
          if (aplicar) await prisma.subseccion.update({ where: { id: sub.id }, data: { titulo: TITULOS[sub.codigo] } });
        }
      }
      for (const f of FALTANTES.filter((x) => x.sesion === s.codigo)) {
        if (s.subsecciones.some((x) => x.codigo === f.codigo)) continue;
        anotar(`  ${f.codigo}: subsección que faltaba («${f.titulo}»)`);
        const orden = Math.min(0, ...s.subsecciones.map((x) => x.orden)) - 1;
        if (aplicar) await prisma.subseccion.create({ data: { sesionId: s.id, codigo: f.codigo, titulo: f.titulo, orden } });
      }
    }
  }

  if (!caso.ejes.some((e) => e.esPreambulo)) {
    anotar(`Preámbulo: eje 0 con la sesión «${PREAMBULO.sesion}» (actividad: acuerdos, sin publicar)`);
    if (aplicar) {
      await prisma.eje.create({
        data: {
          casoId: caso.id,
          numero: 0,
          esPreambulo: true,
          nombre: PREAMBULO.nombre,
          descripcion: `Preámbulo de la cartilla ${CARTILLA}.`,
          objetivoGeneral: PREAMBULO.objetivo,
          tono: "#177575",
          orden: Math.min(...caso.ejes.map((e) => e.orden)) - 1,
          sesiones: {
            create: { codigo: "P", titulo: PREAMBULO.sesion, objetivo: PREAMBULO.objetivo, tipo: "acuerdos", pantalla: "acuerdos", publicada: false, orden: 0 },
          },
        },
      });
    }
  }

  console.log(cambios.length ? cambios.join("\n") : "Nada que cambiar: el módulo ya está cuadrado con la cartilla.");
  if (cambios.length && !aplicar) console.log("\nRepite con --aplicar para escribir los cambios.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
