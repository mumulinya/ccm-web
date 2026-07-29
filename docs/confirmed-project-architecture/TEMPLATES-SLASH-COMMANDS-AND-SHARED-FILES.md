# 模板、斜杠命令与共享文件

## 提示模板

- 系统提供开发、维护、审查、协作和规划模板，也允许用户创建、编辑和删除自定义模板。
- 模板只负责帮助用户形成输入，不直接创建任务或绕过模型语义判断。
- 变量在前端明确填写后展开；模板正文作为用户提交的一部分进入精确会话。

## 斜杠命令

- 命令按 `global | group | project` 作用域发布，只展示当前会话可用命令。
- 查询类命令可读取任务、Git、知识库、工具、日志和系统状态。
- 修改类命令带结构化风险和权限要求；例如提交、回滚、项目停止必须经过确认。
- 显式命令走确定性解析；普通自然语言仍交给模型语义路由。
- 自定义命令必须通过Schema和作用域校验，不能注入任意服务端路径。

## 共享文件

- 全局、群聊和项目共享文件具有独立授权范围。
- 支持上传、下载、读取、写入和删除；路径在受管目录内解析。
- 群聊主 Agent、项目主 Agent和子 Agent只能读取其授权作用域内的共享文件。
- 共享文件可成为需求资料或知识来源，但文件本身仍是事实源，聊天摘要不会替代原文。

## 实现入口

- 模板：`backend/modules/templates/templates.ts`
- 命令：`backend/modules/tools/slash-commands.ts`
- 共享文件：`backend/modules/tools/tools.ts`、`projects/projects.ts`、`collaboration/group-routes.ts`
- 页面：`TemplatePicker.vue`、`SlashCommandMenu.vue`、项目/群聊共享文件弹窗。
