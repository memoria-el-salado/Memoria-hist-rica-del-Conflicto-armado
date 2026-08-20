#!/usr/bin/env node
/**
 * Cambia el motor de base de datos del proyecto entre PostgreSQL y MySQL.
 *
 *   npm run db:motor mysql        (XAMPP, MySQL 8)
 *   npm run db:motor postgresql
 *   npm run db:motor              muestra el motor actual
 *
 * Prisma no admite elegir el motor con una variable de entorno, así que se
 * reescribe la línea `provider` del esquema. El modelo de datos es el mismo
 * para los dos motores: no hay listas de texto ni tipos exclusivos de uno.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const rutaEsquema = join(raiz, "prisma", "schema.prisma");

const MOTORES = {
  mysql: {
    nombre: "MySQL",
    ejemplo: 'DATABASE_URL="mysql://root@localhost:3306/memoria_el_salado"',
    nota: "En XAMPP el usuario suele ser root sin contraseña.",
  },
  postgresql: {
    nombre: "PostgreSQL",
    ejemplo:
      'DATABASE_URL="postgresql://memoria:memoria@localhost:5432/memoria_el_salado?schema=public"',
    nota: "",
  },
};

const esquema = readFileSync(rutaEsquema, "utf8");
const actual = esquema.match(/datasource db \{[^}]*provider\s*=\s*"([^"]+)"/s)?.[1];

const pedido = process.argv[2];

if (!pedido) {
  console.log(`Motor actual: ${MOTORES[actual]?.nombre ?? actual}`);
  console.log("Para cambiarlo:  npm run db:motor mysql   |   npm run db:motor postgresql");
  process.exit(0);
}

if (!MOTORES[pedido]) {
  console.error(`Motor no reconocido: "${pedido}". Usa "mysql" o "postgresql".`);
  process.exit(1);
}

if (actual === pedido) {
  console.log(`El proyecto ya está configurado para ${MOTORES[pedido].nombre}.`);
  process.exit(0);
}

writeFileSync(
  rutaEsquema,
  esquema.replace(/(datasource db \{[^}]*provider\s*=\s*)"[^"]+"/s, `$1"${pedido}"`),
  "utf8"
);

const { nombre, ejemplo, nota } = MOTORES[pedido];
console.log(`
Motor cambiado a ${nombre}.

  1. Ajusta DATABASE_URL en el archivo .env:
     ${ejemplo}${nota ? `\n     ${nota}` : ""}

  2. Crea las tablas y carga los datos:
     npm run db:sincronizar
     npm run db:seed
`);
