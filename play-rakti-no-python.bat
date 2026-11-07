@echo off
rem Play Rakti WITHOUT Python: uses the PowerShell that comes with Windows to serve the game.
rem Double-click it. Chrome or Edge opens in its own window (own profile, autoplay allowed so the title music starts).
cd /d "%~dp0"

set "PORT=8124"
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER (
  echo Could not find Chrome or Edge. Please install one of them.
  pause
  exit /b 1
)

rem the game is served by a small PowerShell window (close it when you are done playing)
start "Rakti server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rakti-server.ps1" -Port %PORT% -Root "%~dp0."
timeout /t 3 /nobreak >nul

start "" "%BROWSER%" --user-data-dir="%LocalAppData%\RaktiGameBrowser" --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check "http://127.0.0.1:%PORT%/"
