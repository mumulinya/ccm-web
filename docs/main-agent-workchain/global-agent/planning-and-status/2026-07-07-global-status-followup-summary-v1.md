# 全局状态追问摘要 v1

## 背景

Claude Code 协调器要求：worker 结果和系统通知是内部信号，主 Agent 面向用户时要综合成可读进度；如果用户在等待期间问“进展如何”，不能猜测 worker 结果，也不能重新派发同一任务。

本项目已有任务卡、进度 checkpoint 和全局直派完成同步，但 Web 全局主 Agent 对“现在进展怎么样 / 任务状态 / 完成了吗”这类追问还主要依赖模型路由。飞书入口有 `/status`，但摘要较简略，且 Web 入口没有同等保底路径。

## 本次升级

- 新增 `isGlobalProgressStatusRequest`，识别“任务状态、进展如何、做到哪了、完成了吗、How's it going”等状态追问。
- Web `/api/global-agent/run` 和 legacy `/api/global-agent/chat` 复用同一条状态摘要快路径，不创建新任务，不展示 Todo。
- 飞书控制入口也复用同一识别逻辑。
- `formatMissionStatus` 升级为用户可读摘要：
  - 最近全局 mission 的状态、完成/失败/阻塞计数。
  - 当前进展和子目标状态。
  - 最近全局直派任务状态。
  - 下一步说明。
- 明确提示不会猜测还没返回的子 Agent 结果，技术记录仍留在任务卡技术详情。
- 状态摘要继续清洗内部协议词，避免 `CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、`raw payload` 进入用户主文本。

## 验证

- 通过：`node scripts/main-agent-decision-ui-selftest.mjs`
- 通过：`npm run check`
- 通过：`npm run build`
- 通过：`npm run test:chat-experience`
- 通过：dist `runGlobalAgentIntentSelfTest`
- 通过：dist 全局 loop / workchain / delivery 自测
- 通过：`git diff --check`，仅有既有 CRLF 提示
