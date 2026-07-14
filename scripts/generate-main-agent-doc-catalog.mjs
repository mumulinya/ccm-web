import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd(), 'docs/main-agent-workchain')
const output = path.join(root, 'CATALOG.md')
const excluded = new Set(['README.md', 'CATALOG.md'])

const collect = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(directory, entry.name)
  if (entry.isDirectory()) return collect(absolute)
  if (!entry.isFile() || !entry.name.endsWith('.md') || excluded.has(entry.name)) return []
  const content = fs.readFileSync(absolute, 'utf8')
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.md$/, '')
  return [{ absolute, title, relative: path.relative(root, absolute).replaceAll(path.sep, '/') }]
})

const documents = collect(root).sort((a, b) => {
  const folderCompare = path.posix.dirname(a.relative).localeCompare(path.posix.dirname(b.relative), 'en')
  return folderCompare || b.relative.localeCompare(a.relative, 'en')
})
const groups = new Map()
for (const document of documents) {
  const folder = path.posix.dirname(document.relative)
  if (!groups.has(folder)) groups.set(folder, [])
  groups.get(folder).push(document)
}

const lines = [
  '# Main Agent Workchain 文档总目录',
  '',
  `> 共 ${documents.length} 篇功能与验收记录。该文件由 \`node scripts/generate-main-agent-doc-catalog.mjs\` 生成。`,
  '',
]
for (const [folder, items] of groups) {
  lines.push(`## ${folder} (${items.length})`, '')
  for (const item of items) lines.push(`- [${item.title}](./${item.relative})`)
  lines.push('')
}

fs.writeFileSync(output, `${lines.join('\n').trim()}\n`, 'utf8')
console.log(JSON.stringify({ success: true, documents: documents.length, folders: groups.size, output }, null, 2))

