# 全局工作伴侣与参考图宠物生成 v1

## 目标

宠物空间只保留两个真实工作伴侣：全局 Agent 与音乐 Agent。群聊主 Agent、项目子 Agent、Claude Code/Codex/Cursor 等第三方执行器、TestAgent 和定时任务不再创建独立桌宠，它们的工作状态统一映射到全局 Agent 宠物。

用户可以在宠物空间或全局 Agent 对话中上传 PNG、JPG、WebP 参考图，生成一套可在 Web 与 Electron 桌面宠物中使用的 Codex v2 宠物皮肤。

## 工作链路

1. 用户选择参考图、名称、可选描述、风格和目标 Agent。
2. 后端复制参考图到持久化任务目录，并将任务写入 `~/.cc-connect/pet-generation-jobs.json`。
3. 单并发队列调用 Codex CLI，并要求使用本机 `hatch-pet` skill 完成真实图像生成与 QA。
4. 前端每三秒读取任务状态，展示排队、生成、校验、安装、完成、失败与取消；失败任务可重试。
5. 安装前必须通过 1536x2288 图集、v2 manifest、扩展图集校验、逐帧 QA、16 方向语义、方向盲测、联络表和九组动作预览门禁。
6. 通过后皮肤同步安装到 Web 与 Electron 资源目录，并自动应用到全局 Agent 或音乐 Agent。

## 状态仲裁

多个执行器同时工作时，全局宠物按错误/调试、等待确认、TestAgent 验收、开发执行、规划思考、完成提示的优先级展示。一个子 Agent 提前完成不会覆盖仍在工作的高优先级任务；高优先级任务结束后会恢复展示尚未结束的执行器。

状态详情保留当前执行者身份，例如 `Codex：正在修改前端`，但不会向用户新增第三只桌宠。

## v2 动画契约

- 图集：8 列 x 11 行，1536x2288，单格 192x208，透明背景。
- 标准动作：idle、running-right、running-left、waving、jumping、failed、waiting、running、review。
- 观察方向：16 个顺时针方向。
- Web 与 Electron 使用相同的状态到动作行映射与逐帧时长。

## 验证

- `npm run check`
- `npm run build`
- `node scripts/pet-workspace-companion-selftest.mjs`
- `node scripts/pet-workspace-companion-render-regression.mjs`

截图与报告保存到 `docs/main-agent-workchain/operations-and-integrations/pets/evidence/workspace-companion/`。

## 2026-07-14 验收结果

- `npm run check`：通过。
- `npm run build`：通过，包含前端、飞书 MCP 与后端完整构建。
- 宠物契约自测：通过；并发仲裁、TestAgent 优先级、任务恢复、v1 拒绝、错误尺寸拒绝、有效 v2 包接受均通过。
- 运行中 API：`/api/pets/agents` 仅返回 `global-agent` 与 `music-agent`；`/api/pets/self-test` 返回 `pass: true`。
- Playwright：桌面与移动端通过；断言仅两个系统宠物、第三方执行者详情、v2 图集、生成进度、失败重试与响应式布局。
- 截图报告：`evidence/workspace-companion/report.json`，结果为 `pass: true`。

## 内置皮肤兼容修复

v2 图集播放器仅用于 `spriteVersionNumber: 2` 的生成皮肤。Clawd 等内置皮肤在 Agent 列表、当前装扮和皮肤图鉴中继续使用原始默认图，例如 Clawd 始终读取 `/pets/clawd.svg`，不会被状态动画首帧替换。
