# Spec: 读书记录 App（Reading Companion）

> 本文档是后续开发的「唯一事实来源」。改需求先改这里，再改代码。

## 1. Objective（目标）

一个**轻量、离线优先**的个人读书记录 App，在 **Mac（Web）和 iPhone/iOS** 上使用：

- 记录每天读了哪本书、读了多少页
- 每天读完后写一段**简单评论**
- 评论有两种模式：**直接保存** 和 **Discuss 模式**（AI 追问、提炼）
- 读完一本书或中途随时，让 AI **整理我对这本书的思考与观点**
- **首页打开即「记录」页**（不是书架）；书架只显示**最近读的 3-4 本书**，按最近记录时间排序
- 数据**只存本地**（不用 iCloud、不上传），配合 Ollama 可**离线**使用 AI

> 后续迭代（不在首批交付）：**统计图表**（周/月/年，§12）与 **图书推荐**（§13）。

**用户**：单用户、非技术背景，自用。**成功**：能稳定记录读书进度并沉淀思考，不依赖网络、不依赖任何服务端。

## 2. Tech Stack（技术栈）

| 层 | 选型 |
|---|---|
| 框架 | Expo（React Native）+ TypeScript（最新 SDK，严格模式） |
| 导航 | expo-router（文件路由，同时支持 Web / iOS） |
| 存储 | expo-sqlite（本地 SQLite，Web 端为 WASM + IndexedDB 持久化） |
| AI | 直接 `fetch` 调 **OpenAI 兼容接口**，不引入重型 SDK |
| 状态 | React Context（轻量，不引入 Redux 等） |

**AI 服务商**：主用 **DeepSeek**（OpenAI 兼容，`https://api.deepseek.com`，模型 `deepseek-chat`）；同一条通路兼容 Ollama（`http://localhost:11434/v1`，离线用）和 OpenAI。Anthropic 暂不在范围内。

**图书元数据**：中文书为主、英文书为辅。
- 当前用 **Open Library**（免费、无需 Key，英文书覆盖更好）；中文书搜不到是已知问题。
- 下一轮改为**中文优先**搜索源（Google Books 或豆瓣读书），Open Library 作为英文备选。
- 都搜不到的书可手动录入。

## 3. Commands（命令）

```
开发（Web / Mac）：  npm run web        # expo start --web
开发（iOS）：        npm run ios        # expo start --ios
类型检查：           npx tsc --noEmit
测试：               npm test           # Jest 单测（纯逻辑）
```

## 4. Project Structure（项目结构）

```
src/                    → 源码
  app/                  → expo-router 页面（文件即路由）
    _layout.tsx         → 根布局（Stack）
    (tabs)/             → 底部标签页
      _layout.tsx       → 标签布局（记录 / 日历 / 设置）
      index.tsx         → 记录（首页）：最近读的 3-4 本书 + 添加/全部图书入口
      calendar.tsx      → 日历视图（每日阅读记录）
      settings.tsx      → 设置（AI 配置）
    book/
      list.tsx          → 全部图书（完整书架）
      search.tsx        → 搜索添加图书（书名 → 结果带封面，支持手动录入）
      [id].tsx          → 图书详情（历史记录 + 整理入口）
    entry/
      new.tsx           → 记录当日进度（页数/百分比）+ 评论（选模式）
      discuss.tsx       → Discuss 对话页
  types.ts              → 类型定义
  db.ts                 → SQLite 数据层（建表 + CRUD）
  ai.ts                 → AI 调用（追问 / 提炼 / 整理）
  utils.ts              → 纯工具（日期、进度、解析）
__tests__/              → 单元测试（纯逻辑）
```

## 5. Code Style（代码风格）

TypeScript + 函数式风格，命名用驼峰，类型定义集中在 `types.ts`。示例：

```ts
// src/ai.ts
export async function extractKeyPoints(
  settings: AISettings,
  comment: string,
  discussion: DiscussionTurn[]
): Promise<string[]> {
  const text = await chat(settings, buildExtractMessages(comment, discussion), 300);
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^[\d.\-•\s]+/, '').trim())
    .filter((s) => s.length > 0);
}
```

约定：纯逻辑与 I/O 分离（`db.ts`/`ai.ts` 只做数据与网络，不做 UI）；不写 `any`；字符串统一用 `'`。

## 6. Data Model（数据模型）

- **Book**：`id, title, author, publisher?, publishYear?, isbn?, pageCount?, coverUrl?, status('reading'|'finished'), startedAt?, finishedAt?, createdAt`
- **ReadingEntry**（每日记录）：`id, bookId, date(YYYY-MM-DD), currentPage?, progressPercent?, pagesRead?, comment, mode('plain'|'discuss'), aiKeyPoints?(JSON), discussion?(JSON), createdAt`
  - `currentPage`（读到第几页，纸质书）与 `progressPercent`（百分比，Kindle）**二选一或都填，至少填一项**
  - `comment` 可为空（可只记进度）
- **Reflection**（整理结果）：`id, bookId, content, createdAt`
- **Settings**：`key, value`（存 provider / baseUrl / apiKey / model）

## 7. Testing Strategy（测试策略）

- **框架**：Jest；只测**纯逻辑**（`utils.ts` 的日期/进度/解析、`ai.ts` 的提示词构建与关键点解析）。
- **不做**：UI 快照、端到端自动化（对个人轻量 App 收益低）。
- **验收方式**：`npx tsc --noEmit` 通过 + `npm test` 通过 + Mac Web / iOS 手动跑通核心流程。

## 8. Boundaries（边界）

- **Always**：提交前类型检查 + 测试通过；数据只存本地；AI 只在用户手动触发时调用。
- **Ask first**：新增依赖包；改数据表结构；改 AI 行为；上架/发布。
- **Never**：把 API Key 写进代码或提交（走 `.env`）；使用 iCloud/云同步；自动触发 AI；把数据传到任何远端。

## 9. Success Criteria（验收标准）

1. 输入书名搜索 → 显示带封面的结果列表 → 选一本保存到书架；搜索不到的也可手动录入。
2. 记录今日进度（页数 和/或 百分比）+ 直接保存评论，重启 App 后仍在。
3. 首页打开即「记录」页，显示最近读的 3-4 本书（按最近记录时间排序）。
4. Discuss 模式：AI 基于评论提问 → 最多 3 轮 → 保存「评论 + 对话 + 提炼要点」。
5. 整理：一键生成对该书的结构化思考整理，可重复、可保存。
6. 设置里填 DeepSeek Key 可用；切换 Ollama 后离线可用。
7. 记录/阅读无需网络；只有 Discuss / 整理需要 AI。
8. Mac 浏览器 + iPhone Expo Go 均可运行。

## 10. 已确认决策

1. ✅ 进度记录：同时支持**页数**（读到第 X 页）和**百分比**（Kindle 显示），至少填一项。
2. ✅ 日历视图：保留，按日历查看每日阅读记录。
3. ✅ 单测：为纯逻辑写 Jest 单测。
4. ✅ 封面 + 搜索：添加图书时按书名搜索，显示带封面的结果；搜索不到可手动录入。

## 11. 能力地图与迭代顺序

| 能力 | 说明 | 阶段 |
|---|---|---|
| 记录核心 | 图书 / 每日进度 / 评论（直接 + Discuss）/ 整理 | Phase 1（先做） |
| 统计图表 | 周 / 月 / 年统计 | Phase 2 |
| 图书推荐 | AI 结合状态推荐书库内图书 | Phase 3 |

Phase 1 先交付记录核心；统计与推荐**复用**其数据层与 AI 通路，后续迭代追加。

## 12. 统计功能（Phase 2）

- 周期：**周 / 月 / 年**，可切换；以**图表**展示。
- 统计项：
  1. **读完的书**：本周期内标记「读完」的书（`finishedAt` 落在周期内）。
  2. **打开过几本书**：本周期内至少有 1 条阅读记录的去重图书数。
  3. **各书本周期进度**：按「周期内进度增量」从高到低排序（不超过 10 本书）。
     - 增量 = 周期末进度 − 周期初进度（周期初取周期开始前最近一条记录作基线）。
     - 例：A 从 20%→40%（+20），B 从 0→30%（+30）→ **B 排在 A 前**。
     - 进度统一归一化为百分比：有百分比用百分比；有「页数 + 总页数」则换算；都无则回退为页数增量。

## 13. 图书推荐功能（Phase 3）

- 触发：**仅用户手动唤起**，不自动弹。
- 范围：**仅限用户书库内**的书。
- 流程：
  1. 唤起后，AI 先问几个判断依据问题（如情绪、精神状态等）。
  2. 结合最近读书数据，直接推荐某一本书。
  3. 用户「刷掉」一本 → 换下一本。
  4. 连续 3-4 本都被刷掉 → 弹窗「今天别读了」。
