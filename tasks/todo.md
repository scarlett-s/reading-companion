# 任务清单（Phase 1：记录核心）

- [ ] **T0 脚手架**：初始化 Expo + TypeScript + expo-router + expo-sqlite，Web 可启动
  - Acceptance：`npm run web` 起 Web 无报错；目录结构就位；TS 严格模式
  - Verify：`npm run web` 启动；`npx tsc --noEmit` 通过
  - Files：package.json、app.json、tsconfig.json、babel.config.js、app/_layout.tsx、app/(tabs)/*、.gitignore、.env.example

- [ ] **T1 类型 + 纯工具**：`types.ts` 全类型；`utils.ts` 日期/进度归一化/关键点解析纯函数
  - Acceptance：类型齐全；纯函数可独立测试
  - Verify：`npm test`
  - Files：src/types.ts、src/utils.ts、__tests__/utils.test.ts

- [ ] **T2 数据层**：`db.ts` 建表 + CRUD + 最近 N 本书查询
  - Acceptance：books/entries/settings/reflections 表可读写；`getRecentBooks(n)` 按最近记录时间排序
  - Verify：`npx tsc --noEmit`；`npm test`（若有可测纯逻辑）
  - Files：src/db.ts

- [ ] **T3 AI 通路**：OpenAI 兼容 chat + generateQuestion / extractKeyPoints / synthesizeBook
  - Acceptance：三函数可用，支持 DeepSeek 与 Ollama
  - Verify：`npm test`（提示词构建 + 解析，mock fetch）
  - Files：src/ai.ts、__tests__/ai.test.ts

- [ ] **T4 设置页**：填写 baseUrl / apiKey / model 并持久化
  - Acceptance：设置写入 SQLite，重进仍保留；不写死任何 Key
  - Verify：手动（web）；`npx tsc --noEmit`
  - Files：app/(tabs)/settings.tsx

- [ ] **T5 图书管理**：搜索添加（带封面）+ 手动录入 + 列表 + 详情
  - Acceptance：书名搜索显示带封面结果；可保存；可手动录入；全部图书列表；详情页展示
  - Verify：手动（web + iOS）
  - Files：app/book/search.tsx、app/book/list.tsx、app/book/[id].tsx

- [ ] **T6 首页 + 记录（直接保存）**：打开即记录页 + 最近 3-4 本 + 记录进度/评论
  - Acceptance：首页是记录页；显示最近 3-4 本（最近记录时间排序）；记录页数/百分比 + 评论，plain 保存
  - Verify：手动
  - Files：app/(tabs)/index.tsx、app/entry/new.tsx

- [ ] **T7 Discuss 模式**：AI 提问最多 3 轮 + 提炼，随评论保存
  - Acceptance：评论后进入 discuss；最多 3 轮；结束保存评论 + 对话 + 要点
  - Verify：手动（需 DeepSeek key 或 Ollama）
  - Files：app/entry/discuss.tsx、src/ai.ts

- [ ] **T8 整理/回顾**：图书详情页一键整理并保存 Reflection
  - Acceptance：一键生成结构化思考；保存并可重复查看
  - Verify：手动
  - Files：app/book/[id].tsx、src/ai.ts、src/db.ts

- [ ] **T9 日历视图**：按天显示阅读记录
  - Acceptance：日历高亮有记录的天，可点看当天记录
  - Verify：手动
  - Files：app/(tabs)/calendar.tsx

- [ ] **T10 打磨 + 验收**：逐条对照 SPEC §9
  - Acceptance：全部成功标准通过；Web + iOS 跑通；离线记录可用
  - Verify：SPEC §9 逐条核对
  - Files：跨文件收尾
