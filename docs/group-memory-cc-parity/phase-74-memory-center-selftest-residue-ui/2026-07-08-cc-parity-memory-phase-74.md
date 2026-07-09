# Phase 74 - Memory Center Selftest Residue Archive UI

## 目标

把 Phase 73 的 Global Agent 自测残留归档能力从后端安全接口升级为 Memory Center 可操作闭环。用户和长期维护流程可以直接在记忆质量面板里看到 active / residue 污染状态，先预演归档，再带原因执行归档。

这一步继续贴近 Claude Code 记忆系统方向：记忆健康检查不只停留在报告层，还要能从 UI 进入可审计的维护动作。

## 完成内容

- 在 Memory Center 质量面板新增 `Global Agent 自测残留` 维护区。
- 展示 active contamination、residue contamination、最近预演或归档数量、扫描状态。
- 增加 `预演归档` 动作，调用 `archive_selftest_residue` 的 `dryRun` 模式。
- 增加 `归档残留` 动作，复用维护弹窗并要求填写原因。
- 当 active memory 存在污染时禁用 residue 归档按钮，避免把 active 污染误当历史残留处理。
- 展示 residue 行，便于确认残留文件来源。
- 归档完成后刷新 `global_memory_selftest_contamination` 单项质量检查，并刷新 Memory Center overview。
- 为新增面板补齐响应式布局和深色主题样式。
- 在 `scripts/main-agent-decision-ui-selftest.mjs` 增加静态覆盖：
  - selftest residue 面板存在。
  - dry-run 调用存在。
  - `archive_selftest_residue` 操作入口存在。
  - active 污染保护存在。
  - 前端质量检查和后端操作名连接存在。

## 安全约束

- UI 不直接操作文件，只调用 `/api/memory-center/operation`。
- 真正的文件移动仍由 `archiveGlobalAgentMemorySelfTestResidues()` 执行。
- dry-run 和实际归档共用后端扫描结果。
- 实际归档仍要求 `reason`，并由后端写入 memory operation audit。
- UI 禁止在 active memory 污染时直接做 residue archive。

## 验证

- `npm run build:frontend` 通过。
- `node scripts\main-agent-decision-ui-selftest.mjs` 通过。
- `npm run check` 通过。
- Global Agent 自测残留 dry-run 验证通过：

```json
{
  "dryRun": true,
  "archivedCount": 0,
  "skippedCount": 0,
  "before": {
    "active_contamination_count": 0,
    "residue_contamination_count": 0
  },
  "after": {
    "active_contamination_count": 0,
    "residue_contamination_count": 0
  }
}
```

- `runGlobalAgentMemorySelfTestResidueArchiveSelfTest()` 通过，覆盖：
  - 自测 residue 能被扫描发现。
  - dry-run 不移动文件。
  - 实际归档只移动 residue。
  - active memory 保持干净。
  - 归档后 residue 不再包含测试文件。

最终扫描：

```json
{
  "pass": true,
  "status": "ok",
  "active": 0,
  "residue": 0
}
```

## 当前长期目标状态

长期目标仍未完成。Phase 74 完成后，Global Agent 记忆自测污染治理形成了 UI 层闭环：质量检查、告警、dry-run、带原因归档、操作后刷新和审计入口都已连接。

下一步建议继续推进 compact 前后健康门：在子 Agent 会话上下文注入前，自动检查 Global Agent memory active clean，并把 memory health 摘要放进第三方 Agent 的任务上下文。
