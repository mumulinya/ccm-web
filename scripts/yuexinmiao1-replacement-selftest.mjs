import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const menu = read('frontend/src/components/pets/usePetMenu.js')
const sprite = read('frontend/src/components/pets/PetSprite.vue')
const v2 = read('frontend/src/components/pets/PetV2Sprite.vue')
const desktopMain = read('ccm-package/pet/main.js')
const desktopRenderer = read('ccm-package/pet/renderer/pet.js')
const musicAction = read('frontend/public/pets/yuexinmiao1/juggling.svg')

const supplementalStates = ['thinking', 'planning', 'building', 'debugging', 'juggling', 'sweeping', 'carrying', 'notification', 'yawning', 'dozing', 'collapsing', 'sleeping', 'waking']
const roots = ['frontend/public/pets/yuexinmiao1', 'ccm-package/public/pets/yuexinmiao1', 'ccm-package/pet/assets/yuexinmiao1']
const missing = []
for (const target of roots) {
  for (const file of ['spritesheet.webp', 'pet.json', 'SOURCE.txt', ...supplementalStates.map(state => `${state}.svg`)]) {
    if (!fs.existsSync(path.join(root, target, file))) missing.push(`${target}/${file}`)
  }
}

const checks = [
  ['前端使用指定来源图集', menu.includes("spritesheetPath: 'yuexinmiao1/spritesheet.webp'")],
  ['前端支持混合补充动作', sprite.includes('useSupplementalState')],
  ['九行图集动态计算背景', v2.includes('Math.max(9, props.rows)')],
  ['桌宠注册内置图集元数据', desktopMain.includes('BUILTIN_PET_SKINS')],
  ['桌宠优先加载补充状态', desktopRenderer.includes('supplementalStateFiles?.[normalizedState]')],
  ['桌宠禁用旧月薪喵环境动作', desktopRenderer.includes('disableLegacyAmbient')],
  ['来源作者已记录', read('ccm-package/public/pets/yuexinmiao1/SOURCE.txt').includes('Creator: kiffin')],
  ['音乐动作不包含第一版耳机结构', !musicAction.includes('M53 79 Q54 39 96 35 Q139 39 139 79') && !musicAction.includes('x="43" y="73" width="18" height="35"')],
]

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name)
if (missing.length || failed.length) {
  console.error(JSON.stringify({ success: false, missing, failed }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length, supplemental_states: supplementalStates.length, paid_provider_calls: 0 }, null, 2))
