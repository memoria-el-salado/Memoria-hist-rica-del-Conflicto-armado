#!/usr/bin/env bash
#
# Memoria El Salado — arranque rápido (para el día a día, ya instalado).
#
#   ./iniciar.sh                 modo desarrollo
#   ./iniciar.sh --produccion    modo compilado (para la sustentación)
#
# Si es la primera vez en este equipo, usa ./instalar.sh en su lugar.

set -euo pipefail

PUERTO_APP="3000"
MODO="desarrollo"
[[ "${1:-}" == "--produccion" ]] && MODO="produccion"

cd "$(dirname "${BASH_SOURCE[0]}")"

rojo()  { printf '\033[0;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[0;32m%s\033[0m\n' "$*"; }
gris()  { printf '\033[0;90m%s\033[0m\n' "$*"; }

if [[ ! -f .env || ! -d node_modules ]]; then
  rojo "✗ El proyecto todavía no está instalado en este equipo."
  echo "  Ejecuta primero:  ./instalar.sh"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  rojo "✗ PostgreSQL no está corriendo."
  echo "  Inícialo y vuelve a intentar (Servicios en Windows, 'brew services start postgresql' en macOS,"
  echo "  'sudo systemctl start postgresql' en Linux)."
  exit 1
fi

if [[ "$MODO" == "produccion" ]]; then
  gris "Compilando para producción..."
  npm run build
  npm start &
else
  npm run dev &
fi
PID_SERVIDOR=$!

trap 'kill $PID_SERVIDOR 2>/dev/null || true' EXIT INT TERM

URL="http://localhost:$PUERTO_APP"
gris "Esperando a que el servidor responda..."

LISTO=0
for _ in $(seq 1 90); do
  if curl -fsS "$URL/login" >/dev/null 2>&1; then LISTO=1; break; fi
  kill -0 "$PID_SERVIDOR" 2>/dev/null || { rojo "✗ El servidor se detuvo."; exit 1; }
  sleep 1
done

[[ "$LISTO" == "1" ]] || { rojo "✗ El servidor no respondió a tiempo."; exit 1; }

if command -v xdg-open >/dev/null 2>&1;   then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1;     then open "$URL" >/dev/null 2>&1 &
elif command -v powershell.exe >/dev/null 2>&1; then powershell.exe -NoProfile start "$URL" >/dev/null 2>&1 &
elif command -v start >/dev/null 2>&1;    then start "$URL" >/dev/null 2>&1 &
else gris "Abre manualmente: $URL"
fi

verde "
La aplicación está funcionando en $URL

  Administrador: admin.sistema · Mh7#tQvk.Rz3 (provisional)
  Si ya la cambiaste, entra con la tuya.

  Detener: Ctrl+C
"

wait "$PID_SERVIDOR"
