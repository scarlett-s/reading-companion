# 实施计划（Phase 2：iOS 优先 + 苏格拉底 + 统计 + 导出）

> 依据 [SPEC.md](../SPEC.md)。Phase 1（T0–T10，记录核心）已完成，本计划为 Phase 2（iOS 优先重构）。Phase 3 推荐在 SPEC §11 单独排期。

## 阶段边界

- **已完成（Phase 1）**：T0–T10。详见 `report/2026-08-18-report.md` 与 git log。
- **本阶段（Phase 2）**：T11–T21。本计划聚焦这里。

## 目标（一句话）

把「记录核心」按 iOS 优先 + 设计稿（`UI/`）重做：抽屉导航、首页瀑布流 + 悬浮「＋」、新增笔记弹窗、苏格拉底式 AI（替代旧 3 轮 Discuss）、阅读统计（横条图 + 热力图）、笔记导出（txt/md/html）。

## 组件与依赖

```
types.ts（核心数据 + Book.readCount + Book.rating + ReadingEntry.aiSummary）
   │
   ├── utils.ts（日期/进度/解析）
   ├── stats.ts（纯统计：天数/周期/增量）→ stats.test.ts
   ├── export.ts（纯导出：Markdown/纯文本/HTML）→ export.test.ts
   ├── db.ts（迁移 + markFinished + updateEntryDiscussion + countEntriesByBook + getEntriesByDateRange + setBookRating）
   └── ai.ts（苏格拉底提示词 + generateSocraticQuestion + buildSocraticSummaryMessages + 升级 synthesizeBook）→ ai.test.ts
       │
       └── UI 层：
           (drawer)/_layout    抽屉壳子（Drawer.tsx 组件）
             ├─ index           首页瀑布流 + NoteCard + 悬浮「＋」
             │    └─ 跳 note/new
             ├─ library         书库（库内搜索 + 「最近在读」/「我的书库」+ 「＋」卡）
             │    ├─ library/[id]  详情（封面/5星/heat map/信息卡/笔记/洞察/导出/标记读完）
             │    └─ library/add    添加（外部搜索 + 手动录入）
             ├─ stats           周/月/年 + BarChart + HeatMap
             ├─ calendar        日历
             ├─ settings        AI 配置 + 全部导出入口
             └─ note/new        弹窗（书名/进度/笔记）→ 提交 / 与 AI 聊天
                  └─ note/chat/[entryId]   苏格拉底对话
```

依赖方向：`utils`/`stats`/`export` 无依赖 → `db`/`ai` 依赖 `types` → UI 依赖全部。

## 实施顺序（串行为主，验证可滚）

### Phase 2 主线
1. **T11 数据模型扩展**：迁移 + 新字段 + 新 db 函数 + 单测覆盖 db 路径。
2. **T12 统计纯函数**：先写 stats.test.ts，再写 stats.ts（test-driven）。
3. **T13 苏格拉底 AI**：先 ai.test.ts，再 ai.ts 新提示词/函数；保留旧函数可平滑迁移。
4. **T14 抽屉导航 + 首页**：自实现 Drawer 组件 + (drawer)/_layout + 首页瀑布流 + 悬浮「＋」（**T0–T10 的首页要拆掉**）。
5. **T15 新增笔记弹窗**：note/new.tsx，书名自动补全/添加图书、进度、笔记（必填）；提交 / 与 AI 聊天两按钮。
6. **T16 AI 对话页**：note/chat/[entryId].tsx（改造旧 discuss.tsx），苏格拉底 ≤10 + AI 判断结束 + 总结写回。
7. **T17 书库 + 添加图书**：library/index.tsx + library/add.tsx（库内搜索 + 外部搜索 + 手动录入）。
8. **T18 图书详情**：library/[id].tsx，封面 / StarRating / HeatMap / 信息卡 / 笔记列表 / 标记读完 / 导出 / 洞察报告按钮（>5 笔记）。
9. **T19 统计页**：stats/index.tsx + BarChart + HeatMap（53×7）。
10. **T20 导出**：export.ts + iOS 分享（expo-sharing/file-system）+ Web Blob 下载。
11. **T21 SPEC/README + 验收**：对照 SPEC §9 + §10 逐条勾；tsc + test；iOS 手动跑通。

### 中文搜索源（子任务，依需求插入 T17）
- **T17.1 中文优先搜索源**：评估 Google Books vs 豆瓣读书 API；选定后接入（与「添加图书」页同步）。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 自实现抽屉手势与现有 Tabs 冲突 | 移除 `(tabs)/` 整体，切到 `(drawer)/` 目录；expo-router 路由不影响 |
| 苏格拉底 AI 提示词易飘 | 提示词强约束六类 + 一次一问 + 总结格式；`ai.test.ts` 断言关键词 |
| Web 端 SQLite 不支持 ALTER TABLE ADD COLUMN 旧模式 | 用 `try/catch` 包装迁移；或 `PRAGMA table_info` 检查列后再 ALTER |
| 新旧两条 AI 通路并存导致代码复杂 | T13 完成即弃用旧函数（`generateQuestion`/`extractKeyPoints`），保留可读调用站点直到 T16 |
| 视觉与设计稿脱节 | T14–T19 每完成一个页面就对 `UI/` 同名图过一遍；颜色用 SPEC §15 的统一变量 |
| 中文书搜索接口不稳/限流 | 选 Google Books（更稳）作默认；结果带本地 SQLite 缓存；失败回退 Open Library |

## 验证检查点

- 每任务后：`npx tsc --noEmit` 通过；纯逻辑任务 `npm test` 通过。
- **M1（T11–T13 后）**：数据迁移无破坏；苏格拉底提示词单测绿；统计纯函数绿。
- **M2（T14–T16 后）**：抽屉导航跑通；首页瀑布流可看；新增笔记弹窗可提交可进对话。
- **M3（T17–T19 后）**：书库分组正确；详情卡（含 5 星 / heat map）正常；统计图渲染。
- **M4（T20–T21 后）**：导出三格式可用；iOS 分享走通；SPEC §9 验收全过。

## 与 Phase 1 的差异（重点）

- **导航**：底部 Tabs → 左侧抽屉。
- **首页**：记录表单 → 笔记瀑布流 + 悬浮「＋」。
- **记录流程**：直接保存 / Discuss → 提交 / 与 AI 聊天（弹窗式）。
- **AI**：3 轮 Discuss + 提炼要点 → 苏格拉底（≤10 轮 + 总结写回）。
- **数据**：评论可空 → **必填**；新增 `readCount`/`rating`/`aiSummary`。
- **新模块**：stats / export / Drawer / NoteCard / HeatMap / BarChart / StarRating。
- **新依赖**：expo-sharing、expo-file-system（中文搜索源选定后再加 fetch 库）。