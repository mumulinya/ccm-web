import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const sourceApi = await import(pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'requirements', 'source-ingestion.js')).href)
const taskApi = await import(pathToFileURL(path.join(root, 'ccm-package', 'dist', 'system', 'task-attachments.js')).href)

const publicFetcher = async url => ({
  response: {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
  },
  buffer: Buffer.from('<html><body><h1>退款需求</h1><p>完成退款申请、审核和结果通知，并提供验收证据。</p></body></html>'),
  finalUrl: url,
})

const privateFetcher = async url => ({
  response: {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
  },
  buffer: Buffer.from('<html><body>腾讯文档：请先登录后查看，或申请访问权限。</body></html>'),
  finalUrl: url,
})

const link = 'https://docs.qq.com/doc/online-workflow-test'
const extracted = sourceApi.extractOnlineDocumentUrls(`请读取 ${link} 并执行`)
const publicResult = await sourceApi.ingestRequirementSources({
  userText: `需求来源 ${link}`,
  extractRequirement: false,
  onlineDocumentFetcher: publicFetcher,
})
const privateResult = await sourceApi.ingestRequirementSources({
  userText: `需求来源 ${link}`,
  extractRequirement: false,
  onlineDocumentFetcher: privateFetcher,
})
const taskMutation = await taskApi.buildTaskAttachmentMutation({
  files: [],
  currentAttachments: [],
  currentContexts: [],
  retainedIds: [],
  userText: `按文档开发：${link}`,
  onlineDocumentFetcher: publicFetcher,
})
const retainedMutation = await taskApi.buildTaskAttachmentMutation({
  files: [],
  currentAttachments: taskMutation.attachments,
  currentContexts: taskMutation.contexts,
  retainedIds: taskMutation.attachments.map(item => item.id),
  userText: `按文档开发：${link}`,
  onlineDocumentFetcher: publicFetcher,
})

const checks = {
  urlExtraction: extracted.length === 1 && extracted[0] === link,
  publicDocumentReadable: publicResult.sources[0]?.readable === true
    && publicResult.sources[0]?.kind === 'tencent_document'
    && publicResult.sources[0]?.content.includes('退款申请'),
  privateDocumentRequiresAuthorization: privateResult.sources[0]?.status === 'needs_authorization'
    && privateResult.sources[0]?.readable === false,
  linkOnlyTaskCreatesAttachment: taskMutation.attachments.length === 1
    && taskMutation.attachments[0]?.url === link
    && taskMutation.attachments[0]?.readable === true,
  linkOnlyTaskCreatesExecutionContext: taskMutation.context.includes('来源链接=')
    && taskMutation.context.includes('退款申请'),
  retainedLinkIsDeduplicated: retainedMutation.attachments.length === 1
    && retainedMutation.contexts.length === 1,
}

const report = { pass: Object.values(checks).every(Boolean), checks }
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
