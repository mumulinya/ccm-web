# MCP/Skill 工具市场与目录生命周期

## 工具来源

- CCM内置目录和官方精选。
- CCM Community远程目录。
- Skills.sh、Smithery及用户明确添加的 HTTPS目录。
- 用户本地手工配置的 MCP和Skill。

## 安装流程

1. 读取并标记来源信任级别和在线状态。
2. 安装前预览包信息、来源证明、文件清单、权限影响和运行时影响。
3. 远程URL执行HTTPS、DNS、内网地址、重定向和响应大小校验。
4. Skill先进入临时目录，验证 `SKILL.md` 和目录结构后原子安装。
5. MCP只保存受支持的启动定义和加密凭据引用。
6. 安装、更新或卸载后更新目录revision，重新计算授权快照并触发受控运行时重同步。

## 安全与失败处理

- 市场安装不等于授权；用户仍需在全局、群聊或项目作用域显式启用。
- 安装包不能越界写入，不能把环境密钥显示在预览、状态或审计中。
- 目录变化导致旧子 Agent快照失效；Runner会受控重建，不能继续使用过期权限。
- 重同步失败时保留已安装文件和失败原因，相关Agent派发失败关闭。
- 所有安装、更新、卸载和自动重同步写入有界审计日志。

## 实现入口

- 市场：`backend/modules/tools/marketplace.ts`
- 目录与授权：`backend/modules/tools/tools.ts`
- 页面：`frontend/src/components/tools/ToolsConfig.vue`、`InternalMcpCatalog.vue`、`McpServerEditor.vue`
