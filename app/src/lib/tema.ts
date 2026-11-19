/**
 * El tema claro u oscuro de la interfaz.
 *
 * La elección se guarda en el navegador. Si la persona no ha elegido, se sigue
 * la preferencia de su sistema. El script del layout raíz la aplica antes de
 * pintar (`<html data-tema>`), para que la página no parpadee en claro.
 */
export const TEMAS = ["claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const CLAVE_TEMA = "memoria.tema";

/** Lo guardado, si es un tema válido; si no, null (manda el sistema). */
export function leerTema(valor: unknown): Tema | null {
  return (TEMAS as readonly unknown[]).includes(valor) ? (valor as Tema) : null;
}

/** El tema que se aplica: el elegido o, sin elección, el del sistema. */
export function temaEfectivo(guardado: unknown, sistemaOscuro: boolean): Tema {
  return leerTema(guardado) ?? (sistemaOscuro ? "oscuro" : "claro");
}

export const otroTema = (tema: Tema): Tema => (tema === "oscuro" ? "claro" : "oscuro");

/**
 * El script que corre en el <head> antes de pintar. Va como texto porque se
 * ejecuta antes de que cargue React; repite la regla de `temaEfectivo`.
 */
export const SCRIPT_TEMA = `(function(){try{var g=localStorage.getItem("${CLAVE_TEMA}");var t=g==="oscuro"||g==="claro"?g:(matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro");document.documentElement.dataset.tema=t;}catch(e){}})();`;
