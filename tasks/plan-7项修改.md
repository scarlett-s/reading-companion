# 7 项修改 — 实施方案（Phase 2.5）

> 本文档为 7 项修改的唯一实施方案。对应 `tasks/todo.md` 的 T23–T29。
> 不改动根目录 `PLAN.md` 与 `tasks/plan.md`。

## 背景
Expo SDK 57 / React Native 0.86 + expo-router 文件路由 + expo-sqlite。目标 iOS 优先，Web 次要。
改动全部本地、离线，不引入新依赖。

## 1. 首页卡片：查看 / 编辑 / 删除 / 关联（双链）
- `db.ts`：新增 `links` 表（`id, fromEntryId, toEntryId, createdAt`，`UNIQUE(fromEntryId,toEntryId)`）；新增 `updateEntry` / `deleteEntry` / `addLink` / `removeLink` / `getLinksForEntry`（出链）/ `getBacklinksForEntry`（入链）。
- 新页面 `note/[id].tsx`：展示笔记详情 + 编辑 / 删除（二次确认）/ 关联其他笔记（选择器）/ 关联列表 + 反向链接。
- `note/new.tsx` 支持 `entryId` 参数进入编辑模式（预填 + `updateEntry`）。
- `NoteCard` 整卡可点 → 笔记详情；书名文字可点 → 书详情。
- `(drawer)/index.tsx` 透传 `entryId` / `bookId`。

## 2. 点击书名 → 书详情
- 同上，`NoteCard` 书名按钮 `onPressBook` → `/library/[id]`。

## 3. 键盘遮挡
- `KeyboardAvoidingView`（iOS `padding`）包裹：`note/new`、`note/chat/[entryId]`、`library/add`、`(drawer)/library`、`(drawer)/settings`。

## 4. 豆瓣读书搜索
- 新建 `douban.ts`：`GET https://book.douban.com/j/subject_suggest?q=...`；`mapDoubanResult`（封面 `/s/`→`/l/`）。
- `BookSearchResult` 提到 `types.ts`，`openlibrary.ts` / `douban.ts` / `library/add.tsx` 统一引用。
- `library/add.tsx` 加搜索源切换：豆瓣（默认）/ Open Library（英文备选）/ 手动录入。

## 5. 统计百分数保留 2 位
- `utils.ts` 加 `round2`；`BarChart` 显示 `round2(value)`；`formatProgress` 统一 `round2`。

## 6. AI 停止发问
- `ai.ts` 加 `detectStopIntent`；更新苏格拉底提示词：10 轮是上限不是目标，用户想法充分展开或表达想结束（就聊到这/下次再说等）即 `[[END]]` 收尾。

## 7. 预设告别回复
- `ai.ts` 加 `FAREWELL`（「我们下次再聊！」/「see you next time!」）+ `farewellFor`。
- `chat/[entryId].tsx`：命中停止意图时追加预设告别 turn 并直接 `finish()`。

## 测试
- `ai.test.ts`：`detectStopIntent` / `farewellFor` / 提示词新约束。
- `utils.test.ts`：`round2`。
- `douban.test.ts`：`mapDoubanResult` 映射 + 封面替换。

## 验收
- `npx tsc --noEmit` + `npm test` 通过；手动跑通核心流程。
