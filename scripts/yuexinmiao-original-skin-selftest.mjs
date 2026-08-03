import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const menu = read('frontend/src/components/pets/usePetMenu.js')
const sprite = read('frontend/src/components/pets/PetSprite.vue')
const desktopMain = read('ccm-package/pet/main.js')
const desktopRenderer = read('ccm-package/pet/renderer/pet.js')

const originalFiles = [
  'yuexinmiao-idle.svg',
  'yuexinmiao-thinking.svg',
  'yuexinmiao-working.svg',
  'yuexinmiao-notification.svg',
  'yuexinmiao-react-drag.svg',
]
const roots = ['frontend/public/pets', 'ccm-package/public/pets', 'ccm-package/pet/assets']
const missing = []
for (const target of roots) {
  for (const file of originalFiles) {
    if (!fs.existsSync(path.join(root, target, file))) missing.push(`${target}/${file}`)
  }
}

const checks = [
  ['皮肤列表保留原月薪喵身份', menu.includes("id: 'yuexinmiao'") && !menu.includes("sourceUrl: 'https://codex-pet.org/zh/pets/yuexinmiao1/'")],
  ['网页宠物使用原状态图', sprite.includes("idle: 'yuexinmiao-idle.svg'")],
  ['桌面宠物使用原状态图', desktopRenderer.includes("idle: 'yuexinmiao-idle.svg'")],
  ['桌面入口不替换原皮肤', !desktopMain.includes("spritesheetPath: 'yuexinmiao1/spritesheet.webp'")],
  ['新版图集不会注入原皮肤元数据', !desktopMain.includes('BUILTIN_PET_SKINS')],
]

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name)
if (missing.length || failed.length) {
  console.error(JSON.stringify({ success: false, missing, failed }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length, original_files: originalFiles.length, paid_provider_calls: 0 }, null, 2))
