@echo off
rem Double-click to play Rakti with the start-screen music playing the moment the page loads (no click needed).
rem Chrome and Edge block sound until you click or press a key. This opens the game in its own browser window
rem (its own profile, so your normal browser is untouched) with that block switched off, like YouTube.
cd /d "%~dp0"

set "PORT=8123"
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER (
  echo Could not find Chrome or Edge. Install one of them, or open index.html from a local server yourself.
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found, so the game's local server could not start. Install Python from python.org.
  pause
  exit /b 1
)

rem the game is served from a small local web server (close its window when you are done playing)
start "Rakti server" /min python -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul

start "" "%BROWSER%" --user-data-dir="%LocalAppData%\RaktiGameBrowser" --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check "http://127.0.0.1:%PORT%/"
