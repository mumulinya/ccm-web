import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const spritePath = path.join(root, 'frontend/src/components/pets/PetSprite.vue')
const menuPath = path.join(root, 'frontend/src/components/pets/usePetMenu.js')
const sprite = fs.readFileSync(spritePath, 'utf8')
const menu = fs.readFileSync(menuPath, 'utf8')

const checks = [
  ['内置宠物进入状态渲染器', menu, 'fallbackPetTypes.some(item => item.id === type)'],
  ['Clawd 使用专属动作目录', sprite, "clawd: {\n    dir: 'clawd',\n    files: clawdStateFiles"],
  ['规划状态使用深度思考动作', sprite, "planning: 'clawd-working-ultrathink.svg'"],
  ['动作图片失败后保留当前宠物', sprite, 'const fallbackSvgUrl = computed'],
  ['错误回退由统一处理器接管', sprite, '@error="handleImageError"'],
]

const requiredAssets = [
  'ccm-package/public/pets/clawd/clawd-idle-follow.svg',
  'ccm-package/public/pets/clawd/clawd-working-ultrathink.svg',
  'ccm-package/public/pets/clawd/clawd-working-typing.svg',
  'ccm-package/public/pets/clawd/clawd-error.svg',
]

const missingChecks = checks.filter(([, source, marker]) => !source.includes(marker))
const missingAssets = requiredAssets.filter(asset => !fs.existsSync(path.join(root, asset)))
const wrongSpeciesFallback = sprite.includes("@error=\"$event.target.src = '/pets/yuexinmiao.svg'\"")

if (missingChecks.length || missingAssets.length || wrongSpeciesFallback) {
  console.error(JSON.stringify({
    success: false,
    missing_checks: missingChecks.map(([name]) => name),
    missing_assets: missingAssets,
    wrong_species_fallback: wrongSpeciesFallback,
  }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  checks: checks.length + requiredAssets.length + 1,
  paid_provider_calls: 0,
}, null, 2))
