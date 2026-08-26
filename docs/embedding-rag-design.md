# Embedding Pipeline 与渐进式 RAG — 技术设计

> 本文档是 embedding / retrieval / RAG 三层的唯一事实来源。改架构先改这里。
> 实现依据：`tasks/为阅读笔记 APP 搭建 Embedding Pipeline 与渐进式 RAG.md`

## 1. 目标（一句话）

从用户保存第一条笔记起就为其生成并持久化 embedding，历史笔记逐渐形成语义索引；「跟 AI 聊聊」时按相关性检索历史笔记注入上下文，检索不到足够相关内容就自动退回普通对话——用户无感知、不阻塞保存、失败不丢笔记。

## 2. 现状与边界

- **无后端**：纯 Expo/React Native 客户端。AI 直连 OpenAI 兼容接口（DeepSeek / Ollama / OpenAI）。
- **API Key 现状**：存在本地 SQLite `settings` 表，用户在「设置」页手填，运行时读取——**不硬编码进代码/提交**，符合单用户离线优先定位。
- **生产环境说明**：真正的多用户产品不应在客户端持有 Key，应加一层 server-side proxy（转发 + 托管 Key + 限流）。本 App 是单用户自用，沿用现有「用户自填 Key、本地调用」模式即可，embedding 也走同一通路，不引入新后端。

## 3. 已确认决策

| 决策点 | 结论 |
|---|---|
| Embedding 接口 | OpenAI 兼容 `/embeddings`（复用 `baseUrl`+`apiKey`，新增 `embeddingModel` 设置） |
| RAG 注入范围 | 仅「跟 AI 聊聊」（苏格拉底对话），洞察报告维持现状 |
| Backfill 触发 | App 启动自动、非阻塞、限流 |

## 4. 数据模型

新增表 `note_embeddings`（独立于 `entries`，可回溯、可重生成）：

| 列 | 类型 | 说明 |
|---|---|---|
| `note_id` | TEXT PK | 对应 `entries.id`，永远能回溯到原始笔记 |
| `embedding` | TEXT | `JSON.stringify(number[])`，`ready` 前为 NULL |
| `model` | TEXT | 生成所用的 embedding model 名 |
| `dimensions` | INTEGER | 向量维度（= 数组长度） |
| `content_hash` | TEXT | `comment` 的哈希，用于去重/变更检测 |
| `status` | TEXT | `pending` / `ready` / `failed` |
| `created_at` | INTEGER | |
| `updated_at` | INTEGER | |

- 建表用 `CREATE TABLE IF NOT EXISTS`（幂等），不迁移/不动 `entries`，**现有本地数据零丢失**。
- `content_hash` 只对 `comment`（语义内容）计算；进度/书名变化不触发重生成。

## 5. Embedding Provider 抽象

```ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  modelInfo(): { model: string; dimensions: number };
}
```

- 默认实现 `OpenAIEmbeddingProvider`：按 baseUrl 自动选端点——
  - **Ollama**（`:11434`）→ 原生 `POST {origin}/api/embed`，body `{ model, input }`，取 `embeddings[0]`（与 baseUrl 是否带 `/v1` 无关）。
  - **其它（OpenAI 等）** → `POST {baseUrl}/embeddings`，body `{ model, input }`，取 `data[0].embedding`。
  - 请求前 `console.log` URL/body、响应后 `console.log` status/body，错误信息也带三者，便于真机排查。
- `model` 解析：`settings.embeddingModel` 优先；为空则 `baseUrl` 含 `11434`（Ollama）默认 `nomic-embed-text`，否则 `text-embedding-3-small`。
- 后续可换云端其它家 / 自部署 / 本地 on-device，只需新增一个 provider 实现，**retrieval 层不动**。

## 6. Pipeline（不阻塞保存）

| 事件 | 触发 | 行为 |
|---|---|---|
| 新建笔记 | `addEntry` 之后 | `onEntrySaved(id)` 异步 fire-and-forget |
| 编辑笔记 | `updateEntry` 之后 | `content_hash` 未变 → 跳过；变了 → 重新生成 |
| 删除笔记 | `deleteEntry` 之后 | 同步删/失效对应 embedding |

- `onEntrySaved(id)`：读 entry → 算 hash → 已有同 hash 且 `ready` 则跳过；否则 `embed(comment)` → 成功 upsert `ready`，失败标 `failed`。
- **失败绝不导致笔记保存失败**（fire-and-forget，异常内捕获）。
- **重试**：`failed`/`pending` 记录由 backfill 重新拉取处理。
- **Backfill**：`backfillEmbeddings()` 找「无 `ready` embedding 的 entry」，限流（每批 ≤20，串行）补生成；`settings.baseUrl` 为空（未配 AI）时直接跳过，避免把 pending 误标 failed。

## 7. Semantic Retrieval（本地 SQLite + JS cosine）

- 向量存 SQLite，JS 里算 cosine similarity（几百~几千条完全够，不引 vector DB）。
- 纯函数（可单测）：`cosineSimilarity(a,b)`、`retrieveSimilar(queryVec, all, { excludeId, topK, threshold })`。
- 流程：取当前 note 的 embedding 作 query → 与所有 `ready` 向量比 → 排除自身 → 阈值过滤 → Top-K。
- **Retrieval 证据**：返回 `{ noteId, score }[]`，为将来「为什么关联这条」预留。
- retrieval 层接口独立，数据规模变大后可替换为向量索引/vector DB。

## 8. 渐进式 RAG 注入

`note/chat/[entryId].tsx` 首次生成问题时：

1. 取当前 entry 的 embedding 作 query；
2. 无 embedding / 检索无达标结果 → **走原 `buildSocraticMessages`，无感知退化**；
3. 有达标历史笔记 → 拼入 system prompt 的「相关历史笔记」上下文块，正文仍只含当前笔记 + 对话。

后续每一轮提问都沿用同一批检索结果（存 ref）。

### Token / 上下文控制（§6）

- `MAX_RETRIEVED = 3`（Top-K）
- `MIN_SIMILARITY = 0.5`（阈值）
- 每条历史笔记正文截断 ≤ 200 字
- 去除与当前笔记 content_hash 相同 / 与更高分结果相似度 > 0.98 的重复项
- 宁可少而精，绝不把全部历史笔记塞给 LLM

## 9. 派生数据原则

用户原始 `entries.comment` 永远是 source of truth。`note_embeddings`（及 `aiSummary`/`discussion` 等）均为**可重新生成**的派生数据，AI 内容绝不覆盖用户原始笔记。删除笔记时派生数据一并清理。

## 10. 文件改动清单

| 文件 | 改动 |
|---|---|
| `src/types.ts` | 新增 `NoteEmbedding` / `EmbeddingStatus` / `EmbeddingProvider`；`AISettings` 加 `embeddingModel` |
| `src/db.ts` | 建 `note_embeddings` 表 + 读写/删除/按状态查询/缺 embedding 查询；`getSettings` 返回 `embeddingModel` |
| `src/embedding.ts`（新） | provider + hash + pipeline（`onEntrySaved`/`onEntryDeleted`/`backfillEmbeddings`）+ retrieval 纯函数 |
| `src/ai.ts` | `buildSocraticMessages` 支持注入「相关历史笔记」上下文 |
| `src/app/note/chat/[entryId].tsx` | 首次加载做 retrieval，达标则注入；不达标退回原流程 |
| `src/app/note/new.tsx` | `addEntry`/`updateEntry` 后 fire-and-forget 触发 pipeline |
| `src/app/(drawer)/index.tsx` | `saveEdit` 后触发 pipeline |
| `src/components/NoteMenu.tsx` | `deleteEntry` 后删 embedding |
| `src/app/(drawer)/settings.tsx` | 新增「embedding model」设置项 |
| `src/app/_layout.tsx` | 启动后自动 `backfillEmbeddings()` |
| `__tests__/embedding.test.ts`（新） | 单测 hash / cosine / retrieveSimilar |

## 11. 约束（持续遵守）

- **Always**：提交前 `tsc` + `test` 通过；embedding 从第一条笔记开始生成；embedding 是派生数据、可重生成；RAG 渐进启用；无高质量结果自动 fallback；不发送全部历史笔记给 LLM。
- **Never**：API Key 硬编码/提交；embedding 阻塞笔记保存；embedding 失败导致笔记丢失；因 RAG 引入独立 vector DB（当前规模不需要）。
