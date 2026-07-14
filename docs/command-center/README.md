# CCM 命令中心

## 目标

命令中心参考 Claude Code 的成熟交互，但只暴露 CCM 能真实执行的能力。每个可见命令必须属于以下一种实现：

- `直接读取`：调用 CCM 本地只读 API，不经过模型。
- `本地操作`：调用受控写 API，执行前确认并写审计。
- `当前会话`：在当前页面完成会话、复制、导出、统计或主题操作。
- `打开页面`：导航到 CCM 已注册页面。
- `Agent 工作流`：把计划、审查、验证、恢复等任务交给当前 Agent 的完整执行链路。

菜单不会用占位命令凑数量。Anthropic 登录/额度、Claude 安装器、Slack/GitHub App 安装、内部调试命令等产品专属能力不适用于 CCM，因此不展示。

## 当前覆盖

2026-07-14 的内置与动态 Skill 统计：

| 入口 | 可用命令 |
| --- | ---: |
| 全局 Agent | 54 |
| 项目工作台 | 59 |
| 群聊主 Agent | 56 |

CC 同类能力已覆盖：`help`、`status`、`plan`、`review`、`security-review`、`config`、`context`、`copy`、`diff`、`doctor`、`export`、`hooks`、`mcp`、`memory`、`model`、`permissions`、`rename`、`sessions`、`skills`、`stats`、`tasks`、`theme`、`usage`、`verify`、`resume`、`retry` 和 `rollback`。

CCM 业务命令还包括项目/群聊/任务/回放/自动开发/定时任务/知识库/稳定性/检查点/执行器等操作。

## 安全约束

- `/clear`、`/commit`、`/rollback`、`/project-start`、`/project-stop` 等高风险命令必须二次确认。
- `/commit` 使用真实 `/api/git/commit`，项目名和提交说明由解析器传入。
- 参数进入 URL 前统一编码；作用域和项目/群聊上下文在后端再次校验。
- 每次解析写入 `~/.cc-connect/logs/slash-command-audit.jsonl`。
- 用户可见卡片展示摘要；原始响应放在“查看原始结果”中。

## 验证

```bash
npm run test:slash-commands
npm run test:slash-commands:api
npm run test:slash-commands:render
npm run check
npm run build:frontend
```

契约测试验证命令唯一性、三入口接线、页面目标、客户端动作、API 端点、实现类型、高风险确认和 CC 对照集合。API 自测会在三个作用域逐条解析全部命令，确保参数、上下文、实现类型和动作载荷都能生成。

Playwright 回归验证全局菜单、项目 `/branch`、群聊 `/sessions`、取消 `/clear` 无副作用，以及 390px 移动端菜单边界。截图保存在 `docs/command-center/evidence/2026-07-14/`。
