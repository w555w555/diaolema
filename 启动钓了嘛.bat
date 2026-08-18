@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.local\node;%USERPROFILE%\tools\node-v24.19.0-win-x64;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，无法启动钓了嘛。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次启动，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败。
    pause
    exit /b 1
  )
)

echo 正在启动钓了嘛本机窗口...
node desktop\start.mjs
if errorlevel 1 pause
