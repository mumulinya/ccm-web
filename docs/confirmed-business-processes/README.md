# 已确认业务流程实现

本目录记录 CCM 已经由用户确认、已经进入生产代码并通过回归验证的业务流程。

这里描述的是当前真实实现，不保存讨论草案、未来计划或仅有页面原型的能力。流程发生变化时，应直接更新对应文档，并保留实现入口、状态边界和验证证据，避免产品口径与代码脱节。

## 已确认流程

| 业务流程 | 当前状态 | 文档 |
| --- | --- | --- |
| 群聊项目子 Agent 跨项目协作 | 已实现、已启用签名与精确会话门禁 | [项目子 Agent 协作流程](./PROJECT-CHILD-AGENT-COLLABORATION.md) |
| 记忆系统端到端流程 | 已实现、已完成CC式压缩、长期记忆、MCP hydration与Context Engine闭环 | [记忆系统完整业务流程](./MEMORY-SYSTEM-END-TO-END.md) |
| 自动开发任务端到端流程 | 已记录全局Agent、任务派发、工作台、群聊/项目会话从需求摄取到开发、验收、回传、回放和记忆准入的完整链路 | [自动开发任务完整业务流程](./AUTOMATIC-DEVELOPMENT-END-TO-END.md) |
| 自动开发统一任务系统V2 | 已实现精确作用域身份、真实会话队列、跨会话工作区互斥、结构化终态门禁和旧入口兼容 | [自动开发统一任务系统V2](./AUTOMATIC-DEVELOPMENT-UNIFIED-TASK-SYSTEM-V2.md) |
| Agent MCP/Skill注册与继承 | 已实现全局、群聊、项目主Agent工具调用，以及项目子Agent签名快照、原生注册和精确作用域复验 | [Agent MCP与Skill注册继承流程](./AGENT-MCP-SKILL-INHERITANCE.md) |
| 全链路模型语义路由 | 已实现统一模型决策、跨Agent选人、TestAgent语义计划、模型记忆提取、结构化验收与失败回执 | [全链路模型语义路由完整业务流程](./MODEL-SEMANTIC-ROUTING-END-TO-END.md) |
| 知识库召回与本地Embedding V3 | 已实现真实本地/远程语义候选、generation索引、作用域门禁、Token预算和加密凭据 | [知识库召回与本地Embedding V3](./KNOWLEDGE-RETRIEVAL-EMBEDDING-V3.md) |

## 收录规则

1. 业务流程必须已经实现并完成针对性回归，不能只记录设计方案。
2. 文档必须明确用户入口、参与角色、数据和通信方式、状态流转、失败处理及验收条件。
3. 主 Agent、项目子 Agent、TestAgent 和用户的责任边界必须分开描述。
4. 涉及会话、任务、项目、权限或记忆时，必须写明精确作用域和跨作用域拒绝策略。
5. 原始协议字段和排障标识可以记录，但不能代替用户可理解的业务说明。
6. 实现变化后同步更新本文索引、对应流程文档及 `docs/CURRENT.md`。
