# 工作台、页面加载与菜单管理

## 权威边界

- 任务、项目、群聊、定时任务和运行状态仍以各自 canonical 存储为事实来源，工作台只生成轻量只读投影。
- `UsabilityWorkbenchSnapshotV3` 首屏只包含统计、待办、首批执行/交付记录、资源摘要、游标、checksum 和生成时间。
- 活跃任务、近期完成、项目、群聊和定时任务通过 `/api/usability/workbench/items` 游标分页，不在首屏传输全部历史。
- 工作台 GET 不清理 PID、不归档任务、不修改任务状态。自动归档由治理调度器查询候选任务并逐条执行 SQLite CAS。

## 任务动作

- 工作台通过 `/api/usability/tasks/:id/action` 执行暂停、恢复、重试、补充、开始、取消和归档。
- 每次动作绑定用户、任务 revision、`client_message_id` 和幂等回执。
- `paused` 才能直接恢复；`failed` 进入重试；`needs_user` 必须携带补充信息；确认和权限等待继续进入原门禁。
- Viewer 只读，Operator 可执行普通任务与项目运行，Admin 负责定时任务配置和高风险管理。

## 项目控制

- “连接/断开 Agent”调用 `/api/projects/agent-connection`。
- “启动/暂停/重新运行/构建源码”调用 `/api/projects/runtime/action`，并绑定精确运行配置。
- 断开项目 Agent 会按既有规则停止当前项目全部源码运行和构建进程，不影响其他项目。
- 项目资源快照不公开源码目录、PID 文件或 Provider 内部协议。

## 菜单配置 V3

- `NavigationConfigurationV3` 由“Admin 工作区默认 + 当前用户个人覆盖”合并而成。
- 工作区默认和个人配置分别维护 revision；PATCH 使用 CAS，冲突返回 `409 state_drift`。
- 用户可以调整分组、顺序、隐藏、固定、移动端入口和个人安全链接；Admin 可切换到工作区默认模式。
- 旧浏览器 `ccm-navigation-config-v2` 首次登录时按 checksum 惰性导入，之后仅作本地备份。
- `BroadcastChannel` 与 Runtime Event 同步多标签及多设备变化，旧请求和旧 revision 不能覆盖新配置。
- RBAC 在配置合并后应用。菜单布局只改变导航呈现，不授予 API 权限；无权限入口禁用并说明所需角色。
- 图标只接受受控 Lucide 名称或单个 Unicode 字符；拒绝 HTML、SVG 代码、URL 和脚本。

## 页面生命周期与无障碍

- 业务页按需加载，统一使用全局加载状态；加载失败保留最近有效快照并提供重试。
- 工作台请求使用 `AbortController + request_generation`，旧响应不能覆盖新状态。
- 导航分组和菜单项使用真实 button/link 语义，支持键盘焦点；悬停操作在 `focus-within` 时同样可见。
- 菜单弹窗提供 dialog 语义、标题关联和 Escape 关闭，移动端使用可滚动布局。

## 实现入口

- `backend/modules/system/usability.ts`
- `backend/modules/system/navigation-config.ts`
- `backend/core/task-store.ts`
- `backend/modules/system/api-access-control.ts`
- `frontend/src/components/common/UsabilityWorkbench.vue`
- `frontend/src/composables/useUsabilityWorkbenchLive.js`
- `frontend/src/components/workspace/MenuManager.vue`
- `frontend/src/utils/menuConfiguration.js`
- `frontend/src/App.vue`
