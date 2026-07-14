# Codex 风格会话消息导航 v1

日期：2026-07-13

## 目标

将项目原有的右侧胶囊式消息导航改成接近 Codex 的左侧细线轨迹，并由一个公共组件统一服务项目会话、群聊会话和全局 Agent 会话。

## 实现

- 公共组件：`frontend/src/components/common/MessageNavigator.vue`
- 项目会话传入 `messagesEl` 与 `msg-` 消息前缀。
- 群聊会话传入 `groupMessagesEl` 与 `gc-msg-` 消息前缀。
- 全局 Agent 会话传入 `chatBody` 与 `msg-` 消息前缀。
- 组件监听实际消息滚动容器，根据可视区域自动计算当前消息。
- 普通节点为短灰线，当前消息为黑色长线；移除了胶囊底板、整条边框、模糊背景和伪滚动条。
- 鼠标悬浮、键盘聚焦或点击节点时，通过 `Teleport` 在聊天容器外显示用户问题、对应回复和附件摘要，避免被 `overflow` 裁切。
- 点击节点沿用各会话已有的平滑滚动逻辑，并将目标消息居中。
- 导航位置和最大高度根据真实消息滚动区域计算，使用 `ResizeObserver` 响应桌面、手机和容器尺寸变化，不覆盖输入框。
- 支持深色主题、键盘焦点、`aria-current` 和减少动效设置。

## 验证

- `npm run test:message-navigator`：公共能力和三类会话接入全部通过。
- `npm run check`：通过。
- `npm run build`：通过。
- 桌面真实项目会话：19 个节点、1 个当前态；点击第 18 个节点后目标消息垂直居中，摘要浮层可见。
- 手机 `390×844`：无横向页面溢出，导航轨迹与输入框不重叠。
- 浏览器控制台：无新增错误。

## 截图

- [桌面端悬浮摘要](evidence/2026-07-13-message-navigator-desktop.png)
- [手机端消息轨迹](evidence/2026-07-13-message-navigator-mobile.png)
