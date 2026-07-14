# 业务需求资料统一接入 v1

## 目标

让全局 Agent、群聊主 Agent和“我的工作台”使用同一套资料接入链路。用户可以提交文字、图片、文件或在线文档，主 Agent先读取来源、提取可执行需求并保留证据，再进入计划、分派、执行和验收流程。

## 已实现

- 三个入口统一接入 `backend/modules/requirements/source-ingestion.ts`。
- 支持 TXT、Markdown、JSON、CSV、常见代码文本、DOCX、XLSX、PPTX 和 PDF。
- 图片使用设置中的群聊主 Agent 模型进行多模态识别，提取可见文字、需求、验收线索、风险和不确定内容。
- 支持公开在线文档抓取；腾讯文档遇到登录或权限页时明确返回“需要授权”，不会假装读过。
- 在线地址在访问前检查 DNS 和 IP，拦截 localhost、内网及保留地址，重定向后再次检查。
- 单文件上限 25 MB；图片和在线文档上限 12 MB；单来源最多保留 20,000 字符，模型总上下文最多 60,000 字符。
- 提取结果包含业务目标、范围、验收标准、依赖、风险、待确认问题和来源证据。
- 模型提取失败时使用确定性规则继续整理，同时保存 `extraction_error`、`fallback_used` 和用户可读提示，不再静默降级。
- Windows 网络环境中若 Node `fetch` 连接失败，会使用 Node 原生 HTTP/HTTPS 重试；该传输由图片识别和主 Agent 结构化提取共同复用。

## 数据链路

资料接入结果随任务持久化：

- `source_documents`：供 Agent 执行时读取的正文上下文。
- `source_attachments`：文件名、路径或 URL、大小、解析器、状态、摘要、错误和截断标记。
- `source_ingestion`：来源数量、可读数量、警告、提取方式、降级状态及技术错误。
- `requirement_extraction`：结构化业务需求和来源证据。

全局 Agent 将任务分派给群聊主 Agent 时继续传递以上字段，群聊任务和子 Agent 因而可以读取同一份需求证据。

## 用户界面

- 用户正文只显示“读取了几份资料、整理出的目标、范围、验收和风险”。
- 文件路径、解析器、失败原因和模型降级信息放在默认折叠的“技术记录”或“技术详情”中。
- 工作台通过真实 `multipart/form-data` 发送原始 `File`，不是只传文件名。
- 窄屏下折叠内容有显式 CSS 约束，关闭时不会泄露技术字段，页面无横向溢出。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`
- `npm --prefix frontend run build`
- `npm run test:requirement-sources`
- `npm run test:requirement-source-render`

资料自测覆盖文本、DOCX、XLSX、PPTX、PDF、模拟视觉模型、原生 HTTP 兜底、腾讯文档授权页、内网 URL 拦截、附件证据和模型降级记录。

真实接口验收使用当前模型配置上传工作台 PNG，结果为 `parsed / configured-vision-model`，结构化需求为 `model`，没有触发降级。验收任务已移入归档，避免污染用户任务列表。

截图保存在：

- `scratch/requirement-source-render-regression/01-workbench-upload-confirmation-desktop.png`
- `scratch/requirement-source-render-regression/02-workbench-technical-details-desktop.png`
- `scratch/requirement-source-render-regression/03-workbench-upload-confirmation-mobile.png`

## 边界

私有腾讯文档仍需要用户提供可访问的公开链接或完成授权；当前实现不会绕过登录。旧版二进制 Office 文件（DOC/XLS/PPT）不在本版解析范围内，应转换为 OOXML 或 PDF。
