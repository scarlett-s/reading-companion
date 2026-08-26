请先检查当前 Reading Companion 项目的代码结构、数据库结构和 AI 对话实现，再设计并实现一套 Embedding Pipeline，为后续 RAG 提供基础。

不要修改现有 UI，也不要改变现有产品流程，除非确有技术必要。当前阶段以 MVP 为目标，避免引入不必要的复杂基础设施。

## 目标

从用户保存第一条笔记开始，就为笔记生成并保存 embedding，使历史笔记逐渐形成一个可检索的语义索引。

RAG 能力现在就应该存在于架构中，但只有在确实检索到高相关历史笔记时，才把这些历史笔记加入 AI 对话上下文。

如果没有检索到足够相关的历史内容，则自动退化为当前普通 AI 对话流程。

不要使用「用户达到 50 条笔记后才开启 RAG」这样的固定条数规则作为主要判断条件。

## 1. Embedding 数据结构

在不破坏现有 notes 数据结构的基础上，为 embedding 增加独立的数据记录。

至少保存：

- note_id
- embedding / vector
- embedding_model
- embedding_dimensions（如果有必要）
- content_hash
- created_at
- updated_at
- embedding 状态，例如 pending / ready / failed

Embedding 必须始终可以追溯回原始 note。

数据库 migration 必须保证现有本地数据不会丢失。

## 2. Embedding Pipeline

当笔记发生以下操作时：

- 新建笔记：生成 embedding
- 编辑笔记：只有语义内容发生变化时才重新生成 embedding
- 删除笔记：同步删除或使对应 embedding 失效

使用 content_hash 或类似机制，避免相同内容重复调用 embedding。

Embedding 生成不要阻塞用户保存笔记。尽量在保存成功后异步处理。

即使 embedding 生成失败，也不能导致用户笔记保存失败。

需要支持失败重试。

另外提供一个 backfill 机制，用于给已经存在但还没有 embedding 的历史笔记批量补生成 embedding。

## 3. Embedding Provider 抽象

不要把系统绑定到某一家 embedding 服务商。

建立统一接口，例如：

EmbeddingProvider
- embed(text)
- 获取当前模型信息

目前可以先使用云端 embedding API，但后续应该可以替换为：

- 其他云端 embedding API
- 自己部署的 embedding model
- 本地 / on-device embedding model

而不需要重写 retrieval 层。

不要把 API key 硬编码在 Expo / iOS 客户端中。

如果当前项目还没有安全的 server-side API 层，请先说明生产环境中应该如何处理，再决定当前 MVP 采用什么方式。

## 4. Semantic Retrieval

现在就实现一个基础语义检索服务。

当给定当前笔记或当前 AI 对话上下文时：

1. 获取当前内容的 embedding
2. 与历史笔记 embeddings 比较
3. 排除当前 note 本身
4. 找出最相关的历史笔记
5. 使用最低 similarity threshold 过滤低相关结果
6. 最终只返回少量 Top-K 结果

当前阶段优先保持简单。

如果预计单个用户只有几百或几千条笔记，可以直接在 SQLite 中保存 vectors，并在本地计算 cosine similarity。

不要因为使用 RAG 就立即引入独立 vector database。

但 retrieval 层需要保持可替换，以便以后数据规模增大后接入向量索引或 vector database。

## 5. 渐进式 RAG

当用户点击「跟 AI 聊聊」时：

当前笔记 / 当前对话
→ semantic retrieval
→ 判断检索质量

如果存在足够相关的历史笔记：

当前内容
+ 当前书籍相关上下文
+ 检索到的历史笔记
→ LLM

如果不存在足够相关的历史笔记：

当前内容
+ 当前书籍相关上下文
→ LLM

用户不需要看到「普通模式」和「RAG 模式」两个模式。

随着用户积累更多笔记，RAG 应该自然变得越来越有用。

不要把用户全部历史笔记发送给 LLM。

## 6. Token 与上下文控制

RAG 的一个重要目的就是减少不必要的 token 消耗。

需要明确限制：

- 最大检索笔记数量
- 历史笔记最多贡献多少字符或 token
- minimum similarity threshold
- 是否需要去除重复或高度相似的笔记

宁可只加入少量高度相关笔记，也不要大量堆积上下文。

同时保留 retrieval evidence，例如：

- 来源 note_id
- similarity score
- 为什么被检索出来

方便未来实现「为什么关联这条笔记」之类的解释功能。

## 7. 原始数据与 AI 派生数据必须分离

用户原始笔记始终是 source of truth。

以下内容都属于可重新生成的 derived data：

- embedding
- AI summary
- AI tags
- inferred relations
- topic clusters

不要让 AI 生成内容覆盖用户原始笔记。

## 8. 为未来功能预留架构，但现在不要实现

当前架构需要支持未来实现：

- 相关笔记推荐
- 自动笔记关联
- 兴趣 / 主题聚类
- 长期阅读兴趣变化
- 跨历史笔记 AI 洞察
- 基于阅读兴趣的书籍推荐
- semantic retrieval + full-text search 的 hybrid retrieval

但当前任务不要实现：

- Knowledge Graph
- Topic clustering
- Recommendation algorithm
- MMR
- FTRL
- 复杂用户画像系统

这些以后再逐步加入。

## 9. 开始编码前先检查现状

请先检查：

- 当前 SQLite schema
- note 创建、编辑、删除流程
- 当前 AI chat 实现
- 当前 API / service architecture
- Expo / React Native 的技术限制
- 当前是否已有后端服务

然后先告诉我：

1. 目前项目结构是怎样的
2. 哪些文件和数据库 schema 需要修改
3. 你建议采用怎样的 embedding / retrieval 架构
4. 哪些技术决策需要我确认

在我确认方案后，再实现最小、稳定的版本。

同时更新相关技术文档，让以后接手项目的 agent 明确知道：

- embedding 从第一条笔记开始生成
- embedding 属于可重新生成的派生数据
- RAG 是渐进式启用的
- 没有高质量 retrieval 结果时自动 fallback
- 不应把全部历史笔记直接发送给 LLM