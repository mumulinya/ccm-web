# 内置与外部 Skill 边界

## 目标

CCM 内部工作 Skill 必须随项目和 npm 包发布，不能被用户操作或外部商城覆盖。商城下载、本机加载和用户创建的 Skill 必须使用独立的外部目录，并在工具配置界面中与内置 Skill 明确区分。

## 实现

- 14 个 CCM 内置 Skill 的唯一源码位于 `ccm-package/templates/skills/ccm-*`，运行时直接读取该目录，不再复制到用户外部 Skill 目录。
- `~/.cc-connect/skill-packages` 仅用于商城下载和本机外部 Skill 包。
- 启动时写入只读目录元数据，并自动修复被手工移除的内置 Skill 元数据。
- 启动时清理旧版本遗留在外部目录中的内置同名副本。
- 存储 API 拒绝修改、停用、覆盖或删除内置 Skill，返回 `403` 和 `CCM_INTERNAL_SKILL_IMMUTABLE`。
- 商城拒绝安装、更新或卸载任何与内置 Skill 保留名称冲突的条目。
- 外部 Skill 仍支持创建、更新、启停和删除。
- 工具配置页面分为“CCM 内置 Skill”和“外部与用户 Skill”；内置项只读，不显示开关和删除按钮。
- 内置 Skill 提供只读“查看说明”入口，内容仅从 npm 包内对应的 `SKILL.md` 安全读取，查看能力不会开放编辑、停用或删除权限。

## 验证

运行：

```bash
npm run test:internal-skill-boundary
```

隔离回归会验证内置路径归属、不可变字段、存储保护、API `403`、商城冲突保护、旧副本清理、元数据自修复、外部 Skill 完整生命周期以及前端分组来源。
