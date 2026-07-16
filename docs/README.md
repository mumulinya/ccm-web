# CCM 文档中心

这里是项目文档的唯一入口。文档按业务责任归档，避免把版本记录、实现日志、测试证据和产品说明混放在同一级目录。

## 核心业务

| 目录 | 内容 | 查找入口 |
| --- | --- | --- |
| [main-agent-workchain](./main-agent-workchain/README.md) | 全局 Agent、群聊主 Agent、项目子 Agent、TestAgent 对接及任务闭环 | [目录](./main-agent-workchain/CATALOG.md) |
| [test-agent](./test-agent/README.md) | TestAgent 自身的浏览器执行、验收断言、证据和 CLI 契约 | [目录](./test-agent/CATALOG.md) |
| [tooling-and-extensions](./tooling-and-extensions/README.md) | MCP、Skill、第三方 Agent 适配、授权和市场安装 | [目录](./tooling-and-extensions/CATALOG.md) |
| [group-memory-cc-parity](./group-memory-cc-parity/README.md) | 群聊记忆与 Claude Code 对齐的连续阶段记录 | [目录](./group-memory-cc-parity/CATALOG.md) |
| [memory-system](./memory-system/README.md) | 项目记忆上下文、质量门禁和控制中心记录 | README |
| [product-evolution](./product-evolution/README.md) | 早期版本化架构、产品功能和可靠性设计 | [目录](./product-evolution/CATALOG.md) |

## 产品与运维专题

- [command-center](./command-center/README.md)：命令中心及真实渲染证据。
- [knowledge-base](./knowledge-base/README.md)：知识库产品与生产化升级。
- [system-settings](./system-settings/README.md)：系统设置页面与配置治理。

## 归档规则

1. 新功能或升级记录使用 `YYYY-MM-DD-功能名-vN.md`。
2. 文档放入最具体的业务叶子目录，不在 `docs` 根目录新增专题文件。
3. 主 Agent 工作链记录进入 `main-agent-workchain`；TestAgent 内部能力进入 `test-agent`，两者不要混放。
4. MCP、Skill、第三方 CLI 和工具权限记录进入 `tooling-and-extensions`。
5. 截图、JSON 报告等验证材料放在所属专题的 `evidence` 目录。
6. 移动或新增文档后，运行 `node scripts/generate-doc-catalogs.mjs`；主 Agent 工作链另运行 `node scripts/generate-main-agent-doc-catalog.mjs`。
