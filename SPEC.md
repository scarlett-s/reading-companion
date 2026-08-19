# Spec: 读书记录 App（Reading Companion）

> 本文档是后续开发的「唯一事实来源」。改需求先改这里，再改代码。

## 1. Objective（目标）

一个**轻量、离线优先**的个人读书记录 App，**核心 = iPhone/iOS**（Web 保留为开发/次要目标）：

- 每次读完**强制写一条笔记**（评论必填）
- 写笔记时可选「**与 AI 聊天**」：**苏格拉底式提问**（四阶段、六类问题，AI 判断结束，上限 10 轮），结束 AI 给一段**总结**
- 一本书笔记 **>5 条**后可触发 **洞察报告**（≤500 字）
- 读完一本书或中途随时**导出笔记**（纯文本 / Markdown / HTML 三种格式）
- 首页打开即「**笔记瀑布流**」（单列白卡，底部居中**绿色「＋」**开弹窗记录）；**左侧抽屉菜单**导航（首页 / 书库 / 统计 / 日历 / 设置）
- 阅读统计：天数为单位、含「上次打开 x 天前」+「第几遍」；周/月/年统计 + 横条图 + 热力图
- 数据**只存本地**（不用 iCloud、不上传），配合 Ollama 可**离线**使用 AI

**用户**：单用户、非技术背景，自用。**成功**：能稳定记录读书笔记并沉淀思考，不依赖网络、不依赖任何服务端。

---

## 2. Tech Stack（技术栈）

| 层 | 选型 |
|---|---|
| 框架 | Expo SDK 57（React Native 0.86）+ TypeScript 严格模式 |
| 导航 | expo-router（文件路由）+ 自实现轻量**左滑抽屉**（不引 `@react-navigation/drawer`） |
| 存储 | expo-sqlite（本地 SQLite，Web 端 WASM + IndexedDB） |
| AI | `fetch` 直调 **OpenAI 兼容接口**，不引重型 SDK |
| 状态 | React Context（轻量） |
| 图表 | **View 实现**横条图 + 热力图（53×7 格子），不引 svg |
| 导出 | iOS 用 `expo-sharing` + `expo-file-system`；Web 用 Blob 下载 |

**AI 服务商**：主用 **DeepSeek**（`deepseek-chat`），同通路兼容 Ollama（离线）和 OpenAI。Anthropic 暂不在范围内。

**图书元数据**：中文书为主、英文书为辅。
- **中文优先**搜索源：Google Books 或豆瓣读书（待定），Open Library 作为英文备选。
- 都搜不到的书可手动录入。

---

## 3. Commands（命令）

```
开发（Web / Mac）：  npm run web        # expo start --web
开发（iOS）：        npm run ios        # expo start --ios
类型检查：           npx tsc --noEmit
测试：               npm test           # Jest 单测（纯逻辑）
Web 双击启动：        ./启动读书记录.command
```

---

## 4. Project Structure（项目结构）

```
src/
  app/                              → expo-router 页面（文件即路由）
    _layout.tsx                     → 根布局（Stack）
    (drawer)/_layout.tsx            → 抽屉壳子（自实现，左滑 / 汉堡打开）
    (drawer)/index.tsx              → 首页：笔记瀑布流 + 悬浮绿色「＋」
    (drawer)/library/index.tsx      → 我的书库（库内搜索 + 「最近在读」/「我的书库」分组 + 「＋」卡）
    (drawer)/stats/index.tsx        → 统计页（周/月/年 + 横条图 + 热力图）
    (drawer)/calendar.tsx           → 日历视图
    (drawer)/settings.tsx           → 设置（AI 配置 + 全部导出）
    library/add.tsx                 → 添加图书（外部搜索 + 手动录入）
    library/[id].tsx                → 图书详情（封面/5星/heat map/信息卡/笔记列表/洞察报告/导出/标记读完）
    note/new.tsx                    → 新增笔记弹窗（底部上拉）
    note/chat/[entryId].tsx         → 苏格拉底 AI 对话页
  types.ts                          → 类型定义
  db.ts                             → SQLite 数据层（建表 + CRUD + 迁移）
  ai.ts                             → AI 调用（苏格拉底 / 总结 / 洞察）
  stats.ts                          → 纯统计函数（天数/周期/进度增量/热力图）
  export.ts                         → 笔记导出（Markdown / 纯文本 / HTML）
  share.ts                          → 平台分享/下载
  utils.ts                          → 纯工具（日期、进度、解析）
  openlibrary.ts                    → 图书搜索（Open Library）
  components/                       → Drawer / NoteCard / HeatMap / BarChart / BookCover / StarRating / ExportButtons
__tests__/                          → 单测（utils / ai / stats / export / period / migration）
```

## 5. Code Style（代码风格）

TypeScript + 函数式风格，命名用驼峰，类型集中在 `types.ts`。**纯逻辑与 I/O 分离**：`db.ts`/`ai.ts`/`stats.ts`/`export.ts` 只做数据/网络/计算，不做 UI；`utils.ts` 完全无副作用。

约定：不写 `any`；字符串统一用 `'`；新逻辑先写测试（test-driven）。

---

## 6. Data Model（数据模型）

### Book
```
id, title, author, publisher?, publishYear?, isbn?, pageCount?, coverUrl?,
status: 'reading' | 'finished',
readCount: number       // 已读完遍数，默认 0；「正在读第 x 遍」= readCount+1
rating?: number         // 0–5，未评 undefined
startedAt?, finishedAt?, createdAt
```

### ReadingEntry（每日笔记/记录）
```
id, bookId, date(YYYY-MM-DD),
currentPage?, progressPercent?, pagesRead?,
comment: string                  // 必填
mode: 'plain' | 'chat'
discussion?: DiscussionTurn[]    // 苏格拉底对话（chat 模式）
aiSummary?: string               // 对话结束时 AI 给的总结（替代原 aiKeyPoints）
createdAt
```

### Reflection（洞察报告）
```
id, bookId, content, createdAt
```

### Settings
```
key, value  （baseUrl / apiKey / model）
```

### Migration
本地个人 App、数据量小：`ALTER TABLE ADD COLUMN`（`readCount DEFAULT 0`、`rating INTEGER`、新增 `aiSummary TEXT`），加在 `initDatabase()` 的 `CREATE TABLE IF NOT EXISTS` 之后跑迁移。

---

## 7. Testing Strategy（测试策略）

- **框架**：Jest；只测**纯逻辑**。
- **覆盖**：`utils.ts` 日期/进度/解析、`ai.ts` 苏格拉底提示词/总结、`stats.ts` 天数/周期/增量、`export.ts` 三格式生成。
- **不做**：UI 快照、端到端自动化。
- **验收**：`npx tsc --noEmit` + `npm test` 通过 + iOS 手动跑通核心流程。

---

## 8. Boundaries（边界）

- **Always**：提交前类型检查 + 测试通过；数据只存本地；AI 仅手动触发；评论必填；笔记与对话一起保存。
- **Ask first**：新增依赖包；改数据表结构；改 AI 行为；上架/发布。
- **Never**：把 API Key 写进代码或提交（走 `.env`）；用 iCloud/云同步；自动触发 AI；把数据传到任何远端。

---

## 9. Success Criteria（验收标准）

1. 抽屉菜单导航：首页 / 书库 / 统计 / 日历 / 设置 全部可达。
2. 首页打开即**笔记瀑布流**，按时间倒序；底部居中绿色「＋」可开弹窗记录。
3. 新增笔记弹窗：书名（书库自动补全，无则「添加图书」）、进度（至少一项）、笔记（必填）。
4. 「提交」= 直接保存；「与 AI 聊天」= 进苏格拉底对话，AI 判断结束或达 10 轮上限 → 给总结，写回笔记。
5. 笔记 >5 条时可触发生成洞察报告（≤500 字），存为 Reflection。
6. 图书详情：封面 / 5 星 / heat map 卡 / 信息卡（距上次 x 天、已读 x 天） / 笔记列表 / 标记读完（readCount++） / 导出。
7. 统计页：周/月/年切换；读完的书 / 开始读的书 / 进度排名（周月 ≤5，年 ≤10）；含横条图 + 热力图。
8. 导出：单本书（图书详情）+ 全部（设置），txt/md/html 三格式；iOS 走系统分享。
9. 设置里填 DeepSeek Key 可用；切换 Ollama 后离线可用。
10. 数据只存本地；不联网可记录、只读。

---

## 10. 已确认决策

1. ✅ 进度记录：同时支持**页数**和**百分比**，至少填一项。
2. ✅ 日历视图：保留。
3. ✅ 单测：纯逻辑 Jest 单测。
4. ✅ 封面 + 搜索：外部搜索带封面，搜不到可手动录入；**中文优先搜索源**。
5. ✅ **苏格拉底式 AI**：四阶段 + 六类，AI 判断结束，上限 10 轮。
6. ✅ **评论必填**（强制写想法）。
7. ✅ **笔记导出**：纯文本 + Markdown + HTML 三格式。
8. ✅ **遍数判定**：读完后再记录 = 自动进入下一遍（`readCount++`）。
9. ✅ **洞察报告**：>5 条笔记 + 字数限制 500 字。
10. ✅ **图表**：横条图 + 热力图（53×7），免依赖。
11. ✅ **导航**：底部 Tab → 左侧抽屉菜单。
12. ✅ **首页**：笔记瀑布流 + 悬浮「＋」开弹窗记录。
13. ✅ **5 星评级**：图书详情可设置/查看。

---

## 11. 能力地图与迭代顺序

| 能力 | 说明 | 阶段 |
|---|---|---|
| 记录核心 | 图书 / 笔记 / 苏格拉底对话 / 整理（洞察报告） | **Phase 2（当前）** |
| 统计图表 | 周/月/年统计 + 横条图 + 热力图 | Phase 2（与记录核心一起交付） |
| 图书推荐 | AI 结合状态推荐书库内图书 | Phase 3 |

---

## 12. 统计功能

- 周期：**周 / 月 / 年**，可切换；以**图表**展示。
- 统计项：
  1. **读完的书**：本周期内标记「读完」的书（`finishedAt` 落在周期内）。
  2. **开始读的书**：本周期内有首条记录的书。
  3. **各书本周期进度**：按「周期内进度增量」从高到低排序，**周/月 ≤前 5，年 ≤前 10**。
     - 增量 = 周期末进度 − 周期初基线（周期开始前最近一条记录）。
- **图书级统计**（图书详情页）：
  - 实际读书天数（去重日期数）
  - 阅读周期（首末记录间隔 +1 天）
  - 上次打开 x 天前
  - 正在读第 x 遍 / 已读完 x 遍
  - 个人 5 星评级
- **图表**：
  - **横条图**：进度排名，比例条形。
  - **热力图**：一年 53×7 网格，颜色深浅 = 当日笔记数；全局（首页顶部 / 统计页）和按书（图书详情）。

---

## 13. 苏格拉底 AI

- **场景**：写完一条笔记 → 选「与 AI 聊天」→ 进入对话。
- **四阶段**（每轮递进）：① 获取信息 → ② 倾听并反馈 → ③ 总结 → ④ 提出开放性问题。
- **六类问题**（轮流、避免重复）：
  1. 澄清问题
  2. 检验假设
  3. 检视证据
  4. 探索多元观点
  5. 推演后果和影响
  6. 关于问题本身的追问
- **结束判断**：用户想法充分展开时主动总结；**上限 10 条**提问。
- **输出**：对话 + `aiSummary`（总结）一起写回对应笔记。

---

## 14. 导出

- **内容**：以 Markdown 为中间格式（书名/作者 + 逐条：日期、进度、评论、对话、总结）。
- **格式**：纯文本（去标记）、Markdown、HTML（简单模板，不引渲染库）。
- **入口**：图书详情「导出笔记」（单本）+ 设置「导出全部笔记」。
- **平台**：iOS 系统分享（`expo-sharing`）；Web Blob 下载。

---

## 15. UI 规范（来自 `UI/` 设计稿）

- **配色**：浅灰背景 `#f0f0f0`、白色圆角卡、绿色主 `#7CB342`、蓝色辅 `#208AEF`、金色 `#FFC107`。
- **导航**：左滑抽屉（默认隐藏）。
- **首页**：单列白卡瀑布流，底部居中绿色实心圆「＋」。
- **新增笔记弹窗**：底部上拉，键盘右上「与 AI 聊天」绿色、右下「提交」蓝色。
- **AI 对话**：左 AI / 右用户气泡。
- **书库**：顶部搜索框；「最近在读」3 列 + 「我的书库」3 列（首位「＋」灰卡）。
- **图书详情**：封面（白方块）→ 5 星 → heat map 绿色卡 → 两枚白信息卡（距上次 / 已读）。