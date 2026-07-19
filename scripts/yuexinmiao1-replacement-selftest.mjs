import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import crypto from 'node:crypto'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const menu = read('frontend/src/components/pets/usePetMenu.js')
const sprite = read('frontend/src/components/pets/PetSprite.vue')
const v2 = read('frontend/src/components/pets/PetV2Sprite.vue')
const desktopMain = read('ccm-package/pet/main.js')
const desktopRenderer = read('ccm-package/pet/renderer/pet.js')

const supplementalStates = ['thinking', 'planning', 'working', 'building', 'debugging', 'reviewing', 'waiting', 'juggling', 'sweeping', 'carrying', 'notification', 'attention', 'happy', 'error', 'yawning', 'dozing', 'collapsing', 'sleeping', 'waking']
const roots = ['frontend/public/pets/yuexinmiao1', 'ccm-package/public/pets/yuexinmiao1', 'ccm-package/pet/assets/yuexinmiao1']
const missing = []
const invalidSupplemental = []
for (const target of roots) {
  for (const file of ['spritesheet.webp', 'pet.json', 'SOURCE.txt', ...supplementalStates.map(state => `${state}.svg`)]) {
    if (!fs.existsSync(path.join(root, target, file))) missing.push(`${target}/${file}`)
  }
  for (const state of supplementalStates) {
    const svgPath = path.join(root, target, `${state}.svg`)
    if (!fs.existsSync(svgPath)) continue
    const svg = fs.readFileSync(svgPath, 'utf8')
    if (
      !svg.includes('<image')
      || !svg.includes('data:image/webp;base64,')
      || svg.includes('href="spritesheet.webp"')
      || !svg.includes('保留来源角色帧，并独立绘制业务场景和动画')
    ) {
      invalidSupplemental.push(`${target}/${state}.svg`)
    }
  }
}

const musicSvgs = roots.map(target => read(`${target}/juggling.svg`))
const musicHasForbiddenAccessory = musicSvgs.some(svg => (
  /headphone|earphone|耳机/i.test(svg)
  || /[♫♪♬♩]/u.test(svg)
  || /music[-_ ]?note/i.test(svg)
))

const expectedAtlasSha256 = '4fd7d2ed00b9cce321acba7953ecb25290a78391046e94308c2b8947763c4bcd'
const atlasHashes = roots.map(target => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, target, 'spritesheet.webp')))
  .digest('hex'))
const atlasChecksumValid = atlasHashes.every(hash => hash === expectedAtlasSha256)

const checks = [
  ['前端使用指定来源图集', menu.includes("spritesheetPath: 'yuexinmiao1/spritesheet.webp'")],
  ['前端支持混合补充动作', sprite.includes('useSupplementalState')],
  ['九行图集动态计算背景', v2.includes('Math.max(9, props.rows)')],
  ['桌宠注册内置图集元数据', desktopMain.includes('BUILTIN_PET_SKINS')],
  ['桌宠优先加载补充状态', desktopRenderer.includes('supplementalStateFiles?.[normalizedState]')],
  ['桌宠禁用旧月薪喵环境动作', desktopRenderer.includes('disableLegacyAmbient')],
  ['来源作者已记录', read('ccm-package/public/pets/yuexinmiao1/SOURCE.txt').includes('Creator: kiffin')],
  ['指定来源图集校验值一致', atlasChecksumValid],
  ['补充 SVG 使用来源角色帧和独立业务场景', invalidSupplemental.length === 0],
  ['音乐动作没有耳机或音符道具', !musicHasForbiddenAccessory],
  ['业务动作拥有独立资源', supplementalStates.every(state => menu.includes(`yuexinmiao1/${state}.svg`))],
  ['资源中心读取真实内置图集路径', menu.includes("const sheet = skin?.spritesheetPath")],
]

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name)
if (missing.length || failed.length || invalidSupplemental.length) {
  console.error(JSON.stringify({ success: false, missing, failed, invalidSupplemental }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length, supplemental_states: supplementalStates.length, paid_provider_calls: 0 }, null, 2))
