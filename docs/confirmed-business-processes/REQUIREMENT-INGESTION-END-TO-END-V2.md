# 需求池、文档、图片与附件摄取完整业务流程 V2

## 用户入口与精确身份

用户可以从任务派发、我的工作台、全局Agent、群聊会话、项目会话和定时开发入口提交业务描述、图片、文件或公开在线文档。每次提交绑定来源通道、目标群聊或项目、精确会话、`client_message_id`、内容checksum和任务ID；相同内容在其他会话不会复用任务。

## 端到端流程

1. 服务端流式读取Multipart，请求、文件数量、单文件、合计文件和字段大小在读取过程中受限。文件先进入隔离目录，格式、签名、MIME和路径全部通过后才原子提交。
2. 公网文档解析域名并固定已核验IP，实际连接不重新进行不受控DNS解析。重定向逐次核验，响应流超过12 MB、超时、私网、保留地址、鉴权页或不支持格式时失败关闭。
3. PDF、OOXML、文本、表格、网页和视觉模型结果形成不可省略的来源正文。系统计算来源checksum，并按标题、段落、表格和Token预算生成完整分片清单。
4. 图片使用统一Provider可靠性运行时，遵循用户超时、瞬时失败最多五次、鉴权快速失败和熔断；视觉回执绑定原图checksum和识别结果checksum。
5. 需求模型逐分片提取目标、范围、依赖、风险、验收和未确认项。超限来源分批提取后正式合并，不使用字符截断、本地摘要或关键词结果冒充完整读取。
6. 每个需求和工作项必须引用`source_id + source_checksum + chunk_ids`。服务端验证分片属于当前任务、checksum仍有效、所有必需来源均被覆盖。
7. `RequirementSourceCoverageReceiptV2`为确认和派发门禁。`partial`、需要授权、读取失败、模型失败、缺少验收或证据失效都不能进入自动执行。
8. 需求质量由`RequirementIntakeQualityDecisionV2`模型决定`ready | needs_user | reject`。长度只判断空输入和容量，不解释业务完整性。
9. 需求池条目使用稳定`entry_id`、revision、内容checksum、幂等键、认领租约和fencing token。手动、批量和定时派发共享原子认领；旧revision冲突，过期租约恢复到`ready`，已有任务绑定禁止重复创建。
10. 确认后的任务进入精确会话串行队列。子Agent只读取计划引用的完整分片，任务回放保存来源清单、覆盖回执、刷新历史和证据引用。
11. 失败来源可按任务重试，在线快照只能由用户显式刷新。刷新或checksum变化会使旧计划失效并回到等待确认。
12. 预览失败、取消和上传中断立即清理本轮文件。任务保留期间附件由引用注册表保护；清理中心只删除24小时以上、无任务引用的孤立安全上传文件。

## 状态与用户展示

- `完整读取`：正文、分片、checksum和覆盖回执均有效。
- `部分读取`：只得到部分正文或部分分片，必需来源时禁止确认。
- `需要授权`：在线页面要求登录或没有公开分享。
- `格式不支持`：真实内容类型不在受支持解析器范围。
- `读取失败`：网络、解析、模型或校验失败，可按来源重试。
- `等待模型处理`：原始来源已经保存，但尚无结构化需求或计划，不会自动派发。

页面分别展示上传、解析、视觉识别、需求提取和拆解状态。刷新浏览器后读取服务端任务状态，不重新上传、不静默重复调用模型。

## 安全与事实来源

原始上传文件和在线快照是唯一来源事实。状态接口、任务回放和审计不返回Prompt、API Key、图片base64或在线正文。模型只能解释已读取分片，服务端负责身份、容量、权限、checksum和状态机门禁。

## 实现与验证

- 摄取与证据：`backend/modules/requirements/source-ingestion.ts`、`backend/modules/requirements/source-evidence-v2.ts`
- 上传与生命周期：`backend/system/secure-multipart.ts`、`backend/system/task-attachments.ts`、`backend/system/attachment-reference-registry.ts`
- 需求池：`backend/modules/collaboration/daily-dev-backlog.ts`
- 接口与任务确认：`backend/modules/collaboration/collaboration-routes.ts`
- 页面：`frontend/src/components/tasks/AutomatedTaskIntakeModal.vue`、`frontend/src/components/common/OnlineDocumentReferences.vue`
- 回归：`scripts/requirement-ingestion-v2-production-selftest.mjs`

验证默认使用Mock Provider，付费Provider调用为0。
