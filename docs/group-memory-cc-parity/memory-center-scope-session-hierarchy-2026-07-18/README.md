# 记忆中心项目与群聊会话层级

## 问题

记忆中心原先把项目长期记忆、项目会话、群聊会话和任务 Agent 会话展平在同一列。即使后端已经按精确会话隔离压缩状态，页面仍容易让人误以为“一个项目或群聊只有一份记忆”。

## 最终结构

```text
全局 Agent
  ├─ 全局长期记忆
  └─ 全局会话列表

群聊
  └─ 指定群聊
       └─ 该群的 gcs_* 会话列表

项目
  └─ 指定项目
       ├─ 项目长期记忆
       └─ 该项目的稳定 CCM 会话列表

子 Agent
  └─ 任务 Agent 会话列表
```

- 全局当前区域默认展开。
- 群聊、项目和任务 Agent 父节点默认收起，点击后只展示该父节点的会话。
- 没有产生压缩文件的真实群聊会话仍会出现，并以空会话状态打开，不会因为 token 为 0 就被隐藏。
- 项目长期记忆和项目会话连续性仍是两种独立数据，只在同一项目父节点下组织展示。

## 数据投影

- 群聊会话以 `group-messages/sessions/<groupId>/manifest.json` 为真实会话清单，再与 `group-memory-sessions` 中的压缩状态合并。
- 项目长期记忆来自 `project-memory`，项目会话来自 `web-sessions/<projectId>`，通过 `projectId` 在前端归入同一父节点。
- 全局会话继续以 `global-agent-history.json` 为真实会话清单，孤立诊断记录不投影到产品页面。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:global-memory-center-sessions`：16 项通过。
- `npm run test:memory-center-scope-hierarchy`：16 项通过，包含空群聊会话详情、项目长期记忆与会话分离。
- `npm run test:global-memory-center-sessions:render`：桌面与手机视口通过，无横向溢出；左栏总滚动高度由全部展开时的 `5055px` 收敛为 `777px`。
- 当前真实数据：3 个群聊父节点下共 5 个会话；7 个项目父节点下共 20 个项目会话。

## 代码入口

- `backend/modules/knowledge/memory-control-center-api.ts`
- `backend/modules/knowledge/memory-control-center-handler.ts`
- `frontend/src/components/knowledge/MemoryCenterPanel.vue`
- `scripts/memory-center-scope-hierarchy-selftest.mjs`
