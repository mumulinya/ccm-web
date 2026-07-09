# Phase 73 - Global Memory Selftest Residue Archive

## 目标

把 Phase 72 已经发现的 Global Agent 记忆自测残留从“只能告警”升级为“可安全处理”：保留 active memory 的硬保护，同时给历史自测污染备份、tmp、polluted residue 提供 dry-run、指定文件归档、带 reason 审计和 Memory Center 操作入口。

这一步继续贴近 Claude Code 记忆系统方向：自测数据不能污染真实长期记忆；如果历史 residue 存在，也必须能被发现、解释、归档，并留下可追溯记录。

## 完成内容

- 在 `backend/agents/global/memory.ts` 增加 `archiveGlobalAgentMemorySelfTestResidues()`。
- 支持 `dryRun`、`reason`、`actor`、`files/file`。
- 非 dry-run 时强制要求 `reason`，防止无审计清理。
- 归档只处理 residue 文件，不处理 `memory.json` 或 `memory.json.bak`。
- 归档目标固定在 `C:\Users\admin\.cc-connect\global-agent-memory\selftest-residue-archive`。
- 使用全局记忆自测锁，避免多个自测或清理动作同时改写 Global Agent memory。
- 对目标路径做 `pathInside()` 校验，防止路径逃逸。
- residue 扫描覆盖从 `bak-before-sanitize-` 扩展到所有 `bak-before-`，包含 Phase 72 resync 备份。
- 增加 `runGlobalAgentMemorySelfTestResidueArchiveSelfTest()`，覆盖 dry-run 不移动、实际归档只移动 residue、active memory 保持干净。
- 在 Memory Center API 增加 `scope=global` + `operation=archive_selftest_residue` 操作入口。
- 在 `scripts/main-agent-decision-ui-selftest.mjs` 增加静态覆盖，锁住归档函数、自测函数和 Memory Center 操作名。

## 本次实际清理结果

- 执行前：active contamination 为 0，residue contamination 为 5。
- dry-run：可归档唯一 residue 文件 4 个；其中 1 个文件命中两类 residue 行，所以扫描行数为 5。
- 实际归档：归档 4 个历史自测残留文件。
- 执行后：active contamination 为 0，residue contamination 为 0，scan status 为 `ok`。

归档文件保留在：

`C:\Users\admin\.cc-connect\global-agent-memory\selftest-residue-archive`

## 验证

- `npm run build:backend` 通过。
- `node scripts\main-agent-decision-ui-selftest.mjs` 通过。
- `npm run check` 通过。
- `runGlobalAgentMemorySelfTestResidueArchiveSelfTest()` 通过。
- `archiveGlobalAgentMemorySelfTestResidues({ dryRun: true })` 通过，dry-run 不移动文件。
- `archiveGlobalAgentMemorySelfTestResidues({ dryRun: false, reason })` 通过，历史 residue 已归档。
- 记忆链路回归全部通过：
  - `runGlobalAgentMemorySelfTest`
  - `runGlobalAgentMemoryStressSelfTest`
  - `runGlobalAgentMemorySelfTestIsolationSelfTest`
  - `runGlobalAgentMemorySelfTestResidueArchiveSelfTest`
  - `runGroupGlobalAgentMemoryBridgeContextSelfTest`
  - `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
  - `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`
  - `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
  - `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
  - `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
  - `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
  - `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
  - `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`
  - `runGlobalMemoryUsageReceiptValidationSelfTest`
  - `runGlobalMemoryControlSelfTest`

最终污染扫描：

```json
{
  "pass": true,
  "status": "ok",
  "active": 0,
  "residue": 0
}
```

## 当前长期目标状态

长期目标未完成。Phase 73 完成后，Global Agent memory 的自测污染风险已经从“发现和隔离”升级到“发现、告警、dry-run、归档、审计、回归验证”闭环。

下一步建议继续沿 Claude Code 方向增强：

- 把 residue archive 操作暴露到 Memory Center UI 的一键 dry-run / archive。
- 给子 Agent 会话上下文增加 memory archive / contamination 摘要，避免第三方 Agent 误读历史 residue。
- 建立 compact 前后的 memory health gate，要求 post-compact 重新注入前先验证 active memory clean。
- 对跨群聊全局记忆和项目记忆加入更细的生命周期策略：fresh、advisory、deprecated、archived。
