# 用户可见验收术语收口 v2

## 背景

上一轮已经把大部分“回执”改成“结果说明”，但主 Agent 的用户主视图里仍可能出现“门禁通过 / 未过门禁 / gate 引用”这类偏内部执行词。用户只需要知道验收是否通过、哪里还要补证据，底层 `acceptance_gate`、runtime gate 和 worker 协议仍应留在技术详情或内部结构里。

## 本次升级

- 前端 `agentDisplay` 增加用户可见术语清洗：
  - `交付门禁` -> `交付验收`
  - `验收门禁` -> `验收检查`
  - `门禁通过 / 门禁未通过` -> `验收通过 / 验收未通过`
  - `记忆 gate 引用` -> `记忆使用声明`
- 群聊主 Agent 状态卡把失败检查显示为“待补验收”，不再展示“未过门禁”。
- 全局主 Agent 的完成提示和子任务状态改为“交付验收 / 验收通过”。
- 任务卡里的记忆派发校验、压缩重注入校验会先清洗再显示，避免旧 runtime 摘要直接暴露 `gate` 词。
- 后端 display stream、workchain checkpoint、delivery report、global mission 摘要也接入同样的用户可见术语清洗。

## 保留边界

- 内部字段名不改：`acceptance_gate`、`failed_gates`、runtime gate、worker handoff 仍保留原协议，避免影响第三方写代码 Agent 和验收逻辑。
- 技术详情里仍可用于排查底层协议，但默认折叠。

## 守护

- `scripts/main-agent-decision-ui-selftest.mjs` 新增前后端可见术语断言。
- `frontend/visual-regression/main-agent-display-fixture.js` 加入旧 `记忆 gate 引用` 样例。
- `scripts/main-agent-render-regression.mjs` 断言真实主视图显示“记忆使用声明”，并且不显示“门禁”或“gate 引用”。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:render-regression`：通过，已生成真实渲染截图，并断言主视图不显示“门禁 / gate 引用”。
- `npm run test:replay-regression`：通过，普通问话仍不展示 Todo，技术详情仍可折叠查看。
- `git diff --check`：通过，仅保留仓库既有 LF/CRLF 提示。
