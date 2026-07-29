# 全局 Agent 运行体系 V2

## 目标与边界

全局 Agent 是 Web 与飞书的跨项目业务入口。它负责理解请求、查询全局信息、选择群聊或项目执行位置、创建和监督下游任务，并把最终结果返回原精确会话。它不直接替代群聊主 Agent、项目主 Agent或项目子 Agent修改源码。

生产运行链固定为：

```text
Web / 飞书消息
→ 精确会话 Turn 持久化
→ 服务端原子领取
→ 模型语义路由
→ 精确写入授权
→ Agentic Loop 与工具执行
→ Mission 后台监督
→ 终态规范化
→ 持久发件箱投递
→ 会话、回放与长期记忆准入
```

## 一、消息入站与权威队列

1. Web、兼容聊天接口和飞书入站都先生成稳定 `turn_id`，并写入 `conversation-turn-control` V2。
2. 队列以 `channel + exact_session_id` 隔离。同一精确会话只能存在一个有效执行租约，不同会话可以并行。
3. 队首由服务端原子 `claim`；浏览器的发送状态只是服务端队列的显示，不拥有调度权。
4. 队列记录保存租约、到期时间、Run ID、checkpoint、语义回执和原始来源身份。多标签、刷新、断线以及 Web/飞书重复入站不能产生第二个执行者。
5. `waiting_confirmation`、`waiting_clarification`和`blocked`释放执行租约。`supervising`表示 Mission 已转入后台，不长期占用聊天队首。
6. 后续消息由模型判断为确认、补充要求、目标调整、状态查询或新任务；自然语言不经过关键词或正则续跑路由。

## 二、模型语义路由与授权

模型输出结构化工作流决定，服务端随后生成 `GlobalWriteAuthorizationReceiptV2`。回执绑定：

- 当前用户主体与 RBAC 角色；
- Web 或飞书来源、精确会话、消息和 Turn；
- 语义决定 checksum；
- 允许的目标、影响范围、工具家族和最高风险；
- 单轮有效期、撤销状态和回执 checksum。

授权规则：

1. `actionRequired`只说明请求需要执行，不授予写权限。
2. 只有模型明确返回 `authorizationDirective=grant`、用户具备相应能力、目标能够精确证明、无需用户确认且风险不高时，才生成当前范围内的普通写授权。
3. 高风险、破坏性、发布部署、越界目标、权限不足和 `requiresUserConfirmation=true`始终等待精确用户确认。
4. 用户确认绑定工具调用签名，只能使用一次；撤销会立即使旧授权失效。
5. 计划、源码分析和需求拆解保持只读。创建任务、提交 Git、修改配置等副作用必须分别通过写入门禁。
6. Provider不可用、超时或结构化结果无效时，Run进入 `failed/degraded`，不执行工具、不创建任务，也不计为成功。

## 三、执行与 Mission 监督

1. Agentic Loop只能调用全局作用域已授权的 Skill、MCP和内部工具。
2. 每次工具调用同时校验授权回执、精确目标、风险、一次性确认和工具幂等键。
3. 工具调用和结果进入当前会话的隐藏执行账本，不生成重复聊天气泡。
4. 开发需求创建 Global Mission或统一任务并交给目标群聊/项目；后台 Supervisor持续读取结构化进度、权限、TestAgent和验收状态。
5. Mission监督与聊天回合解耦。同一会话可以管理多个已派发Mission，但模型回合仍严格串行。
6. 与已有Mission有关的状态查询或补充要求由模型绑定原Run；独立新需求创建新的Run。

## 四、会话上下文与正式压缩

1. 未压缩时使用当前精确会话的全部完整轮次，以及对应隐藏执行账本。
2. 工具使用和工具结果必须保持配对；MicroCompact只处理足够旧且满足上下文压力条件的工具结果，不修改原始记录。
3. 超大压缩段按真实Token容量拆成完整对话轮次，每段分别调用正式压缩模型。
4. 所有分段通过来源消息覆盖和保护事实校验后，再由正式模型合并摘要。
5. 只有全部原始消息ID已被有效覆盖、保护事实完整且压缩后再次通过容量门禁，才能推进compact boundary。
6. 任一分段、合并摘要或最终容量校验失败时失败关闭：不提交摘要、不推进边界、不丢弃最旧对话，也不调用主模型。
7. canonical transcript、隐藏执行账本和历史摘要永久保留，是恢复与审计的事实来源。

## 五、终态与精确投递

Run、Supervisor和Mission的完成、失败、取消与验收统一生成 `GlobalRunTerminalReceiptV2`。终态提交后创建 `GlobalTerminalDeliveryV1` 持久发件箱，分别跟踪：

- Web精确会话写入；
- 飞书原精确会话投递；
- Run终态规范化；
- 任务回放更新；
- 长期记忆候选准入。

每一项使用稳定dedupe key，失败最多重试五次。重试耗尽后进入 `delivery_failed` 并允许管理员手动重试；业务正文绝不转发到通用Webhook。下游回调失败不会回滚已经证明的业务终态。

## 六、重启与异常恢复

1. 启动时分页扫描全部非终态Run，不设20条恢复上限。
2. 恢复前重新核验精确会话、上下文边界、deadline、Mission归属、工具幂等结果和当前授权。
3. 旧版宽泛写授权不会被继承；恢复的写操作必须重新生成并验证V2授权。
4. 无法证明租约、上下文或副作用归属时进入 `blocked`，禁止重复执行。
5. 队列租约过期后受控重排；失败Turn释放队首，后续消息仍可继续。
6. 调度器独立扫描活动Supervisor和终态未投递发件箱。历史终态缺少通知时惰性生成补发项，并按原来源去重投递。
7. 所有后台调用统一捕获异常、写入时间线并触发一次受控唤醒，不留下未处理Promise。

## 七、用户可见状态

- `queued`：已进入精确会话队列，展示真实位置。
- `claimed/running`：当前模型回合正在执行。
- `authorization_required`：等待当前会话的精确授权。
- `waiting_clarification`：需要用户补充信息，已释放队首。
- `supervising`：任务已派发，后台持续监督，不阻塞新消息。
- `degraded/failed`：模型或关键能力不可用，明确失败且允许按策略重试。
- `delivery_failed`：业务已终态，但原会话投递仍需重试。
- `completed/cancelled/blocked`：由结构化终态回执决定，不从回复文本猜测。

## 八、实现入口

- 队列：`backend/agents/conversation-turn-control.ts`
- 授权：`backend/agents/global/global-agent-authorization.ts`
- Run与Agentic Loop：`backend/agents/global/global-agent-loop-engine.ts`
- 上下文压缩：`backend/agents/global/memory.ts`
- Mission监督：`backend/agents/global/mission-supervisor.ts`
- 终态发件箱：`backend/agents/global/global-terminal-delivery.ts`
- Web API：`backend/modules/global/global-agent-api.ts`
- 飞书入口：`backend/modules/global/global-agent-feishu-channel.ts`
- 前端：`frontend/src/components/global/GlobalAgent.vue`

## 九、生产验收证据

- 精确授权、会话租约和终态发件箱专项回归：`scripts/global-agent-runtime-production-closure-selftest.mjs`
- 服务端队列回归：`scripts/conversation-turn-control-selftest.mjs`
- 全局上下文隔离：`scripts/global-agent-global-only-context-selftest.mjs`
- 正式模型压缩链：`scripts/global-agent-model-session-compaction-selftest.mjs`
- 飞书原会话回传：`scripts/feishu-global-agent-roundtrip-selftest.mjs`
- 首次安装认证后的真实运行E2E：`scripts/main-agent-runtime-e2e.mjs`
- 全部测试使用Mock Provider，付费Provider调用为0。

上线门禁为：无模型自授权、无同会话并发、无压缩消息丢失、无终态漏投、无关键词语义续跑、无假成功、无恢复数量上限。
