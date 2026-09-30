import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { armarHilos, posturaParaNuevo, puedeEscribir, puedeVerForo, type Postura, type Quien } from "@/lib/foros";

/**
 * Datos de los debates que comparten las pantallas del docente y del
 * estudiante. Las reglas —quién ve, quién escribe— están en `foros.ts`; aquí
 * solo se leen de la base.
 */

/** La sesión no guarda quién creó la cuenta, y para los foros hace falta. */
export async function quienSoy(): Promise<Quien | null> {
  const sesion = await auth();
  if (!sesion?.user) return null;

  const usuario = await prisma.user.findUnique({
    where: { id: sesion.user.id },
    select: { id: true, rol: true, creadoPorId: true },
  });
  return usuario ? { id: usuario.id, rol: usuario.rol, creadoPorId: usuario.creadoPorId } : null;
}

export type MensajeVista = {
  id: string;
  texto: string;
  fuente: string | null;
  postura: Postura | null;
  destacado: boolean;
  autor: string;
  esDocente: boolean;
  propio: boolean;
  fecha: string;
};

export type HiloVista = MensajeVista & { respuestas: MensajeVista[] };

const FECHA: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

/**
 * Carga un debate para quien lo abre. Devuelve `null` si no le corresponde
 * verlo: el foro de otro docente no existe para él.
 *
 * Un estudiante que entra sin rol recibe el del bando con menos gente, para que
 * sepa desde dónde argumenta antes de escribir.
 */
export async function cargarDebate(foroId: string, quien: Quien) {
  const foro = await prisma.foro.findUnique({
    where: { id: foroId },
    include: {
      sesion: { select: { codigo: true, titulo: true } },
      participantes: { select: { userId: true, postura: true } },
    },
  });
  if (!foro || !puedeVerForo(quien, foro)) return null;

  let miPostura: Postura | null = null;
  if (quien.rol === "ESTUDIANTE") {
    miPostura = foro.participantes.find((p) => p.userId === quien.id)?.postura ?? null;
    if (!miPostura) {
      const postura = posturaParaNuevo(foro.participantes.map((p) => p.postura));
      // upsert: si el estudiante abre el foro en dos pestañas a la vez, no choca.
      const creado = await prisma.participanteForo.upsert({
        where: { foroId_userId: { foroId, userId: quien.id } },
        create: { foroId, userId: quien.id, postura },
        update: {},
      });
      miPostura = creado.postura;
      foro.participantes.push({ userId: quien.id, postura: creado.postura });
    }
  }

  const mensajes = await prisma.mensajeForo.findMany({
    where: { foroId },
    include: { autor: { select: { nombre: true, rol: true } } },
  });

  const vistas = mensajes.map((m) => ({
    id: m.id,
    respuestaAId: m.respuestaAId,
    creadoEn: m.creadoEn,
    vista: {
      id: m.id,
      texto: m.texto,
      fuente: m.fuente,
      postura: m.postura,
      destacado: m.destacado,
      autor: m.autor.nombre,
      esDocente: m.autor.rol === "DOCENTE",
      propio: m.autorId === quien.id,
      fecha: m.creadoEn.toLocaleString("es-CO", FECHA),
    } satisfies MensajeVista,
  }));

  const hilos: HiloVista[] = armarHilos(vistas).map((h) => ({
    ...h.vista,
    respuestas: h.respuestas.map((r) => r.vista),
  }));

  return {
    foro: {
      id: foro.id,
      pregunta: foro.pregunta,
      rolA: foro.rolA,
      rolB: foro.rolB,
      fuentes: foro.fuentes,
      abierto: foro.abierto,
      sesion: foro.sesion ? `${foro.sesion.codigo} · ${foro.sesion.titulo}` : null,
    },
    hilos,
    miPostura,
    puedeEscribir: puedeEscribir(quien, foro),
    conteo: {
      A: foro.participantes.filter((p) => p.postura === "A").length,
      B: foro.participantes.filter((p) => p.postura === "B").length,
    },
  };
}

export type Debate = NonNullable<Awaited<ReturnType<typeof cargarDebate>>>;
