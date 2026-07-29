# TestAgent 风险分级、证据路由与增量复验

## 目标

主 Agent仍负责理解需求、制定计划、派发开发和最终交付，TestAgent仍是只读独立验收者。本次优化不增加第二条开发链，而是让验收强度、失败归属和复验范围更准确。

## 验收计划

项目主 Agent必须由模型生成两份结构化数据：

- `acceptanceEvidencePlan`：每条标准包含可观察结果、验收对象和 `code_diff`、`command`、`http`、`browser`、`artifact` 中至少一种证据。
- `verificationProfile`：模型根据完整需求语义选择 `lightweight`、`standard`、`interactive` 或 `critical`。

缺少字段、证据类型无效或只有“功能正常”一类不可执行描述时，项目计划 fail closed，不创建可执行开发工单。

群聊主 Agent使用同一结构输出验收计划；旧任务没有结构化字段时仍可读取，但新任务会把模型分级和证据计划写入任务，供 TestAgent工单使用。

## 风险分级

| 等级 | 典型范围 | 默认检查 |
| --- | --- | --- |
| `lightweight` | 文档、低影响配置 | 文件差异与已有轻量检查 |
| `standard` | 普通源码修改 | 构建、类型检查、测试命令 |
| `interactive` | 页面交互、浏览器流程 | 标准检查、Playwright、截图、控制台 |
| `critical` | 权限、资金、发布、破坏性变更 | 完整检查、HTTP/浏览器证据、对抗验证 |

分级由模型语义决策产生。本地代码只校验 schema、执行安全和证据门禁，不通过关键词或正则猜测业务风险。项目或群聊已显式配置的检查不会被模型分级降级。

## 失败路由

```text
真实命令/HTTP/浏览器失败
  -> implementation_rework
  -> 原开发 Agent修复

证据未知、Provider能力缺口或偶发不稳定
  -> test_agent_recheck
  -> TestAgent增量复验，不调用开发 Agent

服务、凭据、启动条件或执行超时
  -> environment
  -> 任务阻塞并说明条件，不错误返工源码

缺少产品决定且无法自动归类
  -> needs_user
  -> 当前会话请求用户处理
```

只有 `implementation_rework` 可以生成开发返工单。进程退出、模型文字或空报告都不能单独证明实现失败。

## 增量复验

第一轮读取完整验收范围。后续 TestAgent复验只包含：

- 上一轮失败或未知的验收标准；
- 失败、阻塞或超时的验证命令；
- 失败的浏览器检查；
- 一条上一轮已通过的核心标准和命令，用于防止返工回归。

源码返工后和证据补验都保留上一轮报告，但 TestAgent仍读取当前源码并重新产生真实证据。最多三轮；用尽轮次后按最后失败路由阻塞，只有实现失败才标记返工耗尽。

## 确认边界

- TestAgent不能修改源码、测试、配置或依赖。
- 模型负责规划和分级，不拥有最终通过权。
- CCM根据命令退出码、HTTP、浏览器断言、截图和 artifact manifest执行确定性门禁。
- 环境问题不会伪装成代码失败，证据缺失也不会伪装成通过。
- 项目会话、直接项目任务和群聊独立验收共用同一策略模型。

## 验证

- `npm run check`
- `npm run build:backend`
- `node scripts/test-agent-review-policy-selftest.mjs`
- `node scripts/project-main-agent-orchestration-selftest.mjs`

测试全部使用本地结构化夹具，不调用付费 Provider。
