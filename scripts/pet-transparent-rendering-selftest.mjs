import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const assetRoots = [
  path.join(root, 'frontend/public/pets'),
  path.join(root, 'ccm-package/pet/assets'),
]
const runtimeSources = [
  path.join(root, 'frontend/src/components/pets/PetSprite.vue'),
  path.join(root, 'frontend/src/components/pets/usePetMenu.js'),
  path.join(root, 'ccm-package/pet/renderer/pet.js'),
]
const desktopMain = fs.readFileSync(path.join(root, 'ccm-package/pet/main.js'), 'utf8')
const supportedExtensions = new Set(['.svg', '.png', '.webp', '.apng'])

function collectImages(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) collectImages(target, output)
    else if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) output.push(target)
  }
  return output
}

function collectReferencedAssetNames() {
  const names = new Set()
  const assetPattern = /['"]([^'"]+\.(?:svg|png|webp|apng))['"]/gi
  for (const sourceFile of runtimeSources) {
    const source = fs.readFileSync(sourceFile, 'utf8')
    for (const match of source.matchAll(assetPattern)) names.add(path.basename(match[1]))
  }
  return names
}

async function inspectImage(file) {
  const { data } = await sharp(file, { animated: false, density: 96 })
    .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let visible = 0
  let black = 0
  let dark = 0
  let brightness = 0
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 24) continue
    visible += 1
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
    brightness += luminance
    if (data[index] < 12 && data[index + 1] < 12 && data[index + 2] < 12) black += 1
    if (luminance < 28) dark += 1
  }

  if (!visible) return { reason: 'no_visible_pixels' }
  const blackRatio = black / visible
  const darkRatio = dark / visible
  const meanBrightness = brightness / visible
  if (blackRatio > 0.72 || darkRatio > 0.82 || meanBrightness < 24) {
    return { reason: 'black_render', blackRatio, darkRatio, meanBrightness }
  }
  return null
}

const referencedNames = collectReferencedAssetNames()
const activeImages = assetRoots
  .flatMap((directory) => collectImages(directory))
  .filter((file) => referencedNames.has(path.basename(file)))

const failures = []
for (const file of activeImages) {
  try {
    const issue = await inspectImage(file)
    if (issue) failures.push({ file: path.relative(root, file), ...issue })
  } catch (error) {
    failures.push({ file: path.relative(root, file), reason: 'decode_failed', error: error.message })
  }
}

const accelerationPolicyValid = desktopMain.includes('const shouldDisableHardwareAcceleration =')
  && desktopMain.includes("process.env.CCM_PET_DISABLE_HARDWARE_ACCELERATION === '1'")
  && desktopMain.includes("process.platform === 'linux'")
  && desktopMain.includes('if (shouldDisableHardwareAcceleration) app.disableHardwareAcceleration();')

if (!accelerationPolicyValid || failures.length) {
  console.error(JSON.stringify({
    success: false,
    accelerationPolicyValid,
    checkedActiveImages: activeImages.length,
    failures,
  }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  checkedActiveImages: activeImages.length,
  referencedAssetNames: referencedNames.size,
  hardwareAcceleration: 'desktop-default',
  paidProviderCalls: 0,
}, null, 2))
