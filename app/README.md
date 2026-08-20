# Memoria El Salado

Plataforma web educativa para la enseñanza interactiva de la memoria histórica del conflicto armado
colombiano, con tecnologías **LMS** (gestión del aprendizaje) y **LCMS** (gestión de contenidos).

Trabajo de grado — Ingeniería de Software, Universidad Manuela Beltrán.
Fabian Santiago Tobón Valero · Daniel Alejandro León Ladino.

---

## 1. Qué necesitas instalar

| Requisito | Versión mínima | Cómo comprobarlo |
| --- | --- | --- |
| **Node.js** | 20 o superior (probado en 22) | `node --version` |
| **npm** | 10 o superior | `npm --version` |
| **Base de datos** | **MySQL 8** (el de XAMPP) **o** PostgreSQL 14+ | `mysql --version` / `psql --version` |

Descargas: [Node.js](https://nodejs.org) · [XAMPP](https://www.apachefriends.org) ·
[PostgreSQL](https://www.postgresql.org/download/)

El proyecto funciona igual con los dos motores; usa el que tengas instalado. Si trabajas con **XAMPP**,
basta con iniciar MySQL desde su panel de control.

> En Windows, para que los scripts encuentren las herramientas de XAMPP, añade `C:\xampp\mysql\bin`
> al PATH del sistema.

---

## 2. Crear la base de datos

**Si usas XAMPP con MySQL** (lo más rápido): abre el panel de XAMPP, pulsa **Start** junto a MySQL y
crea la base desde phpMyAdmin, o por terminal:

```bash
mysql -u root -e "CREATE DATABASE memoria_el_salado CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**Si usas PostgreSQL** (te pedirá la contraseña de `postgres`):

```bash
psql -U postgres -c "CREATE USER memoria WITH PASSWORD 'memoria';"
psql -U postgres -c "CREATE DATABASE memoria_el_salado OWNER memoria;"
```

> Si usas `instalar.bat` o `./instalar.sh`, este paso lo hace el script por ti.

---

## 3. Configurar las variables de entorno

Copia la plantilla y edita el archivo resultante:

```bash
cp .env.example .env
```

El archivo `.env` debe quedar así, con la línea `DATABASE_URL` según el motor que uses:

```env
# MySQL / XAMPP (root sin contraseña, que es lo habitual en XAMPP)
DATABASE_URL="mysql://root@localhost:3306/memoria_el_salado"

# o bien PostgreSQL
# DATABASE_URL="postgresql://memoria:memoria@localhost:5432/memoria_el_salado?schema=public"

AUTH_SECRET="pega-aqui-el-secreto-generado"
AUTH_TRUST_HOST=true
```

Además, indícale al proyecto qué motor usar:

```bash
npm run db:motor mysql        # o: npm run db:motor postgresql
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
npm run db:sincronizar # crea las tablas (sirve para MySQL y PostgreSQL)
npm run db:seed      # crea los usuarios, las 20 familias del simulador y deja
                     # los dos PDF del CNMH ya cargados en el sistema
```

> **Atajo:** haz doble clic en `instalar.bat` (Windows) o en `Instalar.command` (macOS). Hace los
> pasos 2 a 5 completos y abre la aplicación. Ver la sección 12.

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
| `npm run build` | Compilación de producción |
| `npm start` | Ejecuta la compilación de producción |
| `npm test` | Pruebas automatizadas de verificación |
| `npm run lint` | Análisis estático del código |
| `npm run db:motor` | Cambia entre MySQL y PostgreSQL |
| `npm run db:sincronizar` | Crea o actualiza las tablas desde el esquema |
| `npm run db:migrate` | Aplica las migraciones versionadas (solo PostgreSQL) |
| `npm run db:seed` | Recarga los datos iniciales |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run estado` | Resume los módulos y documentos cargados |
| `npm run modulos:limpiar` | Borra módulos y documentos para repetir una importación |
| `npm run pdf:revisar <pdf>` | Muestra la estructura y el texto que el importador ve en un PDF |
| `npm run pdf:clasificar <pdf...>` | Distingue una guía del estudiante de una guía para maestros |
| `npm run humo:sesiones` | Comprueba que las actividades muestran el contenido importado |
| `npm run humo:documentos` | Comprueba que el estudiante no abre el material reservado al docente |

Los dos últimos necesitan la aplicación en marcha (`npm run dev`).

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
- **Prisma sobre MySQL o PostgreSQL**: el mismo modelo relacional funciona en los dos motores, lo que
  facilita desplegar la plataforma en la infraestructura que tenga cada institución.
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

## 12. Motores de base de datos

El proyecto funciona sobre **MySQL 8** o sobre **PostgreSQL**, con el mismo modelo de datos y el mismo
código. El adaptador se elige solo leyendo el esquema de `DATABASE_URL`, y `npm run db:motor` ajusta el
esquema de Prisma al motor elegido.

Para que un único modelo sirva en los dos motores se evitaron los tipos exclusivos de uno:

- Las sensaciones de una marca de cartografía se guardan en una columna **JSON**, porque MySQL no admite
  listas de texto como PostgreSQL.
- Los campos de texto extenso (relatos, testimonios, títulos de sesión) se declaran como **TEXT**: en
  MySQL un texto normal se limita a 191 caracteres y truncaría el contenido.

**Diferencia entre ambos:** el historial de migraciones versionadas de `prisma/migrations` está escrito
en SQL de PostgreSQL. Con MySQL las tablas se crean directamente desde el esquema
(`npm run db:sincronizar`), sin historial. Es equivalente en resultado, pero conviene saberlo.

Ambos han sido probados de extremo a extremo: login por rol, importación de un módulo desde PDF y
cartografía social con persistencia.

---

## 13. Scripts de arranque

| Script | Sistema | Cuándo usarlo |
| --- | --- | --- |
| `instalar.bat` | Windows | **Doble clic.** Detecta si tienes MySQL o PostgreSQL corriendo, crea la base de datos y el `.env`, instala, carga los datos y abre la app |
| `Instalar.command` | macOS | **Doble clic.** Lo mismo (delega en `instalar.sh`) |
| `./instalar.sh` | macOS y Linux | Lo mismo, desde la terminal |
| `./instalar.sh --mysql` | macOS y Linux | Fuerza MySQL si tienes los dos motores |
| `./instalar.sh --produccion` | macOS y Linux | Igual, pero compilado (recomendado para la sustentación) |
| `./iniciar.sh` | macOS y Linux | Día a día, cuando ya está instalado |

En Windows, los `.sh` no se ejecutan con doble clic: usa `instalar.bat`.

Ambos se pueden volver a ejecutar sin riesgo: conservan el `.env` y los datos que ya existan.

---

## 14. Licencia y atribuciones

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

De los 551 paquetes del árbol de dependencias, ocho tienen **copyleft débil**: `mariadb`
(LGPL-2.1-or-later, el controlador de MySQL), `lightningcss` y `axe-core` (MPL-2.0), `elkjs`
(EPL-2.0) y el binario de `sharp` para Windows. Ninguna obliga a relicenciar el proyecto: MPL y EPL
son copyleft por archivo y solo aplican si se modifican sus fuentes, y LGPL permite el uso desde
software con otra licencia cuando el enlace es dinámico, que es como Node.js carga sus módulos.

**No hay ninguna dependencia GPL, AGPL ni SSPL.** El detalle completo está en `LICENSE`.

## 15. Manual de Usuario

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
