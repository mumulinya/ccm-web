# 工作台、页面加载与菜单管理

## 工作台

- 首页聚合项目、群聊、待处理任务、执行中任务和近期活动。
- 从工作台发起的需求仍进入统一任务摄取、计划、队列和验收链，不创建独立任务系统。
- 任务优先级、暂停和批量排队修改服务端任务状态，页面只显示结果。

## 页面生命周期

- 业务页按需加载，首次加载使用统一全局遮罩；页面内部不重复叠加互相冲突的Loading层。
- 加载失败显示统一重试状态，不用空白页面伪装“没有数据”。
- 已打开页面保留标签状态；会话任务在后台继续运行，切换页面不会取消任务。

## 菜单管理

- 用户可调整菜单分组、顺序、显示、固定和移动端主入口，也可添加安全的外部HTTPS链接。
- 菜单配置使用版本化Schema，支持备份、恢复、导入、导出和重置。
- 菜单偏好保存在浏览器本地，不修改后端权限或业务路由。
- 受保护的菜单管理入口不能被自身配置永久隐藏。

## 实现入口

- `frontend/src/App.vue`
- `frontend/src/components/workspace/Dashboard.vue`
- `frontend/src/components/workspace/MenuManager.vue`
- `frontend/src/utils/menuConfiguration.js`
- `frontend/src/components/common/PageLoadingOverlay.vue`
