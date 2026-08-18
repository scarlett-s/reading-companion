# 读书记录 App（Reading Companion）

一个轻量、离线优先的个人读书记录 App，在 **Mac（Web）和 iPhone/iOS** 上使用。

## 功能

- 记录每天读了哪本书、读了多少页（页数 或 百分比，Kindle 友好）
- 每天读完后写一段评论，两种模式：
  - **直接保存**：写完就存
  - **Discuss**：AI 基于评论追问（最多 3 轮），结束后提炼要点一起保存
- **整理思考**：读完一本书或中途随时，让 AI 汇总你对这本书的评论与讨论，整理成结构化的观点
- **日历视图**：按天回看阅读记录
- **图书搜索**：添加图书时按书名搜索（Open Library，带封面），搜不到可手动录入
- 数据**只存本地**（SQLite），不依赖任何服务端

## 运行

### 安装依赖

```bash
npm install
```

### Mac（Web 浏览器）

```bash
npm run web:serve
```

然后浏览器打开 `http://localhost:8080`。

> 说明：本地数据（SQLite）在 Web 上走 WASM，需要跨源隔离头（COOP/COEP），上面的命令已自动加上。

开发模式（热更新，但 Web 端 SQLite 需上面的 `web:serve` 才有正确头）：

```bash
npm run web
```

### iPhone / iOS

需要手机装 **Expo Go**，然后：

```bash
npm run ios
```

用 Expo Go 扫码即可。

## 配置 AI

Discuss 和「整理」功能需要 AI。打开 App 的 **设置** 页：

- **DeepSeek**（推荐）：点「DeepSeek」预设，填入你的 API Key，模型 `deepseek-chat`
- **Ollama**（本地，可离线）：点「Ollama（本地）」预设，本机装了 Ollama 即可，无需 Key

## 测试与检查

```bash
npm test          # 单元测试（纯逻辑）
npx tsc --noEmit  # 类型检查
```

## 技术栈

Expo（React Native）+ TypeScript · expo-router · expo-sqlite · OpenAI 兼容 AI 接口（DeepSeek / Ollama）

## 目录结构

```
src/
  app/          → 页面（expo-router 文件路由）
    (tabs)/     → 记录 / 日历 / 设置
    book/       → 全部图书 / 搜索添加 / 图书详情
    entry/      → 记录进度 / Discuss
  types.ts      → 类型定义
  db.ts         → SQLite 数据层
  ai.ts         → AI 调用
  utils.ts      → 纯工具函数
  openlibrary.ts → 图书搜索
__tests__/      → 单元测试
```

规格见 [SPEC.md](SPEC.md)，实施计划见 [tasks/plan.md](tasks/plan.md)。
