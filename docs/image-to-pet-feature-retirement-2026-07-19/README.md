# 图片生成宠物功能下线

## 原因

图片生成的 SVG 宠物质量无法稳定达到用户预期，因此停止继续暴露和维护该生成链路。

## 已移除

- 宠物空间“从图片创建”按钮。
- 皮肤选择区“新建宠物皮肤”卡片。
- 图片上传与宠物生成弹窗。
- `/api/pets/generation-jobs` 及其预览、候选、重试、确认、删除和动作审核接口。
- 全局 Agent 的 `create_pet_from_image` 工具及工具展示文案。
- 服务启动时的宠物生成任务恢复和生成状态联动。
- Codex 主形象执行器、本地 SVG 动作生成、视觉 QA 模块。
- `ccm-svg-pet-designer` 内置 Skill、专用测试脚本和 package script。
- 构建目录中已删除源码遗留的 JavaScript、声明文件和 sourcemap。

## 保留

- 全局 Agent 与音乐 Agent 两个系统宠物。
- 桌面宠物启动、关闭、显示隐藏、位置和动作策略。
- 已安装的内置或自定义宠物皮肤，包括此前已经生成并安装的皮肤。
- 历史生成任务文件与参考图片。它们不再被服务读取，也没有可访问的产品入口；本次未擅自删除用户数据。

## 验证

- `npm run build:backend`
- `npm run build:frontend`
- `npm run check`
- `node scripts/pet-workspace-companion-selftest.mjs`
- `CCM_PET_URL=http://127.0.0.1:3080/ node scripts/pet-workspace-companion-render-regression.mjs`
- GET/POST `/api/pets/generation-jobs` 均返回 404。

下线专项测试覆盖 UI、API、全局 Agent 工具、既有宠物渲染、桌面与移动端布局。没有调用 Codex 或付费 Provider。

## 已知无关测试状态

`scripts/role-skills-selftest.mjs` 的宠物 Skill 断言已移除，但该脚本仍有 6 个与本次功能无关的旧模块接入静态断言失败：全局、群聊与项目运行时已经拆分到新模块，而脚本仍在旧聚合文件中匹配源码。本次未扩大范围修改这些既有断言。
