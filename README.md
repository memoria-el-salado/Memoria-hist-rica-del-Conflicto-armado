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
| [`LICENSE`](LICENSE) | Licencia MIT del código y alcance sobre el contenido de terceros |

## Puesta en marcha

La plataforma está pensada para vivir en la nube: la aplicación en **Vercel**, y la base de datos y
los documentos en **Supabase**. Los planes gratuitos de ambos bastan.

Para trabajar en el proyecto desde tu equipo hacen falta **Node.js 20+** y una base
**PostgreSQL 14+**, que puede ser la del propio proyecto de Supabase. El resto de este documento
detalla la instalación, la arquitectura y las decisiones técnicas.

## Estado

Prototipo funcional. Cubre los diez casos de uso del proyecto, con 94 pruebas automatizadas sobre la
política de contraseñas, la separación de funciones por rol, las reglas del simulador y la extracción
de estructura y contenido desde los PDF y el cálculo del avance ponderado.

---

## 1. Qué necesitas instalar

| Requisito | Versión mínima | Cómo comprobarlo |
| --- | --- | --- |
| **Node.js** | 20 o superior (probado en 22) | `node --version` |
| **npm** | 10 o superior | `npm --version` |
| **PostgreSQL** | 14 o superior | `psql --version` |

Descargas: [Node.js](https://nodejs.org) · [PostgreSQL](https://www.postgresql.org/download/)

No hace falta instalar PostgreSQL si vas a trabajar contra la base del proyecto de Supabase: en ese
caso basta con su cadena de conexión, y `psql` solo sirve para inspeccionar la base a mano.

---

## 2. Crear la base de datos

**Contra Supabase** (lo habitual): no hay nada que crear. El proyecto ya trae su base `postgres`;
solo necesitas la cadena de conexión, en el botón **Connect** del panel.

**Contra un PostgreSQL local** (te pedirá la contraseña de `postgres`):

```bash
psql -U postgres -c "CREATE USER memoria WITH PASSWORD 'memoria';"
psql -U postgres -c "CREATE DATABASE memoria_el_salado OWNER memoria;"
```

---

## 3. Configurar las variables de entorno

Copia la plantilla y edita el archivo resultante:

```bash
cp .env.example .env
```

El archivo `.env` debe quedar así:

```env
# En Supabase, la cadena del puerto 5432 (conexión de sesión) es la que admite
# `npm run db:sincronizar`. La del 6543 con ?pgbouncer=true va en Vercel.
DATABASE_URL="postgresql://USUARIO:CONTRASENA@HOST:5432/postgres"

AUTH_SECRET="pega-aqui-el-secreto-generado"
AUTH_TRUST_HOST=true

# Depósito privado de Supabase para los PDF que sube el administrador. Sin
# estas tres variables los archivos se guardan en app/almacen/.
SUPABASE_URL="https://REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="la-llave-service_role"
SUPABASE_BUCKET="documentos"
```

Genera el `AUTH_SECRET` con:

```bash
npx auth secret
```

> **Importante:** `.env` está excluido del control de versiones. Nunca subas contraseñas al repositorio;
> esto responde a la Ley 1581 de 2012 sobre protección de datos personales citada en el documento.

---

## 4. Instalar y preparar el proyecto

```bash
npm install            # instala dependencias y genera el cliente de Prisma
npm run db:sincronizar # crea las tablas a partir del esquema
npm run db:seed      # crea los usuarios, las 20 familias del simulador y deja
                     # los dos PDF del CNMH ya cargados en el sistema
```

---

## 5. Ejecutar la aplicación

```bash
npm run dev
```

Abre **http://localhost:3000**. Para el modo de producción usa `npm run build` y luego `npm start`.

---

## 6. Usuarios y cadena de responsabilidad

La instalación crea **un único usuario**, el administrador. Nadie se registra por su cuenta: las
cuentas se dan de alta en cadena.

| Quién | Crea a | Dónde |
| --- | --- | --- |
| Administrador | Docentes | `Docentes` |
| Docente | Sus estudiantes | `Mis Estudiantes` |

```
Administrador  →  Docente  →  Estudiantes
```

Cada usuario queda vinculado a quien lo creó, de modo que un docente solo ve, administra y reporta
sobre los estudiantes que él mismo dio de alta.

**Credenciales iniciales del administrador** (las imprime `npm run db:seed` al terminar):

| Usuario | Contraseña provisional |
| --- | --- |
| `admin.sistema` | `Mh7#tQvk.Rz3` |

> Es provisional: al entrar, la plataforma pide cambiarla. Está en `prisma/seed.ts` si necesitas
> consultarla, y `npm run db:seed` la restablece (borrando los datos).

En la pantalla de login hay que elegir el rol correcto: el sistema rechaza el ingreso si el rol
seleccionado no corresponde al usuario.

### Contraseña provisional y primer ingreso

Nadie elige la contraseña de otra persona. El flujo es el mismo para los tres roles:

1. Quien crea la cuenta ve una **contraseña provisional ya propuesta** por la plataforma, que cumple
   la política completa. Puede pedir otra (`Generar otra`) o escribir la suya.
2. Al guardar aparece la caja **Credenciales para entregar**, con el usuario y la contraseña listos
   para copiar y entregar a la persona.
3. La cuenta queda marcada con `debeCambiarContrasena`. Mientras esa marca siga activa, el proxy
   manda a `/cambiar-contrasena` cualquier ruta que se intente abrir: no hay forma de saltársela.
4. La persona confirma la provisional, elige la suya —que vuelve a validarse contra la política— y
   entra a su área. La marca se apaga y el token de sesión se refresca en el acto.

Después, cualquiera puede cambiar su contraseña cuando quiera desde **Cambiar mi contraseña**, al pie
del menú lateral; ahí se pide la contraseña vigente antes de aceptar la nueva.

Si alguien pierde la provisional, no se puede recuperar (está cifrada): quien creó la cuenta pulsa
**Restablecer contraseña** en la lista y la plataforma emite otra provisional. El administrador puede
hacerlo con sus docentes y cada docente solo con los estudiantes de su grupo. Las cuentas que aún no
han elegido contraseña propia se distinguen en la lista con la insignia *Contraseña provisional*.

---

## 6.1 Política de contraseñas

Toda contraseña creada en la plataforma debe cumplir, y la comprobación se hace en el navegador
mientras se escribe y otra vez en el servidor:

- Mínimo **10 caracteres**.
- Al menos una **minúscula**, una **mayúscula**, un **número** y un **símbolo**.
- Sin espacios.
- Sin palabras comunes (`password`, `123456`, `admin`…) ni el nombre de la plataforma.
- Sin el **nombre ni el usuario** de la persona, ni siquiera una palabra suelta de ellos.
- Sin repetir un carácter tres veces seguidas (`aaa`).
- Sin secuencias (`1234`, `abcd`, `dcba`).

Las provisionales que propone la plataforma se sortean con la API criptográfica del navegador a
partir de palabras cortas y sin tildes, para poder dictarlas por teléfono, y se comprueban contra
esta misma política antes de ofrecerse.

Las contraseñas se guardan cifradas con **bcrypt**; nunca en texto plano. Esto responde al requisito
no funcional de seguridad y a la Resolución 500 de 2021 sobre seguridad digital.

La política vive en `src/lib/politica-contrasena.ts`, aislada del resto y cubierta por pruebas.

---

## 7. Comandos disponibles

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (genera Prisma y compila) |
| `npm start` | Ejecuta la compilación de producción |
| `npm test` | Pruebas automatizadas de verificación |
| `npm run lint` | Análisis estático del código |
| `npm run db:sincronizar` | Crea o actualiza las tablas desde el esquema |
| `npm run db:seed` | Recarga los datos iniciales |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run modulos` | Resume los módulos y documentos cargados |
| `npm run modulos -- limpiar` | Borra módulos y documentos para repetir una importación |
| `npm run pdf -- <pdf>` | Muestra la estructura y el texto que el importador ve en un PDF |
| `npm run pdf -- <a.pdf> <b.pdf> --publico` | Distingue una guía del estudiante de una guía para maestros |
| `npm run humo:sesiones` | Comprueba que las actividades muestran el contenido importado |
| `npm run humo:documentos` | Comprueba que el estudiante no abre el material reservado al docente |
| `npm run humo:almacen` | Comprueba el almacén de PDF: guarda, lee y borra un archivo de prueba |

`humo:sesiones` y `humo:documentos` necesitan la aplicación en marcha (`npm run dev`).
`humo:almacen` no la necesita.

---

## 8. Arquitectura

```
src/
├── app/
│   ├── login/              Autenticación con selección de rol (CU01)
│   ├── estudiante/         7 pantallas de la ruta pedagógica
│   ├── docente/            4 pantallas LMS / LCMS
│   ├── admin/              3 pantallas de sistema (incluye el importador de PDF)
│   └── api/                Endpoints de autenticación y de documentos fuente
├── components/             Armazón de la interfaz y los mapas
├── lib/
│   ├── simulador.ts        Reglas del reparto de tierras (lógica pura y probada)
│   ├── importador-pdf.ts   Detección de la estructura curricular en un PDF
│   ├── datos-geograficos.ts Contorno real de Colombia para el mapa sin conexión
│   ├── politica-contrasena.ts  Reglas de contraseñas seguras
│   ├── usuarios.ts         Validación común del alta de usuarios
│   ├── navegacion.ts       Mapa de rutas y permisos por rol
│   └── prisma.ts           Cliente de base de datos
├── auth.ts                 Configuración de autenticación con credenciales
├── auth.config.ts          Configuración compartida sin base de datos (Edge)
└── proxy.ts                Protección de rutas por rol
prisma/
├── schema.prisma           Modelo de datos
└── seed.ts                 Usuarios, familias y documentos fuente
documentos-cnmh/            PDF del CNMH que carga la semilla
```

**Decisiones técnicas**

- **Next.js (App Router)** con React Server Components: las páginas leen de la base de datos en el
  servidor y las *server actions* escriben, sin necesidad de una API REST separada.
- **Prisma sobre PostgreSQL**: el modelo relacional se aplica desde un único esquema, y el mismo
  código sirve para la base de Supabase en la nube y para un PostgreSQL local de desarrollo.
- **Codificación modular**: cada caso de estudio hereda ejes y sesiones de la arquitectura base, de modo
  que agregar un municipio nuevo no implica reescribir el sistema (CU09).
- **Contraseñas cifradas con bcrypt**, sesiones JWT y política de contraseñas seguras verificada en
  cliente y servidor.
- **Altas en cadena**: cada cuenta la crea el nivel superior y queda vinculada a su responsable.
- **Mapas reales con Leaflet y OpenStreetMap**, sin clave de API ni cuenta. Si los mosaicos no cargan
  por falta de conexión, la aplicación cambia sola a un mapa de respaldo que dibuja el contorno real de
  Colombia y una retícula de latitud y longitud, de modo que las coordenadas siguen siendo auténticas y
  la actividad se puede realizar igual.

---

## 9. Cobertura de casos de uso

| Caso | Descripción | Dónde está |
| --- | --- | --- |
| CU01 | Autenticación diferenciada por rol | `/login` |
| CU01 | Alta de docentes por la administración | `/admin/docentes` |
| CU01 | Alta de estudiantes por el docente | `/docente/estudiantes` |
| CU01 | Cambio de contraseña obligatorio en el primer ingreso | `/cambiar-contrasena` |
| CU02 | Cartografía social sobre mapa real | Sesión con actividad `cartografia` |
| CU03 | Simulador de repartición de tierras | Sesión con actividad `simulador` |
| CU04 | Jardín de la Memoria | Sesión con actividad `jardin` |
| CU05 | Diario privado con control de compartir | `/estudiante/diario` |
| CU06 | Gestión de contenido multimedia (LCMS) | `/docente/contenidos` |
| CU07 | Reportes por subpoblaciones | `/docente/subpoblaciones` |
| CU08 | Mediación de debates y foros | `/docente/foros` |
| CU09 | Escalabilidad de módulos geográficos | `/admin/casos` |
| CU09 | Creación de módulos desde documentos PDF | `/admin/importar` |
| CU10 | Validación de accesibilidad universal | `/admin/accesibilidad` |

**Las dos guías del CNMH.** Cada caso se publica en dos documentos: la guía del estudiante, que es
la que se importa para construir el módulo, y la guía para maestros, que trae las orientaciones y lo
que se espera que los estudiantes descubran. La segunda se marca como **solo docentes** desde
`/admin/importar`: la restricción se aplica en `/api/documentos/[id]`, de modo que un estudiante que
escriba la dirección recibe un 403, y las pantallas de actividad solo enlazan documentos abiertos.

**Las actividades del estudiante no son rutas fijas.** Todas viven en `/estudiante/sesion/{id}`: la
pantalla que se muestra la decide la actividad que el administrador asignó a esa sesión al importar
el módulo, y el contenido que se lee es el texto que el importador extrajo del PDF para esa sesión.
Es lo que permite que un módulo nuevo traiga sus propios contenidos en vez de reutilizar los de El
Salado. El trabajo del estudiante —anotaciones, marcas, memorias, simulaciones y respuestas— queda
asociado a la sesión en la que se produjo.

**Mapas**: la cartografía social y el mapa de casos de estudio usan coordenadas geográficas reales
(latitud y longitud), no posiciones aproximadas sobre una imagen. Al importar un módulo se pueden
indicar sus coordenadas para ubicarlo en el mapa de Colombia.

**Accesibilidad**: control de tamaño de texto (A / A+ / A++), transcripción sincronizada en los recursos
de audio (WCAG 1.2.2), etiquetas y roles ARIA en formularios y controles, foco de teclado visible, y
diseño responsivo que conmuta a navegación inferior por debajo de 960 px.

---

## 10. Estado inicial: el sistema arranca vacío

La aplicación **no trae contenido precargado**. Al instalarla quedan solo dos cosas:

- Los **usuarios** de acceso.
- Las **20 familias** del simulador de tierras, que son datos fijos del ejercicio.

No hay módulos, ni documentos, ni marcas, ni entradas. Todo se construye desde la aplicación: el
administrador sube una guía pedagógica en PDF, importa el módulo, y el docente publica las sesiones.

Las guías del Centro Nacional de Memoria Histórica sobre El Salado (colección *La caja de
herramientas*, 2018) son el material para el que está pensado el importador. La **guía para maestros y
maestras** trae los títulos de los ejes; el **informe** trae las sesiones y subsecciones, pero no los
títulos de eje, así que con ese hay que escribirlos en la revisión.

---

## 11. Construir la ruta pedagógica

Todo el ciclo se hace desde la aplicación, sin tocar código:

**1. El administrador importa el módulo** (`Importar módulo`)

- Pulsa **Analizar** sobre uno de los documentos ya cargados, o sube un PDF nuevo.
- El sistema detecta ejes, sesiones y subsecciones por su numeración (`1`, `1.2`, `1.2.1`), y
  **propone la actividad interactiva** de cada sesión según su título: el ejercicio de repartición se
  reconoce como simulador de tierras, "Tierra de abundancia" como la copla, etc.
- Revisa la estructura: corrige los títulos, cambia la actividad de cada sesión y elimina lo que no
  corresponda. La extracción de un PDF llega con títulos partidos por las columnas, así que este paso
  siempre hace falta.
- Da nombre al caso de estudio y confirma. El módulo se crea con las sesiones **sin publicar**.

**2. El docente publica las sesiones** (`Panel del Docente`)

Cada sesión tiene un interruptor. Solo las publicadas quedan disponibles para el estudiante.

**3. El estudiante recorre la ruta** (`Mapa del Viaje`)

Ve los ejes con sus sesiones y subsecciones, y abre las que estén publicadas.

El PDF queda guardado fuera de la carpeta pública y solo se sirve a usuarios autenticados, mediante
`/api/documentos/[id]`. La lógica de detección vive en `src/lib/importador-pdf.ts`, aislada de la base
de datos y cubierta por pruebas automatizadas.

**Limitación conocida:** el importador extrae la *estructura*, no el contenido de cada actividad. Los
objetivos de sesión y el material didáctico no están en el índice del PDF, así que no se importan.

---

## 12. Base de datos

El proyecto funciona sobre **PostgreSQL**, con Prisma por delante. En producción es la base gestionada
del proyecto de Supabase; en desarrollo puede ser esa misma o un PostgreSQL instalado en el equipo.
No hay que declarar el motor en ningún sitio: `prisma/schema.prisma` lo fija y no cambia.

**Cómo se crean las tablas.** Aplicando el esquema con `npm run db:sincronizar`. El proyecto no lleva
un historial de migraciones versionadas: el esquema es la única fuente de verdad, y una migración
escrita a mano que se desincronice del esquema produce una base incompleta sin avisar de nada.

Para desplegar en la nube hay dos cadenas de conexión distintas, y no son intercambiables. La del
puerto **5432** mantiene abierta la sesión, que es lo que `db:sincronizar` necesita para crear las
tablas. La del **6543** agrupa las conexiones y es la que debe ir en Vercel, donde cada visita levanta
una función independiente y las conexiones directas se agotarían en minutos.

## 13. Licencia y atribuciones

El código fuente se publica bajo **licencia MIT** (archivo `LICENSE` en la raíz del repositorio).

La licencia cubre el software, **no el contenido**. Quedan fuera de ella:

- Los documentos del **CNMH** que se importen a la plataforma, que conservan la licencia con la que
  su autor los publicó.
- Los testimonios y relatos aportados por la comunidad a través de la plataforma.
- La cartografía de **OpenStreetMap**, cuyos datos se publican bajo *Open Database License* (ODbL) y
  exigen la atribución «© colaboradores de OpenStreetMap», que la aplicación muestra en cada mapa.

Licencias de las dependencias directas, todas permisivas y compatibles con MIT:

| Dependencia | Licencia |
| --- | --- |
| Next.js, React, Tailwind CSS, `unpdf`, Zod, `pg` | MIT |
| Prisma y sus adaptadores, TypeScript | Apache-2.0 |
| NextAuth (Auth.js) | ISC |
| Leaflet, dotenv | BSD-2-Clause |
| bcryptjs | BSD-3-Clause |

En el árbol de dependencias quedan siete paquetes con **copyleft débil**: `lightningcss` y
`axe-core` (MPL-2.0), `elkjs` (EPL-2.0), `@vercel/og` (MPL-2.0) y los binarios de `sharp`
(LGPL-3.0-or-later). El número exacto varía con el sistema operativo, porque `sharp` y
`lightningcss` instalan un binario distinto en cada uno.

Ninguna obliga a relicenciar el proyecto: MPL y EPL son copyleft por archivo y solo aplican si se
modifican sus fuentes, y LGPL permite el uso desde software con otra licencia cuando el enlace es
dinámico, que es como Node.js carga sus módulos. Todas intervienen al compilar o al procesar
imágenes, no en la lógica de la plataforma.

**No hay ninguna dependencia GPL, AGPL ni SSPL.** El detalle completo está en `LICENSE`.

## 14. Manual de Usuario

`MANUAL-DE-USUARIO.docx` es una **guía visual**: una pantalla por página, con la captura grande y
unos pocos pasos numerados debajo. Va dirigido a quien **usa** la plataforma sin conocerla; este
README está dirigido a quien la **instala y mantiene**.

Se regenera desde la aplicación en marcha, para que nunca muestre pantallas que ya no existen:

```bash
npm run dev                                          # en otra terminal
npm run demo:cargar <guia.pdf> <guia-maestros.pdf>   # datos con los que se ve algo real
npm run manual:capturar                              # 20 capturas en manual/capturas
npm run manual:generar                               # arma el .docx
```

`demo:cargar` **borra los módulos y las cuentas de docentes y estudiantes**, y deja el administrador
con la misma contraseña que el resto. Es para preparar una demostración o el manual, no para una
instalación en uso. La generación del documento necesita Python con `python-docx`.

---

## 15. Herramientas de asistencia con IA

En el desarrollo de este proyecto se usó **Claude** (Anthropic) como herramienta de apoyo, en
tareas de ingeniería concretas y siempre bajo revisión de los autores:

| Uso | En qué consistió |
| --- | --- |
| **Auditoría de código** | Revisión del árbol de dependencias y sus licencias, detección de código muerto y de archivos duplicados, y localización de fallos como migraciones desincronizadas del esquema |
| **Pruebas** | Redacción de las pruebas automatizadas sobre la lógica pura —política de contraseñas, reglas del simulador, extracción desde PDF y cálculo del avance— y de los guiones de comprobación de extremo a extremo |
| **Limpieza de código** | Unificación de guiones que se solapaban, retirada de rutas y componentes obsoletos, y corrección de estilos que desbordaban la pantalla |
| **Control de versiones** | Preparación de los commits y publicación del repositorio en GitHub |

Las decisiones de diseño, la definición de los requisitos, la estructura pedagógica y la validación
del resultado corresponden a los autores. Los commits en los que hubo asistencia lo declaran en su
línea `Co-Authored-By`, de modo que el historial del repositorio deja constancia de dónde se usó.
