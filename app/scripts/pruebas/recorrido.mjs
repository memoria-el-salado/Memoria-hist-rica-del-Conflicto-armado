/**
 * 3.3 · Competencias y desbloqueo del mapa.
 *
 * El docente pone a un curso a recorrer el mapa en orden. Sus estudiantes ven
 * los ejes siguientes cerrados, con lo que falta para abrirlos; los de un
 * curso libre, no. El docente abre un eje a mano y lo vuelve a cerrar; el estudiante
 * hace las sesiones publicadas del eje 1 y, al pasar el umbral, se le abre el siguiente. Sus
 * competencias suben con ellas. Volver a libre lo abre todo.
 *
 * Usa el módulo activo y su sesión publicada, con cuentas de prueba: no se
 * publica ni se cambia nada real.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:recorrido
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);
const cerrados = (pagina) => pagina.evaluate(() => (document.body.innerText.match(/\bCERRADO\b/g) ?? []).length);

/** Deja en la sesión el trabajo que su actividad pide para darse por hecha (src/lib/progreso.ts). */
async function hacer(autorId, s) {
  const respuesta = (datos = undefined) =>
    prisma.respuestaActividad.create({ data: { userId: autorId, sesionId: s.id, texto: "Respuesta de prueba del recorrido.", datos } });
  switch (s.pantalla) {
    case "cartografia":
      return prisma.marcaCartografia.create({ data: { autorId, sesionId: s.id, lugar: "Prueba recorrido", relato: "Mi lugar de prueba.", lat: 9.7, lon: -75.1 } });
    case "copla":
    case "meubico":
    case "testimonios":
    case "compromiso":
      return respuesta();
    case "despensa":
      return respuesta({ ubicaciones: { aguacate: "carmen", tabaco: "ovejas", hamacas: "jacinto", name: "salado" } });
    case "dilema":
      return respuesta({ opcion: "Opción de prueba" });
    case "investigar":
      return respuesta({ fuentes: ["Fuente de prueba"] });
    case "simulador":
      return prisma.simulacion.create({ data: { userId: autorId, sesionId: s.id, validadaEn: new Date() } });
    case "jardin":
      return prisma.florJardin.create({ data: { autorId, sesionId: s.id, nombre: "Prueba", legado: "Prueba", epoca: "RETORNO", pieza: "FLOR", tono: "#D95D39", altura: 60 } });
    case "diario":
      return prisma.entradaDiario.create({ data: { autorId, sesionId: s.id, emocion: "ESPERANZA", texto: "Entrada de prueba." } });
    default:
      return prisma.anotacion.create({ data: { autorId, sesionId: s.id, texto: "Anotación de prueba del recorrido." } });
  }
}

/** Borra todo el trabajo del estudiante de prueba. */
async function deshacer(autorId) {
  await Promise.all([
    prisma.marcaCartografia.deleteMany({ where: { autorId } }),
    prisma.respuestaActividad.deleteMany({ where: { userId: autorId } }),
    prisma.simulacion.deleteMany({ where: { userId: autorId } }),
    prisma.florJardin.deleteMany({ where: { autorId } }),
    prisma.entradaDiario.deleteMany({ where: { autorId } }),
    prisma.anotacion.deleteMany({ where: { autorId } }),
  ]);
}

await ejecutar("3.3 · Competencias y desbloqueo del mapa", async ({ abrir }) => {
  const ejes = await prisma.eje.findMany({ where: { caso: { activo: true } }, orderBy: { orden: "asc" }, include: { sesiones: true } });
  const primero = ejes.find((e) => !e.esPreambulo && e.sesiones.some((s) => s.publicada));
  if (!primero || ejes.filter((e) => !e.esPreambulo).length < 2) throw new Error("El módulo activo necesita al menos dos ejes y una sesión publicada en el primero.");
  const segundo = ejes[ejes.indexOf(primero) + 1];
  const publicadas = primero.sesiones.filter((s) => s.publicada);
  const siguientes = ejes.length - ejes.indexOf(primero) - 1;

  const docente = await crearCuenta("docente", "DOCENTE");
  const enOrden = await prisma.curso.create({ data: { nombre: "Prueba orden", anio: 2026, docenteId: docente.id } });
  const libre = await prisma.curso.create({ data: { nombre: "Prueba libre", anio: 2026, docenteId: docente.id } });
  const estA = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: enOrden.id });
  await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: libre.id });

  const navegador = await abrir();

  // --- El docente pide recorrer en orden ------------------------------------------
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  await doc.goto(`${BASE}/docente/cursos/${enOrden.id}`, { waitUntil: "networkidle0" });
  await doc.click("::-p-text(En orden, eje por eje)");
  await doc.select("#umbral-recorrido", "60");
  await doc.click("::-p-text(Guardar recorrido)");
  await esperarTexto(doc, "Recorrido en orden: cada eje se abre al llegar al 60% en el anterior.");
  const curso = await prisma.curso.findUnique({ where: { id: enOrden.id } });
  comprobar("el curso recorre el mapa en orden", curso.recorrido === "EN_ORDEN" && curso.umbral === 60);
  await capturar(doc, "recorrido-docente");

  // --- Los estudiantes ------------------------------------------------------------
  const a = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await a.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("en orden, los ejes siguientes al primero están cerrados", (await cerrados(a)) === siguientes, `${await cerrados(a)} cerrados`);
  comprobar("y dicen qué falta para abrirlos", await hay(a, `Se abre al llegar al 60% en el eje ${primero.numero}`));
  comprobar("el mapa muestra las cuatro competencias", (await hay(a, "TUS COMPETENCIAS CIUDADANAS")) && (await hay(a, "Escucha activa")) && (await hay(a, "Asertividad")));

  const b = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await b.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("en un curso libre no hay ejes cerrados", (await cerrados(b)) === 0);

  // --- El docente abre un eje a mano --------------------------------------------
  await doc.reload({ waitUntil: "networkidle0" });
  await doc.click(`[aria-label="Abrir ya el eje ${segundo.numero}"]`);
  await esperarTexto(doc, `El eje ${segundo.numero} queda abierto para el curso.`);
  await a.reload({ waitUntil: "networkidle0" });
  comprobar("un eje abierto por el docente deja de estar cerrado", (await cerrados(a)) === siguientes - 1);

  // --- Por avance ---------------------------------------------------------------
  // Hace todas las sesiones publicadas del eje 1, cada una con el trabajo que su
  // actividad pide (cómo se hace cada una lo prueba su propio humo:*). Así la
  // prueba no depende de cuántas haya publicado el docente real.
  // Antes, el docente deja de abrir a mano el segundo eje: así se ve que lo abre el avance.
  await doc.click(`[aria-label="Dejar de abrir a mano el eje ${segundo.numero}"]`);
  await doc.waitForSelector(`[aria-label="Abrir ya el eje ${segundo.numero}"]`, { timeout: 20_000 });
  await a.reload({ waitUntil: "networkidle0" });
  comprobar("sin la apertura a mano, el segundo eje vuelve a cerrarse", (await cerrados(a)) === siguientes);
  for (const s of publicadas) await hacer(estA.id, s);
  await a.reload({ waitUntil: "networkidle0" });
  const segundoCerrado = await a.evaluate(
    // Cada estación del mapa lleva su nombre completo en la etiqueta accesible y su estado a la vista.
    (nombre) =>
      [...document.querySelectorAll('[role="tablist"][aria-label="Estaciones del viaje"] [role="tab"]')].some(
        (t) => t.offsetParent !== null && (t.getAttribute("aria-label") ?? "").includes(nombre) && /\bCERRADO\b/.test(t.innerText)
      ),
    segundo.nombre
  );
  comprobar("al pasar el umbral en el primer eje, se abre el siguiente", !segundoCerrado && (await cerrados(a)) < siguientes, `${publicadas.length} sesiones hechas`);
  comprobar("y sus competencias suben con las sesiones hechas", await a.evaluate(() => /\b[1-9]\d* de \d+ actividad(es)? · [1-9]\d*%/.test(document.body.innerText)));
  await capturar(a, "recorrido-estudiante");

  // --- De vuelta a libre ---------------------------------------------------------
  await deshacer(estA.id);
  await a.reload({ waitUntil: "networkidle0" });
  comprobar("sin el avance, vuelven a cerrarse", (await cerrados(a)) === siguientes);
  await doc.click("::-p-text(Libre: cualquier sesión publicada)");
  await doc.click("::-p-text(Guardar recorrido)");
  await esperarTexto(doc, "Recorrido libre");
  await a.reload({ waitUntil: "networkidle0" });
  comprobar("volver a libre lo abre todo", (await cerrados(a)) === 0);
});
