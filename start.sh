#!/bin/bash
# Restaurant Ordering System - Start Script
cd "$(dirname "$0")/server"

# Ensure node is in PATH
export PATH="$HOME/bin:$PATH"

# Check if already running
if curl -s http://localhost:3001/api/categories > /dev/null 2>&1; then
  echo "✅ Server already running on http://localhost:3001"
  echo ""
  echo "📱 顾客点菜（手机扫码）: http://localhost:3001/?table=1"
  echo "🏪 商家管理后台:        http://localhost:3001/admin"
  exit 0
fi

echo "🍽️  启动点餐系统..."
node index.js &
SERVER_PID=$!
sleep 2

if curl -s http://localhost:3001/api/categories > /dev/null 2>&1; then
  echo "✅ 启动成功！"
  echo ""
  echo "📱 顾客点菜（手机扫码）: http://localhost:3001/?table=1"
  echo "🏪 商家管理后台:        http://localhost:3001/admin"
  echo ""
  echo "提示：同一局域网内手机扫码访问 http://<你的IP>:3001/?table=桌号"
  echo "按 Ctrl+C 停止服务"
  wait $SERVER_PID
else
  echo "❌ 启动失败，请检查日志"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi
