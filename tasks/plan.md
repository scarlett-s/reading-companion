# 实施计划（Phase 1：记录核心）

> 依据 [SPEC.md](../SPEC.md)。统计（§12）与推荐（§13）为后续迭代，不在本计划内。

## 组件与依赖

```
scaffold（Expo + TS + router + sqlite）
   │
   ├── types.ts ──────┐
   ├── utils.ts（纯函数，可测）│
   └── db.ts（SQLite）      │
          │                │
          ├── ai.ts（AI 通路）── settings 持久化
          │
          └── UI 层：
              book/search → book/list → book/[id]
              entry/new → entry/discuss
              (tabs)/index（首页记录）→ calendar → settings
```

依赖方向：`utils` 无依赖 → `db`/`ai` 依赖 `types` → UI 依赖 `db`/`ai`。

## 实施顺序（串行为主）

1. **脚手架** — Expo + expo-router + expo-sqlite + TS 严格模式，Web 可启动。
2. **类型 + 纯工具** — `types.ts`、`utils.ts`（日期/进度归一化/解析）+ 单测。
3. **数据层** — `db.ts` 建表 + CRUD +「按最近记录时间排序取最近 N 本」查询。
4. **AI 通路** — `ai.ts`（OpenAI 兼容 chat + 追问/提炼/整理三函数）+ 单测。
5. **设置页** — 填 baseUrl/apiKey/model，持久化到 SQLite。
6. **图书管理** — 搜索（带封面）→ 添加 → 列表 → 详情。
7. **首页 + 记录** — 打开即记录页，最近 3-4 本；记录页数/百分比 + 直接保存评论。
8. **Discuss 模式** — AI 提问最多 3 轮 + 提炼，随评论保存。
9. **整理/回顾** — 图书详情页一键整理，存 Reflection。
10. **日历视图** — 按天显示阅读记录。
11. **打磨 + 验收** — 逐条对照 SPEC §9 成功标准，Web + iOS 跑通。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Web 端 SQLite（WASM）兼容 | expo-sqlite 官方支持 web，早期用 Web 实测验证 |
| 图书搜索接口不稳定（Open Library 限流） | 结果缓存 + 手动录入兜底；必要时加 Google Books 备选 |
| AI Key 泄露 | 走 `.env`（gitignore），设置页输入存本地 SQLite，不进代码 |
| Discuss 输出格式不稳定 | 提示词约束 + `utils` 解析函数单测覆盖 |

## 验证检查点

- 每个任务后：`npx tsc --noEmit` 通过；涉及纯逻辑时 `npm test` 通过。
- 里程碑 M1（任务 1-3 后）：数据层可独立读写，单测绿。
- 里程碑 M2（任务 5-7 后）：能添加图书并记录进度、直接保存评论。
- 里程碑 M3（任务 8-10 后）：Discuss 与整理跑通。
- 终验：对照 SPEC §9 全部成功标准。
