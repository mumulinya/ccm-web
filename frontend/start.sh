#!/bin/bash
echo "========================================"
echo "  cc-web 启动脚本"
echo "========================================"
echo ""

echo "[1/2] 启动后端服务器 (端口 3080)..."
cd "$(dirname "$0")/.."
npm run start &
BACKEND_PID=$!

echo "[2/2] 启动前端开发服务器 (端口 3081)..."
npm run dev:frontend &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  启动完成！"
echo "  后端: http://localhost:3080"
echo "  前端: http://localhost:3081"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待子进程
wait
