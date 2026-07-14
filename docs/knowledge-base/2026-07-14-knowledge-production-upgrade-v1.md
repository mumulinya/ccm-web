# 知识库真实业务化升级 v1

日期：2026-07-14

## 目标

将“知识库与文档”从本地 RAG 演示页升级为可用于真实业务资料的知识工作台，并保证全局 Agent、群聊主 Agent和项目工作流能按范围检索资料。

## 用户可见能力

- 页面顶部展示文档数、知识分片数、同步目录数和语义检索状态。
- 普通问答只显示用户可读回答，来源默认折叠；检索得分、向量模式和回退原因位于技术详情。
- 检索调试使用纯检索接口，不调用大模型。
- 支持本地多文件、在线公开文档和本地目录同步。
- 支持全局、群聊、项目和 Agent 知识范围，以及共享/限定范围可见性。
- 文档列表展示来源、范围、解析状态、索引时间、分片数量和版本号。
- 回答来源可点击并定位到对应文档分片。
- 文档更新自动归档历史版本；用户可预览并恢复版本，恢复前的当前内容仍会继续归档。
- 桌面和移动页面采用同一套业务组件，移动端抽屉完整覆盖视口。

## 文档格式

文本和代码格式包括 Markdown、TXT、JSON、CSV、YAML、TOML、XML、HTML、CSS、JavaScript、TypeScript、Vue、日志、Python、Java、Go、Rust、C/C++、Shell、PowerShell、SQL 等。

二进制资料包括 PDF、DOCX、XLSX、PPTX 和常见图片。Office 文档复用 OOXML 提取器；图片复用已配置的视觉模型；在线文档复用需求资料导入链路，腾讯文档需要公开分享或有效授权。

单个文件限制为 25 MB，一次最多 20 份，总量不超过 100 MB。

## 检索实现

- Markdown 按标题和段落分片，代码按声明边界分片，表格按行分组，长段落按自然边界切分。
- 中文分词同时保留单字、双字组合和短语，英文保留单词。
- 默认使用 TF-IDF、覆盖率和本地 hashing 向量混合排序。
- 配置 Embedding 后增加外部语义向量重排；调用失败自动回退本地检索。
- 文档内容、分片和向量缓存到 `~/.cc-connect/knowledge-index-cache-v2.json`，未变化文档不会重复解析或生成向量。
- 索引重建使用单任务队列。重复请求复用当前任务；文件在构建期间变化时会追加一轮重建。

## 安全与范围

- 上传、读取、删除、版本预览和版本恢复都执行 basename 与目录包含校验，禁止访问知识库目录外文件。
- 文件类型、数量和容量在写入知识库前校验，Multipart 临时文件统一清理。
- 同步目录使用“来源根路径 + 相对路径”的稳定哈希文件名，同名文件不会互相覆盖。
- 群聊/项目标签检索只能命中对应范围；无范围的 Agent 默认只读取全局知识，避免项目限定资料作为全局兜底泄露。
- RAG Prompt 明确把导入资料视为不可信参考内容，不执行资料中的指令。
- 模型回答中的引用只保留本次真实检索结果内的 citation。
- 知识问答复用群聊主 Agent 的统一 OpenAI/Anthropic 模型客户端，不再强制拼接 `/chat/completions`。

## 模块边界

- `backend/modules/knowledge/knowledge-files.ts`：安全路径、格式解析、来源元数据、版本和在线文档。
- `backend/modules/knowledge/knowledge-index.ts`：格式感知分片、缓存、重建队列和混合检索。
- `backend/modules/knowledge/knowledge-watcher.ts`：目录首次同步、变更监听和同名文件隔离。
- `backend/modules/knowledge/rag.ts`：RAG HTTP 接口与统一模型问答。
- `frontend/src/components/knowledge/KnowledgeBase.vue`：页面状态协调。
- `KnowledgeHealthOverview.vue`、`KnowledgeImportPanel.vue`、`KnowledgeQueryWorkspace.vue`、`KnowledgeDocumentList.vue`：按业务职责组成页面。

## 新增接口

- `GET /api/rag/status`：索引、Embedding、解析失败和目录同步健康状态。
- `POST /api/rag/import-url`：导入在线公开文档。
- `GET /api/rag/document-versions`：读取历史版本列表。
- `GET /api/rag/document-version-content`：安全预览历史版本。
- `POST /api/rag/restore-version`：恢复历史版本并保留当前版本。

既有 `/api/rag/query`、`/api/rag/chat`、`/api/rag/upload`、`/api/rag/documents`、`/api/rag/chunks`、`/api/rag/document-content`、`/api/rag/watch-paths` 和 `/api/rag/metadata` 保持兼容并扩展结构化状态。

## 验证

- `npm run check`
- `npm run build`
- `npm run test:knowledge`
- `npm run test:knowledge-api`
- `npm run test:knowledge-render`
- `npm run test:requirement-sources`

自测覆盖路径穿越、文件类型、目录同名冲突、格式感知分片、并发重建、持久化缓存、知识范围隔离、结构化引用、版本预览与恢复。Playwright 覆盖桌面 1440x1000 和移动 390x844，验证无横向溢出、技术详情默认折叠、普通问答不显示得分，以及引用能够打开对应分片。

回归证据位于：

- `scratch/knowledge-production-selftest/report.json`
- `scratch/knowledge-api-selftest/report.json`
- `scratch/knowledge-render-regression/report.json`
- `scratch/knowledge-render-regression/desktop-1440x1000-initial.png`
- `scratch/knowledge-render-regression/desktop-1440x1000.png`
- `scratch/knowledge-render-regression/mobile-390x844-initial.png`
- `scratch/knowledge-render-regression/mobile-390x844.png`
