# Test Agent 运维短手册

面向群聊主 Agent ↔ Test Agent 独立复核链路的值班/排障说明。

## 角色

| 角色 | 职责 |
|------|------|
| 群聊主 Agent | 验收、签发 handoff、根据结论返工/复验/总结 |
| Test Agent | 按 handoff 只做验证，产出 report/verdict/证据，不改业务代码 |

## 何时自动触发独立复核

门禁由 `buildIndependentReviewGate` / `explainIndependentReviewTriggerDecision` 决定，任务卡「复杂变更独立复核」会显示可读原因（不再只写「未触发」）。

**会触发（`required=true`）常见条件：**

- 任务显式 `requires_independent_review=true`
- 业务开发任务且真实变更 ≥ 3 个文件
- 变更含后端/API/配置等高风险路径
- 有变更且目标描述命中后端/API/权限/支付等关键词

**不会触发时，detail 会写明跳过原因，例如：**

- `requires_independent_review=false`
- 任务不要求代码变更
- 仅少量低风险文件且目标未命中复杂关键词
- 尚无真实文件变更证据

## 结论怎么走

| 裁决 | 主 Agent 动作 |
|------|----------------|
| `passed` | 继续最终总结 |
| `needs_rework` | 打回原实现成员 |
| `needs_recheck` | 重新跑 Test Agent；若有 `browserProviderGaps`，复验 handoff 强制 `browserProvider=playwright` |
| `needs_user` / 环境阻塞 | 走环境准备 follow-up，补登录/配置后再复验 |

## 并发与冲突

- **不同群聊 / 不同项目**：Test Agent **并行**，无全局单飞锁。
- **同一仓库「边写边验」**：冲突保护会把实现 Agent 与 Test Agent **先写后验串行**；Test Agent 不进共享可写 worktree。
- **同一任务重复请求**：幂等 key 相同则复用原 run。

## 复验预算

- 协调器总轮次：`COORDINATOR_REVIEW_MAX_ROUNDS = 5`
- 每个 review subject 的 Test Agent 复验上限：`TEST_AGENT_RECHECK_MAX_PER_SUBJECT = 2`
- 超限会 SSE 提示并写入 `test_agent_recheck_budget_blocked`，避免 provider-gap 无限复验。

## 卡死时查什么

1. 任务卡 / delivery summary 里的 `independent_review_gate.decision_detail` / `user_detail`
2. `~/.cc-connect/test-agent-runs/` 最近 runner 记录（status / error / pid）
3. `~/.cc-connect/test-agent-handoffs/` 对应 handoff 的 `options.browserProvider` 与 `metadata.providerGapReroute`
4. 群聊 SSE / timeline 的 `conflict_plan`、复验预算提示
5. 本地回归：`npm run test:test-agent:ci`

## 常用命令

```bash
# 可信度 + production hardening + ownership
npm run test:test-agent:ci

# 仅可信度自测（假绿 / 上传越界 / 裁决一致 / Playwright 复验）
npm run test:test-agent-credibility

# Runner 取消、孤儿 PID、幂等等
npm run test:test-agent-production-hardening
```

## 明确不做（能力债）

- 自然语言自动生成多会话浏览器场景
- 完整 Playwright trace schema 校验
- 把 MCP 做到与 Playwright 同等能力（gap 时 fail-closed 并改走 Playwright）
