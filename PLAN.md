# 读书记录 App — 实施方案

## 1. 目标

一个**轻量**、**离线优先**的个人读书记录 App，在 **Mac 和 iPhone/iOS** 上使用：

- 记录每天读了哪本书、读了多少页
- 每天读完后写一段**简单评论**
- 评论有两种模式：**直接保存** 和 **Discuss 模式**（AI 追问）
- 读完一本书（或中途随时）让 AI **整理我对这本书的思考与观点**
- 数据**存在本地**（不用 iCloud），配合 Ollama 可**离线**使用

## 2. 技术选型（推荐）

**Expo（React Native）+ TypeScript**

| 方案 | 说明 |
|---|---|
| 框架 | Expo（React Native）+ TypeScript |
| 导航 | expo-router |
| 存储 | expo-sqlite（本地 SQLite，不依赖网络） |
| 状态 | React Context / Zustand（轻量） |
| AI | 直接用 `fetch` 调接口（OpenAI / Anthropic / Ollama），不引入重型 SDK |

**为什么选它，而不是原生 SwiftUI：**

- 你的机器**没装 Xcode**（约 12GB 下载 + Apple ID 签名配置）。原生 SwiftUI 需要先装 Xcode 才能构建和跑到手机，对非技术用户门槛高。
- 你的机器**已经装好 Node 和 Ollama**，Expo 现在就能跑起来。
- 一套代码同时覆盖 iOS 和 Mac。

**需要你知道的一个取舍：**

- **iPhone 上**：通过 Expo Go 扫码即可运行，几乎零门槛。
- **Mac 上（第一版）**：以 **Web 方式运行**（浏览器里打开，本地地址）。这完全能用、数据也在本地，但严格说是「浏览器里的 App」而不是独立的原生 Mac 窗口。
  - 之后如果你想要「独立的 Mac 桌面 App 窗口」，可以在二期加一个 Electron/Tauri 外壳，功能逻辑不变。

> 如果你特别在意「Mac 必须是原生 App 窗口、不接受浏览器」，请告诉我，我会改用原生方案（但需要先装 Xcode）。

## 3. 核心功能

1. **书架 / 图书管理**
   - 手动录入书名、作者
   - 或联网自动补全图书信息（Open Library / Google Books，仅拉取元数据）
   - 也可导入
   - 记录总页数、开始日期、状态（在读 / 读完）

2. **每日读书进度**
   - 选一本书，记「今天读到第几页 / 读了多少页」+ 日期
   - 可附一段当日评论

3. **评论的两种模式**
   - **直接保存**：写完就存。
   - **Discuss 模式**：用户先写评论 → AI 基于评论提一个追问 → 用户简短回答 → AI 再问，**最多 3 轮** → 结束后 AI 从整段对话**提炼关键信息**，与评论一起保存。

4. **整理 / 回顾（Organize）**
   - 手动触发。读完一本书或中途随时。
   - AI 汇总该书所有的评论 + 所有 discuss 内容，**生成对这本书的思考与观点整理**。

5. **设置**
   - AI 服务商选择：OpenAI / Anthropic / Ollama（本地）
   - 填 API Key（Ollama 无需 Key，填本地地址即可）
   - 模型选择
   - AI 均为**手动触发**，不自动弹。

## 4. 数据模型（SQLite 表）

- **Book**：id、title、author、coverUrl、totalPages、status、startedAt、finishedAt
- **ReadingEntry**（每日记录）：id、bookId、date、pagesRead、currentPage、comment、mode（direct/discuss）、keyPoints（AI 提炼）、createdAt
- **DiscussionRound**（discuss 每轮对话）：id、entryId、round、role（user/ai）、text
- **Reflection**（整理结果）：id、bookId、content、createdAt
- **Settings**：provider、apiKey、model、endpoint

## 5. AI 集成设计

**统一抽象层**：无论 OpenAI / Anthropic / Ollama / DeepSeek，都走同一个「发消息拿回复」接口。核心实现 **OpenAI 兼容端点**，DeepSeek（`https://api.deepseek.com`）、OpenAI、Ollama（`localhost:11434/v1`）共用同一条通路，只需改 baseUrl + key + model。Anthropic 单独适配（可选，暂缓）。

> 决策：AI 服务商采用 **DeepSeek API**（用户已确认）。默认模型 `deepseek-chat`。

**Discuss 模式流程（最多 3 轮）：**

1. 用户写评论 → 点「Discuss」
2. 系统提示词要求 AI：*只提一个针对性的追问*
3. 用户简短回答 → AI 再问 → 最多 3 轮（用户也可提前结束）
4. 结束后 AI 提炼：*从以上对话提炼 3–5 条关键信息*
5. 保存：原始评论 + 每轮对话 + 提炼结果

**整理 / 回顾流程：**

- 收集该书的全部 ReadingEntry（评论 + 关键信息 + discuss 对话）
- 一次性发给 AI，要求输出结构化的「这本书我的思考与观点」整理

**离线策略：**

- 本地数据永远可读写、可记录（无需网络）
- 只有 Discuss / Organize 需要 AI：接 Ollama 时离线可用；否则无网络时提示「离线中，稍后再试」

## 6. 界面结构（页面）

- 书架（图书列表）
- 图书详情（进度、历史记录、整理结果）
- 记录今日进度（页数 + 评论，选直接保存 / Discuss）
- Discuss 对话页（问答轮次 + 结束提炼）
- 整理 / 回顾结果页
- 设置（AI 服务商配置）

## 7. 实施计划（分阶段）

- **Phase 0**：初始化 Expo + TypeScript 项目、目录结构、基础导航
- **Phase 1**：数据层 —— SQLite 建表、Book / ReadingEntry 的增删改查
- **Phase 2**：书架 + 图书录入（手动 + 联网补全元数据）
- **Phase 3**：每日进度记录 + 直接保存评论
- **Phase 4**：AI 抽象层 + 设置页（OpenAI / Anthropic / Ollama）
- **Phase 5**：Discuss 模式（3 轮追问 + 提炼）
- **Phase 6**：整理 / 回顾功能
- **Phase 7**：打磨、离线处理、Mac Web 运行验证

## 8. 已确认决策

1. ✅ Mac 第一版用 **Web 方式**运行（Expo Web），后续可选加桌面窗口。
2. ✅ 图书联网补全默认用 **Open Library**（免费、无需 Key）。
3. ✅ AI 服务商：**DeepSeek API**（OpenAI 兼容），默认模型 `deepseek-chat`；同时保留 Ollama 本地选项。
