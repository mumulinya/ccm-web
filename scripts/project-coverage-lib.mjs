import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const COVERAGE_SCHEMA = 'ccm-project-coverage-manifest-v1'
export const AUDIT_SCHEMA = 'ccm-project-coverage-audit-receipt-v1'
export const DEFAULT_MANIFEST = 'scripts/project-coverage-manifest.json'
export const DEFAULT_DOCUMENT = 'docs/confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md'

/**
 * @typedef {'active' | 'compatibility' | 'retired'} ProjectCoverageStatus
 * @typedef {{id:string, component:string, entryType?:'tab'|'standalone'}} ProjectCoverageEntryPointV1
 * @typedef {{
 *   id:string,
 *   label:string,
 *   status:ProjectCoverageStatus,
 *   summary:string,
 *   frontendPages:ProjectCoverageEntryPointV1[],
 *   backendRoots:string[],
 *   productionEntrypoints:string[],
 *   apiPrefixes:string[],
 *   cliCommands:string[],
 *   testDomains:string[],
 *   criticalTests:string[],
 *   architectureDocs:string[],
 *   businessProcessDocs:string[],
 *   sharedBy:string[]
 * }} ProjectCoverageDomainV1
 * @typedef {{
 *   schema:string,
 *   version:number,
 *   title:string,
 *   generatedDocument:string,
 *   topLevelStructure:Array<{path:string,responsibility:string}>,
 *   domains:ProjectCoverageDomainV1[],
 *   compatibilityEntries:Array<{
 *     id:string,label:string,status:'compatibility'|'retired',reason:string,
 *     productionEntrypoints:string[],apiPrefixes:string[]
 *   }>,
 *   testHelpers:Array<{file:string,reason:string}>
 * }} ProjectCoverageManifestV1
 * @typedef {{
 *   schema:string,version:number,generated_at:string,manifest_checksum:string,
 *   success:boolean,counts:Record<string,number>,coverage:Record<string,number>,
 *   errors:Array<{code:string,message:string,details?:unknown}>,
 *   warnings:Array<{code:string,message:string,details?:unknown}>
 * }} ProjectCoverageAuditReceiptV1
 */

const slash = value => String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
const unique = values => [...new Set(values)]
const checksum = value => crypto.createHash('sha256').update(value).digest('hex')

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function readCoverageManifest(root, manifestPath = DEFAULT_MANIFEST) {
  return JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'))
}

function walk(directory, predicate, output = []) {
  if (!fs.existsSync(directory)) return output
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target, predicate, output)
    else if (predicate(target, entry.name)) output.push(target)
  }
  return output
}

function exactPathExists(root, relativePath) {
  const normalized = slash(relativePath)
  if (!normalized || normalized.includes('..')) return false
  let current = root
  for (const segment of normalized.split('/')) {
    if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) return false
    const exact = fs.readdirSync(current).find(entry => entry === segment)
    if (!exact) return false
    current = path.join(current, exact)
  }
  return fs.existsSync(current)
}

function frontendInventory(root) {
  const appPath = path.join(root, 'frontend', 'src', 'App.vue')
  const source = fs.readFileSync(appPath, 'utf8')
  const tabBlock = source.match(/const DEFAULT_TABS\s*=\s*\[([\s\S]*?)\]\s*\n\s*const TAB_ICONS/)?.[1] || ''
  const tabs = [...tabBlock.matchAll(/\{\s*id:\s*['"]([^'"]+)['"]/g)].map(match => match[1])
  const loaderBlock = source.match(/const PAGE_LOADERS\s*=\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  const components = new Map()
  for (const match of loaderBlock.matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z0-9_-]+))\s*:\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g)) {
    components.set(match[1] || match[2], slash(path.join('frontend/src', match[3])))
  }
  if (tabs.includes('dashboard') && /<UsabilityWorkbench\b/.test(source)) {
    const importPath = source.match(/import\s+UsabilityWorkbench\s+from\s+['"]([^'"]+)['"]/)?.[1]
    if (importPath) components.set('dashboard', slash(path.join('frontend/src', importPath)))
  }
  return {
    pages: tabs.map(id => ({ id, component: components.get(id) || '' })),
  }
}

function productionTypeScriptFiles(root) {
  const roots = [
    path.join(root, 'backend', 'server.ts'),
    path.join(root, 'backend', 'server-pet-activity.ts'),
    path.join(root, 'backend', 'modules'),
  ]
  const files = []
  for (const target of roots) {
    if (!fs.existsSync(target)) continue
    if (fs.statSync(target).isFile()) files.push(target)
    else walk(target, (file, name) => name.endsWith('.ts'), files)
  }
  return files.filter(file => {
    const relative = slash(path.relative(root, file))
    return !/(?:^|\/)(?:test-agent)(?:\/|$)/.test(relative)
      && !/(?:self-?test|selftest|protocol-self-tests)/i.test(relative)
  })
}

function apiInventory(root) {
  const prefixes = new Set()
  const occurrences = new Map()
  for (const file of productionTypeScriptFiles(root)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      if (!line.includes('/api/')) return
      if (!/(?:pathname|req\.url|request\.url|startsWith|===|match\(|register|handle)/.test(line)) return
      for (const match of line.matchAll(/\/api\/([A-Za-z0-9_-]+)/g)) {
        const prefix = `/api/${match[1]}`
        prefixes.add(prefix)
        const refs = occurrences.get(prefix) || []
        refs.push(`${slash(path.relative(root, file))}:${index + 1}`)
        occurrences.set(prefix, refs)
      }
    })
  }
  return { prefixes: [...prefixes].sort(), occurrences }
}

function cliInventory(root) {
  const cliPath = path.join(root, 'ccm-package', 'bin', 'ccm.js')
  const source = fs.readFileSync(cliPath, 'utf8')
  const helpBlock = source.match(/function printHelp\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  const commands = new Set()
  for (const match of helpBlock.matchAll(/console\.log\(["`]  ([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/g)) {
    commands.add(match[1].trim())
  }
  return { commands: [...commands].sort() }
}

function documentationInventory(root) {
  const architectureRoot = path.join(root, 'docs', 'confirmed-project-architecture')
  const processRoot = path.join(root, 'docs', 'confirmed-business-processes')
  const markdown = directory => fs.readdirSync(directory)
    .filter(file => file.endsWith('.md') && !['README.md', 'PROJECT-COVERAGE-MATRIX.md'].includes(file))
    .map(file => slash(path.relative(root, path.join(directory, file))))
    .sort()
  return {
    architectureDocs: markdown(architectureRoot),
    businessProcessDocs: markdown(processRoot),
  }
}

function testInventory(root) {
  const scriptsRoot = path.join(root, 'scripts')
  const testLike = /(?:selftest|audit|regression|e2e|soak|acceptance|production|attest)/i
  const files = fs.readdirSync(scriptsRoot)
    .filter(file => /\.(?:mjs|cjs|js)$/.test(file) && testLike.test(file))
    .sort()
  const domains = JSON.parse(fs.readFileSync(path.join(scriptsRoot, 'test-domains.json'), 'utf8'))
  return { files, domains }
}

export function collectCoverageInventory(root) {
  const backendRoots = fs.readdirSync(path.join(root, 'backend'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `backend/${entry.name}`)
    .sort()
  return {
    frontend: frontendInventory(root),
    api: apiInventory(root),
    cli: cliInventory(root),
    docs: documentationInventory(root),
    tests: testInventory(root),
    backendRoots,
  }
}

function ownerMap(entries, field) {
  const result = new Map()
  for (const entry of entries) {
    for (const value of entry[field] || []) {
      const key = typeof value === 'string' ? value : value.id
      const owners = result.get(key) || []
      owners.push(entry.id)
      result.set(key, owners)
    }
  }
  return result
}

function ratio(covered, total) {
  return total === 0 ? 100 : Math.round((covered / total) * 10000) / 100
}

export function auditProjectCoverage({
  root,
  manifest,
  generatedDocument = null,
  inventory: inventoryOverride = null,
}) {
  const errors = []
  const warnings = []
  const fail = (code, message, details) => errors.push({ code, message, ...(details === undefined ? {} : { details }) })
  const warn = (code, message, details) => warnings.push({ code, message, ...(details === undefined ? {} : { details }) })
  const inventory = inventoryOverride || collectCoverageInventory(root)

  if (manifest.schema !== COVERAGE_SCHEMA) fail('invalid_schema', `清单schema必须为 ${COVERAGE_SCHEMA}`)
  if (manifest.version !== 1) fail('invalid_version', '清单version必须为1')
  if (!Array.isArray(manifest.domains) || manifest.domains.length === 0) fail('missing_domains', '清单必须包含业务域')
  if (!Array.isArray(manifest.topLevelStructure)) fail('missing_top_level_structure', '清单必须包含顶层结构')
  if (!Array.isArray(manifest.compatibilityEntries)) fail('missing_compatibility_entries', '清单必须包含兼容条目')

  const domains = Array.isArray(manifest.domains) ? manifest.domains : []
  const compatibility = Array.isArray(manifest.compatibilityEntries) ? manifest.compatibilityEntries : []
  const ids = [...domains, ...compatibility].map(entry => entry.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length) fail('duplicate_domain_id', '业务域或兼容条目ID重复', unique(duplicateIds))

  const requiredArrays = [
    'frontendPages', 'backendRoots', 'productionEntrypoints', 'apiPrefixes', 'cliCommands',
    'testDomains', 'criticalTests', 'architectureDocs', 'businessProcessDocs', 'sharedBy',
  ]
  for (const domain of domains) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(String(domain.id || ''))) fail('invalid_domain_id', `业务域ID无效: ${domain.id}`)
    if (!['active', 'compatibility', 'retired'].includes(domain.status)) fail('invalid_domain_status', `业务域状态无效: ${domain.id}`)
    if (!String(domain.label || '').trim() || !String(domain.summary || '').trim()) fail('incomplete_domain', `业务域缺少名称或摘要: ${domain.id}`)
    for (const field of requiredArrays) {
      if (!Array.isArray(domain[field])) fail('invalid_domain_field', `${domain.id}.${field} 必须为数组`)
    }
  }

  const pathFields = ['backendRoots', 'productionEntrypoints', 'architectureDocs', 'businessProcessDocs']
  for (const domain of domains) {
    for (const field of pathFields) {
      for (const relative of domain[field] || []) {
        if (!exactPathExists(root, relative)) fail('missing_exact_path', `${domain.id} 声明的路径不存在或大小写不一致: ${relative}`)
      }
    }
    for (const page of domain.frontendPages || []) {
      if (!page?.id || !page?.component) fail('invalid_frontend_page', `${domain.id} 的页面条目缺少id或component`)
      else if (!exactPathExists(root, page.component)) fail('missing_frontend_component', `${domain.id} 的页面组件不存在: ${page.component}`)
    }
    for (const test of domain.criticalTests || []) {
      if (!exactPathExists(root, `scripts/${test}`)) fail('missing_critical_test', `${domain.id} 的关键测试不存在: ${test}`)
    }
  }
  for (const entry of compatibility) {
    for (const relative of entry.productionEntrypoints || []) {
      if (!exactPathExists(root, relative)) fail('missing_compatibility_path', `${entry.id} 的兼容入口不存在: ${relative}`)
    }
  }

  const declaredBackendRoots = new Set((manifest.topLevelStructure || []).map(entry => slash(entry.path)).filter(item => item.startsWith('backend/')))
  const missingBackendRoots = inventory.backendRoots.filter(item => !declaredBackendRoots.has(item))
  if (missingBackendRoots.length) fail('unmapped_backend_root', '存在未登记的后端一级生产目录', missingBackendRoots)

  const pageOwners = ownerMap(domains, 'frontendPages')
  const discoveredTabs = new Map(inventory.frontend.pages.map(page => [page.id, page.component]))
  for (const page of inventory.frontend.pages) {
    const owners = pageOwners.get(page.id) || []
    if (owners.length !== 1) fail(owners.length ? 'duplicate_frontend_owner' : 'unmapped_frontend_page', `页面 ${page.id} 必须有且仅有一个业务域主归属`, owners)
    const declared = domains.flatMap(domain => domain.frontendPages || []).find(item => item.id === page.id)
    if (declared && slash(declared.component) !== slash(page.component)) {
      fail('frontend_component_drift', `页面 ${page.id} 的真实组件与清单不一致`, { declared: declared.component, actual: page.component })
    }
  }
  for (const [pageId, owners] of pageOwners) {
    const page = domains.flatMap(domain => domain.frontendPages || []).find(item => item.id === pageId)
    if (page?.entryType !== 'standalone' && !discoveredTabs.has(pageId)) fail('unreachable_frontend_page', `清单页面没有生产Tab入口: ${pageId}`, owners)
    if (owners.length > 1) fail('duplicate_frontend_owner', `页面 ${pageId} 被多个业务域主归属`, owners)
  }

  const apiEntries = [
    ...domains.map(domain => ({ id: domain.id, apiPrefixes: domain.apiPrefixes || [] })),
    ...compatibility.map(entry => ({ id: entry.id, apiPrefixes: entry.apiPrefixes || [] })),
  ]
  const apiOwners = ownerMap(apiEntries, 'apiPrefixes')
  for (const prefix of inventory.api.prefixes) {
    const owners = apiOwners.get(prefix) || []
    if (owners.length !== 1) fail(owners.length ? 'duplicate_api_owner' : 'unmapped_api_prefix', `API前缀 ${prefix} 必须有且仅有一个主归属`, { owners, occurrences: inventory.api.occurrences.get(prefix) || [] })
  }
  for (const [prefix, owners] of apiOwners) {
    if (owners.length > 1) fail('duplicate_api_owner', `API前缀 ${prefix} 被重复归属`, owners)
  }

  const cliOwners = ownerMap(domains, 'cliCommands')
  for (const command of inventory.cli.commands) {
    const owners = cliOwners.get(command) || []
    if (owners.length !== 1) fail(owners.length ? 'duplicate_cli_owner' : 'unmapped_cli_command', `CLI命令 ${command} 必须有且仅有一个主归属`, owners)
  }

  for (const [kind, field] of [['架构文档', 'architectureDocs'], ['业务流程文档', 'businessProcessDocs']]) {
    const owners = ownerMap(domains, field)
    for (const document of inventory.docs[field]) {
      const documentOwners = owners.get(document) || []
      if (documentOwners.length !== 1) fail(documentOwners.length ? 'duplicate_document_owner' : 'orphan_document', `${kind}必须有且仅有一个主归属: ${document}`, documentOwners)
    }
  }

  const testDomains = inventory.tests.domains.domains || {}
  for (const domain of domains) {
    for (const testDomain of domain.testDomains || []) {
      if (!testDomains[testDomain]) fail('unknown_test_domain', `${domain.id} 引用了未知测试域: ${testDomain}`)
    }
    const allowedTests = new Set((domain.testDomains || []).flatMap(testDomain => testDomains[testDomain]?.tests || []))
    for (const test of domain.criticalTests || []) {
      if (!allowedTests.has(test)) fail('critical_test_not_in_domain', `${domain.id} 的关键测试未登记到声明测试域: ${test}`)
    }
  }

  if (generatedDocument !== null) {
    const expected = renderCoverageMatrix(manifest)
    if (String(generatedDocument).replace(/\r\n/g, '\n') !== expected) fail('generated_document_drift', '覆盖矩阵与结构化清单不一致，请运行 npm run coverage:generate')
  }

  const coveredPages = inventory.frontend.pages.filter(page => (pageOwners.get(page.id) || []).length === 1).length
  const coveredApis = inventory.api.prefixes.filter(prefix => (apiOwners.get(prefix) || []).length === 1).length
  const coveredCli = inventory.cli.commands.filter(command => (cliOwners.get(command) || []).length === 1).length
  const architectureOwners = ownerMap(domains, 'architectureDocs')
  const processOwners = ownerMap(domains, 'businessProcessDocs')
  const coveredArchitectureDocs = inventory.docs.architectureDocs.filter(document => (architectureOwners.get(document) || []).length === 1).length
  const coveredBusinessDocs = inventory.docs.businessProcessDocs.filter(document => (processOwners.get(document) || []).length === 1).length

  if (domains.some(domain => domain.status !== 'active')) warn('non_active_domain', '现行业务域清单中包含非active条目，建议移动到compatibilityEntries')

  /** @type {ProjectCoverageAuditReceiptV1} */
  const receipt = {
    schema: AUDIT_SCHEMA,
    version: 1,
    generated_at: new Date().toISOString(),
    manifest_checksum: checksum(stableStringify(manifest)),
    success: errors.length === 0,
    counts: {
      domains: domains.length,
      compatibility_entries: compatibility.length,
      frontend_pages: inventory.frontend.pages.length,
      api_prefixes: inventory.api.prefixes.length,
      cli_commands: inventory.cli.commands.length,
      architecture_docs: inventory.docs.architectureDocs.length,
      business_process_docs: inventory.docs.businessProcessDocs.length,
      critical_tests: unique(domains.flatMap(domain => domain.criticalTests || [])).length,
    },
    coverage: {
      frontend_pages_percent: ratio(coveredPages, inventory.frontend.pages.length),
      api_prefixes_percent: ratio(coveredApis, inventory.api.prefixes.length),
      cli_commands_percent: ratio(coveredCli, inventory.cli.commands.length),
      architecture_docs_percent: ratio(coveredArchitectureDocs, inventory.docs.architectureDocs.length),
      business_process_docs_percent: ratio(coveredBusinessDocs, inventory.docs.businessProcessDocs.length),
    },
    errors,
    warnings,
  }
  return { receipt, inventory }
}

function list(values, formatter = value => `\`${value}\``) {
  return values?.length ? values.map(formatter).join('、') : '—'
}

function documentLinks(values, generatedDocument) {
  const documentDirectory = path.posix.dirname(slash(generatedDocument))
  return list(values, value => {
    const relative = path.posix.relative(documentDirectory, slash(value))
    const label = path.posix.basename(value, '.md').replaceAll('-', ' ')
    return `[${label}](./${relative})`
  })
}

export function renderCoverageMatrix(manifest) {
  const checksumValue = checksum(stableStringify(manifest))
  const lines = [
    '# 项目结构与业务流程覆盖矩阵',
    '',
    '> 本文由 `scripts/project-coverage-manifest.json` 自动生成，请勿手工修改。',
    `> 清单版本：V${manifest.version} · 清单 checksum：\`${checksumValue.slice(0, 16)}\``,
    '',
    '本矩阵只列出能够从页面、API、CLI或后台调度真实到达的生产能力。兼容与退役入口单独列出，不计入现行业务覆盖。',
    '',
    '## 顶层结构',
    '',
    '| 目录 | 责任 |',
    '| --- | --- |',
    ...(manifest.topLevelStructure || []).map(entry => `| \`${entry.path}\` | ${entry.responsibility} |`),
    '',
    '## 现行业务覆盖',
    '',
    '| 业务域 | 页面 | API / CLI | 生产实现 | 测试与确认文档 |',
    '| --- | --- | --- | --- | --- |',
  ]
  for (const domain of manifest.domains || []) {
    const pages = list(domain.frontendPages, page => `\`${page.id}\` → \`${page.component}\``)
    const interfaces = [
      list(domain.apiPrefixes),
      domain.cliCommands?.length ? `CLI：${list(domain.cliCommands)}` : '',
    ].filter(Boolean).join('<br>')
    const implementation = [
      list(domain.backendRoots),
      list(domain.productionEntrypoints),
    ].filter(value => value !== '—').join('<br>')
    const evidence = [
      `测试域：${list(domain.testDomains)}`,
      `关键测试：${list(domain.criticalTests)}`,
      `架构：${documentLinks(domain.architectureDocs, manifest.generatedDocument)}`,
      `流程：${documentLinks(domain.businessProcessDocs, manifest.generatedDocument)}`,
    ].join('<br>')
    lines.push(`| **${domain.label}**<br>${domain.summary} | ${pages} | ${interfaces || '—'} | ${implementation || '—'} | ${evidence} |`)
  }
  lines.push(
    '',
    '## 兼容与退役入口',
    '',
    '| 条目 | 状态 | 接口 / 实现 | 保留原因 |',
    '| --- | --- | --- | --- |',
  )
  for (const entry of manifest.compatibilityEntries || []) {
    lines.push(`| ${entry.label} | \`${entry.status}\` | ${list([...(entry.apiPrefixes || []), ...(entry.productionEntrypoints || [])])} | ${entry.reason} |`)
  }
  lines.push(
    '',
    '## 维护门禁',
    '',
    '- 新增页面、API前缀、CLI命令、确认文档或专项测试时，必须先更新结构化清单。',
    '- 页面、API、CLI和确认文档必须有唯一主业务域；共享能力通过 `sharedBy` 表达。',
    '- `npm run coverage:check` 校验真实入口、精确路径、测试归属和生成文档一致性。',
    '- `npm run docs:check`、`npm run test:all` 与发布流水线均执行覆盖门禁。',
    '',
  )
  return `${lines.join('\n')}`
}
