import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const source = fs.readFileSync(path.join(process.cwd(), 'frontend/src/App.vue'), 'utf8')
const checks = [
  ['CCM 品牌名称', '<strong>CCM</strong>'],
  ['产品副标题', '<small>Agent Workspace</small>'],
  ['品牌标识', 'class="brand-mark"'],
  ['版本信息', 'class="brand-version"'],
  ['品牌返回首页', 'title="返回我的工作台"'],
]

const missing = checks.filter(([, marker]) => !source.includes(marker))
if (missing.length || source.includes('class="menu-edit-btn"') || source.includes('title="打开导航配置中心"')) {
  console.error(`Sidebar brand self-test failed: ${missing.map(([name]) => name).join(', ') || '旧菜单管理快捷入口仍存在'}`)
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length + 2, paid_provider_calls: 0 }, null, 2))
