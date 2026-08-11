# 桌面宠物与用户通知

## 产品边界

- 用户通知是持久业务事实；网页通知中心、Electron桌宠、网页宠物和飞书只是不同投递渠道。
- 桌宠不是Agent，也不保存或生成业务结论。它只投影任务、权限和Agent的结构化状态。
- 桌宠内容是最多240字的用户化摘要，例如“任务已完成”“测试失败”“需要权限确认”“任务等待补充资料”。
- Prompt、API Key、Cookie、原始工具结果、错误栈、源码正文、本地路径、Provider协议和Agent原始输出永不进入宠物通知。
- Agent运行过程通过`ccm-pet-agent-milestone-v1`安全投影；第三方Result只表示“等待CCM验收”，不能触发完成语义。

## 数据结构

`UserNotificationV2`保存在SQLite，绑定：

- 精确接收用户；
- 来源渠道；
- `global | group | project | task | system | music`作用域；
- 精确会话与任务；
- 类型、严重程度、结构化状态；
- 脱敏标题、摘要和操作入口；
- 稳定幂等键与事件checksum。

`UserNotificationDeliveryV2`分别记录`web | desktop_pet | web_pet | feishu`的投递状态、客户端、尝试次数、认领和确认时间。没有在线宠物客户端时保持`pending`，不会伪装成已送达。

`PetAgentMilestoneV1`只存在于实时宠物流，绑定task、work item、精确会话、消息锚点、generation、attempt和Agent run。它只保存最多240字的安全摘要和跳转定位，不保存正文。计划、开始实现、关键发现、验收、返工和总结属于临时里程碑；需要用户处理、失败、取消和正式终态继续进入持久通知。

## 归属规则

- 能证明发起用户时只通知该用户。
- 无法证明发起用户时通知所有有效Admin。
- Web与飞书回复仍遵循原精确来源，不因桌宠通知跨会话转发。
- 权限、阻塞和待补充通知在解决前保持活动；已读不等于已解决。

## 运行时

- Electron使用调用方为`desktop-pet`的内部HMAC，请求绑定方法、完整路径、时间和一次性nonce。
- Electron只可访问桌宠启动数据、通知流、投递确认、配置PATCH和安全导航等最小路由。
- Electron通知流采用单连接和指数退避。通知被窗口实际渲染后才提交确认。
- Electron离线时，全局网页宠物接管同一通知协议；Electron恢复后网页宠物自动隐藏。
- 网页和Electron同时支持实时里程碑；同一时刻只显示最新气泡，旧generation、旧attempt和重复心跳不会刷屏。
- 桌宠默认手动启动。开启“随CCM启动”后，仅在检测到图形桌面时自动启动；无桌面的Linux服务器安全跳过。

## 配置与资源

- `PetConfigV2`包含revision、Agent配置、位置、自定义皮肤、自动启动、网页兜底和`milestones | terminal_only`进度模式；默认关键里程碑。
- 页面和Electron使用PATCH语义；revision不匹配返回`409 state_drift`，不能用陈旧整份配置覆盖其他窗口修改。
- 上传资源限制2MB。PNG校验签名、IHDR和最大4096像素；SVG拒绝脚本、事件、实体、`foreignObject`、外部引用和CSS URL。
- 资源写入使用checksum不可变副本；Electron读取时执行路径、扩展名、普通文件、符号链接和realpath边界校验。
- Electron渲染页使用严格CSP，不允许外部网络、对象或Frame资源。

## 生命周期与保留

- 通知状态从持久创建开始，经渠道认领、展示和确认进入已送达。
- 临时失败最多重试5次；15秒未确认的宠物认领可由客户端重连后恢复。
- 点击通知只打开绑定的会话、任务回放或审批页面；目标失效时提示记录已归档。
- 已读或取消提醒的普通通知默认保留180天；未解决的权限和阻塞通知继续保留。清理中心通过预览和持久事务执行删除。

## 实现入口

- `backend/system/user-notifications.ts`
- `backend/system/pet-agent-milestones.ts`
- `backend/system/observability-database.ts`
- `backend/modules/pets/pets.ts`
- `backend/modules/collaboration/task-permission-broker.ts`
- `backend/server-pet-activity.ts`
- `ccm-package/pet/main.js`
- `ccm-package/pet/preload.js`
- `ccm-package/pet/renderer/pet.js`
- `frontend/src/components/system/NotificationCenter.vue`
- `frontend/src/components/pets/WebPetHost.vue`
- `frontend/src/components/pets/DesktopPet.vue`

完整用户流程见[桌面宠物与用户通知完整业务流程](../confirmed-business-processes/DESKTOP-PET-AND-USER-NOTIFICATIONS.md)。
