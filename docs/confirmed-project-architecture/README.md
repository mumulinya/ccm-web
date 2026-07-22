# 已确认项目结构与业务流程

本目录集中保存 CCM 已经由用户确认的项目结构、模块边界和业务流程。

这里的文档是当前产品口径，不用于记录临时方案、实施阶段、测试流水或尚未确认的设想。后续确认新的核心模块时，在本目录新增独立 Markdown 文档，并同步修正受影响的既有文档，避免同一业务保留相互冲突的说明。

## 当前文档

- [记忆系统](./MEMORY-SYSTEM.md)：全局 Agent、群聊主 Agent、独立项目 Agent、群聊项目子 Agent的单会话记忆，以及无会话列表的音乐 Agent 单例记忆、长期记忆、压缩、MCP 读取和受控写回流程。
- [知识库使用系统](./KNOWLEDGE-SYSTEM.md)：知识文档如何按全局、群聊、项目和 Agent 作用域被自动召回，第三方 Agent 如何通过 MCP 深读，以及 Embedding 缺失时的本地检索流程。
- [音乐意图与播放](./MUSIC-PLAYBACK.md)：全局 Agent 与音乐 Agent 如何理解精确点歌、歌手、心情、场景、曲风和随机播放请求，并共用唯一播放器。
- [开发 Agent 认证与运行时](./DEVELOPMENT-AGENT-AUTH.md)：Codex、Cursor 的本机 CLI 登录，Claude Code 第三方 API，以及独立项目 Agent 与群聊项目子 Agent 的统一认证边界。
- [TestAgent 智能独立验收](./TEST-AGENT.md)：TestAgent 如何自主读码、选择命令和 Playwright 检查，并由确定性证据门禁给出最终验收结论。
- [开发权限分级审批](./TASK-PERMISSION-APPROVAL.md)：项目子 Agent 如何申请额外权限、群聊主 Agent 如何审批、何时升级用户，以及限时租约如何消费和审计。
- [飞书全局 Agent 双向会话](./FEISHU-GLOBAL-AGENT.md)：飞书消息如何进入独立全局会话、回复如何返回原飞书会话，以及权限如何在飞书中确认。
