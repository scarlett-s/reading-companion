#!/bin/bash
# 双击这个文件即可启动读书记录 App（Mac 浏览器版）
cd "$(dirname "$0")"

# 首次运行：安装依赖
if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖（约 1-2 分钟）…"
  npm install || { echo "依赖安装失败"; read -p "按回车关闭"; exit 1; }
fi

# 没有构建产物时先构建
if [ ! -f dist/index.html ]; then
  echo "正在构建…"
  npx expo export --platform web || { echo "构建失败"; read -p "按回车关闭"; exit 1; }
fi

# 已经在运行就直接开浏览器
if curl -s -o /dev/null http://localhost:8080/; then
  open http://localhost:8080/
  echo "App 已在浏览器打开。"
  read -p "按回车关闭本窗口"
  exit 0
fi

# 打开浏览器 + 启动服务
(sleep 1; open http://localhost:8080/) &
echo "启动中，浏览器将自动打开 http://localhost:8080"
echo "—— 关闭这个窗口，App 就停止。下次再双击本文件即可。 ——"
node scripts/serve-web.js
