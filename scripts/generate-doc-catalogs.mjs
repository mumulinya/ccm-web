import fs from 'node:fs'
import path from 'node:path'

const docsRoot = path.resolve(process.cwd(), 'docs')
const catalogs = [
  {
    directory: 'product-evolution',
    title: '产品演进设计文档目录',
    description: '按业务域归档的版本化架构、产品与可靠性设计记录。',
  },
  {
    directory: 'tooling-and-extensions',
    title: '工具与扩展文档目录',
    description: 'MCP、Skill、第三方 Agent 运行适配、权限和市场安装记录。',
  },
  {
    directory: 'test-agent',
    title: 'TestAgent 内部实现文档目录',
    description: 'TestAgent 契约、浏览器执行、断言、证据和可靠性记录。',
  },
  {
    directory: 'group-memory-cc-parity',
    title: '群聊记忆 CC 对齐阶段目录',
    description: '群聊记忆、压缩、恢复和会话连续性的分阶段实现记录。',
  },
]

const excludedNames = new Set(['README.md', 'CATALOG.md'])

function collectMarkdown(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(current, entry.name)
    if (entry.isDirectory()) return collectMarkdown(root, absolute)
    if (!entry.isFile() || !entry.name.endsWith('.md') || excludedNames.has(entry.name)) return []
    const content = fs.readFileSync(absolute, 'utf8')
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.md$/, '')
    return [{
      title,
      relative: path.relative(root, absolute).replaceAll(path.sep, '/'),
    }]
  })
}

function generateCatalog(config) {
  const root = path.join(docsRoot, config.directory)
  if (!fs.existsSync(root)) return null
  const documents = collectMarkdown(root).sort((left, right) => {
    const leftFolder = path.posix.dirname(left.relative)
    const rightFolder = path.posix.dirname(right.relative)
    return leftFolder.localeCompare(rightFolder, 'en') || right.relative.localeCompare(left.relative, 'en')
  })
  const groups = new Map()
  for (const document of documents) {
    const folder = path.posix.dirname(document.relative)
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder).push(document)
  }

  const lines = [
    `# ${config.title}`,
    '',
    `> ${config.description}共 ${documents.length} 篇。该文件由 \`node scripts/generate-doc-catalogs.mjs\` 生成。`,
    '',
  ]
  for (const [folder, items] of groups) {
    lines.push(`## ${folder} (${items.length})`, '')
    for (const item of items) lines.push(`- [${item.title}](./${item.relative})`)
    lines.push('')
  }
  const output = path.join(root, 'CATALOG.md')
  fs.writeFileSync(output, `${lines.join('\n').trim()}\n`, 'utf8')
  return { directory: config.directory, documents: documents.length, folders: groups.size, output }
}

const results = catalogs.map(generateCatalog).filter(Boolean)
console.log(JSON.stringify({ success: true, catalogs: results }, null, 2))
