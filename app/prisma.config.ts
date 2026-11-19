import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` corre al instalar las dependencias (postinstall) y al
 * compilar, y no se conecta a ninguna base: solo lee el esquema. Pedir aquí la
 * variable DATABASE_URL hacía fallar `npm install` en cualquier entorno que no
 * la tuviera, como las vistas previas de Vercel. Si falta, se usa una dirección
 * de relleno: los comandos que sí necesitan la base (migrar, studio) la piden
 * de verdad y fallan al intentar conectarse, con el error de conexión.
 */
const SIN_CONFIGURAR = "postgresql://sin-configurar:sin-configurar@localhost:5432/sin-configurar";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || SIN_CONFIGURAR,
  },
});
