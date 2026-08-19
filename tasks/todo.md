# 任务清单（Phase 2：iOS 优先 + 苏格拉底 + 统计 + 导出）

> T0–T10 已完成（Phase 1 记录核心）。本清单为 Phase 2。

---

## Phase 2 主线

- [ ] **T11 数据模型扩展**：`Book.readCount` / `Book.rating` / `ReadingEntry.aiSummary`、迁移、`db.ts` 新增 `markFinished` / `updateEntryDiscussion` / `countEntriesByBook` / `getEntriesByDateRange` / `setBookRating`
  - Acceptance：旧数据库迁移不丢数据；新字段可读写；新函数通过单测
  - Verify：`npx tsc --noEmit`；`npm test`（新增 db 路径测试）
  - Files：`src/types.ts`、`src/db.ts`、`__tests__/db-migrations.test.ts`

- [ ] **T12 统计纯函数**：天数 / 周期 / 上次打开 / 周期进度增量 + 单测
  - Acceptance：`stats.ts` 纯函数可独立测试
  - Verify：`npm test`（`__tests__/stats.test.ts`）
  - Files：`src/stats.ts`、`__tests__/stats.test.ts`

- [ ] **T13 苏格拉底 AI 重构**：提示词 + `generateSocraticQuestion` + `buildSocraticSummaryMessages` + 升级 `synthesizeBook`（洞察报告，≤500 字）+ 单测
  - Acceptance：提示词含四阶段 + 六类 + 一次一问 + ≤10；总结写回；洞察报告有字数约束
  - Verify：`npm test`（更新 `__tests__/ai.test.ts`）
  - Files：`src/ai.ts`、`__tests__/ai.test.ts`

- [ ] **T14 抽屉导航 + 首页瀑布流**：自实现 `Drawer` 组件 + `(drawer)/_layout.tsx` + 首页单列白卡瀑布流 + 底部居中绿色「＋」FAB
  - Acceptance：抽屉可左滑/汉堡打开；首页瀑布流按时间倒序；FAB 可点击开 note/new
  - Verify：手动（Web + iOS）；对照 `UI/landing-page.png`
  - Files：`src/components/Drawer.tsx`、`src/app/(drawer)/_layout.tsx`、`src/app/(drawer)/index.tsx`、`src/components/NoteCard.tsx`

- [ ] **T15 新增笔记弹窗**：`note/new.tsx`，书名（库内自动补全 + 库外「添加图书」）、进度（页数 / 百分比，至少一项）、笔记（必填）；「提交」= 直接保存；「与 AI 聊天」= 进对话
  - Acceptance：评论为空时两按钮均禁用；提交保存笔记；点 AI 聊天进入对话页携带 entryId
  - Verify：手动（Web + iOS）；对照 `UI/input-note.png`
  - Files：`src/app/note/new.tsx`

- [ ] **T16 AI 对话页**：苏格拉底对话，AI 判断结束 / ≤10 轮，结束 AI 给总结写回笔记
  - Acceptance：最多 10 条提问；AI 主动结束或上限触发总结；`aiSummary` 写回对应 entry
  - Verify：手动（需 DeepSeek key 或 Ollama）；对照 `UI/AI-chatbox.png`
  - Files：`src/app/note/chat/[entryId].tsx`（改造旧 `entry/discuss.tsx`）

- [ ] **T17 书库 + 添加图书**：`library/index.tsx`（库内搜索 + 「最近在读」/「我的书库」分组 + 「＋」卡）+ `library/add.tsx`（外部搜索 + 「添加图书」+ 手动录入）
  - Acceptance：库内搜索可用；分组正确；首位「＋」卡可跳 add；外部搜索带封面
  - Verify：手动；对照 `UI/library.png` 与 `UI/add-book.png`
  - Files：`src/app/library/index.tsx`、`src/app/library/add.tsx`

- [ ] **T17.1 中文优先搜索源**：选定 Google Books 或豆瓣读书并接入；Open Library 降级为英文备选（待用户确认选哪个）
  - Acceptance：中文书名搜索能命中；失败回退 Open Library
  - Verify：手动
  - Files：`src/openlibrary.ts`（或新建 `src/booksearch.ts`）

- [ ] **T18 图书详情**：封面 / 5 星 / heat map 卡 / 信息卡（距上次 x 天、已读 x 天）/ 笔记列表 / 标记读完（readCount++）/ 导出 / 洞察报告（>5 笔记）
  - Acceptance：封面信息全展示；5 星可点设/改；标记读完触发 readCount++；笔记 >5 时洞察按钮可用；导出按钮可用
  - Verify：手动；对照 `UI/book-detail.png`
  - Files：`src/app/library/[id].tsx`、`src/components/StarRating.tsx`、`src/components/HeatMap.tsx`

- [ ] **T19 统计页**：周 / 月 / 年切换；读完的书 / 开始读的书 / 进度排名（周月 ≤5、年 ≤10）；BarChart + HeatMap
  - Acceptance：三个周期正确切换；排名限位正确；图表渲染正常
  - Verify：手动
  - Files：`src/app/stats/index.tsx`、`src/components/BarChart.tsx`

- [ ] **T20 导出**：Markdown / 纯文本 / HTML 三格式；iOS 用 `expo-sharing` + `expo-file-system`；Web 用 Blob 下载；入口：图书详情（单本）+ 设置（全部）
  - Acceptance：三格式内容正确（单测覆盖）；iOS 系统分享面板可用；Web 下载触发
  - Verify：`npm test`（`__tests__/export.test.ts`）+ 手动（iOS + Web）
  - Files：`src/export.ts`、`__tests__/export.test.ts`、`src/app/library/[id].tsx`（导出按钮）、`src/app/settings/index.tsx`（全部导出）

- [ ] **T21 SPEC + README + 验收**：对照 SPEC §9 + §10 逐条；`npx tsc --noEmit` 通过；`npm test` 通过；iOS 手动跑通核心流程
  - Acceptance：SPEC §9 全部勾选；README 反映新设计稿与流程
  - Verify：SPEC §9 核对清单 + GitHub issue 模板
  - Files：`SPEC.md`、`README.md`

---

## Phase 3（暂排期）

- [ ] **T22 图书推荐**：手动唤起、限书库内；先问状态问题；推荐后刷掉 3-4 本弹「今天别读了」

---

## 已完成（Phase 1，仅备查）

- [x] T0 脚手架：Expo + TS + router + sqlite
- [x] T1 类型 + 纯工具函数
- [x] T2 数据层 db.ts
- [x] T3 AI 通路 ai.ts
- [x] T4 设置页
- [x] T5 图书管理（搜索/添加/列表/详情）
- [x] T6 首页记录 + 直接保存评论
- [x] T7 Discuss 模式
- [x] T8 整理/回顾
- [x] T9 日历视图
- [x] T10 打磨 + 验收

详见 `report/2026-08-18-report.md`。