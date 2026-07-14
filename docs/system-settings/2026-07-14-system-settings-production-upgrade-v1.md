# 系统设置生产化升级 v1

日期：2026-07-14

## 目标

把系统设置从混合配置与运维诊断的长页面，收敛为用户可理解、状态可信、凭据安全的设置中心，并验证桌面和移动端真实渲染。

## 完成内容

### 统一模型

- 原“群聊主 Agent 模型”更名为“统一大模型”。
- 明确全局 Agent、群聊主 Agent、音乐 Agent 共享同一套协议、URL、Key 和模型配置。
- 新增只执行最小请求的连接测试，不创建任务、不派发子 Agent。
- 连接结果分别映射到三个 Agent，显示真实响应耗时。
- API 对协议、HTTP(S) URL、温度和超时执行服务端校验。
- 知识库 Embedding 作为独立子页保留；本地混合检索仍可在未配置外部模型时工作。

### 凭据安全

- 统一模型 Key 从明文 JSON 自动迁移为 `ccm-secret://` 本机凭据引用。
- 飞书 Webhook URL 纳入 AES-256-GCM 凭据保护范围。
- API 只返回 `hasKey`、就绪状态或 `******`，不返回真实密钥。
- 密钥输入框留空代表保留已保存凭据，不再把掩码文本回填进表单。

### 飞书双通道

- 报告通知与任务会话改为分段视图，避免两套配置堆在一屏。
- 报告通知只负责日报和周报；任务会话负责接收需求并返回计划、进度、TestAgent 和验收结论。
- 任务会话展示真实进程、WebSocket、重试队列和连接验证结果。
- 配置步骤默认折叠，普通用户首先看到状态和主要操作。

### 页面与交互

- `Settings.vue` 从 2105 行收敛为 58 行的页面装配层。
- 按业务拆分渠道、模型、体验、系统四个面板；面板仅在打开时加载自身数据。
- 删除设置页不可见的自动开发诊断、CLI 探针、每日演练和知识库文档管理遗留代码。
- 修复原“测试意图识别”和“恢复出厂设置”无处理函数的问题。
- 版本与进程状态改为后端真实数据，不再写死 `v1.0.8` 和 `ONLINE`。
- 恢复默认只删除当前浏览器的主题、轮询和菜单偏好，不删除 Agent、项目、任务、会话、密钥或知识库。
- 使用 Lucide Vue 图标统一设置页操作和导航图标。

## 接口

- `GET /api/system/settings-status`：版本、PID、启动时间、运行时长和凭据保护状态。
- `GET /api/orchestrator/config`：脱敏后的统一模型配置及使用方。
- `POST /api/orchestrator/config`：保存并加密统一模型配置。
- `POST /api/orchestrator/connection-test`：执行无副作用的模型连通性测试。

## 验证

- `npm run check`
- `npm run build`
- `npm run test:settings`
- `npm run test:settings-render`
- `npm audit --omit=dev`：生产依赖 0 个已知漏洞。

真实模型连接测试通过，三个共享使用方均为 ready。

截图与报告：

- `scratch/settings-production-selftest/report.json`
- `scratch/settings-render-regression/report.json`
- `scratch/settings-render-regression/desktop-channels.png`
- `scratch/settings-render-regression/desktop-models.png`
- `scratch/settings-render-regression/desktop-system.png`
- `scratch/settings-render-regression/mobile-models.png`
