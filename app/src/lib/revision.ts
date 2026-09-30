/**
 * Lo que el docente ve de cada trabajo al revisarlo: el texto del estudiante y,
 * según la actividad, lo que eligió, ubicó o citó. Así puede comentar sin
 * abrir la sesión de cada estudiante.
 */

import { leerDatosGuiada } from "./actividades";
import { leerDatosCopla, LUGARES, PRODUCTOS } from "./copla";

export type ClaseTrabajo = "RESPUESTA" | "SIMULACION" | "DIARIO";

export const LIMITES_COMENTARIO = { minimo: 2, maximo: 2000 };

const ETIQUETA_PANTALLA: Record<string, string> = {
  copla: "Respuesta a la copla",
  despensa: "Mapa de la despensa",
  meubico: "Me ubico",
  dilema: "Dilema",
  investigar: "Investigación",
  testimonios: "Testimonios",
  compromiso: "Compromiso",
};

const nombre = <T extends { id: string; nombre: string }>(lista: readonly T[], id: string) =>
  lista.find((x) => x.id === id)?.nombre ?? id;

/** Una etiqueta para el tipo de trabajo y las líneas de detalle que lo acompañan. */
export function detalleDeTrabajo(trabajo: {
  clase: ClaseTrabajo;
  pantalla?: string;
  datos?: unknown;
  equidad?: number;
  emocion?: string;
}): { etiqueta: string; detalle: string[] } {
  if (trabajo.clase === "SIMULACION") {
    return { etiqueta: "Simulación de tierras", detalle: [`Índice de equidad: ${trabajo.equidad ?? 0} de 100`] };
  }
  if (trabajo.clase === "DIARIO") {
    return { etiqueta: "Diario compartido", detalle: trabajo.emocion ? [`Emoción: ${trabajo.emocion}`] : [] };
  }

  const pantalla = trabajo.pantalla ?? "";
  const etiqueta = ETIQUETA_PANTALLA[pantalla] ?? "Respuesta escrita";
  const detalle: string[] = [];

  if (pantalla === "despensa") {
    const { ubicaciones, versos } = leerDatosCopla(trabajo.datos);
    const pares = Object.entries(ubicaciones).map(([p, l]) => `${nombre(PRODUCTOS, p)} → ${nombre(LUGARES, l)}`);
    if (pares.length) detalle.push(`Ubicó: ${pares.join(" · ")}`);
    if (versos) detalle.push(`Versos: ${versos}`);
  } else {
    const d = leerDatosGuiada(trabajo.datos);
    if (pantalla === "dilema" && d.opcion) detalle.push(`Eligió: ${d.opcion}`);
    if (pantalla === "investigar" && d.fuentes?.length) detalle.push(`Fuentes: ${d.fuentes.join(" · ")}`);
    if (pantalla === "compromiso") detalle.push(d.compartido ? "Lo compartió con su curso" : "No lo compartió con su curso");
  }
  return { etiqueta, detalle };
}

/**
 * Un trabajo espera comentario si no tiene ninguno posterior a su última
 * versión: si el estudiante reescribe su respuesta, vuelve a quedar pendiente.
 */
export function estaPendiente(ultimaVersion: Date, comentarios: { creadoEn: Date }[]): boolean {
  return !comentarios.some((c) => c.creadoEn.getTime() >= ultimaVersion.getTime());
}
