# CCM Memory CC Parity Phase 239

## 阶段目标

补齐 Claude Code 类型化记忆中容易遗漏的正向反馈：不仅记住用户纠正过的失败做法，也记住用户明确确认过的非显然成功判断。

- 正向确认必须绑定当前 `groupId::gcs_*` 内一条既有 Assistant 做法。
- 平台重新计算目标消息完整 SHA-256，不能只信任调用方声明。
- 目标做法必须可跨会话复用、非显而易见，并提供 Why/How。
- 普通赞美、无目标确认、伪造 checksum、错误会话声明和活动流水确认全部拒绝。
- 拒绝审计继续只保存标识、类型和原因，不保存被拒绝正文。
- Global Agent 继续只接收全局记忆和路由信息，不接收群聊会话正文。
- 旧会话和旧群级会话制品直接删除，不迁移。

## Claude Code 对照结论

Claude Code 在 `D:\claude-code\src\memdir\memoryTypes.ts:133-146` 明确要求 feedback 记忆同时记录 failure 和 success。如果只保存纠正，Agent 虽然会避开旧错误，但会逐渐偏离用户已经验证过的方法，并变得过度保守。

其 `when_to_save` 同时覆盖：

- 用户明确纠正做法。
- 用户确认一个非显然做法有效。
- 用户认可 Agent 主动做出的不寻常判断。

Phase 238 已经实现 `feedback/user_correction`，但正向反馈仍没有独立类型，也没有证明“用户确认的是哪一条做法”。仅凭“对”“很好”写入会把礼貌性赞美错误升级为长期规则，也可能把另一个群聊会话中的做法串入当前会话。

Phase 239 将正向反馈落为可复算的 message binding，而不是新增一个宽松关键词入口。

## 实现内容

### 1. 正向确认契约

用户消息可以携带可选结构化信息：

```json
{
  "memoryConfirmation": {
    "validated": true,
    "targetMessageId": "assistant-message-id",
    "targetMessageChecksum": "full-sha256",
    "groupSessionScopeId": "groupId--gcs_*",
    "rule": "可选的长期规则",
    "why": "可选原因",
    "howToApply": "可选应用方式"
  }
}
```

平台只在当前蒸馏输入中向前查找目标消息，不读取其他群聊会话。目标必须由 Assistant 发出，必须位于确认消息之前；声明了 scope 时必须与当前 typed-memory scope 完全一致。

### 2. 自然语言确认

除了结构化契约，平台识别“对，就保持这个做法”“完全正确”“yes exactly, keep doing that”“that was the right call”等明确确认。

- 没有显式 target id 时，只查看前 3 条消息中的最近 Assistant 消息。
- 目标文本自身含有未来适用、非显然和原因信号时，可以生成 Why/How，不要求 Assistant 预先输出结构化 `memoryAdmission`。
- “谢谢，做得不错”等普通赞美不产生候选。
- 明确确认但目标只是普通排序、格式调整等显然做法时，生成无正文拒绝审计，不写入记忆。

### 3. 绑定证明

每条准入的 `feedback/validated_approach` 保存 `ccm-group-positive-feedback-binding-v1` 元数据：

- confirmation message id。
- target Assistant message id。
- `explicit_message_id` 或 `adjacent_assistant` 绑定方式。
- 平台计算的目标消息完整 SHA-256。
- claimed checksum 与复算结果是否一致。
- claimed group-session scope 与当前 scope 是否一致。
- 目标是否满足 durable、non-obvious、Why/How 门槛。

以下情况 fail closed：

- 找不到目标或目标不是 Assistant 消息。
- scope 声明与当前 `groupId--gcs_*` 不一致。
- checksum 声明与平台复算结果不一致。
- 目标不具备跨会话价值、非显然性、原因或应用方式。
- 目标是 PR 清单、活动总结、Git 历史或其他活动流水。

### 4. PR 流水与 PR 判断分离

Phase 238 的活动噪声规则会拒绝任何包含 `PR` 的候选，范围过宽。Phase 239 将它收紧为：

- 继续拒绝 PR list、PR summary、周报、最近提交和 activity summary。
- 允许“类似重构应保持单个 bundled PR，因为拆分只会制造 churn”这类被用户确认的长期判断。

这样既保留 Claude Code 示例中的成功反馈，也不会重新放行活动流水。

### 5. 质量门与可观测性

蒸馏质量新增 fatal 检查 `positive_feedback_binding`。任何 `validated_approach` 缺少有效目标、scope、checksum 或目标资格时，质量评估失败。

长期记忆写入准入账本新增聚合字段：

- positive confirmation candidates。
- admitted confirmations。
- rejected confirmations。
- invalid bindings。

子 Agent 上下文显示上述聚合数字和绑定纪律，不显示拒绝正文。Memory Center 新增“正向确认”和“无效确认”卡片；生产活跃会话当前没有通用 session distillation ledger，因此面板按条件隐藏，没有注入测试数据。

## 旧会话清理

运行时审计发现三个早期群级 typed-memory 目录，它们不带 `--gcs_*`，当前上下文构建不会读取，但仍属于旧会话制品。按照用户“旧会话直接删除、不迁移”的要求，已删除：

- `group-memory-md/gmps7ha15`
- `group-memory-md/gmqbz18hj`
- `group-memory-md/gmr02wpbv`
- 空的 `group-session-memory/gmps7ha15`
- 空的 `group-tool-continuity/gmps7ha15`

删除前验证了绝对路径、允许根目录和精确 group id。当前 `group-memory-md/gmps7ha15--gcs_mriu5m33_ahy0yo` 被显式保护并保留；服务重启后旧群级目录没有重新生成。

首次生产验收还发现 Memory Center 的 compact-boundary timeline 总览会遍历旧 `group-memory/<groupId>.json`，并以默认 session 调用 typed-memory 消费诊断，从而重建一个空的裸 `groupId` 账本。现已改为先读取每个群聊的 active session manifest，只选择匹配的 `gcs_*` memory scope，并把 session id 显式传给诊断。

消费账本层同时增加了作用域防火墙：如果调用方只传裸 `groupId`，而该群聊存在活动的非 `default` 会话，读写路径会统一重定向到 `groupId--gcs_*`，observation id、entry id、ledger metadata、checksum 和文件路径全部使用重定向后的作用域。这使得后续新增或延迟执行的诊断入口即使遗漏 session id，也不会穿透会话边界。定向回归、生产完整质量评估以及评估完成后 35 秒延迟检查均证明裸目录未重建。

## 会话边界

生产会话状态：

- `gmps7ha15::gcs_mriu5m33_ahy0yo`
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`

三个群聊均只有一个 active `gcs_*`，archived 为 0，legacy/default 为 0。Phase 239 自测证明：另一个 `gcs_*` 即使声明相同 target message id 和 checksum，也因当前会话找不到目标且 scope 不匹配而拒绝。

## 验证结果

- `npm run check`：通过。
- 完整前端、MCP、后端构建：通过。
- Phase 239 正向反馈自测：21/21。
- 正向候选 7 条：准入 2，拒绝 5，无效绑定 4。
- 显式 message-id 绑定：通过。
- 紧邻 Assistant 自然语言绑定：通过。
- 无结构化 target admission 的自然语言 Why/How 推导：通过。
- 普通赞美、伪造 checksum、错误 scope、缺失目标、活动流水确认：全部拒绝。
- 旧无绑定正向事实清退 1 条，对应陈旧 Markdown 删除 1 个。
- 重复执行幂等、拒绝审计无正文、跨会话拒绝：通过。
- Phase 238 长期写入准入回归：22/22，PR/活动流水继续拒绝。
- 通用日志蒸馏回归：10/10。
- 类型化蒸馏质量回归：8/8。
- 类型化记忆上下文回归：24/24。
- Phase 237 当前源证明回归：20/20。
- Phase 236 消费反馈回归：18/18。
- Phase 235 自然语言语义召回回归：20/20。
- Memory Center 会话隔离：11/11，新增质量时间线 active-session scope 和裸 group 消费账本重定向检查。
- Compact-boundary timeline 回归：7/7。
- 生产 HTTP 完整质量评估：160 项检查，返回 73.8/warn，耗时 23.2 秒；评估结束后再等待 35 秒，旧群级 typed-memory 目录仍未重建。
- `phase239-positive-feedback-*` 运行时残留：0。
- 桌面 1440x900：页面与 Memory Center 无横向溢出、越界控件或重叠。
- 移动 390x844：页面宽度保持 390；越出视口的类型筛选按钮全部位于既有 `overflow-x:auto` 容器。
- 桌面和移动浏览器 warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`15928`
- HTTP `/api/groups`：200。
- 服务错误日志：空。
- 三个生产群聊各保留一个当前会话。
- archived session：0。
- legacy/default session：0。
- 旧群级 session-memory 制品：0。
- Phase 239 测试制品：0。

## 长期目标状态

长期目标继续保持 active，不在 Phase 239 结束时标记完成。

后续优先方向：继续对照 Claude Code 的记忆写入与读取提示，把“用户确认过的做法”接入后续消费反馈和陈旧撤销闭环；当新证据否定已确认做法时，生成可追溯的 supersession/revocation，而不是让正向反馈永久升权。同时继续保持群聊会话硬隔离、Global Agent 正文隔离、第三方子 Agent 新会话注入和旧会话直接删除。
