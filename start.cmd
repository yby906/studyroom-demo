@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 静园 · 校园自习室预约管理系统

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [错误] 未检测到 Node.js。
  echo  请先安装 Node.js 18 或更高版本： https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo.
echo  正在启动本地自习室预约系统，浏览器将自动打开...
echo  关闭此窗口或按 Ctrl + C 即可停止服务。
echo.

node server.js

if errorlevel 1 (
  echo.
  echo  服务已停止或启动失败，请检查上方提示。
  pause
)
