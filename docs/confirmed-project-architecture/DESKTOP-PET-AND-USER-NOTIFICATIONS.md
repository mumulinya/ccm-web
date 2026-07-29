# 桌面宠物与用户通知

## 桌面宠物

- 桌面宠物是工作状态投影和快捷导航入口，不是独立主 Agent。
- 它可展示全局、群聊主 Agent、项目开发 Agent、TestAgent和定时任务的统一活动状态。
- 多个执行同时发生时，由全局协调器按优先级选择当前展示活动，防止状态相互覆盖。
- 用户可启动、关闭、配置皮肤、上传受限资源并从宠物跳转到相关页面。
- Electron运行时不可用时页面宠物仍可使用，桌面窗口明确显示不可用原因。

## 通知链

- Web Toast、桌面宠物和飞书通知都消费结构化任务/权限/播放事件。
- 权限申请显示任务来源、风险和有效期；宠物只提示，不替用户批准。
- 飞书消息的处理中表情、完成或失败反馈绑定原飞书消息。
- Web来源的普通回复不会发送到飞书；飞书来源的业务通知只回原会话。
- 通知失败不改变任务真实终态，并保留可重试的投递回执。

## 资源安全

- 宠物上传资源限制为受支持格式和2 MB，并验证相对路径不能逃逸资源目录。
- Agent回复、源码和密钥不会写入宠物资源或公开状态文件。

## 实现入口

- `backend/modules/pets/pets.ts`
- `backend/modules/pets/pet-activity-coordinator.ts`
- `backend/modules/collaboration/agent-notifications.ts`
- `backend/integrations/feishu-reaction-feedback.ts`
- `frontend/src/components/pets/*`
