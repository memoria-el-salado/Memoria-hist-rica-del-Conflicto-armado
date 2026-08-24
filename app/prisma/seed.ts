/**
 * Datos iniciales de la plataforma.
 *
 * La aplicación arranca vacía: no hay módulos, ni documentos, ni contenido.
 * Solo se crea el usuario administrador, porque alguien tiene que poder entrar
 * la primera vez, y las familias del simulador de tierras, que son datos fijos
 * del ejercicio.
 *
 * El resto de usuarios se dan de alta desde la propia aplicación, siguiendo la
 * cadena de responsabilidad: el administrador crea a los docentes y cada
 * docente crea a sus estudiantes.
 */

import { PrismaClient, Prioridad, Rol } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import "dotenv/config";

// El proyecto admite PostgreSQL y MySQL; el adaptador se elige por la URL.
const url = process.env.DATABASE_URL ?? "";
const adapter = url.startsWith("mysql:")
  ? new PrismaMariaDb(url)
  : new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

/** Apellidos de las 20 familias del ejercicio "¿cómo repartir las tierras?". */
const APELLIDOS = [
  "Torres Luna", "Martínez", "Barrios", "De Ávila", "Cohen Salcedo", "Mercado",
  "Pérez Villa", "Narváez", "Salgado", "Redondo", "Arrieta", "Villalba",
  "Guerra", "Díaz", "Meza", "Olivares", "Paternina", "Contreras", "Beltrán", "Yepes",
];

/**
 * Credenciales iniciales del administrador. La contraseña es provisional: la
 * plataforma le pedirá elegir la suya en cuanto entre por primera vez.
 */
const ADMIN = {
  usuario: "admin.sistema",
  nombre: "Administración del Sistema",
  iniciales: "AD",
  contrasena: "Mh7#tQvk.Rz3",
};

async function main() {
  console.log("Vaciando la base de datos...");
  // El orden respeta las dependencias entre tablas.
  await prisma.$transaction([
    prisma.foro.deleteMany(),
    prisma.respuestaActividad.deleteMany(),
    prisma.entradaDiario.deleteMany(),
    prisma.florJardin.deleteMany(),
    prisma.asignacion.deleteMany(),
    prisma.simulacion.deleteMany(),
    prisma.familia.deleteMany(),
    prisma.marcaCartografia.deleteMany(),
    prisma.anotacion.deleteMany(),
    prisma.auditoriaAccesibilidad.deleteMany(),
    prisma.recurso.deleteMany(),
    prisma.subseccion.deleteMany(),
    prisma.sesion.deleteMany(),
    prisma.eje.deleteMany(),
    prisma.documentoFuente.deleteMany(),
    prisma.caso.deleteMany(),
    prisma.reporteDiferenciado.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("Creando el usuario administrador...");
  await prisma.user.create({
    data: {
      usuario: ADMIN.usuario,
      nombre: ADMIN.nombre,
      iniciales: ADMIN.iniciales,
      rol: Rol.ADMIN,
      email: `${ADMIN.usuario}@memoriaelsalado.edu.co`,
      passwordHash: await bcrypt.hash(ADMIN.contrasena, 10),
      debeCambiarContrasena: true,
    },
  });

  console.log("Creando las 20 familias del simulador de tierras...");
  await prisma.familia.createMany({
    data: APELLIDOS.map((n, i) => ({
      nombre: "Familia " + n,
      personas: 3 + ((i * 7) % 6),
      menores: (i * 3) % 4,
      cabezaMujer: i % 3 === 0,
      etnica: i % 5 === 0,
      retornada: i % 4 === 1,
      prioridad: i % 3 === 0 ? Prioridad.ALTA : i % 3 === 1 ? Prioridad.MEDIA : Prioridad.BAJA,
      orden: i,
    })),
  });

  console.log(`
Sistema listo y vacío.

  Único usuario creado (administrador)
    Usuario                 ${ADMIN.usuario}
    Contraseña provisional  ${ADMIN.contrasena}

  Al entrar, la plataforma te pedirá cambiarla por una tuya.
  Si la pierdes, vuelve a ejecutar "npm run db:seed" (borra los datos).

  Después:
    1. En "Docentes" creas al profesor.
    2. El profesor entra y crea a sus estudiantes.
    3. En "Importar módulo" subes una guía del CNMH en PDF
       y construyes la ruta pedagógica.
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
