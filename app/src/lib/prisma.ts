import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * El proyecto funciona sobre PostgreSQL o sobre MySQL (por ejemplo el que trae
 * XAMPP). El adaptador se elige leyendo el esquema de la cadena de conexión,
 * de modo que basta con cambiar DATABASE_URL y ejecutar `npm run db:motor`.
 */
function crearCliente() {
  const url = process.env.DATABASE_URL ?? "";

  const adapter = url.startsWith("mysql:")
    ? new PrismaMariaDb(url)
    : new PrismaPg({ connectionString: url });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
