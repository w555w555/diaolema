@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.local\node;%USERPROFILE%\tools\node-v24.19.0-win-x64;%PATH%"
if not exist "node_modules" call npm install
echo 正在生成今日鱼情日报...
call npm run scout:daily
if errorlevel 1 pause
