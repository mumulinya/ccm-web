import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const panel = fs.readFileSync(path.join(root, 'frontend/src/components/pets/PetMenuPanel.vue'), 'utf8')
const template = fs.readFileSync(path.join(root, 'frontend/src/components/pets/PetMenu.template.html'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'frontend/src/components/pets/PetMenu.css'), 'utf8')
const menu = fs.readFileSync(path.join(root, 'frontend/src/components/pets/usePetMenu.js'), 'utf8')
const assets = fs.readFileSync(path.join(root, 'frontend/src/components/pets/PetAssetGrid.vue'), 'utf8')

const checks = [
  ['真实工作伴侣概览', template, 'companion-overview'],
  ['宠物库搜索', template, 'v-model="skinSearch"'],
  ['来源与使用筛选', template, "{ id: 'active', label: '已使用' }"],
  ['动画状态预览', template, 'state-picker'],
  ['应用到 Agent', template, '@click="applyLibraryPet"'],
  ['导出宠物配置', template, '@click="exportSelectedPet"'],
  ['自定义皮肤删除', template, '@click="deleteCustomSkin(selectedLibrarySkin.id)"'],
  ['配置错误提示', template, 'pet-error-banner'],
  ['配置保存失败可见', menu, "toast.error(error?.message || '宠物配置保存失败')"],
  ['移动端详情抽屉', styles, '.pet-space-right.mobile-open'],
  ['底部导航避让', styles, 'bottom:calc(58px + env(safe-area-inset-bottom))'],
  ['资源缺失状态', assets, '资源缺失'],
  ['统一图标', panel, '@lucide/vue'],
]

const missing = checks.filter(([, source, marker]) => !source.includes(marker))
const legacy = template.includes('workspace-companion-card') || template.includes('宠物全能图鉴') || template.includes('生成宠物')
if (missing.length || legacy) {
  console.error(`Pet space redesign self-test failed: ${missing.map(([name]) => name).join(', ') || '旧假宠物或生成入口仍存在'}`)
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length + 1, paid_provider_calls: 0 }, null, 2))
