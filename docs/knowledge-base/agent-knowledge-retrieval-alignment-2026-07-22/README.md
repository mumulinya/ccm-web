# Agent 知识检索全链路对齐

Date: 2026-07-22

## 本次完成

- 新增共享 `knowledge-access` 核心，统一全局、群聊、项目和第三方 Agent 的作用域与可见性判断。
- 权限文件清单在检索打分前生成，兄弟群聊、兄弟项目和受限成员项目不能进入候选集。
- 全局 Agent 每轮自动召回全局知识，`query_knowledge` 也使用同一共享检索器。
- 群聊主 Agent 从标签优先检索切换为精确群聊与成员项目权限检索。
- 普通项目问答和开发任务均自动注入当前项目允许的知识分片。
- `ccm__knowledge_context` MCP 复用相同权限函数，并补充子 Agent 的检索、深读和引用规则。
- 未配置 Embedding 时直接使用本地混合检索；远程失败时 fail soft 到本地并暴露真实状态。
- 知识中心状态文案明确区分远程语义模式、本地模式和远程失败回退。

## 数据流

```text
用户问题
  -> 精确 Agent/群聊/项目绑定
  -> 权限文件清单
  -> 远程语义 + 本地混合排序（可选）
     或本地关键词 + 中文切词 + hashing（默认/回退）
  -> 相关分片 + source 引用
  -> 全局/群聊/项目模型上下文
  -> 第三方 Agent 可通过签名 MCP 深读原文
```

知识检索失败不会伪造命中。Agent 可以在没有知识上下文的情况下继续处理当前请求；涉及必须依赖指定资料的任务，应明确报告未命中。

## 验证证据

- `npm run check`：通过。
- `node scripts/agent-knowledge-retrieval-selftest.mjs`：9 项通过，包括本地默认、远程失败回退和 scope 隔离。
- `node scripts/knowledge-production-selftest.mjs`：12 项通过。
- `node scripts/global-agent-global-only-context-selftest.mjs`：通过。
- `node scripts/third-party-memory-mcp-hydration-selftest.mjs`：49 项通过，付费 Provider 调用 0。
- `npm run build:frontend`：生产构建通过。

浏览器回归脚本要求 `127.0.0.1:3082` 已启动；首次直接执行因测试服务未运行而未进入页面断言，非产品构建失败。
