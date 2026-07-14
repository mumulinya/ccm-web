# RAG 知识库 2.0

## 目标

把原来的“文档分片 + 关键词检索”升级为更接近真实 RAG 的知识库：

- 本地轻量 embedding
- 关键词 + 向量混合召回
- 覆盖率重排
- 引用溯源
- 知识域字段

## 当前实现

文件：`backend/modules/rag.ts`

### 分片索引

每个分片现在包含：

- `filename`
- `index`
- `domain`
- `text`
- `tokens`
- `tf`
- `embedding`

### 本地 embedding

当前使用不依赖外部服务的 hashing embedding：

- 维度：`256`
- 根据 token hash 落桶
- 使用 log TF 权重
- L2 归一化

这不是 OpenAI/BAAI/BGE 那种语义 embedding，但已经可以作为本地轻量向量召回层使用。

### 可选外部 embedding API

新增配置接口：

- `GET /api/rag/embedding-config`
- `POST /api/rag/embedding-config`

配置字段：

- `enabled`
- `apiUrl`
- `model`
- `apiKey`
- `rebuild`

前端入口：

- 系统设置 → 统一大模型 → `知识库向量`

行为：

- 未配置 API：默认使用本地 hashing embedding。
- 已配置 API：重建索引时为每个 chunk 调用 OpenAI-compatible `/embeddings` 接口生成 `semanticEmbedding`。
- 查询时会优先调用 embedding API 生成 query vector，并与 chunk 的 `semanticEmbedding` 计算余弦相似度。
- 如果 API 未配置或调用失败，自动回退 hashing，不影响知识库基本可用性。

### 混合检索

查询流程：

1. query tokenize
2. query hashing embedding
3. 对每个 chunk 计算：
   - TF-IDF keyword score
   - cosine vector score
   - query token coverage
   - filename boost
4. 组合成 hybrid score
5. 返回 top-K

返回字段包含：

- `score`
- `keywordScore`
- `vectorScore`
- `coverage`
- `citation`
- `domain`

### 引用溯源

引用 ID 格式：

```text
filename#chunkIndex
```

RAG chat prompt 会要求模型在回答事实、步骤、配置、接口时标注：

```text
[source:xxx.md#0]
```

### 对话与任务沉淀

新增统一写入接口：

- `POST /api/rag/capture`

支持字段：

- `title`
- `content` / `text`
- `source_type` / `sourceType`
- `domain`
- `project`
- `group_id` / `groupId`
- `session_id` / `sessionId`
- `task_id` / `taskId`
- `agent`
- `tags`

写入行为：

1. 在 `~/.cc-connect/knowledge` 创建 Markdown 知识条目。
2. 写入 frontmatter：标题、来源类型、知识域、项目/群聊/会话/任务/Agent、创建时间、标签。
3. 同步更新 RAG metadata。
4. 立即触发 `rebuildIndex()`，完成分片、embedding 与混合索引重建。

前端一键沉淀入口：

- 全局 Agent：任务卡 `保存知识`，以及全局会话右上角 `保存知识`。
- 群聊：任务卡 `保存知识`，以及群聊工具栏 `保存知识`。
- 项目会话：任务卡 `保存知识`，以及项目工具栏 `保存知识`。

任务卡沉淀内容包含：

- 用户需求
- Agent 结论
- 文件变更
- 验证结果
- 风险/阻塞
- Trace / 会话 / 任务来源

会话沉淀内容包含最近对话原文摘要，并带上全局、群聊或项目知识域。

### 群聊主 Agent RAG 读取

新增群聊主 Agent 自动检索链路：

1. 群聊消息进入主 Agent 协调入口。
2. 主 Agent 根据用户消息、群聊 ID/名称、群聊成员项目名构造 RAG query。
3. 优先按群聊/项目标签检索：
   - `#group-chat`
   - `#group:<group_id>`
   - `#<group_id>`
   - `#<group_name>`
   - `#project:<project>`
4. 如果标签检索无结果，再做全局兜底检索。
5. 命中的知识片段作为 `ragContext` 注入群聊主 Agent。
6. 主 Agent 可以用知识库内容：
   - 直接回答知识问答；
   - 判断是否需要派发；
   - 提炼 `documentFindings`；
   - 写入子 Agent 工作单的“文档依据/验收关注”。

边界：

- 项目 Agent 默认不直接读取 RAG 知识库。
- 项目 Agent 只接收群聊主 Agent 整理后的任务简报。
- 知识库内容不能替代用户当前消息的执行授权；普通咨询仍保持 `direct_answer`，不派发项目 Agent。

关键实现：

- `backend/modules/group-orchestrator.ts`
  - `buildGroupRagContext`
  - `withGroupRagContext`
  - `buildLlmCoordinatorMessages`
  - `buildDocumentAwareAnalysis`

## 已验证

未配置外部 API 时，`POST /api/rag/query` 返回：

```json
{
  "retrieval": {
    "mode": "hybrid",
    "embedding": "hashing",
    "fallback": true,
    "rerank": "keyword+vector+coverage"
  }
}
```

并返回每个命中分片的 `keywordScore / vectorScore / coverage / citation`。

2026-07-04 已验证：

- `npm run build:backend`
- `npm run check`
- `npm --prefix frontend run build`
- `POST /api/rag/capture` 可写入测试条目，并返回 `chunksCount: 1`
- 写入后 `POST /api/rag/query` 可立即命中该条目
- 测试条目已通过 `DELETE /api/rag/document?name=...` 删除
- 群聊主 Agent RAG 自测通过：
  - 临时写入 `group_conversation` 知识条目；
  - `runGroupOrchestrator()` 自动检索到该条目；
  - 普通知识咨询返回 `direct_answer`；
  - 未派发项目 Agent；
  - 回复中包含知识库里的接口事实；
  - 临时测试条目已删除。

## 后续建议

- 增加持久化向量索引，避免每次重启重算或重复调用 embedding API。
- 增加知识域权限：
  - global
  - project
  - group
  - personal
- 增加 reranker：
  - cross-encoder
  - LLM rerank
- 增加回答 grounding 检查：
  - 无证据时拒答
  - 低分时提示证据不足
- 增加引用点击跳转到原文分片。
