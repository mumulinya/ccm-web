import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const panel = fs.readFileSync(path.join(root, 'frontend/src/components/tools/AutoDevOpsPanel.vue'), 'utf8')
const template = fs.readFileSync(path.join(root, 'frontend/src/components/tools/AutoDevOps.template.html'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'frontend/src/components/tools/AutoDevOps.css'), 'utf8')

const checks = [
  ['控制台标题', template, '自动开发控制台'],
  ['标签图标', template, 'viewIcons[view.id]'],
  ['运行操作图标', template, '<Play :size="15"'],
  ['链路状态图标', template, 'readiness-icon'],
  ['四项指标图标', template, 'metric-icon'],
  ['可操作活动空状态', template, 'operational-empty'],
  ['主栏双列工作区', styles, '.overview-main{grid-template-columns:repeat(2,minmax(0,1fr))}'],
  ['内容占满宽度', styles, 'max-width: none'],
  ['移动端主栏单列', styles, '.overview-main { grid-template-columns: 1fr; }'],
  ['Lucide 图标来源', panel, '@lucide/vue'],
]

const missing = checks.filter(([, source, marker]) => !source.includes(marker))
if (missing.length || styles.includes('width: min(100%, 1280px)')) {
  console.error(`Auto dev redesign self-test failed: ${missing.map(([name]) => name).join(', ') || '旧 1280px 宽度限制仍存在'}`)
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length + 1, paid_provider_calls: 0 }, null, 2))
