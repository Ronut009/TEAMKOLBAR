@echo off
rem One-time tidy-up: double-click to run restructure-once.ps1 (moves files, deletes nothing).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restructure-once.ps1"
