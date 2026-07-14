# Main Agent 文档分类体系 V1

## 背景

`docs/main-agent-workchain` 原有 276 篇功能与验收记录全部平铺在根目录，全局 Agent、群聊主 Agent、TestAgent 桥接和共享工作链难以按业务责任查找。

## 新目录体系

- `global-agent`：全局 Agent 的对话、计划、派发监督、历史记忆和 TestAgent 桥接。
- `group-main-agent`：群聊主 Agent 的对话、计划状态、成员协调、生命周期和验收交付。
- `test-agent`：主 Agent 工作链中的 TestAgent 路由、浏览器证据、返工复验和验收桥接。
- `shared-workchain`：两类主 Agent 共享的计划 Todo、任务执行、交付验收、用户体验和可靠性。
- `operations-and-integrations`：任务回放、定时调度、飞书、附件需求和产品导航。

每个业务域继续按具体责任分为叶子目录，跨业务文档按主要责任方归档。

## 导航与维护

- 根目录 `README.md` 提供业务域导航和归档规则。
- 每个业务域有独立 `README.md` 说明叶子目录的责任。
- `CATALOG.md` 列出所有文档的真实标题和相对链接。
- `scripts/generate-main-agent-doc-catalog.mjs` 用于新增或移动文档后重新生成目录。

## 验证

- 276 篇原始记录已全部移动到 26 个叶子目录。
- 根目录散落记录为 0。
- 仓库中旧平铺路径引用为 0。
- 文档中相对 Markdown 链接损坏数为 0。
- 所有历史文档的基础文件名保持不变，便于 Git 识别移动历史。

