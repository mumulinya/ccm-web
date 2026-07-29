# 群聊主 Agent 源码驱动规划

## 已确认流程

```text
用户需求、文档或图片
→ 统一模型识别影响项目
→ 群聊主 Agent只读检索相关项目当前源码
→ 生成目标、边界、数据关系、依赖步骤和验收证据计划
→ 实时计划书展示并持续更新
→ 开发 Agent按工作项串行实现
→ TestAgent独立验收
→ 失败时主 Agent生成精确返工单并复验
→ 主 Agent最终验收并向用户交付
```

## 职责边界

- 群聊主 Agent负责需求理解、源码分析、跨项目架构、依赖顺序、工作单、权限、验收和最终总结，不修改源码。
- 项目主 Agent继续只管理当前项目，并使用当前项目的源码证据生成串行工作项。
- 开发 Agent必须重新读取当前源码，只负责工作单范围内的实现、验证和结果说明；发现计划与源码冲突时回报主 Agent重新规划。
- TestAgent保持独立验收。开发 Agent退出码为 0、文本声称完成或存在文件变更，都不能单独通过完成门禁。

## 源码证据

- 影响项目优先使用统一模型返回的 `targetRefs`；模型没有收敛项目时，保守读取群聊绑定的可执行项目。
- 每个项目读取有限的相关源码和配置文件，排除 `.env`、凭据、密钥、数据库、依赖目录和构建产物。
- 证据保存项目、相对路径、完整文件 SHA-256、源码清单 checksum 和快照 checksum。
- 代码任务缺少目标项目源码证据时 fail closed，不派发开发 Agent。
- 最终计划新增了未水合的项目时，以 `source_scope_mismatch` 阻断派发。

## 计划与执行

- 计划包含 `goal`、`boundaries`、`dataRelationships`、`dependencySteps` 和 `sourceCitations`。
- 代码任务统一使用 `sequential`，后续项目等待前置工作项的真实结果和契约证据。
- 源码依据、架构计划和执行步骤写入原任务记录、时间线和任务回放，不新增第二套任务数据库。
- 计划书默认展示目标和执行步骤；边界与数据关系二次展开，源码只展示项目与文件数量。

## 验证

- `npm run check`
- `npm run build:backend`
- `node scripts/group-main-source-planning-selftest.mjs`
- `node scripts/project-main-agent-orchestration-selftest.mjs`
- `node scripts/unified-auto-development-workflow-selftest.mjs`
- `node scripts/test-agent-review-policy-selftest.mjs`
- `node scripts/main-agent-test-agent-ownership-selftest.mjs`

以上验证不调用付费 Provider。
