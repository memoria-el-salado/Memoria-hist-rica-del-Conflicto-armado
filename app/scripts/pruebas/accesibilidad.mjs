/**
 * Accesibilidad y diseño responsivo de toda la plataforma.
 *
 * Recorre cada pantalla de los tres roles, y la portada y el login sin cuenta,
 * en un celular, una tableta y un computador. En cada una:
 *
 *   - pasa axe-core con las reglas de las WCAG 2.1, niveles A y AA (RNF02);
 *   - con el teclado, el primer Tab ofrece saltar al contenido (2.4.1);
 *   - comprueba que nada se sale a lo ancho, que obligaría a arrastrar la
 *     página de lado (RNF03).
 *
 * Las sesiones se prueban sobre un módulo de prueba inactivo, con una sesión
 * por actividad y las cartillas reales vinculadas; se borra al terminar.
 *
 *   npm run dev            (en otra terminal)
 *   npm run humo:accesibilidad
 *
 * Con DETALLE=1 imprime cada elemento que incumple una regla.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { BASE, como, comprobar, crearCuenta, crearModuloDePrueba, ejecutar, prisma, visitar } from "./entorno.mjs";

const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const TAMANOS = [
  { nombre: "celular", width: 375, height: 812, isMobile: true, hasTouch: true },
  { nombre: "tableta", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { nombre: "computador", width: 1280, height: 900 },
];

const ACTIVIDADES = ["zona", "cartografia", "copla", "despensa", "simulador", "jardin", "diario", "meubico", "dilema", "investigar", "testimonios", "compromiso"];

/** Pasa axe sobre la página y devuelve las reglas incumplidas. */
async function auditar(pagina) {
  if (!(await pagina.evaluate(() => Boolean(window.axe)))) await pagina.evaluate(AXE);
  return pagina.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"],
    });
    return r.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      ayuda: v.help,
      nodos: v.nodes.map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`),
    }));
  });
}

/** Cuánto se sale la página a lo ancho, y qué elemento lo provoca. */
function desborde(pagina) {
  return pagina.evaluate(() => {
    const exceso = document.documentElement.scrollWidth - innerWidth;
    if (exceso <= 0) return null;
    const culpable = [...document.querySelectorAll("body *")].find((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "fixed");
    return `${exceso}px · ${culpable ? culpable.tagName.toLowerCase() + (culpable.id ? "#" + culpable.id : "") + "." + [...culpable.classList].slice(0, 3).join(".") : "?"}`;
  });
}

const resumen = new Map();

async function revisar(pagina, ruta, tamano) {
  await pagina.setViewport(tamano);
  const respuesta = await visitar(pagina, `${BASE}${ruta}`);
  if (respuesta && respuesta.status() >= 400) {
    comprobar(`${ruta} abre (${tamano.nombre})`, false, `HTTP ${respuesta.status()}`);
    return;
  }
  const fallas = await auditar(pagina);
  const ancho = await desborde(pagina);
  const etiqueta = `${ruta} · ${tamano.nombre}`;
  if (!tamano.isMobile) {
    // Con el teclado, lo primero es poder saltar el menú (WCAG 2.4.1).
    await pagina.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await pagina.keyboard.press("Tab");
    const primero = await pagina.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    comprobar(`${etiqueta}: el primer Tab ofrece saltar al contenido`, primero === "Saltar al contenido", primero.slice(0, 40));
  }
  comprobar(`${etiqueta}: sin fallas WCAG 2.1 AA`, fallas.length === 0, fallas.map((f) => `${f.id} (${f.nodos.length})`).join(", "));
  comprobar(`${etiqueta}: no se desborda a lo ancho`, !ancho, ancho ?? "");
  for (const f of fallas) {
    const r = resumen.get(f.id) ?? { ayuda: f.ayuda, impacto: f.impacto, rutas: new Set(), nodos: new Set() };
    r.rutas.add(ruta);
    f.nodos.forEach((n) => r.nodos.add(n));
    resumen.set(f.id, r);
  }
}

await ejecutar("Accesibilidad (WCAG 2.1 AA) y diseño responsivo", async ({ abrir }) => {
  const modulo = await crearModuloDePrueba(ACTIVIDADES.map((p) => ({ pantalla: p, titulo: `Sesión de ${p} (prueba)` })));
  await prisma.sesion.update({ where: { id: modulo.sesiones[0] }, data: { codigo: "1.2", contenido: "Un párrafo de la guía para leer en la sesión de prueba, con suficiente texto para anotar." } });
  for (const d of await prisma.documentoFuente.findMany({ select: { id: true } })) {
    await prisma.documentoVinculado.create({ data: { casoId: modulo.casoId, documentoId: d.id } });
  }
  // Las familias del simulador son datos fijos: si faltan, la sesión no tiene qué mostrar.
  if (!(await prisma.familia.count())) throw new Error("Faltan las familias del simulador.");

  const docente = await crearCuenta("docente", "DOCENTE");
  const curso = await prisma.curso.create({ data: { nombre: "Curso de prueba", anio: 2026, docenteId: docente.id } });
  await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id, cursoId: curso.id });
  await crearCuenta("admin", "ADMIN");
  const foro = await prisma.foro.create({
    data: { pregunta: "¿Redistribuir la tierra o tecnificar el campo? (prueba)", rolA: "Reforma", rolB: "Productivista", autorId: docente.id, sesionId: modulo.sesiones[0] },
  });

  const navegador = await abrir();
  const anonimo = await (await navegador.createBrowserContext()).newPage();
  const est = await como(navegador, "prueba.est1", "ESTUDIANTE");
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const adm = await como(navegador, "prueba.admin", "ADMIN");

  const rutas = [
    [anonimo, ["/", "/login"]],
    [
      est,
      [
        "/estudiante/mapa",
        "/estudiante/diario",
        "/estudiante/foros",
        `/estudiante/foros/${foro.id}`,
        "/estudiante/explorador",
        "/cambiar-contrasena",
        ...modulo.sesiones.map((s) => `/estudiante/sesion/${s}`),
      ],
    ],
    [
      doc,
      [
        "/docente/panel",
        "/docente/contenidos",
        "/docente/cursos",
        `/docente/cursos/${curso.id}`,
        "/docente/estudiantes",
        "/docente/foros",
        `/docente/foros/${foro.id}`,
        "/docente/revision",
        "/docente/subpoblaciones",
        `/docente/sesiones/${modulo.sesiones[0]}`,
        `/docente/sesiones/${modulo.sesiones[8]}`,
      ],
    ],
    [adm, ["/admin/docentes", "/admin/importar", "/admin/casos", `/admin/casos/${modulo.casoId}`, "/admin/accesibilidad"]],
  ];

  const soloRuta = process.env.RUTA;
  for (const [pagina, lista] of rutas) {
    for (const ruta of lista) {
      if (soloRuta && !ruta.includes(soloRuta)) continue;
      for (const tamano of TAMANOS) await revisar(pagina, ruta, tamano);
    }
  }

  console.log("\nResumen por regla:\n");
  for (const [id, r] of [...resumen].sort((a, b) => b[1].rutas.size - a[1].rutas.size)) {
    console.log(`  ${id} [${r.impacto}] ${r.ayuda} · ${r.rutas.size} pantallas`);
    const nodos = [...r.nodos];
    for (const n of nodos.slice(0, process.env.DETALLE ? Infinity : 4)) console.log(`      ${n}`);
    if (!process.env.DETALLE && nodos.length > 4) console.log(`      … y ${nodos.length - 4} más`);
  }
});
