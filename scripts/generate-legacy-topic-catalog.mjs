import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd(), 'docs/archive/legacy-topics')

if (!fs.existsSync(root)) {
  console.log(JSON.stringify({ success: true, topics: 0, skipped: 'directory missing' }, null, 2))
  process.exitCode = 0
} else {
  const topics = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const readme = path.join(root, entry.name, 'README.md')
      if (!fs.existsSync(readme)) return null
      const content = fs.readFileSync(readme, 'utf8')
      const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name
      const date = entry.name.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] || ''
      return { name: entry.name, title, date }
    })
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date, 'en') || left.name.localeCompare(right.name, 'en'))

  const lines = [
    '# 单次专题历史归档目录',
    '',
    `> 按日期归档的一次性功能、界面与修复记录，仅作历史证据查阅。共 ${topics.length} 个专题。该文件由 \`node scripts/generate-legacy-topic-catalog.mjs\` 生成。`,
    '',
    '| 日期 | 专题 |',
    '| --- | --- |',
  ]
  for (const topic of topics) {
    lines.push(`| ${topic.date || '-'} | [${topic.title}](./${topic.name}/README.md) |`)
  }

  const output = path.join(root, 'CATALOG.md')
  fs.writeFileSync(output, `${lines.join('\n').trim()}\n`, 'utf8')
  console.log(JSON.stringify({ success: true, topics: topics.length, output }, null, 2))
}
