# 模型强制记忆压缩

## 决策

群聊记忆压缩的最终摘要必须由模型生成。本地规则提取仅作为保真校验参考，不再作为生产压缩结果，也不允许在模型失败时静默降级。

生产配置固定为：

```text
memoryCompactionUseModel = true
memoryCompactionMode = model-required
```

旧配置即使缺少字段或保存过其他模式，读取后也会迁移到 `model-required`。配置接口拒绝关闭模型摘要或切换到本地模式。

## 压缩流程

1. 按当前 `group + gcs_*` 选出压缩边界之前的旧消息。
2. 构造模型请求，输入旧摘要、完整保真校验参考、用户消息和近期时间线。
3. 模型返回结构化 JSON，覆盖目标、用户要求、关键概念、文件代码、错误修复、决策、完成项、待办、当前工作、下一步、成员状态和任务状态。
4. 输出必须完整覆盖保真基线，并通过事实、约束、阻塞状态和完成声明质量门禁。
5. 只有通过后才提交 `compactBoundary`，并将 `summarySource` 写为 `model`、`modelMode` 写为 `model-required`。
6. 模型未配置、请求失败、JSON 为空、保真校验失败或质量门禁失败时，压缩失败关闭，原消息与原记忆保持不变。

同步会话恢复路径不再生成 `deterministic-sync` 压缩边界。它只能更新 token 压力和事实索引；发现历史本地/混合摘要时会清除其上下文权威性，并调度一次强制模型摘要迁移。

## 与 Claude Code 的关系

这使 CCM 与 Claude Code 的关键压缩行为一致：由模型理解会话并生成可恢复摘要，而不是把本地规则摘要作为最终上下文。CCM 额外保留多群聊 `gcs_*` 隔离、子 Agent 记忆注入和压缩事务边界。

## 验证

- 模拟模型成功：Provider 调用 `1` 次，`summarySource=model`，`modelMode=model-required`，生成真实边界。
- 模型缺失：fail-closed，不生成边界。
- 本地同步恢复：40 条消息不会生成本地摘要或压缩边界。
- 配置关闭测试：生产配置拒绝 `memoryCompactionUseModel=false` 和非 `model-required` 模式。
- 保真参考统一：模型请求与提交校验使用同一份完整基线。
- Backend build：通过。
- Frontend build：通过，Vite 转换 `2059` 个模块。
- 测试未调用真实 Provider，隔离数据已删除。

## 关键文件

- `backend/modules/collaboration/group-orchestrator-config.ts`
- `backend/modules/collaboration/group-compaction-engine-part-01.ts`
- `backend/modules/collaboration/group-compaction-engine-part-02.ts`
- `backend/modules/collaboration/group-memory-shared-part-02.ts`
- `backend/modules/collaboration/group-routes-part-03.ts`
- `frontend/src/components/knowledge/MemoryCenterPanel.vue`
