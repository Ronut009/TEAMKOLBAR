@echo off
rem Moves the files Rakti no longer uses into the backup folder. Delete the backup folder afterwards if you like.
cd /d "%~dp0"
if not exist backup mkdir backup
if exist "js\cutscene" move "js\cutscene" "backup\js_cutscene" >nul
if exist "assets\cutscene" move "assets\cutscene" "backup\assets_cutscene" >nul
if exist "assets\audio\music\title song.mp3" move "assets\audio\music\title song.mp3" "backup\" >nul
if exist "assets\level2\sprites\sun_mark.png" move "assets\level2\sprites\sun_mark.png" "backup\" >nul
if exist "assets\level2\sprites\sun_mark_lit.png" move "assets\level2\sprites\sun_mark_lit.png" "backup\" >nul
echo Done: the unused files are now in the backup folder.
pause
(goto) 2>nul & del "%~f0"
