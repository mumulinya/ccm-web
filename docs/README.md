# CCM 文档中心

这里是项目文档的唯一入口。先读取当前产品事实，再按需进入测试手册或历史实施记录，避免把已经确认的业务结构和阶段性设计混在一起。

## 当前入口

| 文档 | 用途 |
| --- | --- |
| [当前状态](./CURRENT.md) | 当前可依赖的产品能力、边界和运行入口 |
| [确认项目结构](./confirmed-project-architecture/README.md) | 已确认的全局、群聊、项目、记忆、权限和集成业务流程 |
| [测试指南](./TESTING.md) | 领域测试、快速回归、历史测试命令和报告位置 |
| [历史归档索引](./archive/README.md) | 阶段记录的逻辑归档说明，不移动或删除原始证据 |

## 当前业务文档

| 目录 | 内容 | 查找入口 |
| --- | --- | --- |
| [main-agent-workchain](./main-agent-workchain/README.md) | 全局 Agent、群聊主 Agent、项目子 Agent、TestAgent 对接及任务闭环 | [目录](./main-agent-workchain/CATALOG.md) |
| [test-agent](./test-agent/README.md) | TestAgent 自身的浏览器执行、验收断言、证据和 CLI 契约 | [目录](./test-agent/CATALOG.md) |
| [tooling-and-extensions](./tooling-and-extensions/README.md) | MCP、Skill、第三方 Agent 适配、授权和市场安装 | [目录](./tooling-and-extensions/CATALOG.md) |
| [group-memory-cc-parity](./group-memory-cc-parity/README.md) | 记忆压缩与 Claude Code 对齐的历史实施记录 | [目录](./group-memory-cc-parity/CATALOG.md) |
| [memory-system](./memory-system/README.md) | 项目记忆上下文、质量门禁和控制中心记录 | README |
| [product-evolution](./product-evolution/README.md) | 早期版本化架构、产品功能和可靠性设计 | [目录](./product-evolution/CATALOG.md) |

## 产品与运维专题

- [command-center](./command-center/README.md)：命令中心及真实渲染证据。
- [knowledge-base](./knowledge-base/README.md)：知识库产品与生产化升级。
- [system-settings](./system-settings/README.md)：系统设置页面与配置治理。

## 历史实施记录

`main-agent-workchain`、`test-agent`、`tooling-and-extensions`、`group-memory-cc-parity` 和 `product-evolution` 中的大量日期化文档是实现与验证证据。它们继续保留在原位置以维持链接稳定，但不再作为当前产品事实的首选入口。详情见 [历史归档索引](./archive/README.md)。

## 归档规则

1. 新功能或升级记录使用 `YYYY-MM-DD-功能名-vN.md`。
2. 专题文档放入最具体的业务叶子目录；根目录只保留 `README.md`、`CURRENT.md` 和 `TESTING.md` 三个稳定入口。
3. 主 Agent 工作链记录进入 `main-agent-workchain`；TestAgent 内部能力进入 `test-agent`，两者不要混放。
4. MCP、Skill、第三方 CLI 和工具权限记录进入 `tooling-and-extensions`。
5. 截图、JSON 报告等验证材料放在所属专题的 `evidence` 目录。
6. 移动或新增文档后，运行 `node scripts/generate-doc-catalogs.mjs`；主 Agent 工作链另运行 `node scripts/generate-main-agent-doc-catalog.mjs`。
