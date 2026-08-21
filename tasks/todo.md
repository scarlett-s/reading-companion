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

---

## Phase 2.5（7 项修改）

> 用户反馈的 7 项修改，详见 `tasks/plan-7项修改.md`。

- [x] **T23 首页卡片可查看/编辑/删除/双链**：`db.ts` 新增 `links` 表 + `updateEntry`/`deleteEntry`/`addLink`/`removeLink`/`getLinksForEntry`/`getBacklinksForEntry`；新建 `note/[id].tsx`（查看/编辑/删除/关联/反向链接）；`note/new.tsx` 支持编辑；`NoteCard` 可点击 + 书名可点；首页透传 id/bookId
  - Acceptance：卡片点按进详情；编辑/删除可用；关联后双方可见（双向链接）
  - Verify：`npx tsc --noEmit`；手动（Web + iOS）
  - Files：`src/db.ts`、`src/app/note/[id].tsx`、`src/app/note/new.tsx`、`src/components/NoteCard.tsx`、`src/app/(drawer)/index.tsx`

- [x] **T24 点击卡片书名进书详情**：`NoteCard` 书名按钮 → `/library/[id]`
  - Acceptance：点击书名进入对应图书详情页
  - Verify：手动
  - Files：`src/components/NoteCard.tsx`、`src/app/(drawer)/index.tsx`

- [x] **T25 键盘遮挡输入框**：`KeyboardAvoidingView` 包裹所有输入屏幕
  - Acceptance：新增笔记 / 与 AI 对话等输入时键盘不遮挡
  - Verify：手动（iOS）
  - Files：`src/app/note/new.tsx`、`src/app/note/chat/[entryId].tsx`、`src/app/library/add.tsx`、`src/app/(drawer)/library/index.tsx`、`src/app/(drawer)/settings.tsx`

- [x] **T26 豆瓣读书搜索**：`douban.ts` + `BookSearchResult` 提到 `types.ts` + `library/add.tsx` 搜索源切换
  - Acceptance：豆瓣搜中文书可命中；Open Library 仍作英文备选
  - Verify：手动 + `npm test`（`douban.test.ts`）
  - Files：`src/douban.ts`、`src/types.ts`、`src/openlibrary.ts`、`src/app/library/add.tsx`

- [x] **T27 统计百分数保留 2 位**：`utils.ts` `round2` + `BarChart`/`formatProgress` 统一
  - Acceptance：统计页百分数只保留 2 位小数
  - Verify：`npm test` + 手动
  - Files：`src/utils.ts`、`src/components/BarChart.tsx`

- [x] **T28 AI 停止发问**：`ai.ts` `detectStopIntent` + 提示词强调上限非目标、用户想结束即收尾
  - Acceptance：AI 不再必问满 10 轮；用户表达停止意愿即终止
  - Verify：`npm test` + 手动（需 AI）
  - Files：`src/ai.ts`、`src/app/note/chat/[entryId].tsx`

- [x] **T29 预设告别回复**：`ai.ts` `farewellFor` + chat 页命中停止意图直接以预设回复收尾保存
  - Acceptance：用户说「就聊到这」等 → 回复「我们下次再聊！」/「see you next time!」并保存
  - Verify：`npm test` + 手动
  - Files：`src/ai.ts`、`src/app/note/chat/[entryId].tsx`

---

## Phase 2.5 Round 2 — UI 重新设计（参考 ref-landingpage / ref-editcard / ref-dashboard）

> 9 项 UI 调整；详见 `tasks/plan-7项修改-round3.md`。
> 决策：菜单不加「复制」；chat 键盘用 `react-native-keyboard-controller`；豆瓣详情失败时部分字段也填。

- [x] **T30 首页样式参考 ref-landingpage**：`NoteCard` 圆角 16 / 间距 16 / 阴影更浅；正文 4 行 + 「展开」蓝色文字；整卡可点进详情；右上「…」打开菜单
  - Files：`src/components/NoteCard.tsx`、`src/app/(drawer)/index.tsx`

- [x] **T31 卡片…白卡菜单 + AI 对话禁用**：新组件 `NoteMenu`；首项按 `entryHasAI` 灰/绿色；底部字数 + 最后编辑
  - Files：`src/components/NoteMenu.tsx`、`src/components/NoteCard.tsx`、`src/app/(drawer)/index.tsx`、`src/app/note/[id].tsx`

- [x] **T32 卡片右下 AI 小标记**：抽 `entryHasAI(entry)` 到 `utils.ts`；底部右胶囊（绿/灰）
  - Files：`src/utils.ts`、`src/components/NoteCard.tsx`、`__tests__/utils.test.ts`

- [x] **T33 豆瓣搜索信息补全**：`fetchDoubanDetail` HTML 解析；`BookSearchResult` 加 `translator`；`Book` 加 `translator`；in-memory cache；失败时已抓到的字段保留
  - Files：`src/douban.ts`、`src/types.ts`、`src/db.ts`、`src/app/library/add.tsx`、`__tests__/douban.test.ts`

- [x] **T34 笔记详情「查看对话」改文字 + 弹窗**：蓝色文字按钮；点击弹 `Modal` 显示对话气泡
  - Files：`src/app/note/[id].tsx`

- [x] **T35 AI 对话输入框不被键盘遮挡**：内置 `KeyboardAvoidingView` + `Keyboard.addListener` 监听键盘高度顶起 footer（**不引 native 依赖**，保证 Expo Go 可跑）
  - Files：`src/app/note/chat/[entryId].tsx`

- [x] **T36 笔记输入界面按钮位置**：「与 AI 对话」屏幕右下角（`KeyboardStickyView`）；iOS「提交」在 `InputAccessoryView` 内（键盘顶端）；Android 保留底部
  - Files：`src/app/note/new.tsx`

- [x] **T37 Drawer 抽屉样式重设计**：宽 320、品牌头、行高 56、选中态绿条 + 浅灰底
  - Files：`src/components/Drawer.tsx`

- [x] **T38 测试 + 验收**：`entryHasAI` / `fetchDoubanDetail` 测试；`npx tsc --noEmit` + `npm test` 通过