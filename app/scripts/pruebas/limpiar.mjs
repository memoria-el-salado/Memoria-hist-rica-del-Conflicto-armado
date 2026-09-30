/**
 * Borra las cuentas `prueba.*` y lo que crearon. Cada prueba ya limpia al
 * terminar; esto es para cuando una se corta a medias (se cerró la terminal,
 * se cayó la conexión) y dejó datos de prueba en la base.
 *
 *   npm run humo:limpiar
 */
import { borrarCuentasDePrueba, prisma } from "./entorno.mjs";

const quedan = await borrarCuentasDePrueba();
console.log(quedan === 0 ? "No quedan cuentas de prueba." : `Quedan ${quedan} cuentas de prueba.`);
await prisma.$disconnect();
process.exitCode = quedan === 0 ? 0 : 1;
