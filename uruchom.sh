#!/usr/bin/env sh
# Bezramka – uruchamianie na macOS i Linuksie:  ./uruchom.sh   albo   ./uruchom.sh example.com
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Brak Node.js. Zainstaluj wersję LTS z https://nodejs.org i uruchom ponownie."
  exit 1
fi

if [ ! -d node_modules/electron ]; then
  echo "Pierwsze uruchomienie: pobieram Electron. To może potrwać minutę lub dwie..."
  npm install || exit 1
fi

exec npx electron . "$@"
