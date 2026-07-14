# CCM Memory CC Parity Phase 240

## 阶段目标

补齐已确认正向记忆的陈旧撤回与替代闭环。长期记忆不是写入后永久升权：当当前源码、资源状态或用户的新判断否定旧做法时，平台必须精准绑定旧事实，留下不可变生命周期证据，并从所有活动投影中移除陈旧内容。

- 记忆作用域始终是 `groupId::gcs_*`，撤回不能跨群聊会话。
- 子 Agent 只接收所属群聊当前会话的活动记忆，不接收已撤回或已替代正文。
- Global Agent 继续只接收全局路由和全局记忆，不接收群聊会话正文。
- 第三方子 Agent 每次任务仍创建新会话，并注入所属群聊会话的筛选后上下文。
- 旧会话、默认会话和旧群级记忆直接删除，不迁移。

## Claude Code 对照结论

Claude Code 在 `D:\claude-code\src\memdir\memoryTypes.ts:201-202` 明确指出：记忆可能随时间陈旧，基于记忆形成假设前应读取当前文件或资源进行核验；如果记忆与当前信息冲突，应相信当前观察，并更新或移除陈旧记忆。

Phase 239 已经让正向确认绑定当前群聊会话内的 Assistant 做法，但尚未回答两个问题：已确认做法后来失效时如何撤回，以及旧事实如何保证不会继续出现在 Markdown、召回索引和子 Agent 上下文中。Phase 240 将 Claude Code 的 drift caveat 落成可审计的状态转换，而不是让蒸馏模型凭模糊语义覆盖旧文本。

## 实现内容

### 1. 撤回契约

用户消息可以携带可选结构化信息：

```json
{
  "memoryRevocation": {
    "revoked": true,
    "targetConfirmationMessageId": "confirm-message-id",
    "targetApproachMessageId": "assistant-message-id",
    "targetApproachChecksum": "full-sha256",
    "groupSessionScopeId": "groupId--gcs_*",
    "reason": "旧做法失效的原因",
    "replacementRule": "可选的新规则",
    "howToApply": "可选的新规则使用方式",
    "currentSourceEvidence": {
      "evidenceType": "file_read",
      "sourcePath": "项目内相对路径",
      "sourceChecksum": "full-sha256"
    }
  }
}
```

平台也识别明确的自然语言撤回。没有显式 target 时，只在当前蒸馏输入向前寻找最近已准入的正向确认；不会读取另一个 `gcs_*`，也不会按相似文本全局删除。

### 2. 精确绑定和失败关闭

撤回必须唯一绑定当前 scope 中一条 `feedback/validated_approach`，并满足以下条件：

- 当前 scope 与声明的 `groupId--gcs_*` 完全一致。
- confirmation id 或 approach id 唯一命中。
- 旧事实保存的平台计算完整 SHA-256 合法；调用方声明 checksum 时必须一致。
- 必须提供撤回原因。
- 声明当前源证据时，证据必须通过平台复算。

错误 scope、伪造 checksum、目标缺失或歧义、缺少原因、证明不匹配都会拒绝。拒绝观察只保存 message id、原因、时间和计数，不保存用户正文、旧做法正文或证明内容。

### 3. 当前源码证明

`currentSourceEvidence` 只接受 `file_read`。平台解析项目真实路径、拒绝项目外路径和符号链接逃逸、限制文件为 16 MiB，并直接读取文件重新计算 SHA-256。

有效证明记录 `ccm-group-positive-feedback-current-source-proof-v1`，包含项目相对路径、claimed/observed checksum 和确定性 proof id。调用方不能用自报 checksum 将陈旧记忆降权。

### 4. 不可变生命周期事件

每次成功撤回生成 `ccm-group-positive-feedback-lifecycle-event-v1`：

- `revoked`：旧做法被撤回，没有新规则。
- `superseded`：旧做法被撤回，当前消息同时准入一条 `user_correction` 替代规则。

事件绑定 group-session scope、目标事实、confirmation/approach id、目标 SHA-256、撤回消息、原因、替代事实和证据等级，并保存完整事件 checksum。重放相同撤回消息不会创建第二个事件；损坏 checksum 的历史事件不会被信任。

### 5. 活动投影和 Markdown 清除

成功生成生命周期事件后，目标 `validated_approach` 立即从活动 facts 删除。后续生成的 typed-memory Markdown 和语义召回索引只包含活动事实，因此：

- 已撤回旧正文不再出现在 Markdown。
- 已替代旧正文不再进入召回。
- 新的 `user_correction` 替代规则保持活动状态。
- 子 Agent 上下文只显示 active/revoked/superseded/证明/异常计数，不显示撤回正文。

蒸馏质量新增 fatal 检查 `positive_feedback_lifecycle`。事件缺少合法 scope、目标绑定、完整 checksum、撤回原因，或者 `superseded` 缺少替代事实时，质量门失败。

### 6. Memory Center 可观测性

长期记忆写入区域新增四个状态卡：

- 活动正向记忆。
- 已撤回。
- 已替代。
- 撤回绑定异常。

面板同时显示当前源证明数和无效撤回数。所有数字来自当前活动群聊会话的 distillation ledger；Session A 的生命周期计数不会显示到 Session B。

### 7. manifest 优先的作用域防火墙

生产完整质量评估发现，30 秒后台诊断曾以裸 `groupId` 调用消费账本。旧实现依赖异步模块链中的 runtime `storage` 导入；导入失败时会回退到裸群级路径，从而重建空的 `.typed-memory-consumption-ledger.json`。

`resolveGroupTypedMemoryConsumptionScopeId` 现在先直接读取并验证：

`CCM_DIR/group-messages/sessions/<groupId>/manifest.json`

只有 manifest 中存在 active、未归档且格式为 `gcs_*` 的记录时，才重定向为 `groupId--gcs_*`。`storage` 只保留为后备。这样延迟诊断即使遗漏 session id，也不能创建群级消费账本或穿透会话边界。

## 旧会话处理

本阶段继续执行用户指定的删除策略，不迁移历史会话。生产 manifest 复核结果：

- `gmps7ha15::gcs_mriu5m33_ahy0yo`
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`

每个群聊均为 session count 1、active 1、archived 0、legacy/default 0。裸 `group-memory-md/gmps7ha15` 在停止旧服务、验证绝对路径后删除；最终服务和后台诊断均未重建它。

## 验证结果

- `npm run check`：通过。
- 完整 `npm run build`：通过。
- manifest-first resolver 最终加固后 `npm run build:backend`：通过。
- Phase 240 正向反馈生命周期：19/19。
- 结果：active validated 1、revoked 1、superseded 1、current-source proof 1、跨会话撤回拒绝。
- Phase 239 正向确认回归：21/21。
- Phase 238 写入准入回归：22/22。
- Phase 237 当前源证明回归：20/20。
- Phase 236 消费反馈回归：18/18。
- Phase 235 语义自然语言召回回归：20/20。
- Memory Center 会话隔离：13/13。
- 通用日志蒸馏：10/10。
- 蒸馏质量：8/8。
- 类型化上下文：24/24。
- 生产 HTTP 完整质量评估：160 项，73.8/warn，4 项既有失败，耗时 26.4 秒。
- 完整质量评估后延迟 70 秒：裸旧目录仍不存在，活动 scoped 目录存在。
- 两轮 30 秒后台诊断：未重建裸群级消费账本。
- Phase 240 测试运行时残留：0。
- `git diff --check`：通过，仅有既有行尾转换警告。
- 桌面 1440x900：无横向溢出、截断控件或重叠。
- 移动 390x844：body 宽度保持 390，类型筛选只在既有 `overflow-x:auto` 内横向滚动。
- 浏览器 warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`24900`
- HTTP `/api/groups`：200。
- 服务错误日志：空。
- 三个生产群聊各保留一个当前活动会话。
- archived session：0。
- legacy/default session：0。
- 旧群级 typed-memory 制品：0。
- Phase 240 测试制品：0。

## 长期目标状态

Phase 240 已完成，但 Claude Code 记忆系统对齐是长期目标，继续保持 active，不在本阶段标记完成。

后续继续对照 Claude Code 的读取提示、记忆更新和陈旧处理路径，优先增强生命周期事件在召回使用反馈中的可解释性、当前资源的多类型证明，以及长时间运行下的自动陈旧复核；任何增强都继续保持群聊会话硬隔离、Global Agent 群聊正文隔离、第三方子 Agent 新会话注入和旧会话直接删除。
