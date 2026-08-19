# 读书记录 App（Reading Companion）

一个轻量、离线优先的个人读书记录 App，**核心 = iPhone/iOS**（Web 保留为开发/次要目标）。

## 功能

- **笔记瀑布流首页**：打开即看历史笔记，底部居中「＋」开弹窗记录
- **新增笔记**：书名（书库自动补全 + 添加图书）、进度（页数/百分比，至少一项）、笔记（必填）；可「提交」直接保存，或「与 AI 聊天」
- **苏格拉底式 AI 对话**：写完笔记可选与 AI 聊（四阶段 + 六类问题，AI 判断结束、最多 10 轮），结束给总结写回笔记
- **洞察报告**：一本书笔记 >5 条后可生成（≤500 字），沉淀你的思路与观点
- **我的书库**：库内搜索 + 「最近在读」/「我的书库」分组 + 添加图书（外部搜索带封面）
- **图书详情**：封面 / 5 星评级 / 阅读热力图 / 距上次读 x 天 / 已读 x 天 / 遍数 / 标记读完
- **统计**：周/月/年切换，读完的书 / 开始读的书 / 进度排名 + 横条图 + 热力图
- **导出笔记**：纯文本 / Markdown / HTML 三格式，单本书（图书详情）或全部（设置），iOS 走系统分享
- **日历视图**：按天回看阅读记录
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

### iPhone / iOS

手机装 **Expo Go**，然后 `npm run ios`，用 Expo Go 扫码。

## 配置 AI

「与 AI 聊天」和「洞察报告」需要 AI，打开 App 的 **设置** 页：

- **DeepSeek**（推荐）：填 API Key，模型 `deepseek-chat`
- **Ollama**（本地，可离线）：本机装 Ollama 即可，无需 Key

## 测试与检查

```bash
npm test          # 单元测试（纯逻辑）
npx tsc --noEmit  # 类型检查
```

## 技术栈

Expo SDK 57 + TypeScript · expo-router · expo-sqlite · expo-sharing / expo-file-system · OpenAI 兼容 AI 接口（DeepSeek / Ollama）

## 目录结构

```
src/app/(drawer)/   → 首页 / 书库 / 统计 / 日历 / 设置（抽屉导航）
src/app/library/    → 添加图书 / 图书详情
src/app/note/       → 新增笔记 / AI 对话
src/*.ts            → types / db / ai / stats / export / share / utils / openlibrary
__tests__/          → 单元测试
```

规格见 [SPEC.md](SPEC.md)，实施计划见 [tasks/plan.md](tasks/plan.md)。
