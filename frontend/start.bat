@echo off
echo ========================================
echo   cc-web 启动脚本
echo ========================================
echo.

echo [1/2] 启动后端服务器 (端口 3080)...
cd /d "%~dp0.."
start "cc-web 后端" cmd /k "npm run start"

echo [2/2] 启动前端开发服务器 (端口 3081)...
start "cc-web 前端" cmd /k "npm run dev:frontend"

echo.
echo ========================================
echo   启动完成！
echo   后端: http://localhost:3080
echo   前端: http://localhost:3081
echo ========================================
echo.
pause
