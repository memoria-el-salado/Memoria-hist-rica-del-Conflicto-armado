/**
 * Borra las cuentas `prueba.*`, los módulos de prueba y lo que se creó en ellos. Cada prueba ya limpia al
 * terminar; esto es para cuando una se corta a medias (se cerró la terminal,
 * se cayó la conexión) y dejó datos de prueba en la base.
 *
 *   npm run humo:limpiar
 */
import { borrarCuentasDePrueba, borrarModulosDePrueba, prisma } from "./entorno.mjs";

const modulos = await borrarModulosDePrueba();
const quedan = await borrarCuentasDePrueba();
console.log(quedan + modulos === 0 ? "No quedan datos de prueba." : `Quedan ${quedan} cuentas y ${modulos} módulos de prueba.`);
await prisma.$disconnect();
process.exitCode = quedan + modulos === 0 ? 0 : 1;
