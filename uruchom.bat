@echo off
rem Bezramka - uruchamianie na Windows. Dwuklik wystarczy.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Brak Node.js. Zainstaluj wersje LTS ze strony https://nodejs.org i uruchom ten plik ponownie.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Pierwsze uruchomienie: pobieram Electron. To moze potrwac minute lub dwie...
  call npm install
  if errorlevel 1 (
    echo Instalacja sie nie udala. Sprawdz polaczenie z internetem.
    pause
    exit /b 1
  )
)

start "" "node_modules\electron\dist\electron.exe" . %*
