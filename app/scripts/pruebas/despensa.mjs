/**
 * 2.3 · Copla interactiva: el mapa de «la despensa del Caribe».
 *
 * Un estudiante ubica productos tocando el producto y luego el lugar, y
 * arrastrándolos; quita uno; no puede guardar sin el mínimo ni sin explicar la
 * despensa; guarda, y ve cómo lo ubicó su curso. Un compañero ve el resumen
 * solo después de guardar el suyo, y el resumen suma a los dos. Un estudiante
 * de otro curso solo cuenta en el suyo.
 *
 * Se hace sobre un módulo de prueba inactivo, que se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:despensa
 */
import { BASE, capturar, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, esperarTexto, prisma } from "./entorno.mjs";

const EXPLICACION =
  "Porque en sus municipios se siembra aguacate, ñame y tabaco, y de ahí sale buena parte de la comida de la costa.";

const mismoObjeto = (a, b) =>
  JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());

const hay = (pagina, texto) => pagina.evaluate((t) => document.body.innerText.includes(t), texto);

/** Tocar el producto y después el lugar: el camino del dedo y del teclado. */
async function tocar(pagina, producto, lugar) {
  await pagina.click(`::-p-xpath(//section[@aria-labelledby="titulo-productos"]//button[normalize-space()="${producto}"])`);
  await pagina.click(`[aria-label="Ubicar ${producto} en ${lugar}"]`);
  await pagina.waitForSelector(`[aria-label="Quitar ${producto} de ${lugar}"]`);
}

/** Arrastrar con los eventos del navegador (el modo sin cabeza no arrastra con el ratón simulado). */
async function arrastrar(pagina, producto, lugar) {
  await pagina.evaluate(
    (p, l) => {
      const origen = [...document.querySelectorAll('section[aria-labelledby="titulo-productos"] button')].find((b) => b.textContent.trim() === p);
      const destino = [...document.querySelectorAll('section[aria-labelledby="titulo-lugares"] li')].find((li) => li.innerText.startsWith(l));
      const datos = new DataTransfer();
      for (const [nodo, tipo] of [[origen, "dragstart"], [destino, "dragover"], [destino, "drop"]]) {
        nodo.dispatchEvent(new DragEvent(tipo, { bubbles: true, cancelable: true, dataTransfer: datos }));
      }
    },
    producto,
    lugar
  );
  await pagina.waitForSelector(`[aria-label="Quitar ${producto} de ${lugar}"]`);
}

async function guardar(pagina, esperado) {
  await pagina.click("::-p-text(mi mapa y mi respuesta)");
  await pagina.waitForFunction(
    (t) => [...document.querySelectorAll('[role="alert"], [role="status"]')].some((e) => e.textContent.includes(t)),
    { timeout: 30_000 },
    esperado
  );
  return true;
}

let modulo;

await ejecutar("2.3 · Copla interactiva: la despensa del Caribe", async ({ abrir }) => {
  modulo = await crearModuloDePrueba("despensa");
  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Prueba 7A", anio: 2026, docenteId: docente.id } });
  const e1 = await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id });
  await crearCuenta("est2", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id });
  await crearCuenta("est3", "ESTUDIANTE", { creadoPorId: docente.id });

  const navegador = await abrir();
  const url = `${BASE}/estudiante/sesion/${modulo.sesionId}`;

  // --- El primer estudiante hace su mapa ------------------------------------
  const est1 = await como(navegador, "prueba.est1", "ESTUDIANTE");
  await est1.goto(url, { waitUntil: "networkidle0" });
  comprobar("muestra los productos por ubicar y los lugares", (await hay(est1, "PRODUCTOS Y OFICIOS POR UBICAR")) && (await hay(est1, "La Cansona")));
  comprobar("sin haber guardado, todavía no muestra el mapa del curso", !(await hay(est1, "CÓMO LO UBICÓ TU CURSO")));
  comprobar("no guarda sin ubicar lo mínimo", await guardar(est1, "Ubica al menos 4 productos en el mapa (llevas 0)."));

  await tocar(est1, "Aguacate", "El Carmen de Bolívar");
  await arrastrar(est1, "Tabaco", "Ovejas");
  await tocar(est1, "Hamacas y artesanías", "San Jacinto");
  await tocar(est1, "Ñame", "El Salado");
  await tocar(est1, "Maíz", "Macayepo");
  comprobar("ubica tocando y arrastrando", await hay(est1, "5 ubicados"));

  await est1.click('[aria-label="Quitar Maíz de Macayepo"]');
  await esperarTexto(est1, "4 ubicados");
  comprobar("un producto se puede devolver a la lista", !(await est1.$('[aria-label="Quitar Maíz de Macayepo"]')));

  await est1.type("#despensa", "Porque sí.");
  comprobar("pide explicar la despensa", await guardar(est1, "la despensa del Caribe»"));
  await est1.$eval("#despensa", (el) => el.select());
  await est1.keyboard.press("Backspace");
  await est1.type("#despensa", EXPLICACION);
  await est1.type("#versos", "Mi tierra da ñame y canto.");
  comprobar("con el mapa y la explicación, guarda", await guardar(est1, "Tu mapa y tu respuesta quedaron guardados."));

  const respuesta = await prisma.respuestaActividad.findFirst({ where: { userId: e1.id, sesionId: modulo.sesionId } });
  comprobar(
    "guarda las ubicaciones, la explicación y los versos",
    respuesta?.texto === EXPLICACION &&
      // jsonb reordena las claves: se compara sin importar el orden.
      mismoObjeto(respuesta.datos?.ubicaciones, { aguacate: "carmen", tabaco: "ovejas", hamacas: "jacinto", name: "salado" }) &&
      respuesta.datos?.versos === "Mi tierra da ñame y canto."
  );

  await est1.reload({ waitUntil: "networkidle0" });
  comprobar("al volver, su mapa sigue ahí", Boolean(await est1.$('[aria-label="Quitar Tabaco de Ovejas"]')));
  comprobar("y ya ve el mapa del curso", (await hay(est1, "CÓMO LO UBICÓ TU CURSO")) && (await hay(est1, "Por ahora solo está tu mapa.")));
  await capturar(est1, "despensa-estudiante");

  // --- El compañero ---------------------------------------------------------
  const est2 = await como(navegador, "prueba.est2", "ESTUDIANTE");
  await est2.goto(url, { waitUntil: "networkidle0" });
  comprobar("el compañero no ve el mapa del curso antes de hacer el suyo", !(await hay(est2, "CÓMO LO UBICÓ TU CURSO")));
  await tocar(est2, "Aguacate", "El Carmen de Bolívar");
  await tocar(est2, "Tabaco", "El Carmen de Bolívar");
  await tocar(est2, "Hamacas y artesanías", "San Jacinto");
  await tocar(est2, "Queso costeño", "Zambrano");
  await est2.type("#despensa", EXPLICACION);
  await guardar(est2, "Tu mapa y tu respuesta quedaron guardados.");
  await est2.reload({ waitUntil: "networkidle0" });
  const resumen = await est2.$eval('section[aria-labelledby="titulo-curso"]', (s) => s.innerText);
  comprobar(
    "el resumen suma los dos mapas, producto por producto",
    resumen.includes("2 mapas guardados") && resumen.includes("El Carmen de Bolívar (2)") && /Ovejas \(1\)/.test(resumen),
    resumen.split("\n").slice(2, 5).join(" / ")
  );
  await capturar(est2, "despensa-curso");

  // --- Otro curso -----------------------------------------------------------
  const est3 = await como(navegador, "prueba.est3", "ESTUDIANTE");
  await est3.goto(url, { waitUntil: "networkidle0" });
  for (const [p, l] of [["Aguacate", "San Onofre"], ["Tabaco", "Chalán"], ["Café", "Colosó"], ["Yuca", "María La Baja"]]) await tocar(est3, p, l);
  await est3.type("#despensa", EXPLICACION);
  await guardar(est3, "Tu mapa y tu respuesta quedaron guardados.");
  await est3.reload({ waitUntil: "networkidle0" });
  comprobar("uno de otro curso solo ve el suyo", (await hay(est3, "Por ahora solo está tu mapa.")) && !(await hay(est3, "El Carmen de Bolívar (")));
});
