import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Un solo cliente para todo el proceso. En desarrollo se guarda en el objeto
 * global porque `next dev` recarga los módulos en caliente con cada cambio, y
 * sin esto cada recarga abriría un juego de conexiones nuevo contra Supabase.
 *
 * Con CONTAR_CONSULTAS=1 imprime cada consulta y lo que tardó: es la forma de
 * ver cuántas hace una pantalla (las pruebas de rendimiento lo usaron para
 * quitar las que se repetían).
 */
function crearCliente() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
    // En desarrollo se usa el pooler de sesión de Supabase, que admite 15
    // clientes: con 6 aquí quedan libres para las pruebas y los guiones, que
    // abren los suyos. En producción (pooler de transacciones) se deja el
    // valor por defecto.
    ...(process.env.NODE_ENV === "production" ? {} : { max: 6 }),
  });
  if (!process.env.CONTAR_CONSULTAS) return new PrismaClient({ adapter });

  const cliente = new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] });
  cliente.$on("query", (e) => console.log(`[consulta] ${Math.round(Number(e.duration))} ms ${e.query.slice(0, 90)}`));
  return cliente;
}

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
