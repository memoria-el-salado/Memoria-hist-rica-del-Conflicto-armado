#!/usr/bin/env bash
# Lanzador para macOS: doble clic sobre este archivo instala y abre la aplicación.
# Solo delega en instalar.sh, que contiene toda la lógica.
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
./instalar.sh
