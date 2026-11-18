/**
 * CU01 · Aulas: la administración conecta a los estudiantes con su docente.
 *
 * Como en Canvas, un estudiante que no está en el aula de un docente entra a
 * la plataforma pero no ve los contenidos, ni escribiendo la dirección de un
 * documento. El administrador lo pone en un aula, le pasa un aula entera a
 * otro docente con sus estudiantes, crea aulas y da de alta estudiantes en
 * ellas.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:aulas
 */
import { BASE, capturar, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

/** Espera a que la base refleje un cambio que la pantalla hizo por su cuenta. */
async function esperarEnBase(consulta, cumple, ms = 20_000) {
  const fin = Date.now() + ms;
  let valor = await consulta();
  while (!cumple(valor) && Date.now() < fin) {
    await new Promise((r) => setTimeout(r, 300));
    valor = await consulta();
  }
  return valor;
}

await ejecutar("CU01 · Aulas y estudiantes", async ({ abrir }) => {
  await crearCuenta("admin", "ADMIN");
  const docA = await crearCuenta("docente", "DOCENTE", { nombre: "Prueba Docente A" });
  const docB = await crearCuenta("otro.docente", "DOCENTE", { nombre: "Prueba Docente B" });
  const aula = await prisma.curso.create({ data: { nombre: "Aula de prueba", anio: new Date().getFullYear(), docenteId: docA.id } });
  const est = await crearCuenta("est1", "ESTUDIANTE", { nombre: "Prueba Sin Aula", creadoPorId: null });
  const documento = await prisma.documentoFuente.findFirst({ where: { soloDocentes: false }, select: { id: true } });

  const navegador = await abrir();

  // --- Sin aula, el estudiante no ve contenidos -------------------------------
  const alumno = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await alumno.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("sin docente, el estudiante entra pero no ve el mapa", (await hay(alumno, "Todavía no estás en un aula")) && !(await hay(alumno, "Continúa aquí")));
  await capturar(alumno, "aulas-sin-aula");
  if (documento) {
    const estado = await alumno.evaluate((u) => fetch(u).then((r) => r.status), `${BASE}/api/documentos/${documento.id}`);
    comprobar("ni abre la cartilla escribiendo la dirección", estado === 403, String(estado));
  }

  // --- El administrador lo pone en el aula de un docente ----------------------
  const admin = await como(navegador, "prueba.admin", "ADMIN");
  await admin.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  comprobar("el administrador ve quién está sin docente", (await hay(admin, "Prueba Sin Aula")) && (await hay(admin, "Sin docente")));
  await admin.select('select[aria-label="Aula de Prueba Sin Aula"]', `c:${aula.id}`);
  const asignado = await esperarEnBase(
    () => prisma.user.findUnique({ where: { id: est.id }, select: { creadoPorId: true, cursoId: true } }),
    (u) => u?.cursoId === aula.id
  );
  comprobar("lo deja en el aula y conectado con su docente", asignado?.cursoId === aula.id && asignado?.creadoPorId === docA.id);
  await capturar(admin, "aulas-admin");

  await alumno.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("ya en el aula, el estudiante ve los contenidos", !(await hay(alumno, "Todavía no estás en un aula")));
  if (documento) {
    const estado = await alumno.evaluate((u) => fetch(u, { method: "HEAD" }).then((r) => r.status), `${BASE}/api/documentos/${documento.id}`);
    comprobar("y abre la cartilla", estado !== 403, String(estado));
  }

  const docente = await como(navegador, "prueba.docente", "DOCENTE");
  await docente.goto(`${BASE}/docente/estudiantes`, { waitUntil: "networkidle0" });
  comprobar("el docente lo encuentra entre sus estudiantes", await hay(docente, "Prueba Sin Aula"));

  // --- Un aula entera pasa a otro docente, con sus estudiantes ----------------
  await admin.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  await admin.select('select[aria-label^="Docente a cargo del aula Aula de prueba"]', docB.id);
  const movido = await esperarEnBase(
    () => prisma.user.findUnique({ where: { id: est.id }, select: { creadoPorId: true, cursoId: true } }),
    (u) => u?.creadoPorId === docB.id
  );
  const aulaMovida = await prisma.curso.findUnique({ where: { id: aula.id }, select: { docenteId: true } });
  comprobar("asignar el aula a otro docente le pasa también sus estudiantes", aulaMovida?.docenteId === docB.id && movido?.creadoPorId === docB.id && movido?.cursoId === aula.id);

  // --- Quitarle el docente lo desconecta --------------------------------------
  await admin.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  await admin.select('select[aria-label="Aula de Prueba Sin Aula"]', "");
  await esperarEnBase(
    () => prisma.user.findUnique({ where: { id: est.id }, select: { creadoPorId: true } }),
    (u) => u?.creadoPorId === null
  );
  await alumno.goto(`${BASE}/estudiante/mapa`, { waitUntil: "networkidle0" });
  comprobar("sin docente otra vez, vuelve a no ver contenidos", await hay(alumno, "Todavía no estás en un aula"));

  // --- Crear un aula y un estudiante dentro de ella ---------------------------
  await admin.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  await admin.type("#aula-nombre", "Aula nueva de prueba");
  await admin.select("#aula-docente", docA.id);
  await admin.click("::-p-text(Crear aula)");
  await esperarTexto(admin, "Aula Aula nueva de prueba creada");
  const nueva = await prisma.curso.findFirst({ where: { nombre: "Aula nueva de prueba", docenteId: docA.id } });
  comprobar("crea un aula para un docente", Boolean(nueva));

  await admin.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  await admin.type("#nombre", "Prueba Alta Admin");
  await admin.type("#usuario", "prueba.est2");
  await admin.select("#destino", `c:${nueva.id}`);
  await admin.click("::-p-text(Crear estudiante)");
  // Al crearla, la pantalla muestra las credenciales para entregar.
  const alta = await esperarEnBase(
    () => prisma.user.findUnique({ where: { usuario: "prueba.est2" }, select: { rol: true, creadoPorId: true, cursoId: true } }),
    Boolean
  );
  comprobar("da de alta un estudiante directamente en el aula", alta?.rol === "ESTUDIANTE" && alta.cursoId === nueva.id && alta.creadoPorId === docA.id);

  // --- Solo el administrador ---------------------------------------------------
  const r = await docente.goto(`${BASE}/admin/aulas`, { waitUntil: "networkidle0" });
  comprobar("un docente no puede entrar a la gestión de aulas", new URL(docente.url()).pathname !== "/admin/aulas" || r.status() >= 400);
});
