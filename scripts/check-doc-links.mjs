import fs from 'node:fs'
import path from 'node:path'

const docsRoot = path.resolve(process.cwd(), 'docs')

function collectMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectMarkdown(absolute)
    return entry.isFile() && entry.name.endsWith('.md') ? [absolute] : []
  })
}

const failures = []
let checkedLinks = 0
for (const file of collectMarkdown(docsRoot)) {
  const content = fs.readFileSync(file, 'utf8')
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g
  for (const match of content.matchAll(linkPattern)) {
    let target = match[1].trim().replace(/^<|>$/g, '')
    if (!target || target.startsWith('#') || /^(?:https?:|mailto:|data:)/i.test(target)) continue
    target = target.split('#')[0].split('?')[0]
    if (!target) continue
    try {
      target = decodeURIComponent(target)
    } catch {}
    const resolved = path.resolve(path.dirname(file), target)
    checkedLinks += 1
    if (!fs.existsSync(resolved)) {
      const line = content.slice(0, match.index).split('\n').length
      failures.push({ file: path.relative(process.cwd(), file).replaceAll(path.sep, '/'), line, target })
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ success: false, checkedLinks, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ success: true, checkedLinks, failures: 0 }, null, 2))
}
