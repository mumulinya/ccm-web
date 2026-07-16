# 全局 Agent 宠物生成运行时修复 v1

## 故障现象

全局 Agent 能识别用户上传的参考图片，也能创建持久化宠物生成任务，但任务在 8% 立即失败，只有参考图、生成提示词和日志，没有产生动作图集。

失败任务：`petgen_mrnc5auk_e3e23a`

## 根因

宠物生成器通过 PATH 启动 npm 安装的 `codex-cli 0.115.0`。本机模型目录包含 GPT-5.6 的 `max/ultra` 推理等级，这些值不被旧 CLI 的模型目录解析器接受；即使临时过滤模型目录，服务端仍会拒绝旧 CLI 调用 GPT-5.6。

本机同时存在可执行的 Codex Patched 运行时 `codex-cli 0.144.0-alpha.4`，该版本能够读取当前 GPT-5.6 模型目录并完成真实模型请求，但旧生成器没有发现或选择它。

## 修复

- 宠物生成器新增 Codex 运行时发现和版本择优逻辑。
- 优先读取 `CCM_PET_CODEX_COMMAND`、`CCM_CODEX_COMMAND`，其次发现用户文档目录中的 Codex Patched 运行时，最后回退 PATH。
- 候选运行时必须通过真实 `--version` 探针，并按语义版本选择较新版本。
- 宠物生成仍使用独立工作目录、`danger-full-access` 沙箱、临时会话和原 hatch-pet 提示词。
- 模型目录不兼容、CLI 版本过旧和图像生成能力缺失会写入可理解的任务错误，不再只显示“进程退出 1”。
- 不修改用户的 GPT-5.6 模型目录，不影响 Codex Patched 中的 `max/ultra` 能力。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- 宠物工作台与生成契约自测：通过。
- 新增检查：版本择优、生成命令权限和临时会话、模型目录错误可读化。
- Codex Patched 最小真实请求：成功返回 `OK`。
- 重启 `3080` 后重试原失败任务：从 `queued` 进入 `generating`。
- 任务已写出 `progress.json`，当前阶段为 `preparing`，后台进程存活并正在读取 hatch-pet 脚本、检查参考图片和生成环境。

生成完成后仍必须通过 Codex v2 图集尺寸、9 组动作、16 个观察方向、逐帧 QA 和盲测门禁，随后才会自动安装并应用到全局 Agent。
