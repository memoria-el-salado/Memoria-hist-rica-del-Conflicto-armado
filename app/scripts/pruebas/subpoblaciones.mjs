/**
 * 3.4 · Subpoblaciones con cuidado (CU07).
 *
 * El alta de estudiantes ya no pregunta la subpoblación. El docente la declara
 * después, y solo con la autorización del acudiente. Los reportes y el panel
 * muestran solo lo autorizado, en agregado y sin grupos de menos de cinco; un
 * dato de antes, sin autorización, cuenta como «Sin declarar». Cada docente ve
 * solo sus reportes.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:subpoblaciones
 */
import { BASE, como, comprobar, crearCuenta, ejecutar, esperarTexto, prisma, capturar } from "./entorno.mjs";

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

await ejecutar("3.4 · Subpoblaciones con cuidado", async ({ abrir }) => {
  const docente = await crearCuenta("docente", "DOCENTE");
  const ahora = new Date();
  const est1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, nombre: "Prueba est1" });
  for (const n of [2, 3, 4, 5]) {
    await crearCuenta(`est${n}`, "ESTUDIANTE", { creadoPorId: docente.id, subpoblacion: "Población desplazada", subpoblacionConsentidaEn: ahora });
  }
  await crearCuenta("est6", "ESTUDIANTE", { creadoPorId: docente.id, subpoblacion: "Retornados", subpoblacionConsentidaEn: ahora });
  // Un dato de la v1: escrito por el docente, sin autorización registrada.
  await crearCuenta("est7", "ESTUDIANTE", { creadoPorId: docente.id, subpoblacion: "Víctimas directas" });
  await crearCuenta("otro.docente", "DOCENTE");

  const navegador = await abrir();
  const doc = await como(navegador, "prueba.docente", "DOCENTE");

  // --- Declarar con autorización -------------------------------------------------
  await doc.goto(`${BASE}/docente/estudiantes`, { waitUntil: "networkidle0" });
  comprobar("el alta de estudiantes ya no pregunta la subpoblación", !(await doc.$("#subpoblacion")));
  await doc.click('[aria-label="Declarar la subpoblación de Prueba est1"]');
  await doc.select(`#subpoblacion-${est1.id}`, "Población desplazada");
  await doc.click(`::-p-xpath(//form[.//select[@id="subpoblacion-${est1.id}"]]//button[normalize-space()="Guardar"])`);
  await esperarTexto(doc, "Registra primero que el acudiente autorizó este dato.");
  comprobar("sin la autorización del acudiente, no se guarda", !(await prisma.user.findUnique({ where: { id: est1.id } })).subpoblacion);

  await doc.click(`#consentimiento-${est1.id}`);
  await doc.click(`::-p-xpath(//form[.//select[@id="subpoblacion-${est1.id}"]]//button[normalize-space()="Guardar"])`);
  await esperarTexto(doc, "registrada con la autorización del acudiente");
  const declarado = await prisma.user.findUnique({ where: { id: est1.id } });
  comprobar("con ella, se guarda con la fecha de la autorización", declarado.subpoblacion === "Población desplazada" && Boolean(declarado.subpoblacionConsentidaEn));

  // --- Reportes ------------------------------------------------------------------
  await doc.goto(`${BASE}/docente/subpoblaciones`, { waitUntil: "networkidle0" });
  const filas = await doc.$$eval(".rejilla-subpoblaciones", (fs) => fs.slice(1).map((f) => `${f.children[0].textContent}:${f.children[1].textContent}`));
  comprobar(
    "muestra el grupo autorizado de cinco y los sin declarar",
    JSON.stringify(filas) === JSON.stringify(["Población desplazada:5", "Sin declarar:1"]),
    filas.join(" · ")
  );
  comprobar("oculta el grupo de uno, sin decir cuál", !(await hay(doc, "Retornados")) && (await hay(doc, "1 estudiante está en grupos de menos de cinco")));
  comprobar("un dato sin autorización no aparece como tal", !(await hay(doc, "Víctimas directas")));
  await capturar(doc, "subpoblaciones-reportes");

  await doc.click("::-p-text(Generar reporte diferenciado)");
  await esperarTexto(doc, "Reporte diferenciado #1 generado · 7 estudiantes");
  const reporte = await prisma.reporteDiferenciado.findFirst({ where: { docenteId: docente.id } });
  comprobar("el reporte queda a nombre del docente, sin los grupos ocultos", Boolean(reporte) && !reporte.resumen.includes("Retornados"));

  const otro = await como(navegador, "prueba.otro.docente", "DOCENTE");
  await otro.goto(`${BASE}/docente/subpoblaciones`, { waitUntil: "networkidle0" });
  comprobar("otro docente no ve ese reporte", !(await hay(otro, "7 estudiantes")));

  // --- Panel ---------------------------------------------------------------------
  await doc.goto(`${BASE}/docente/panel`, { waitUntil: "networkidle0" });
  comprobar(
    "el panel usa la misma protección",
    (await hay(doc, "Población desplazada")) && !(await hay(doc, "Retornados")) && (await hay(doc, "1 en grupos de menos de cinco"))
  );

  // --- Retirar la declaración ----------------------------------------------------
  await doc.goto(`${BASE}/docente/estudiantes`, { waitUntil: "networkidle0" });
  await doc.click('[aria-label="Declarar la subpoblación de Prueba est1"]');
  await doc.select(`#subpoblacion-${est1.id}`, "");
  await doc.click(`::-p-xpath(//form[.//select[@id="subpoblacion-${est1.id}"]]//button[normalize-space()="Guardar"])`);
  await esperarTexto(doc, "queda sin declarar");
  const retirado = await prisma.user.findUnique({ where: { id: est1.id } });
  comprobar("retirar la declaración borra el dato y la autorización", !retirado.subpoblacion && !retirado.subpoblacionConsentidaEn);
});
