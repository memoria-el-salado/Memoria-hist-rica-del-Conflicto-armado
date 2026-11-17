/**
 * Pruebas de rendimiento (objetivo específico 5 y RNF08).
 *
 * Se corren contra la compilación de producción servida en el propio equipo,
 * nunca contra la plataforma publicada:
 *
 *   npm run build
 *   npx next start -p 3100            (en otra terminal)
 *   BASE_PRUEBAS=http://localhost:3100 npm run rendimiento
 *
 * Mide tres cosas:
 *
 *   1. Carga de cada pantalla, en la primera visita (sin caché), en un
 *      computador y en un celular de gama media simulado (procesador 4 veces
 *      más lento y red «Slow 4G»): tiempo hasta el primer byte (TTFB), primer
 *      contenido (FCP), mayor contenido (LCP), estabilidad visual (CLS) y lo que
 *      se descarga. Tres mediciones por pantalla; se informa la mediana.
 *   2. Carga concurrente: varios usuarios a la vez pidiendo la misma pantalla
 *      durante 15 segundos, con 1, 5, 10 y 20 usuarios. Latencias p50, p95 y
 *      p99, peticiones por segundo y errores.
 *   3. Entrega de la cartilla en PDF por la ruta que comprueba permisos.
 *
 * Los umbrales son los de Core Web Vitals de Google: LCP ≤ 2,5 s y CLS ≤ 0,1
 * son «buenos»; un LCP por encima de 4 s es «deficiente». Los resultados quedan
 * en reportes/rendimiento.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { PredefinedNetworkConditions } from "puppeteer-core";
import { BASE, como, comprobar, crearCuenta, ejecutar, prisma } from "./entorno.mjs";

const REPETICIONES = Number(process.env.REPETICIONES ?? 3);
const SEGUNDOS_CARGA = Number(process.env.SEGUNDOS_CARGA ?? 15);
const NIVELES = [1, 5, 10, 20];

const PERFILES = [
  { id: "computador", nombre: "Computador", viewport: { width: 1366, height: 800 }, cpu: 1, red: null },
  {
    id: "celular",
    nombre: "Celular de gama media (CPU ×4, red Slow 4G)",
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
    cpu: 4,
    red: PredefinedNetworkConditions["Slow 4G"],
  },
];

const mediana = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const percentil = (v, p) => (v.length ? v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)] : null);
const redondear = (x, d = 0) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);

/** Recoge LCP y CLS desde el primer momento de la página. */
const OBSERVADOR = () => {
  window.__rend = { lcp: 0, cls: 0 };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__rend.lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__rend.cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
};

async function medirPagina(pagina, url, perfil) {
  await pagina.setViewport(perfil.viewport);
  await pagina.setCacheEnabled(false);
  await pagina.emulateCPUThrottling(perfil.cpu > 1 ? perfil.cpu : null);
  await pagina.emulateNetworkConditions(perfil.red);
  const respuesta = await pagina.goto(url, { waitUntil: "load", timeout: 120_000 });
  await pagina.waitForNetworkIdle({ idleTime: 500, timeout: 20_000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  const m = await pagina.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    const recursos = performance.getEntriesByType("resource");
    const bytes = recursos.reduce((s, r) => s + (r.transferSize || 0), nav.transferSize || 0);
    const js = recursos.filter((r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name)).reduce((s, r) => s + (r.transferSize || 0), 0);
    return {
      ttfb: nav.responseStart,
      fcp,
      lcp: window.__rend?.lcp || null,
      cls: window.__rend?.cls ?? 0,
      dcl: nav.domContentLoadedEventEnd,
      carga: nav.loadEventEnd,
      kb: bytes / 1024,
      kbJs: js / 1024,
      peticiones: recursos.length + 1,
    };
  });
  await pagina.emulateCPUThrottling(null);
  await pagina.emulateNetworkConditions(null);
  return { estado: respuesta?.status() ?? 0, ...m };
}

/** Varios usuarios pidiendo la misma dirección a la vez, durante unos segundos. */
async function carga(url, cookie, usuarios, segundos) {
  const fin = Date.now() + segundos * 1000;
  const tiempos = [];
  let errores = 0;
  const trabajador = async () => {
    while (Date.now() < fin) {
      const t0 = performance.now();
      try {
        const r = await fetch(url, { headers: cookie ? { cookie } : {}, redirect: "manual" });
        await r.arrayBuffer();
        if (r.status >= 300) errores++;
        else tiempos.push(performance.now() - t0);
      } catch {
        errores++;
      }
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: usuarios }, trabajador));
  const total = (performance.now() - t0) / 1000;
  tiempos.sort((a, b) => a - b);
  return {
    usuarios,
    peticiones: tiempos.length + errores,
    porSegundo: redondear((tiempos.length + errores) / total, 1),
    p50: redondear(percentil(tiempos, 50)),
    p95: redondear(percentil(tiempos, 95)),
    p99: redondear(percentil(tiempos, 99)),
    maximo: redondear(tiempos.at(-1) ?? null),
    errores,
  };
}

const cookieDe = async (pagina) => (await pagina.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");

await ejecutar("Pruebas de rendimiento", async ({ abrir }) => {
  // Las sesiones reales del módulo activo, con su actividad principal.
  const sesiones = await prisma.sesion.findMany({
    where: { publicada: true, eje: { caso: { activo: true } }, codigo: { in: ["1.1", "1.2", "1.3", "1.4"] } },
    select: { id: true, codigo: true, pantalla: true },
  });
  const sesion = (codigo) => sesiones.find((s) => s.codigo === codigo);
  if (sesiones.length < 4) throw new Error("Hacen falta publicadas las sesiones 1.1 a 1.4 del módulo activo.");
  const cartilla = await prisma.documentoFuente.findFirst({ where: { soloDocentes: false } });

  const docente = await crearCuenta("docente", "DOCENTE");
  await crearCuenta("est1", "ESTUDIANTE", { creadoPorId: docente.id });
  await crearCuenta("admin", "ADMIN");

  const navegador = await abrir();
  const anonimo = await (await navegador.createBrowserContext()).newPage();
  const est = await como(navegador, "prueba.est1", "ESTUDIANTE");
  const doc = await como(navegador, "prueba.docente", "DOCENTE");
  const adm = await como(navegador, "prueba.admin", "ADMIN");
  for (const p of [anonimo, est, doc, adm]) await p.evaluateOnNewDocument(OBSERVADOR);

  const pantallas = [
    ["Portada pública", anonimo, "/"],
    ["Inicio de sesión", anonimo, "/login"],
    ["Mapa del viaje", est, "/estudiante/mapa"],
    [`Sesión 1.1 (${sesion("1.1").pantalla})`, est, `/estudiante/sesion/${sesion("1.1").id}`],
    [`Sesión 1.2 (${sesion("1.2").pantalla})`, est, `/estudiante/sesion/${sesion("1.2").id}`],
    [`Sesión 1.3 (${sesion("1.3").pantalla})`, est, `/estudiante/sesion/${sesion("1.3").id}`],
    [`Sesión 1.4 (${sesion("1.4").pantalla})`, est, `/estudiante/sesion/${sesion("1.4").id}`],
    ["Diario", est, "/estudiante/diario"],
    ["Panel del docente", doc, "/docente/panel"],
    ["Revisión", doc, "/docente/revision"],
    ["Sesión vista por el docente", doc, `/docente/sesiones/${sesion("1.2").id}`],
    ["Módulos (administrador)", adm, "/admin/casos"],
    ["Auditoría de accesibilidad", adm, "/admin/accesibilidad"],
  ];

  // Calentamiento: la primera petición a cada ruta en un servidor recién
  // arrancado incluye trabajo que un usuario real no paga.
  for (const [, pagina, ruta] of pantallas) await pagina.goto(`${BASE}${ruta}`, { waitUntil: "load" }).catch(() => {});

  // --- 1. Carga de pantallas ----------------------------------------------------------
  console.log("\n1. Carga de cada pantalla (mediana de", REPETICIONES, "visitas sin caché)\n");
  const paginas = [];
  for (const perfil of PERFILES) {
    for (const [nombre, pagina, ruta] of pantallas) {
      const medidas = [];
      for (let i = 0; i < REPETICIONES; i++) medidas.push(await medirPagina(pagina, `${BASE}${ruta}`, perfil));
      const fila = {
        perfil: perfil.id,
        pantalla: nombre,
        ruta: ruta.replace(/[a-z0-9]{20,}$/, "[id]"),
        estado: medidas[0].estado,
        ttfb: redondear(mediana(medidas.map((m) => m.ttfb))),
        fcp: redondear(mediana(medidas.map((m) => m.fcp))),
        lcp: redondear(mediana(medidas.map((m) => m.lcp))),
        cls: redondear(mediana(medidas.map((m) => m.cls)), 3),
        carga: redondear(mediana(medidas.map((m) => m.carga))),
        kb: redondear(mediana(medidas.map((m) => m.kb))),
        kbJs: redondear(mediana(medidas.map((m) => m.kbJs))),
        peticiones: mediana(medidas.map((m) => m.peticiones)),
      };
      paginas.push(fila);
      console.log(
        `  [${perfil.id}] ${nombre.padEnd(34)} TTFB ${String(fila.ttfb).padStart(5)} ms · FCP ${String(fila.fcp).padStart(5)} · LCP ${String(fila.lcp).padStart(5)} · CLS ${fila.cls} · ${fila.kb} KB`
      );
    }
  }

  for (const f of paginas) {
    const lcpMax = f.perfil === "computador" ? 2500 : 4000;
    comprobar(`[${f.perfil}] ${f.pantalla}: responde`, f.estado === 200, String(f.estado));
    comprobar(`[${f.perfil}] ${f.pantalla}: LCP ≤ ${lcpMax} ms`, f.lcp !== null && f.lcp <= lcpMax, `${f.lcp} ms`);
    comprobar(`[${f.perfil}] ${f.pantalla}: CLS ≤ 0,1`, f.cls <= 0.1, String(f.cls));
  }

  // --- 2. Carga concurrente -----------------------------------------------------------
  console.log(`\n2. Carga concurrente (${SEGUNDOS_CARGA} s por nivel)\n`);
  const cookieEst = await cookieDe(est);
  const cookieDoc = await cookieDe(doc);
  const escenarios = [
    ["Inicio de sesión", "/login", null],
    ["Mapa del viaje", "/estudiante/mapa", cookieEst],
    ["Sesión 1.3 con sus actividades", `/estudiante/sesion/${sesion("1.3").id}`, cookieEst],
    ["Panel del docente", "/docente/panel", cookieDoc],
  ];
  const concurrencia = [];
  for (const [nombre, ruta, cookie] of escenarios) {
    for (const usuarios of NIVELES) {
      const r = await carga(`${BASE}${ruta}`, cookie, usuarios, SEGUNDOS_CARGA);
      concurrencia.push({ escenario: nombre, ...r });
      console.log(
        `  ${nombre.padEnd(32)} ${String(usuarios).padStart(2)} usuarios · ${String(r.porSegundo).padStart(5)} pet/s · p50 ${r.p50} ms · p95 ${r.p95} ms · p99 ${r.p99} ms · errores ${r.errores}`
      );
    }
  }
  for (const c of concurrencia) {
    comprobar(`${c.escenario}, ${c.usuarios} usuarios: sin errores`, c.errores === 0, `${c.errores} de ${c.peticiones}`);
    if (c.usuarios <= 10) comprobar(`${c.escenario}, ${c.usuarios} usuarios: p95 ≤ 2000 ms`, c.p95 !== null && c.p95 <= 2000, `${c.p95} ms`);
  }

  // --- 3. La cartilla en PDF ----------------------------------------------------------
  let pdf = null;
  if (cartilla) {
    const medidas = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const r = await fetch(`${BASE}/api/documentos/${cartilla.id}`, { headers: { cookie: cookieEst } });
      const primerByte = performance.now() - t0;
      const cuerpo = await r.arrayBuffer();
      medidas.push({ estado: r.status, primerByte, total: performance.now() - t0, kb: cuerpo.byteLength / 1024 });
    }
    pdf = {
      documento: cartilla.nombreArchivo,
      kb: redondear(medidas[0].kb),
      primerByte: redondear(mediana(medidas.map((m) => m.primerByte))),
      total: redondear(mediana(medidas.map((m) => m.total))),
    };
    console.log(`\n3. Cartilla en PDF (${pdf.documento}, ${pdf.kb} KB): primer byte ${pdf.primerByte} ms · completa ${pdf.total} ms\n`);
    comprobar("la cartilla se entrega completa y en menos de 5 s", medidas.every((m) => m.estado === 200) && pdf.total <= 5000, `${pdf.total} ms`);
  }

  mkdirSync("reportes", { recursive: true });
  const resultado = {
    fecha: new Date().toISOString(),
    base: BASE,
    nodo: process.version,
    repeticiones: REPETICIONES,
    segundosCarga: SEGUNDOS_CARGA,
    perfiles: PERFILES.map((p) => ({ id: p.id, nombre: p.nombre })),
    paginas,
    concurrencia,
    pdf,
  };
  writeFileSync("reportes/rendimiento.json", JSON.stringify(resultado, null, 2));
  console.log("Resultados en reportes/rendimiento.json");
});
