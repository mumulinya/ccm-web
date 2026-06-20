@echo off
REM 快速检查 TypeScript 编译状态
REM 用法: check-build.bat

echo ========================================
echo TypeScript 编译检查
echo ========================================
echo.

echo [1/3] 运行 npm run check (tsc --noEmit)...
call npm run check
if %errorlevel% neq 0 (
    echo.
    echo ❌ npm run check 失败！请查看上方错误信息。
    echo.
    pause
    exit /b 1
)
echo ✅ npm run check 通过
echo.

echo [2/3] 运行 npm run build (tsc)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ npm run build 失败！请查看上方错误信息。
    echo.
    pause
    exit /b 1
)
echo ✅ npm run build 通过
echo.

echo [3/3] 检查 dist/ 目录...
if exist dist\server.js (
    echo ✅ dist\server.js 已生成
) else (
    echo ❌ dist\server.js 不存在
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 所有检查通过！
echo ========================================
pause
