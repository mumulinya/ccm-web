# Phase 396: Memory Center Scroll And Global Session Model Compaction

## 目标

- 修复记忆中心长内容无法稳定滚动的问题。
- 让 Global Agent 的每个会话可以独立压缩。
- Global Agent 生产压缩只接受模型摘要，不再提交本地规则摘要。
- 让 Global Agent 支持 `/compact [摘要要求]`，并严格绑定当前 `session_*`。

## 页面滚动

`MemoryCenterPanel.vue` 现在建立完整的受限高度链：

- 记忆中心根节点固定占满当前 tab，并隐藏外层溢出。
- 顶部栏不参与滚动。
- 会话列表和记忆详情分别使用内部纵向滚动。
- 上下文设置页面使用独立纵向滚动。
- 移动端会话列表保持最大 230px，详情使用剩余高度。

浏览器实测：

- 桌面详情：`clientHeight=565`、`scrollHeight=1989`，实际滚动到 `scrollTop=487`。
- 桌面设置：`clientHeight=565`、`scrollHeight=1167`，实际滚动到 `scrollTop=420`。
- 390x844 移动端：列表 `229/559`，详情 `323/3382`，详情实际滚动到 `scrollTop=300`。
- 页面外层 `window.scrollY=0`，说明滚动发生在正确的内部区域。
- 控制台 0 error；唯一 warning 是音乐模块定位权限被拒绝，与记忆中心无关。

## Global Agent 会话压缩

生产入口统一使用 `compactGlobalAgentSessionWithModel`：

1. 按精确 Global Agent `sessionId` 读取加密转录。
2. 自动压缩按 Memory Center 的 `modelAutoCompactTokenLimit` 判断；手动 `/compact` 强制检查。
3. 保留最近消息窗口，只把边界之前的完整消息轮次交给摘要模型。
4. 模型必须返回固定 JSON 字段，并逐字保留授权、纠正、决策、引用和未完成事项锚点。
5. `sourceMessageIds` 必须与待压缩消息数量、顺序完全一致。
6. 最多进行 3 次模型摘要尝试。
7. 只有校验通过后，才提交 archive、summary、boundary 和 post-compact restore。
8. 模型缺失、超时、输出为空或校验失败时 fail closed：不创建 archive，不移动边界，不删除原转录。

原有的 `compactGlobalAgentSession` 本地规则摘要只保留给离线自测；自动写入、Global Agent 工具压缩和重建后的压缩都改走模型路径。

## 手动命令

Global Agent 命令中心现在显示：

```text
/compact [摘要要求]
```

执行流程：

1. 前端先同步全部 Global Agent 会话历史。
2. 请求只携带当前 `session_id` 和可选 `custom_instructions`。
3. 后端确认该 ID 存在于 Global Agent 历史存储。
4. 只压缩该会话，不遍历兄弟会话，不读取任何群聊 `gcs_*` 上下文。
5. 返回压缩前后 token、保留消息数、archive ID 和摘要来源，不返回完整 memory 大对象。

## 验证

- `npm run test:global-agent-model-session-compaction`: `22/22`。
- 目标会话模型压缩成功，兄弟会话无 archive。
- 无效模型摘要 fail closed，原 70 条转录完整。
- 测试使用注入 mock model 和隔离临时 HOME，真实 Provider 调用为 `0`。
- Backend TypeScript build 通过。
- Frontend Vite build 通过，2059 modules。
- `check-factory-deps.js` 全部通过。
- `check-split-exports.js` 全部通过。
- `git diff --check` 通过，仅有 Windows LF/CRLF 提示。

现有 `slash-command-center-selftest.mjs` 仍被工作树中与本阶段无关的 `ProjectManager.vue 未接入命令中心` 旧断言阻塞；本阶段对 `/compact` 的 scope、API 和前端绑定已由专项测试及真实浏览器命令菜单验收覆盖。

## 关键文件

- `backend/agents/global/memory.ts`
- `backend/modules/global/global-agent-api.ts`
- `backend/modules/global/global-agent-agentic-runtime.ts`
- `backend/modules/global/global-agent.ts`
- `backend/modules/tools/slash-commands.ts`
- `frontend/src/components/global/GlobalAgent.vue`
- `frontend/src/components/knowledge/MemoryCenterPanel.vue`
- `scripts/global-agent-model-session-compaction-selftest.mjs`
