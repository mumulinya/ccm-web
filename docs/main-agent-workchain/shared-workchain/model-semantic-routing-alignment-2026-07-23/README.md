# 全链路模型语义路由

## 目标

CCM 中需要理解自然语言含义的选择统一交给模型。关键词、正则和句子长度不能决定是否创建任务、选择 Skill、选择项目成员、修改代码、拆 Epic、生成验收动作或播放哪首歌。

实现参考 Claude Code 的核心边界：模型读取 Skill 描述和当前上下文后选择能力；运行时代码只验证模型结果、权限、参数、容量和执行证据，不用本地关键词替模型完成语义选择。

## 统一决策

`WorkflowDecision` 是全局、群聊和项目入口的统一模型结果，包含：

- 工作模式：回答、项目分析、直接执行、先计划、拆 Epic。
- 当前意图、续跑关系、目标引用、影响范围和澄清问题。
- 模型选择的 Skill、是否需要代码修改、Agent QA、独立复核及验证方式。
- 模型评估的风险、记忆使用策略、授权语义变化和确认建议；最终权限仍由服务端确定性门禁裁决。

模型返回值必须经过枚举和 Skill 白名单规范化。缺少模型配置、调用失败、JSON 无效或关键字段缺失时 fail closed，不创建本地语义替代结果。

## 已迁移链路

- 全局 Agent：问答、状态、管理、执行授权、目标变更、代码修改需求和 Skill 选择使用模型决定。
- 群聊主 Agent：任务/问答/只读分析、成员派发、空派发重规划、Epic 拆解、Agent QA、独立复核和 Skill 选择使用模型决定。
- 项目 Agent：会话展示模式、是否执行、是否读取项目、代码修改和 Skill 选择使用模型决定。
- 需求资料：文件解析仍为确定性读取；需求提取和任务 DAG 必须由模型生成，失败时不创建本地计划。
- TestAgent：模型把验收目标转换为结构化 command、HTTP 和 browser checks；执行器只运行结构化检查。模型失败时验收被阻止，不从验收文字猜点击、上传、弹窗或表单动作。
- 音乐：精确歌曲、歌手范围、心情、场景、曲风和随机策略由模型决定；歌手候选过滤后仍由模型选歌，模型不可用时不随机或规则选曲。
- 前端模板：删除输入框关键词推荐。只有上游提供模型推荐结果时才显示推荐，否则由用户主动选择模板。

## 确定性边界

以下逻辑保留代码规则，因为它们不是自然语言意图识别：

- 命令、斜杠指令、ID、URL、文件路径、MIME、schema 和枚举校验。
- 项目路径隔离、敏感文件识别、权限升级、租约、风险操作和工具 allowlist。
- Provider HTTP、认证、超时、prompt-too-long 和进程退出错误分类。
- Token 容量、压缩门禁、checksum、会话边界和 MCP 签名验证。
- 结构化任务状态、回执、证据和 UI 展示投影。
- 词法/Embedding 候选召回可以缩小检索集合，但不能据此授权动作或选择工作流。

历史验收流构造器和 coded coordinator 仍作为专项测试/旧数据兼容代码保留；正式运行链路没有调用它们。静态审计会阻止这些函数重新进入生产派发路径。

## 数据流

```text
用户消息 + 精确会话上下文 + 可用项目/群聊/Skill
  -> 统一模型语义决定
  -> schema / enum / Skill allowlist 校验
  -> 确定性权限与容量门禁
  -> 结构化执行计划或自然回答
  -> Agent / 工具执行
  -> 结构化回执与证据门禁
```

模型负责“这句话是什么意思、应该选择什么”；代码负责“这个结果是否合法、是否有权限、是否能安全执行、证据是否足够”。

## 失败策略

- 模型不可用：回答入口返回明确错误，执行入口不创建任务、不派发、不播放、不拆解。
- 模型选择未知 Skill、模式或验证方式：白名单过滤；关键结果为空时阻止。
- 群聊模型空派发：允许一次模型重规划，不使用 coded/regex 补派。
- TestAgent 规划失败：工作单记录 `agentic_test_planning_blocked`，验收不得通过。
- 音乐模型失败：返回 reject，不随机选择候选。

## 验证证据

- `node scripts/model-semantic-routing-audit.mjs`：19 项生产调用链静态门禁通过。
- `npm run test:quick`：23/23 通过，后端测试构建使用独立临时目录。
- `node scripts/project-chat-presentation-selftest.mjs`：项目同步关键词分类 fail closed。
- `node scripts/role-skills-selftest.mjs`：Claude Code、Cursor、Codex 使用模型选定 Skill 快照。
- `node scripts/music-semantic-playback-selftest.mjs`：7 次本地 mock 模型调用覆盖歌曲、歌手、心情、曲风和随机策略。
- backend/frontend production build 通过；测试付费 Provider 调用为 0。

2026-07-24 的独立调用链复查及修复记录见 [模型语义路由独立自检](../model-semantic-routing-self-audit-2026-07-24/README.md)。

2026-07-29 的统一语义运行时、跨Agent路由、TestAgent覆盖、模型记忆准入、结构化验收与失败回执收口见 [全链路模型语义路由完整业务流程](../../../confirmed-business-processes/MODEL-SEMANTIC-ROUTING-END-TO-END.md)。
