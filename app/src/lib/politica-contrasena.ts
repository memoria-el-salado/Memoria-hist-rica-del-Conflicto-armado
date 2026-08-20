/**
 * Política de contraseñas de la plataforma.
 *
 * Responde al requisito no funcional de seguridad del proyecto y a la
 * Resolución 500 de 2021 sobre lineamientos de seguridad digital: las
 * credenciales de acceso deben resistir intentos de adivinación.
 *
 * El módulo es puro para poder verificarlo con pruebas automatizadas.
 */

export const LONGITUD_MINIMA = 10;

/** Contraseñas de uso común y patrones de teclado, que se rechazan siempre. */
const PROHIBIDAS = [
  "contrasena",
  "contraseña",
  "password",
  "123456",
  "qwerty",
  "admin",
  "memoria",
  "elsalado",
  "colombia",
  "iloveyou",
  "abc123",
];

export type ResultadoContrasena = {
  valida: boolean;
  errores: string[];
  /** 0 a 4: sirve para el medidor de la interfaz. */
  fuerza: number;
};

/**
 * Comprueba una contraseña contra la política. Devuelve todos los
 * incumplimientos a la vez, para que quien la crea no tenga que corregir
 * de uno en uno.
 */
export function evaluarContrasena(
  contrasena: string,
  datosPersonales: string[] = []
): ResultadoContrasena {
  const errores: string[] = [];
  const valor = contrasena ?? "";

  if (valor.length < LONGITUD_MINIMA) {
    errores.push(`Debe tener al menos ${LONGITUD_MINIMA} caracteres.`);
  }
  if (!/[a-záéíóúñ]/.test(valor)) {
    errores.push("Debe incluir al menos una letra minúscula.");
  }
  if (!/[A-ZÁÉÍÓÚÑ]/.test(valor)) {
    errores.push("Debe incluir al menos una letra mayúscula.");
  }
  if (!/\d/.test(valor)) {
    errores.push("Debe incluir al menos un número.");
  }
  if (!/[^\w\s]/.test(valor)) {
    errores.push("Debe incluir al menos un símbolo, por ejemplo . - _ # $ %");
  }
  if (/\s/.test(valor)) {
    errores.push("No puede contener espacios.");
  }

  const normalizada = normalizar(valor);

  if (PROHIBIDAS.some((p) => normalizada.includes(p))) {
    errores.push("No puede contener palabras comunes ni el nombre de la plataforma.");
  }

  // El nombre o el usuario dentro de la contraseña la hacen predecible. Se
  // comparan también las palabras sueltas: "Rivera" basta para delatar a
  // "Profesor Rivera" o a "prof.rivera".
  const palabras = datosPersonales
    .flatMap((dato) => normalizar(dato).split(/[^a-z0-9]+/))
    .filter((palabra) => palabra.length >= 4);

  if (palabras.some((palabra) => normalizada.includes(palabra))) {
    errores.push("No puede contener el nombre ni el usuario de la persona.");
  }

  if (/(.)\1{2,}/.test(valor)) {
    errores.push("No puede repetir el mismo carácter tres veces seguidas.");
  }
  if (tieneSecuencia(normalizada)) {
    errores.push("No puede contener secuencias como 1234 o abcd.");
  }

  return { valida: errores.length === 0, errores, fuerza: calcularFuerza(valor) };
}

/** Quita acentos y mayúsculas para comparar sin que el disfraz cuente. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Detecta cuatro caracteres consecutivos ascendentes o descendentes. */
function tieneSecuencia(texto: string): boolean {
  for (let i = 0; i + 3 < texto.length; i++) {
    const codigos = [0, 1, 2, 3].map((d) => texto.charCodeAt(i + d));
    const sube = codigos.every((c, j) => j === 0 || c === codigos[j - 1] + 1);
    const baja = codigos.every((c, j) => j === 0 || c === codigos[j - 1] - 1);
    if (sube || baja) return true;
  }
  return false;
}

/** Medida orientativa de robustez, de 0 a 4, para el indicador visual. */
function calcularFuerza(valor: string): number {
  if (!valor) return 0;

  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((r) => r.test(valor)).length;

  let puntos = 0;
  if (valor.length >= LONGITUD_MINIMA) puntos += 1;
  if (valor.length >= 14) puntos += 1;
  if (variedad >= 3) puntos += 1;
  if (variedad === 4) puntos += 1;

  return Math.min(4, puntos);
}

export const ETIQUETAS_FUERZA = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];

/**
 * Palabras cortas, sin tildes y fáciles de dictar por teléfono o de copiar de
 * un papel. Ninguna se relaciona con la plataforma ni con el conflicto: la
 * contraseña provisional es un trámite, no un mensaje.
 */
const RAICES = [
  "monte", "cauce", "brisa", "nube", "trigo", "sauce", "duna", "playa",
  "faro", "roble", "nido", "vela", "junco", "musgo", "coral", "menta",
  "cedro", "loma", "vado", "helecho", "arena", "pino", "lirio", "trebol",
];

const SIMBOLOS = ["#", "$", "%", ".", "-", "_", "+", "="];

/** Enteros al azar con la API criptográfica, disponible en el navegador y en Node. */
function alAzar(tope: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % tope;
}

function elegir<T>(opciones: readonly T[]): T {
  return opciones[alAzar(opciones.length)];
}

/**
 * Contraseña provisional para una cuenta recién creada.
 *
 * Quien da de alta la cuenta la entrega a la persona, y la persona elige la
 * suya la primera vez que entra. Aun siendo temporal cumple la política
 * completa: se comprueba antes de devolverla y se vuelve a sortear si algún
 * azar la deja fuera de norma.
 */
export function generarContrasenaTemporal(): string {
  for (let intento = 0; intento < 20; intento++) {
    const raiz = elegir(RAICES);
    const candidata =
      raiz[0].toUpperCase() +
      raiz.slice(1) +
      elegir(SIMBOLOS) +
      elegir(RAICES) +
      String(10 + alAzar(90));

    if (evaluarContrasena(candidata).valida) return candidata;
  }

  // Salida de emergencia: la misma forma, pero sin depender del sorteo.
  return `Vado#junco${20 + alAzar(70)}`;
}
