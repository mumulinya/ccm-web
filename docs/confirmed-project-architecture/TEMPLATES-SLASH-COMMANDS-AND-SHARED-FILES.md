# 斜杠命令与共享文件

## 模板状态

- 对话模板功能已经退役，不再提供模板创建、编辑、选择、变量展开或Agent创建模板动作。
- 历史`prompt-templates.json`只作为用户旧数据保留，CCM不再读取或改写。
- 旧`/api/templates`请求统一返回`410 TEMPLATE_FEATURE_REMOVED`，引导用户改用Skill、斜杠命令或共享文件。
- 明确工作方法使用Skill；确定性快捷操作使用斜杠命令；业务资料和规范使用共享文件。

## 斜杠命令

- 命令按`global | group | project`精确作用域发布。
- 显式命令名称、参数、ID和页面跳转使用确定性解析；普通自然语言语义仍交给模型。
- Skill命令只根据当前作用域已授权Skill生成，不把全部已安装Skill暴露给所有Agent。
- 查询、导航和客户端命令可直接解析；本地修改和高风险命令必须经过服务端挑战、用户确认和单次确认回执。
- 高风险命令只允许Admin确认；Operator只能执行中央RBAC允许的受控修改；Viewer只能使用只读能力。
- 自定义命令注册表使用跨进程文件锁与原子写，只允许Prompt和导航动作，不能注册任意服务端端点。
- 命令清单、审计接口不返回本地注册表和日志路径。

## SharedFileManifestV2

- 全局、群聊和项目各自拥有精确共享文件作用域，不跨作用域读取。
- 文件正文保存于受控目录，配置和API只返回ID、名称、类型、大小、checksum、revision、解析状态与分片清单。
- 上传使用流式Multipart，执行64MB请求、10文件、单文件25MB、合计60MB、MIME、文件签名、双扩展名和超时门禁。
- 文件名禁止路径、系统保留字符和可执行扩展名；读取与删除拒绝符号链接、Junction和目录越界。
- 文本与OOXML解析为完整Token分片；不再用20K字符截断伪装完整读取。
- 同一作用域内写入使用跨进程锁和原子清单更新；旧全局磁盘文件、项目内联文件和群聊内联文件惰性导入，原历史数据不删除。

## Agent消费

- 全局Agent读取全局共享文件，不继承群聊或项目文件。
- 群聊主Agent及其项目子Agent读取当前群聊共享文件。
- 项目主Agent及项目会话子Agent读取当前项目共享文件。
- 投影在Token预算内注入完整分片；超出预算的分片必须通过精确`file_id + chunk_id`读取，不能按文件名猜测。
- 实际读取清单、checksum和选中分片进入精确会话隐藏执行账本；聊天界面不生成重复技术消息。

## 实现入口

- 斜杠命令：`backend/modules/tools/slash-commands.ts`
- 共享文件存储：`backend/modules/tools/shared-files-v2.ts`
- 共享文件API：`backend/modules/tools/shared-files-api.ts`
- 安全上传：`backend/system/secure-multipart.ts`
- 群聊投影：`backend/modules/collaboration/collaboration-runtime-plan-tools.ts`
- 项目与全局投影：`backend/server.ts`、`backend/modules/global/global-agent-agentic-runtime.ts`
- 前端命令：`frontend/src/composables/useSlashCommands.js`
