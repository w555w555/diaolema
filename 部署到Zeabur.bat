@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 渔见 → Zeabur
echo 控制台没有 ZIP 上传。本脚本用官方 CLI 从当前文件夹部署。
echo 第一次会打开浏览器登录 Zeabur。
echo.

npx --yes zeabur@latest deploy
if errorlevel 1 (
  echo.
  echo 若提示未登录，先执行： npx zeabur@latest auth login
  echo 然后再次双击本脚本。
)

echo.
pause
