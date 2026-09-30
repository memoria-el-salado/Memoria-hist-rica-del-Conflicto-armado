/**
 * Fechas en hora de Colombia. El servidor de Vercel corre en UTC: sin la zona
 * horaria, lo escrito a las 8 de la noche aparecería al día siguiente.
 */
const FECHA_Y_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });

export const fechaYHora = (d: Date) => FECHA_Y_HORA.format(d);
export const fecha = (d: Date) => FECHA.format(d);
