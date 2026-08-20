# Memoria El Salado

Plataforma web educativa para la enseñanza de la memoria histórica del conflicto armado colombiano,
con tecnologías **LMS** (gestión del aprendizaje) y **LCMS** (gestión de contenidos).

Trabajo de grado — Ingeniería de Software, Universidad Manuela Beltrán.
Fabian Santiago Tobón Valero · Daniel Alejandro León Ladino.

---

## Qué hace

El contenido no está escrito dentro del programa: se **importa desde documentos oficiales en PDF**,
como las guías del Centro Nacional de Memoria Histórica. El administrador sube la guía, la plataforma
reconoce su estructura —ejes, sesiones y subsecciones—, propone una actividad interactiva para cada
sesión y extrae el texto que la acompaña. Tras la revisión humana, esa estructura se convierte en la
ruta pedagógica que recorre el estudiante.

Cada sesión abre **su propia actividad con su propio contenido**: cartografía social sobre un mapa
real, simulador de repartición de tierras, jardín de la memoria, diario personal, lectura anotada o
respuesta escrita. Es lo que permite que la plataforma sirva para otro caso de la memoria histórica
colombiana sin reescribir código.

## Cadena de responsabilidad

Nadie se registra por su cuenta:

```
Administrador  ──crea──▶  Docente  ──crea──▶  Estudiantes
```

Las cuentas nacen con una contraseña provisional que la persona debe cambiar en su primer ingreso.

## Documentación

| Documento | Para quién |
| --- | --- |
| [`app/MANUAL-DE-USUARIO.docx`](app/MANUAL-DE-USUARIO.docx) | Quien **usa** la plataforma: administradores, docentes y estudiantes |
| [`app/README.md`](app/README.md) | Quien la **instala y mantiene**: requisitos, base de datos, arquitectura y decisiones técnicas |
| [`LICENSE`](LICENSE) | Licencia MIT del código y alcance sobre el contenido de terceros |

## Puesta en marcha

Requiere **Node.js 20+** y **MySQL 8** o **PostgreSQL 14+**.

| Sistema | Cómo |
| --- | --- |
| Windows | Doble clic en `app\instalar.bat` |
| macOS | Doble clic en `app/Instalar.command` |
| Linux | `./app/instalar.sh` |

El instalador comprueba los requisitos, crea la base de datos, instala las dependencias, siembra la
cuenta del administrador y abre la aplicación en `http://localhost:3000`. El detalle completo, y la
instalación manual, están en [`app/README.md`](app/README.md).

## Estado

Prototipo funcional. Cubre los diez casos de uso del proyecto, con 70 pruebas automatizadas sobre la
política de contraseñas, la separación de funciones por rol, las reglas del simulador y la extracción
de estructura y contenido desde los PDF.
