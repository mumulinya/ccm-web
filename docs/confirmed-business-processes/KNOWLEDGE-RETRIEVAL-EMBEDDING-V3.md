# 知识库召回与本地 Embedding V3

本文记录知识文档从导入、索引、授权召回到进入Agent上下文的当前生产流程。知识库保存可核验文档原文，不替代单会话记忆或长期记忆。

## 完整流程

```text
用户上传、在线导入、同步目录或手动归档
→ 解析原文并保存版本、来源、scope和visibility
→ 权限范围内语义分片
→ 词面索引与本地/远程语义向量
→ 独立召回两类候选并混合排序
→ 按真实Token预算选择完整分片
→ 主Agent上下文或签名MCP深读
→ 引用和检索回执进入精确会话执行连续性
```

文档内容始终是不可信资料层，不能覆盖系统指令、权限边界或用户当前要求。Agent使用事实时保留`[source:文件名#分片序号]`。

## Embedding模式

| 模式 | 行为 |
| --- | --- |
| 自动 | 有外部配置时优先远程；否则使用本地多语言模型；不可用时明确降级词面检索 |
| 本地语义 | 使用`Xenova/multilingual-e5-small`固定revision的INT8 ONNX模型，Node.js CPU运行 |
| 外部Embedding | 使用OpenAI-compatible `/embeddings`，批量最多32条、最多两个并发批次 |
| 仅词面检索 | 使用关键词、中文字符/二元词和Hashing近似；不标记为语义命中 |

本地模型约118MB，首次使用下载到`.cc-connect/models/embedding`，不放入npm包。下载过程展示进度、速度、缓存位置和错误，并验证固定文件大小及SHA256。可配置镜像；删除模型不会删除知识文档。

## 召回与权限

权限过滤发生在候选计算之前：

- 全局Agent读取共享全局和受限全局知识。
- 群聊主Agent读取当前群聊、共享全局及成员项目标记为`shared`的知识。
- 项目主Agent和项目子Agent读取精确项目、共享全局及签名任务允许的范围。
- 群聊不能因为管理某项目而读取该项目的`restricted`文档。
- TestAgent只读取验收任务签名范围；音乐Agent不使用开发知识库。

词面候选与语义候选从全部已授权分片分别产生，因此语义向量可以召回没有词面重叠的同义表达。结果按chunk ID合并，记录词面得分、语义得分、实际后端、索引generation、scope checksum和降级原因。

自动上下文不截断分片正文。系统使用真实模型Token估算，在预算内选择完整分片；超出预算的分片不注入。第三方Agent可继续通过`ccm__knowledge_context`按签名范围搜索或分页读取原文。

## 索引与恢复

每次重建生成独立的V3 generation。新generation完成解析、向量和checksum校验后才切换active pointer；失败继续服务上一份last-good索引，并在状态和回执标记`stale_served`。

向量缓存绑定后端、模型、revision、维度和checksum。失败、缺失或维度不符的向量不能命中缓存，下次重建必须重试。远程连续失败会打开当前构建熔断；已有本地模型时使用本地向量，否则使用词面结果并后台准备本地模型。

主服务和所有MCP进程共享文件租约。只有一个进程可以构建索引，其他进程读取active generation或等待，不能重复产生Embedding调用或同时覆盖缓存。首次没有可用generation时返回`index_building`，不能伪装成“没有资料”。

## 安全与维护

- Embedding API Key保存到现有AES-256-GCM凭据仓库，配置文件只保存`ccm-secret://`引用。
- 旧明文Key在读取时惰性迁移；接口地址中的内联凭据和敏感查询参数不会进入状态、签名或日志。
- 新同步目录默认`global/restricted`并保存明确scope；旧字符串目录显示“历史共享范围”，不会静默改写原文档。
- 页面提供准备/删除本地模型、修复缺失向量和清除失效索引入口；所有操作保留知识原文和历史版本。

## 关键接口

- `GET /api/rag/status`：generation、last-good、真实向量统计、本地模型进度、租约和降级原因。
- `POST /api/rag/embedding-config`：保存V3模式和加密外部配置并重建。
- `POST /api/rag/local-model/prepare`：异步准备并校验本地模型。
- `DELETE /api/rag/local-model`：删除本地模型缓存并切换词面模式。
- `POST /api/rag/repair-vectors`：重新生成失败、缺失或过期向量。
- 现有查询、问答和签名MCP接口保持兼容。

## 验证证据

- Mock向量验证零词面同义召回、失败向量重试、缓存命中统计、作用域隔离和精确项目受限文档读取。
- 本地HTTP接口验证远程批量和单条兼容，不产生付费Provider调用。
- 独立进程验证构建租约和last-good读取；模型文件验证覆盖大小及SHA256失败。
- knowledge域、前端、Agent、MCP、生产构建和文档链接检查作为上线门禁。

本轮不发布npm。
