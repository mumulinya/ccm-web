# Codex 主形象与本地动作生成链路

## 目标

宠物生成采用两阶段责任边界：

1. Codex 根据用户上传的参考图生成一个标准、可审核的 `idle.svg` 主形象。
2. 用户确认主形象后，CCM 本地全局 Agent 以已确认 SVG 和设计说明为基线生成完整动作。

该链路不恢复旧版 Codex 8x11 图集生成，也不让本地模型生成 canonical 主形象。

## 数据流

1. CCM 保存参考图和精确生成任务。
2. `pet-codex-svg-preview.ts` 发现可用 Codex 运行时，优先选择语义版本最高的有效运行时。
3. Codex 读取参考图、`ccm-svg-pet-designer` Skill、SVG 契约、上一版候选和复审意见。
4. Codex 只写出本轮标准 SVG 与结构化设计说明，不生成动作、图集或安装文件。
5. CCM 使用现有 SVG 安全校验、渲染和参考图相似度复审。未通过时最多自动重做三轮，并保留每轮候选与文字结论。
6. 用户确认主形象后，本地全局 Agent 才生成 26 个独立动作；动作仍需渲染 QA、身份一致性复审和第二次用户确认。

## 运行时与取消

- 运行时优先级：`CCM_PET_CODEX_COMMAND`、`CCM_CODEX_COMMAND`、本机 Codex patched runtime、PATH 中的 `codex`。
- 每个候选使用独立输出文件，旧文件在调用前清理，避免把上次结果误判为本次成功。
- Codex 进程 PID 绑定精确宠物生成任务。用户取消任务时，Windows 使用 `taskkill /T /F` 终止完整子进程树。
- Codex 退出但未写出 SVG 或设计说明、SVG 不满足安全契约、JSON 无效时均 fail closed，不进入主形象确认。

## 兼容行为

- 旧任务按读取时惰性标记为“旧版全局模型主形象”；不删除已有候选和审查记录。
- 旧失败或取消任务点击重试时，主形象阶段自动切换为 Codex。
- 已确认主形象的任务继续本地动作阶段，不重复调用 Codex。
- 已安装宠物、候选选择、修改意见、动作重做和生成记录删除功能保持不变。

## 界面

创建区固定展示：

- 主形象：Codex 标准 SVG
- 后续动作：本地全局 Agent

每条新任务显示“Codex 主形象 · 本地 Agent 动作”，避免把两个阶段误认为同一个模型完成。

## 验证

- `npm run build:backend`
- `npm run build:frontend`
- `npm run check`
- `node scripts/global-agent-svg-pet-selftest.mjs`
- `CCM_PET_URL=http://127.0.0.1:3080/ node scripts/pet-workspace-companion-render-regression.mjs`

验证覆盖 Codex 提示词与输出契约、模拟 Codex 文件产出、SVG 安全校验、本地动作生成、候选收敛、桌面与移动端渲染。自动测试使用 mock runner，真实 Codex/付费 Provider 调用为 `0`。
