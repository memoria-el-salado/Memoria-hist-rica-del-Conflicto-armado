#!/usr/bin/env bash
#
# Memoria El Salado — instalación completa y arranque automático.
#
#   ./instalar.sh                 instala todo y abre la app en el navegador
#   ./instalar.sh --produccion    igual, pero compilado (para la sustentación)
#   ./instalar.sh --mysql         fuerza MySQL (XAMPP)
#   ./instalar.sh --postgres      fuerza PostgreSQL
#
# Si no se indica motor, detecta cuál está corriendo. Se puede volver a
# ejecutar sin problema: conserva la configuración y los datos existentes.

set -euo pipefail

DB_USUARIO="memoria"
DB_CLAVE="memoria"
DB_NOMBRE="memoria_el_salado"
DB_HOST="localhost"
DB_PUERTO="5432"
PUERTO_APP="3000"
MODO="desarrollo"
MOTOR=""

for arg in "$@"; do
  case "$arg" in
    --produccion) MODO="produccion" ;;
    --mysql)      MOTOR="mysql" ;;
    --postgres|--postgresql) MOTOR="postgresql" ;;
  esac
done

cd "$(dirname "${BASH_SOURCE[0]}")"

rojo()  { printf '\033[0;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[0;32m%s\033[0m\n' "$*"; }
azul()  { printf '\033[0;36m%s\033[0m\n' "$*"; }
gris()  { printf '\033[0;90m%s\033[0m\n' "$*"; }

paso() { echo; azul "▸ $*"; }

fallar() {
  echo
  rojo "✗ $1"
  [[ -n "${2:-}" ]] && echo "  $2"
  exit 1
}

# ---------------------------------------------------------------- 1. Requisitos
paso "Paso 1 de 6 · Comprobando requisitos"

# Si Node no está instalado en el sistema, se busca una copia portátil en una
# carpeta "node-portable" junto a esta, o dentro del propio proyecto.
if ! command -v node >/dev/null 2>&1; then
  for base in ../node-portable node-portable; do
    for candidato in "$base/bin" "$base"/*/bin "$base" "$base"/*; do
      if [[ -x "$candidato/node" ]]; then
        PATH="$(cd "$candidato" && pwd):$PATH"
        export PATH
        break 2
      fi
    done
  done
fi

command -v node >/dev/null 2>&1 || fallar \
  "No se encontró Node.js." \
  "Instálalo desde https://nodejs.org (versión LTS), o descomprime una versión portátil en una carpeta \"node-portable\" al lado de esta."

VERSION_NODE="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "$VERSION_NODE" -lt 20 ]]; then
  fallar "Node.js $(node -v) es muy antiguo." "Se necesita la versión 20 o superior."
fi
gris "  Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fallar "No se encontró npm." "Suele venir con Node.js; reinstálalo."
gris "  npm $(npm -v)"

if command -v psql >/dev/null 2>&1; then gris "  $(psql --version)"; fi
if command -v mysql >/dev/null 2>&1; then gris "  $(mysql --version | cut -c1-60)"; fi

if ! command -v psql >/dev/null 2>&1 && ! command -v mysql >/dev/null 2>&1; then
  fallar \
    "No se encontró ni MySQL ni PostgreSQL." \
    "Instala XAMPP (https://www.apachefriends.org) o PostgreSQL (https://www.postgresql.org/download/)."
fi

verde "✓ Requisitos correctos"

# --------------------------------------------------------- 2. Motor de datos
paso "Paso 2 de 6 · Detectando el motor de base de datos"

mysql_vivo() { command -v mysqladmin >/dev/null 2>&1 && mysqladmin ping -h "$DB_HOST" --silent >/dev/null 2>&1; }
postgres_vivo() { command -v pg_isready >/dev/null 2>&1 && pg_isready -h "$DB_HOST" -p 5432 >/dev/null 2>&1; }

if [[ -z "$MOTOR" ]]; then
  if mysql_vivo && postgres_vivo; then
    echo "  Están disponibles los dos motores."
    read -rp "  ¿Cuál usas? [mysql / postgres]: " respuesta
    MOTOR=$([[ "$respuesta" == mysql* ]] && echo mysql || echo postgresql)
  elif mysql_vivo; then
    MOTOR="mysql"
  elif postgres_vivo; then
    MOTOR="postgresql"
  else
    fallar \
      "No se encontró ningún motor de base de datos corriendo." \
      "Inicia MySQL (en XAMPP, el botón Start junto a MySQL) o PostgreSQL, y vuelve a ejecutar este script."
  fi
fi

if [[ "$MOTOR" == "mysql" ]]; then
  DB_PUERTO="3306"
  gris "  Motor: MySQL (puerto $DB_PUERTO)"
else
  DB_PUERTO="5432"
  gris "  Motor: PostgreSQL (puerto $DB_PUERTO)"
fi

node scripts/motor-bd.mjs "$MOTOR" >/dev/null
verde "✓ Motor configurado"

# ------------------------------------------------------ 3. Usuario y base datos
paso "Paso 3 de 6 · Preparando la base de datos"

if [[ "$MOTOR" == "mysql" ]]; then
  # XAMPP trae el usuario root sin contraseña; si tiene una, se pide.
  if mysql -u root -h "$DB_HOST" -e "SELECT 1" >/dev/null 2>&1; then
    CLAVE_MYSQL=""
  else
    read -rsp "  Contraseña de root de MySQL (vacío si no tiene): " CLAVE_MYSQL
    echo
    MYSQL_PWD="$CLAVE_MYSQL" mysql -u root -h "$DB_HOST" -e "SELECT 1" >/dev/null 2>&1 || fallar \
      "No se pudo entrar a MySQL con esa contraseña." "Verifícala en el panel de XAMPP."
  fi

  MYSQL_PWD="$CLAVE_MYSQL" mysql -u root -h "$DB_HOST" \
    -e "CREATE DATABASE IF NOT EXISTS \`$DB_NOMBRE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null
  gris "  Base de datos '$DB_NOMBRE' lista en MySQL"

  if [[ -n "$CLAVE_MYSQL" ]]; then
    # La contraseña viaja dentro de una URL: una arroba o una barra la partirían
    # en dos, así que se escapa antes de componer la cadena.
    CLAVE_URL="$(MYSQL_PWD="$CLAVE_MYSQL" node -e 'process.stdout.write(encodeURIComponent(process.env.MYSQL_PWD))')"
    CADENA="mysql://root:$CLAVE_URL@$DB_HOST:$DB_PUERTO/$DB_NOMBRE"
  else
    CADENA="mysql://root@$DB_HOST:$DB_PUERTO/$DB_NOMBRE"
  fi
else
  if ! psql -U postgres -h "$DB_HOST" -p "$DB_PUERTO" -c "SELECT 1" >/dev/null 2>&1; then
    echo "  Se necesita la contraseña del usuario administrador 'postgres'"
    echo "  (la que definiste al instalar PostgreSQL)."
    read -rsp "  Contraseña: " CLAVE_ADMIN
    echo
    export PGPASSWORD="$CLAVE_ADMIN"
    psql -U postgres -h "$DB_HOST" -p "$DB_PUERTO" -c "SELECT 1" >/dev/null 2>&1 || fallar \
      "No se pudo entrar a PostgreSQL con esa contraseña." \
      "Verifica la contraseña del usuario 'postgres' e inténtalo de nuevo."
  fi

  adminsql() { psql -U postgres -h "$DB_HOST" -p "$DB_PUERTO" -tAc "$1"; }

  if [[ "$(adminsql "SELECT 1 FROM pg_roles WHERE rolname='$DB_USUARIO'")" == "1" ]]; then
    gris "  El usuario '$DB_USUARIO' ya existía"
  else
    adminsql "CREATE USER $DB_USUARIO WITH PASSWORD '$DB_CLAVE';" >/dev/null
    gris "  Usuario '$DB_USUARIO' creado"
  fi

  # CREATEDB permite que Prisma cree su base de datos temporal al generar migraciones.
  adminsql "ALTER USER $DB_USUARIO CREATEDB;" >/dev/null

  if [[ "$(adminsql "SELECT 1 FROM pg_database WHERE datname='$DB_NOMBRE'")" == "1" ]]; then
    gris "  La base de datos '$DB_NOMBRE' ya existía"
  else
    adminsql "CREATE DATABASE $DB_NOMBRE OWNER $DB_USUARIO;" >/dev/null
    gris "  Base de datos '$DB_NOMBRE' creada"
  fi

  unset PGPASSWORD
  CADENA="postgresql://$DB_USUARIO:$DB_CLAVE@$DB_HOST:$DB_PUERTO/$DB_NOMBRE?schema=public"
fi

verde "✓ Base de datos lista"

# ------------------------------------------------------------ 4. Configuración
paso "Paso 4 de 6 · Configurando variables de entorno"

if [[ -f .env ]]; then
  # Si se cambió de motor, la cadena guardada ya no sirve.
  if grep -q "^DATABASE_URL=\"$CADENA\"$" .env; then
    gris "  El archivo .env ya existía, se conserva tal cual"
  else
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$CADENA\"|" .env && rm -f .env.bak
    gris "  Cadena de conexión actualizada al motor seleccionado"
  fi
else
  if command -v openssl >/dev/null 2>&1; then
    SECRETO="$(openssl rand -base64 32)"
  else
    SECRETO="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  fi

  cat > .env <<EOF
DATABASE_URL="$CADENA"
AUTH_SECRET="$SECRETO"
AUTH_TRUST_HOST=true
EOF
  gris "  Archivo .env creado con un secreto generado al azar"
fi

verde "✓ Configuración lista"

# ------------------------------------------------------------- 5. Dependencias
paso "Paso 5 de 6 · Instalando dependencias (puede tardar unos minutos)"

if [[ -d node_modules ]]; then
  gris "  Las dependencias ya estaban instaladas"
else
  npm install --no-audit --no-fund
fi

verde "✓ Dependencias instaladas"

# ------------------------------------------------- 6. Migraciones y datos base
paso "Paso 6 de 6 · Creando las tablas y cargando los datos"

if [[ "$MOTOR" == "postgresql" ]]; then
  # PostgreSQL tiene el historial de migraciones versionado del proyecto.
  npx prisma migrate deploy
else
  # El historial está escrito en SQL de PostgreSQL, así que en MySQL las tablas
  # se crean directamente desde el esquema.
  npx prisma db push
fi
npx prisma generate >/dev/null

# La semilla solo se carga si la base está vacía, para no borrar trabajo previo.
if [[ "$MOTOR" == "mysql" ]]; then
  USUARIOS="$(MYSQL_PWD="$CLAVE_MYSQL" mysql -u root -h "$DB_HOST" -D "$DB_NOMBRE" -N -B \
    -e 'SELECT count(*) FROM User' 2>/dev/null || echo 0)"
else
  USUARIOS="$(psql "$CADENA" -tAc 'SELECT count(*) FROM "User"' 2>/dev/null || echo 0)"
fi

if [[ "$USUARIOS" == "0" ]]; then
  npm run db:seed
else
  gris "  Ya había datos cargados ($USUARIOS usuarios), no se recarga la semilla"
  gris "  Si quieres reiniciarlos desde cero: npm run db:seed"
fi

verde "✓ Datos listos"

# ----------------------------------------------------------------- Arranque
echo
azul "▸ Iniciando la aplicación"

if [[ "$MODO" == "produccion" ]]; then
  gris "  Compilando para producción..."
  npm run build
  npm start &
else
  npm run dev &
fi
PID_SERVIDOR=$!

# Cierra el servidor si se interrumpe el script con Ctrl+C.
trap 'kill $PID_SERVIDOR 2>/dev/null || true' EXIT INT TERM

URL="http://localhost:$PUERTO_APP"
gris "  Esperando a que el servidor responda..."

LISTO=0
for _ in $(seq 1 90); do
  if curl -fsS "$URL/login" >/dev/null 2>&1; then LISTO=1; break; fi
  kill -0 "$PID_SERVIDOR" 2>/dev/null || fallar "El servidor se detuvo inesperadamente."
  sleep 1
done

[[ "$LISTO" == "1" ]] || fallar "El servidor no respondió a tiempo." "Revisa los mensajes de error de arriba."

# Abre el navegador según el sistema operativo.
if command -v xdg-open >/dev/null 2>&1;   then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1;     then open "$URL" >/dev/null 2>&1 &
elif command -v powershell.exe >/dev/null 2>&1; then powershell.exe -NoProfile start "$URL" >/dev/null 2>&1 &
elif command -v start >/dev/null 2>&1;    then start "$URL" >/dev/null 2>&1 &
else gris "  Abre manualmente: $URL"
fi

cat <<EOF

$(verde "════════════════════════════════════════════════════")
$(verde "  La aplicación está funcionando en $URL")
$(verde "════════════════════════════════════════════════════")

  Único usuario creado (administrador)

    Usuario                 admin.sistema
    Contraseña provisional  Mh7#tQvk.Rz3

  Al entrar, la plataforma te pedirá cambiarla por una tuya.

  El sistema arranca vacío. Como administrador puedes:
    1. Crear al docente en "Docentes".
    2. Subir una guía del CNMH en "Importar módulo".

  El docente crea luego a sus estudiantes desde "Mis Estudiantes".

  Para detener la aplicación: Ctrl+C
  Para volver a iniciarla después: ./iniciar.sh

EOF

wait "$PID_SERVIDOR"
