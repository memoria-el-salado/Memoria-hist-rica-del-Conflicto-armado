import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Un solo cliente para todo el proceso. En desarrollo se guarda en el objeto
 * global porque `next dev` recarga los módulos en caliente con cada cambio, y
 * sin esto cada recarga abriría un juego de conexiones nuevo contra Supabase.
 */
function crearCliente() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
  });
}

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
