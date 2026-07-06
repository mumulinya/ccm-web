# Agent Intent Gateway 46.0

## 目标

本轮把全局 Agent、群聊主 Agent、音乐 Agent 的入口统一收敛到结构化意图网关：

- 全局 Agent 优先走 Agentic Loop 的结构化决策，旧 `/api/global-agent/chat` 入口也代理到同一条链路。
- 群聊主 Agent 创建开发任务卡前必须拿到 LLM-backed 的主 Agent 派发决策；规则兜底只允许只读分析或普通回复。
- 音乐 Agent 只有大模型结构化 `music_action` 才允许触发自动播放；fallback 不自动播放。
- 自测覆盖 fallback 禁写、LLM delegate 放行、音乐 fallback no-autoplay 和全局 legacy chat 路由。

## 实现内容

### 全局 Agent

- `backend/modules/global-agent.ts`
  - `/api/global-agent/chat` 代理到 `runAgenticGlobalRequest()`，保留流式和非流式响应兼容。
  - `localActionToAgenticDecision()` 的 model-unavailable fallback 只允许只读/界面类动作。
  - `send_group_cmd`、`manage_cron` 等会写数据、派发任务或修改系统状态的动作，在无模型结构化决策时返回普通回答，不直接执行。
  - `runGlobalAgentIntentSelfTest()` 增加 fallback delegation / cron 禁写检查。

### 群聊主 Agent

- `backend/modules/collaboration.ts`
  - 新增 `classifyGroupProjectTaskIntentWithAgent()`，在 `project_task`、`daily_dev`、`mission`、`project_analysis` 模式下调用群聊主 Agent 编排器做结构化识别。
  - 新增 `normalizeGroupAgentGatewayTaskIntent()`，只有 `runtime === "llm-api"` 且 `dispatchPolicy.action === "delegate"` 且有 assignments 时才允许创建持久任务卡。
  - 编排器失败或降级到 coded fallback 时，不创建任务卡，只保留只读分析或普通会话。
  - `runCollaborationUxSelfTest()` 覆盖 rule fallback 禁写、LLM delegate 放行、LLM direct answer 只读。

### 音乐 Agent

- `backend/modules/music.ts`
  - `runMusicAgentIntentSelfTest()` 标记 fallback play 的 `source === "fallback"`。
- `frontend/src/components/MusicPlayer.vue`
  - `autoplayFromAgentAction()` 现在要求 `action.source === "agent"`。
  - 简单 fallback 即使返回 `play_music`，也不会自动调用播放器。

## 边界

- 规则分类仍保留，用于低风险提示、只读分析和模型不可用时的用户反馈。
- fallback 不再直接写入系统数据、不创建群聊任务卡、不派发开发任务、不创建 cron。
- 用户显式强制创建任务的旧 UI 路径仍保留 `forceProjectTask`，用于人工确认后的兼容操作。
- 音乐 fallback 可返回候选结果和说明，但不会自动播放；自动播放必须来自大模型结构化动作。

## 验证

已执行：

```powershell
npm run check
npm run build:backend
npm run build:frontend
node -e "const m=require('./ccm-package/dist/modules/global-agent.js'); const r=m.runGlobalAgentIntentSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.passed) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/music.js'); const r=m.runMusicAgentIntentSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/collaboration.js'); const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify(r.checks,null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/collaboration.js'); const r=m.runCollaborationProtocolSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"
```
