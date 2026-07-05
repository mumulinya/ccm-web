# 宠物空间 2.0：Workspace Companion

## 目标

把原来的“每个项目一个宠物”重构为更接近 Codex 风格的工作台陪伴区：

- 全局 Agent 是一个可选择、可换皮肤的系统宠物。
- 项目不再生成独立宠物，也不在宠物空间展示项目状态；项目状态回到项目管理和任务看板。
- 音乐 Agent 仍保留独立宠物身份。
- 自定义宠物/挂件继续保留。
- 桌面宠物引擎不再默认为每个项目创建宠物实例。

## 当前实现

### 前端

文件：

- `frontend/src/App.vue`
- `frontend/src/components/pets/PetMenu.vue`

改动：

- `App.vue` 不再把项目列表混入 `petAgents`。
- `App.vue` 会订阅 `/api/status/stream?client=workspace`，把 `global-agent` / `music-agent` 的运行时 `state`、`stateDetail`、`lastActivity` 同步到宠物空间。
- `PetMenu` 保留 `projects` prop 兼容入口，但当前不在页面展示项目状态。
- `PetMenu` 会在系统宠物条目和详情区展示轻量实时状态：
  - 待命；
  - 思考中；
  - 执行中；
  - 已回复；
  - 异常；
  - 待确认。
- 全局 Agent / 音乐 Agent 被固定为系统宠物，不会被自定义宠物逻辑重复添加，也不能被当成自定义挂件删除。
- 宠物空间左侧新增：
  - `WORKSPACE COMPANION` 主工作台伴侣卡片；
  - 桌面宠物引擎；
  - 全局 Agent / 音乐 Agent / 自定义宠物列表。
- 宠物装扮配置只面向：
  - `global-agent`
  - `music-agent`
  - 自定义宠物

### 后端

文件：

- `backend/server.ts`
- `backend/modules/global-agent.ts`

改动：

- `/api/pets/agents` 不再返回项目 Agent 宠物。
- 接口现在返回：
  - 全局 Agent 宠物；
  - 音乐 Agent 宠物；
  - 自定义宠物。
- 全局 Agent 宠物已接入真实 Agent 工作流事件：
  - 用户给全局 Agent 发消息时，宠物进入 `thinking`；
  - 全局 Agent 规划/判断下一步时，宠物气泡显示简短状态；
  - 工具开始执行时进入 `working`；
  - 工具完成时显示执行完成提示；
  - 全局 Agent 完成回复时进入 `happy` 并显示最终回复摘要；
  - 失败、取消或需要用户确认时，切换到 `error` / `notification`。
- 全局 Agent 宠物动作协议 1.0：
  - `thinking`：理解用户需求；
  - `planning`：主 Agent 拆任务/判断下一步；
  - `carrying`：只读查询、读取记忆、检索知识库、搬运上下文；
  - `building`：派发任务、执行开发、运行命令、协调子 Agent；
  - `debugging`：工具失败、测试失败、恢复/重试/返工；
  - `reviewing`：工具完成、验收、复盘、审查交付；
  - `waiting`：等待用户确认/澄清/继续授权；
  - `happy`：完成并给出最终回复；
  - `drag`：用户拖动桌面宠物时的临时反应。
- 动作资源优先复用现有素材：
  - `robot-*` 作为全局 Agent 默认外观；
  - `clawd-working-ultrathink/building/debugger/wizard` 映射规划、执行、排查、验收；
  - `cloudling-building/conducting` 和 `calico-working-building/conducting` 用于其他外观；
  - 通用外观没有专属动作时会回退到 `thinking/working/sweeping/attention/notification`。
- 桌面宠物渲染器已支持新状态，不会再把 `building/debugging/reviewing/waiting` 这类真实工作状态被气泡消息覆盖回老的 `thinking/error`。
- 群聊协作、项目任务和子 Agent 输出会镜像到 `global-agent` 宠物：
  - 项目宠物已经移除，所以协作状态统一由全局 Agent 宠物承载；
  - 气泡会带上来源前缀，例如 `项目A：Agent 正在思考...`；
  - 这样用户不需要在宠物空间看一堆项目宠物，也能知道工作流正在发生什么。
- 点击全局 Agent 宠物会跳转到 `global-agent` 页面。

这样桌面宠物引擎不会再因为项目列表自动创建一堆项目宠物。

## 设计边界

### 保留音乐 Agent 宠物

音乐 Agent 是独立陪伴对象：

- 可以单独命名；
- 可以单独换皮肤；
- 会同步到音乐播放页；
- 仍可通过桌面宠物引擎显示。

### 保留全局 Agent 宠物

全局 Agent 是系统级陪伴对象：

- 可以单独换皮肤；
- 可以单独命名；
- 会显示在宠物空间和桌面宠物气泡；
- 不与项目状态绑定。
- 会同步全局 Agent 的真实思考、工具执行、完成回复和错误状态。
- 会作为群聊协作的“总控视角”，展示子 Agent / 项目任务的关键进度。

### 项目不再是宠物

项目不在宠物空间展示状态：

- 项目状态应放在项目管理页、任务管理页或群聊任务卡；
- 宠物空间只负责桌面宠物、音乐 Agent 宠物和自定义挂件；
- 避免宠物空间重新变成项目监控页。

## 已验证

- `npm run build:backend`
- `npm run check`
- `npm --prefix frontend run build`
- 重启服务到 `http://localhost:3080`
- `GET /api/pets/agents` 返回结果包含 `global-agent` 和 `music-agent`，不再包含项目宠物。
- `global-agent` 的活动状态来源从静态 idle 改为 `agentActivity` 当前状态。
- 全局 Agent 事件已通过 `broadcastPetSpeech` / `setAgentActivity` 进入宠物 SSE 通道。
- SSE 验证：全局 Agent 普通对话会产生 `thinking -> status -> happy -> assistant final`，最终回复气泡只保留 1 条。
- 构建验证：
  - `npm run build:backend`
  - `npm run check`
  - `npm --prefix frontend run build`
  - `node --check ccm-package/pet/renderer/pet.js`

## 后续建议

- 给桌面宠物气泡增加更清晰的“折叠详情”：
  - 默认只显示一句人话状态；
  - 点击后再展示工具名、Trace、子 Agent 回执等技术细节。
- 给群聊协作增加更完整的阶段映射：
  - `reviewing`
  - `blocked`
  - `waiting_user`
  - `recovering`
- 给音乐 Agent 设计专属音乐律动动效，不和工作台状态混用。
