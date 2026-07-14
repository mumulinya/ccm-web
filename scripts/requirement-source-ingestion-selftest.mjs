import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const modulePath = path.join(root, 'ccm-package', 'dist', 'modules', 'requirements', 'source-ingestion.js')

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function storedZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const [name, value] of entries) {
    const filename = Buffer.from(name)
    const data = Buffer.from(value)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(filename.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(filename.length, 28)
    central.writeUInt32LE(offset, 42)
    localParts.push(local, filename, data)
    centralParts.push(central, filename)
    offset += local.length + filename.length + data.length
  }
  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

async function writeFixture(dir, name, value) {
  const file = path.join(dir, name)
  await fs.writeFile(file, value)
  const stat = await fs.stat(file)
  return { filename: name, savedPath: file, size: stat.size }
}

async function run() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ccm-requirement-source-'))
  const originalFetch = globalThis.fetch
  try {
    const api = await import(pathToFileURL(modulePath).href)
    const displayApi = await import(pathToFileURL(path.join(root, 'frontend', 'src', 'utils', 'agentDisplay.js')).href)
    const files = [
      await writeFixture(temp, 'requirement.txt', 'Business goal: add refund approval. Acceptance: approved refunds are recorded.'),
      await writeFixture(temp, 'requirement.docx', storedZip([['word/document.xml', '<w:document><w:body><w:p><w:r><w:t>DOCX refund workflow</w:t></w:r></w:p></w:body></w:document>']])),
      await writeFixture(temp, 'requirement.xlsx', storedZip([
        ['xl/sharedStrings.xml', '<sst><si><t>XLSX acceptance matrix</t></si></sst>'],
        ['xl/worksheets/sheet1.xml', '<worksheet><sheetData><row><c><v>0</v></c></row></sheetData></worksheet>'],
      ])),
      await writeFixture(temp, 'requirement.pptx', storedZip([['ppt/slides/slide1.xml', '<p:sld><a:t>PPTX delivery scope</a:t></p:sld>']])),
      await writeFixture(temp, 'requirement.pdf', await fs.readFile(path.join(root, 'node_modules', 'pdf-parse', 'test', 'data', '04-valid.pdf'))),
      await writeFixture(temp, 'requirement.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')),
    ]
    globalThis.fetch = async (_url, init = {}) => {
      const payload = JSON.parse(String(init.body || '{}'))
      const hasImage = JSON.stringify(payload).includes('base64')
      if (!hasImage) throw new Error('Unexpected model request')
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ summary: 'Refund screen mockup', visible_text: 'Approve refund', requirements: ['Add refund approval'], acceptance: ['Approval is persisted'], risks: [], uncertain: [] }) }] })
        },
      }
    }
    const result = await api.ingestRequirementSources({
      files,
      extractRequirement: false,
      visionConfig: { enabled: true, format: 'anthropic-compatible', apiUrl: 'https://vision.example.test/v1', apiKey: 'test', model: 'vision-test', timeoutMs: 5000 },
    })
    const byName = new Map(result.sources.map(item => [item.name, item]))
    const tencent = await api.ingestRequirementSources({
      userText: '请读取 https://docs.qq.com/doc/test-private',
      extractRequirement: false,
      onlineDocumentFetcher: async () => ({
        response: { ok: true, status: 200, headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }) },
        buffer: Buffer.from('<html><body>腾讯文档：请先登录后查看，或申请访问权限。</body></html>'),
        finalUrl: 'https://docs.qq.com/doc/test-private',
      }),
    })
    const ssrf = await api.ingestRequirementSources({ userText: 'http://127.0.0.1/private-doc', extractRequirement: false })
    const fallback = await api.ingestRequirementSources({
      userText: '实现退款审批页面和后端接口，必须完成测试验收',
      extractRequirement: true,
      requirementConfig: { enabled: false },
    })
    const nativeFallbackServer = createServer((request, response) => {
      request.resume()
      request.on('end', () => {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ summary: 'Native transport fallback', visible_text: 'Fallback works', requirements: ['Keep source evidence'], acceptance: [], risks: [], uncertain: [] }) }] }))
      })
    })
    await new Promise(resolve => nativeFallbackServer.listen(0, '127.0.0.1', resolve))
    const nativeAddress = nativeFallbackServer.address()
    globalThis.fetch = async () => {
      const error = new TypeError('fetch failed')
      error.cause = { code: 'UND_ERR_CONNECT_TIMEOUT', message: 'Connect Timeout Error' }
      throw error
    }
    let nativeFallback
    try {
      nativeFallback = await api.ingestRequirementSources({
        files: [files[5]],
        extractRequirement: false,
        visionConfig: { enabled: true, format: 'anthropic-compatible', apiUrl: `http://127.0.0.1:${nativeAddress.port}`, apiKey: 'test', model: 'vision-test', timeoutMs: 5000 },
      })
    } finally {
      await new Promise(resolve => nativeFallbackServer.close(resolve))
    }
    const technicalSections = displayApi.getTechnicalDetailSections({
      technical: {
        source_ingestion: {
          extraction_method: 'deterministic_fallback',
          fallback_used: true,
          extraction_error: 'simulated extraction error',
          warnings: ['需求已改用本地规则整理'],
          sources: [{ id: 'source-test', name: 'requirement.md', status: 'parsed', parser: 'utf8-text' }],
        },
      },
    })
    const checks = {
      textParsed: byName.get('requirement.txt')?.content.includes('refund approval'),
      docxParsed: byName.get('requirement.docx')?.content.includes('DOCX refund workflow'),
      xlsxParsed: byName.get('requirement.xlsx')?.content.includes('XLSX acceptance matrix'),
      pptxParsed: byName.get('requirement.pptx')?.content.includes('PPTX delivery scope'),
      pdfParsed: byName.get('requirement.pdf')?.content.includes('Acute effect of speed exercise'),
      imageParsedByVision: byName.get('requirement.png')?.parser === 'configured-vision-model' && byName.get('requirement.png')?.content.includes('Approve refund'),
      nativeHttpFallbackWorks: nativeFallback.sources[0]?.readable === true && nativeFallback.sources[0]?.content.includes('Fallback works'),
      attachmentEvidenceRecorded: result.attachments.length === files.length && result.attachments.every(item => item.readable && ['parsed', 'partial'].includes(item.status)),
      tencentAuthorizationExplicit: tencent.sources[0]?.status === 'needs_authorization' && /授权|登录/.test(tencent.sources[0]?.error || ''),
      privateNetworkBlocked: ssrf.sources[0]?.status === 'failed' && /本机|局域网/.test(ssrf.sources[0]?.error || ''),
      deterministicFallbackAvailable: fallback.requirement?.extraction_method === 'deterministic_fallback' && fallback.requirement.scope.includes('前端页面与交互') && fallback.requirement.scope.includes('后端接口与数据'),
      fallbackWarningRecorded: fallback.warnings.some(item => /本地规则/.test(item))
        && fallback.technical?.fallback_used === true
        && /未配置|未启用/.test(fallback.technical?.extraction_error || ''),
      sharedTechnicalDetailsExposeSourceDiagnostics: technicalSections.some(section => section.id === 'requirement-sources')
        && technicalSections.some(section => section.id === 'requirement-ingestion-detail'
          && section.items.some(item => item.label === '提取错误' && item.value === 'simulated extraction error')),
    }
    const report = { pass: Object.values(checks).every(Boolean), checks, parsers: result.technical.parsers, sourceSummary: result.user_summary, failedSources: result.sources.filter(item => !item.readable).map(item => ({ name: item.name, error: item.error })) }
    console.log(JSON.stringify(report, null, 2))
    if (!report.pass) process.exitCode = 1
  } finally {
    globalThis.fetch = originalFetch
    await fs.rm(temp, { recursive: true, force: true })
  }
}

await run()
