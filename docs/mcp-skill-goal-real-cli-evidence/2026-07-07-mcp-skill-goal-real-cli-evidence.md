# MCP/Skill 目标审计接入真实 CLI 探针证据

## 背景

CCM 的统一 MCP/Skill 长期目标不能只依赖静态配置、运行时快照和自测用例来判断完成。目标要求 Claude Code、Cursor、Codex 项目子 Agent 能真实发现并调用授权 MCP/Skill，因此完成度审计需要读取 agent-runner 已持久化的真实 CLI 探针结果。

本次更新把 `agent-runner/probe-status.json` 和 `agent-runner/probe-targets/*.json` 接入 `/api/tools/mcp-skill-goal-audit`。审计只把 30 分钟内成功的真实 CLI 探针视为可证明证据；历史成功但已过期的探针会保留在 evidence 中，但不会让目标误判为 complete。

## 改动

- `backend/modules/tools/tools.ts`
  - 新增 agent-runner 探针文件读取逻辑。
  - 新增 Claude Code / Cursor / Codex runtime 名称归一化。
  - 新增真实 CLI 探针 evidence 聚合，按 runtime 输出 latest、successes、failures、freshSuccesses。
  - `buildMcpSkillGoalCompletionAudit()` 在没有显式 `realCliE2E` 输入时，自动读取持久化探针证据。
  - 保留显式 `realCliE2E` 输入优先级，避免测试或调用方传入的明确结果被本机历史探针覆盖。
  - 自测新增两条门禁：
    - 新鲜持久化探针可让 `real_cli_e2e` requirement 变成 `proven`。
    - 过期探针保持 `real_cli_e2e` 为 `missing`。

- `backend/modules/collaboration/storage.ts`
  - 将 `groupMessageAppendHooks` 改为惰性初始化。
  - 解决 CommonJS 循环依赖场景下 `registerGroupMessageAppendHook()` 可能早于 hook set 初始化被调用的问题。
  - 该问题会阻断 `test:runtime-tools` 加载完整 runtime 自测链路。

## 验证

已运行并通过：

```bash
npm run build:backend
npm run test:runtime-tools
npm run check
```

`test:runtime-tools` 中新增通过项：

- `completionAuditUsesFreshPersistedCliProbeEvidence`
- `completionAuditRejectsStaleCliProbeEvidence`

## 当前结论

本次更新后，目标完成审计已经能读取真实 CLI 探针证据，但当前本机已有探针多为 2026-06-29 或 2026-07-04 的历史记录，按 30 分钟新鲜度规则已经过期。因此长期目标仍应保持 active，不能标记 complete。

下一步需要运行真实 Claude Code、Cursor、Codex CLI E2E 矩阵，让三个 runtime 都产生新鲜成功探针，并继续校验这些探针能证明授权 MCP/Skill 的 native discovery 与 invocation。

## 风险

- 审计目前只把新鲜成功探针作为完成证据，策略偏保守；这会要求定期重跑真实 CLI E2E，但能避免旧证据误导。
- 探针 evidence 会输出 runtime、target、时间和状态，不输出完整 stdout/stderr，避免泄露本地敏感内容。
