# 需求资料摄取与附件

## 适用入口

全局 Agent、任务派发、我的工作台、群聊会话、项目会话和定时任务使用同一套资料摄取能力。用户可以提交业务描述、文件、图片或公开在线文档链接。

## 资料处理

- Multipart按流接收并先写入隔离目录，请求硬上限64 MB；单次最多10个附件，单文件最大25 MB，文件合计最大60 MB，普通字段最大1 MB。
- 文件完成扩展名、MIME、文件签名、双扩展名和受控路径校验后才原子转入上传目录；失败、取消和超时会删除本轮临时文件。
- 图片视觉分析单文件上限 12 MB；在线文档响应体上限 12 MB。
- 在线文档只允许公开 `http/https`。服务端固定经核验的公网IP进行连接，每次重定向重新核验，阻止IPv4、IPv6、映射地址、云元数据和不安全端口。
- PDF、OOXML、HTML、文本、JSON/XML及图片解析为`RequirementSourceManifestV2`；正文不按字符截断，按真实Token预算切成完整分片。
- 腾讯文档使用公开分享链接读取；要求登录或授权的页面明确标记 `needs_authorization`，不猜测正文。

## 模型结构化

1. 服务端先验证文件、链接、MIME、大小和作用域。
2. 可读正文与用户描述交给统一主 Agent模型提取目标、范围、验收标准、依赖、风险和待确认问题；超出单次容量时逐分片提取再由模型合并。
3. 需要拆分时，模型生成 1 至 20 个带稳定键、依赖和目标建议的工作项。
4. 服务端校验 Schema、依赖无环、目标作用域、来源checksum和每个引用分片。必需资料未完整覆盖、模型未引用必需来源或计划引用旧快照时禁止确认和自动派发。
5. 模型不可用时保留原始资料并返回警告，不用关键词生成伪计划，也不创建子任务。

## 数据边界

- 原上传文件与已确认在线快照是事实来源；清单保存解析器、字数、Token、分片、checksum、快照时间、必需性和覆盖状态。
- 图片生成`VisionExtractionReceiptV1`，记录图片checksum、模型、可见文字/需求/验收/不确定项统计和结果checksum，不保存base64。
- 在线来源只有用户点击刷新或失败重试时重新抓取；刷新会使旧计划checksum失效并要求重新确认。
- 面向 Agent的资料上下文标明读取成功或失败；未读取内容不得由文件名推断。
- 子Agent只接收计划引用的完整分片，再由Context Engine执行最终Token门禁，不使用50K字符截断。
- 附件引用注册表按任务重新核验；清理中心只删除超过24小时且引用数为0的安全上传文件，执行前再次扫描避免误删。
- 需求池条目和摄取草稿创建时保存`target_scope + target_id`，不接收用户选择的精确会话。正式任务到达时按任务来源解析自动化会话绑定，并在任务上保存不可变的精确会话解析快照。
- 确认和派发默认使用保存的精确会话；用户可明确改选同一目标下的可写会话。会话不存在、已归档或归属不匹配时失败关闭，不回退到后来切换的活动会话。
- 拆分计划的每个工作项保存目标专属`target_session_id`；跨群聊或跨项目工作项不能继承父任务中其他目标的会话ID。
- 需求池、工作台和全局 Agent没有活动来源绑定时，服务端创建`session_kind=automation`的自动化任务会话并绑定当前来源；普通会话不能绑定这些自动化来源。
- 群聊会话列表投影为普通会话和自动化任务会话；项目会话列表另有独立飞书会话分组。飞书会话不进入Web来源的工作台会话选择器。

## 实现入口

- `backend/modules/requirements/source-ingestion.ts`
- `backend/modules/requirements/source-evidence-v2.ts`
- `backend/system/secure-multipart.ts`
- `backend/system/task-attachments.ts`
- `backend/system/attachment-reference-registry.ts`
- `frontend/src/components/common/TaskAttachmentPicker.vue`
- 回归：`requirement-ingestion-v2-production-selftest.mjs`、`requirement-target-session-binding-selftest.mjs`、`task-attachments-production-selftest.mjs`、`online-document-workflow-selftest.mjs`、`clipboard-attachments-selftest.mjs`。
