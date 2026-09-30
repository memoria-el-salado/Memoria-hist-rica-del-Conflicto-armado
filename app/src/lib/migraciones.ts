/**
 * Qué cambios de esquema puede tolerar la versión publicada.
 *
 * La v2 se desarrolla sobre la base de producción mientras Vercel sigue
 * sirviendo el código de la v1. Una migración se aplica a la base antes de que
 * el código nuevo se publique, así que durante un tiempo la v1 convive con el
 * esquema nuevo. Solo son seguros los cambios que añaden: una tabla nueva, una
 * columna opcional o con valor por defecto. Lo que borra, renombra o endurece
 * rompe la v1 o pierde datos, y va en una migración aparte al publicar la v2.
 */

export type Riesgo = {
  /** Línea del archivo SQL donde empieza la sentencia. */
  linea: number;
  motivo: string;
  sentencia: string;
};

type Regla = { patron: RegExp; motivo: string; salvo?: RegExp };

const REGLAS: Regla[] = [
  {
    // `ALTER COLUMN … DROP NOT NULL` solo relaja: vuelve opcional una columna.
    patron: /\bDROP\s+(TABLE|COLUMN|TYPE|INDEX|CONSTRAINT|DEFAULT|SCHEMA|VIEW)\b/i,
    motivo: "Borra algo que la versión publicada puede estar usando.",
  },
  { patron: /\bRENAME\b/i, motivo: "Renombra: la versión publicada sigue buscando el nombre anterior." },
  {
    patron: /\bALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE\b/i,
    motivo: "Cambia el tipo de una columna: puede perder datos o romper las lecturas.",
  },
  {
    patron: /\bALTER\s+COLUMN\s+"?\w+"?\s+SET\s+NOT\s+NULL\b/i,
    motivo: "Vuelve obligatoria una columna: la versión publicada no la rellena al insertar.",
  },
  {
    patron: /\bADD\s+COLUMN\s+[^,;]*\bNOT\s+NULL\b/i,
    salvo: /\bDEFAULT\b/i,
    motivo: "Añade una columna obligatoria sin valor por defecto: la versión publicada no la rellena.",
  },
  { patron: /^\s*DELETE\s+FROM\b/i, motivo: "Borra filas." },
  { patron: /^\s*TRUNCATE\b/i, motivo: "Vacía una tabla." },
];

/** Quita los comentarios `--` sin cambiar el número de líneas. */
function sinComentarios(sql: string): string {
  return sql
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
}

/**
 * Revisa una migración y devuelve lo que la versión publicada no toleraría.
 * Un resultado vacío significa que se puede aplicar sin romper nada.
 */
export function riesgosDeMigracion(sql: string): Riesgo[] {
  const limpio = sinComentarios(sql);
  const riesgos: Riesgo[] = [];

  let desde = 0;
  for (const trozo of limpio.split(";")) {
    const sentencia = trozo.trim();
    const inicio = desde + trozo.search(/\S|$/);
    desde += trozo.length + 1;
    if (!sentencia) continue;

    // En `ALTER TABLE t ADD COLUMN a …, ADD COLUMN b …` cada columna se juzga sola.
    const partes = sentencia.split(/,(?=\s*(ADD|ALTER|DROP)\b)/i).filter((p) => p && !/^(ADD|ALTER|DROP)$/i.test(p));

    for (const regla of REGLAS) {
      const incumple = partes.some((p) => regla.patron.test(p) && !(regla.salvo && regla.salvo.test(p)));
      if (incumple) {
        riesgos.push({
          linea: limpio.slice(0, inicio).split("\n").length,
          motivo: regla.motivo,
          sentencia: sentencia.replace(/\s+/g, " ").slice(0, 160),
        });
        break;
      }
    }
  }
  return riesgos;
}
