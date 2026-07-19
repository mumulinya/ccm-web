import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const targets = [
  path.join(root, 'frontend/public/pets/yuexinmiao1'),
  path.join(root, 'ccm-package/public/pets/yuexinmiao1'),
  path.join(root, 'ccm-package/pet/assets/yuexinmiao1'),
]

const WIDTH = 192
const HEIGHT = 208
const ATLAS_WIDTH = WIDTH * 8
const ATLAS_HEIGHT = HEIGHT * 9

const BROWN = '#6b4137'
const CREAM = '#fff9ed'
const PINK = '#f5bfd4'
const GREEN = '#58b982'
const RED = '#e85f62'
const YELLOW = '#f6c744'

const overlays = {
  thinking: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M37 71 L72 63 L79 105 L44 113 Z" fill="${CREAM}"/>
    <path d="M47 79 L68 74 M49 89 L69 84 M51 99 L66 95" fill="none" stroke="#5b8fc9" stroke-width="3"/>
    <path d="M75 61 L84 51" fill="none" stroke="${YELLOW}"/>
  </g>`,
  planning: `<g stroke="${BROWN}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="42" y="35" width="66" height="50" rx="4" fill="${CREAM}" stroke-width="5"/>
    <path d="M51 48 L56 53 L64 43 M70 49 H96 M51 65 L56 70 L64 60 M70 66 H94" fill="none" stroke="${GREEN}" stroke-width="4"/>
  </g>`,
  working: `<g stroke="${BROWN}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="42" y="35" width="66" height="50" rx="4" fill="#dff5fb" stroke-width="5"/>
    <path d="M51 48 H76 M51 58 H96 M51 68 H87" fill="none" stroke="#3a78b7" stroke-width="4"/>
    <circle cx="99" cy="75" r="4" fill="${GREEN}" stroke="none"/>
  </g>`,
  building: `<g stroke="${BROWN}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="42" y="35" width="66" height="50" rx="4" fill="${CREAM}" stroke-width="5"/>
    <path d="M52 51 H98 M52 67 H86" fill="none" stroke="#d3d7dc" stroke-width="7"/>
    <path d="M52 51 H86 M52 67 H73" fill="none" stroke="${GREEN}" stroke-width="7"/>
    <path d="M119 119 L141 97 M132 94 L146 108" fill="none" stroke="${YELLOW}" stroke-width="7"/>
  </g>`,
  debugging: `<g stroke="${BROWN}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="96" cy="128" rx="14" ry="17" fill="${RED}"/>
    <path d="M96 112 V144 M82 122 L72 116 M82 132 L70 137 M110 122 L120 116 M110 132 L122 137" fill="none"/>
    <path d="M90 120 H102" stroke="${CREAM}"/>
  </g>`,
  reviewing: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="35" y="58" width="55" height="68" rx="6" fill="${CREAM}"/>
    <path d="M45 74 L50 79 L58 69 M63 76 H80 M45 94 L50 99 L58 89 M63 96 H80 M45 114 H76" fill="none" stroke="${GREEN}" stroke-width="4"/>
  </g>`,
  waiting: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="54" cy="83" r="22" fill="${CREAM}"/>
    <path d="M54 68 V84 L65 91" fill="none" stroke="#5b8fc9"/>
    <circle cx="54" cy="83" r="3" fill="${BROWN}" stroke="none"/>
  </g>`,
  music: `<g stroke="${YELLOW}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M145 60 V34 L163 30 V52 M163 52 Q153 46 151 56 Q153 65 163 59" fill="none"/>
    <path d="M44 48 Q51 42 58 48 M37 61 Q46 54 55 61" fill="none" opacity=".78"/>
  </g>`,
  sweeping: `<g stroke="${BROWN}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M56 91 L132 166" fill="none"/>
    <path d="M119 153 L153 177 L132 192 L103 168 Z" fill="${YELLOW}"/>
    <path d="M122 166 L139 180 M115 173 L128 185" fill="none" stroke="#d79a2c" stroke-width="4"/>
  </g>`,
  notification: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M139 78 Q139 55 156 50 Q173 55 173 78 L181 91 H131 Z" fill="${YELLOW}"/>
    <path d="M150 96 Q156 103 162 96" fill="none"/>
  </g>`,
  attention: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="77" cy="76" rx="11" ry="14" fill="${CREAM}" stroke="none"/>
    <ellipse cx="116" cy="76" rx="11" ry="14" fill="${CREAM}" stroke="none"/>
    <path d="M68 75 Q77 84 86 75 M107 75 Q116 84 125 75 M84 96 Q96 108 109 96" fill="none"/>
    <path d="M126 39 H176 V80 H147 L136 91 V80 H126 Z" fill="${CREAM}"/>
    <path d="M140 59 L149 68 L165 49" fill="none" stroke="${GREEN}" stroke-width="7"/>
  </g>`,
  happy: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="77" cy="76" rx="11" ry="14" fill="${CREAM}" stroke="none"/>
    <ellipse cx="116" cy="76" rx="11" ry="14" fill="${CREAM}" stroke="none"/>
    <path d="M68 75 Q77 84 86 75 M107 75 Q116 84 125 75 M84 96 Q96 108 109 96" fill="none"/>
    <path d="M48 45 L52 55 L62 59 L52 63 L48 74 L44 63 L34 59 L44 55 Z M151 45 L155 55 L165 59 L155 63 L151 74 L147 63 L137 59 L147 55 Z" fill="${YELLOW}"/>
  </g>`,
  error: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="54" y="107" width="84" height="48" rx="7" fill="#fff0f0"/>
    <path d="M77 120 L91 141 M91 120 L77 141 M101 124 H126 M101 138 H119" fill="none" stroke="${RED}"/>
  </g>`,
  yawning: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="97" cy="99" rx="15" ry="20" fill="#74473d"/>
    <path d="M89 108 Q97 114 105 108" fill="none" stroke="${PINK}" stroke-width="5"/>
  </g>`,
  dozing: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="74" cy="76" rx="8" ry="13" fill="${CREAM}" stroke="none"/>
    <ellipse cx="116" cy="76" rx="8" ry="13" fill="${CREAM}" stroke="none"/>
    <path d="M66 78 Q74 85 82 78 M108 78 Q116 85 124 78" fill="none"/>
    <path d="M151 47 H166 L151 63 H167" fill="none" stroke="#5b8fc9"/>
  </g>`,
  waking: `<g stroke="${BROWN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M38 44 L48 55 M154 44 L144 55 M29 75 H45 M163 75 H179" fill="none" stroke="${YELLOW}"/>
    <path d="M78 77 Q86 69 94 77 M105 77 Q113 69 121 77" fill="none"/>
  </g>`,
}

const states = {
  thinking: { row: 6, frames: [0, 1, 2, 3, 4, 5, 0], dur: 2.8, translate: ['0 0', '0 -2', '0 0', '0 -1', '0 0', '0 1', '0 0'], overlay: overlays.thinking },
  planning: { row: 7, frames: [0, 1, 2, 3, 4, 5, 0], dur: 2.2, translate: ['0 0', '0 -1', '0 0', '0 -1', '0 0', '0 -1', '0 0'], overlay: overlays.planning },
  working: { row: 7, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.35, translate: ['0 0', '0 -1', '0 0', '0 -1', '0 0', '0 -1', '0 0'], overlay: overlays.working },
  building: { row: 7, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.15, translate: ['0 0', '0 -2', '0 0', '0 -2', '0 0', '0 -2', '0 0'], overlay: overlays.building },
  debugging: { row: 8, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.25, translate: ['0 0', '-2 0', '2 0', '-1 0', '1 0', '0 0', '0 0'], overlay: overlays.debugging },
  reviewing: { row: 6, frames: [0, 1, 2, 3, 4, 5, 0], dur: 2.4, translate: ['0 0', '0 -1', '0 0', '0 -1', '0 0', '0 -1', '0 0'], overlay: overlays.reviewing },
  waiting: { row: 6, frames: [0, 1, 2, 3, 2, 1, 0], dur: 3.2, translate: ['0 0', '0 1', '0 0', '0 1', '0 0', '0 1', '0 0'], overlay: overlays.waiting },
  juggling: { row: 0, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.05, translate: ['0 1', '0 -4', '0 -1', '0 -5', '0 -1', '0 -3', '0 1'], overlay: overlays.music },
  sweeping: { row: 0, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.6, translate: ['-2 0', '0 0', '2 0', '3 0', '1 0', '-1 0', '-2 0'], overlay: overlays.sweeping },
  carrying: { row: 1, frames: [0, 1, 2, 3, 4, 5, 6, 7, 0], dur: 1.15, translate: ['-3 0', '-2 -2', '-1 0', '0 -2', '1 0', '2 -2', '3 0', '2 -1', '-3 0'] },
  notification: { row: 5, frames: [0, 3, 6, 7, 0], dur: 0.9, translate: ['0 2', '0 -7', '0 -2', '0 -6', '0 2'], overlay: overlays.notification },
  attention: { row: 5, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.5, translate: ['0 1', '0 -3', '0 0', '0 -2', '0 0', '0 -3', '0 1'], overlay: overlays.attention },
  happy: { row: 5, frames: [0, 1, 2, 3, 4, 5, 6, 7, 0], dur: 1.15, translate: ['0 1', '0 -5', '0 -2', '0 -6', '0 -2', '0 -5', '0 -2', '0 -4', '0 1'], overlay: overlays.happy },
  error: { row: 8, frames: [0, 1, 2, 3, 4, 5, 0], dur: 1.4, translate: ['0 0', '-2 0', '2 0', '-2 0', '2 0', '0 0', '0 0'], overlay: overlays.error },
  yawning: { row: 0, frames: [0, 1, 2, 3, 4, 5, 4, 3, 0], dur: 3.8, translate: ['0 0', '0 1', '0 2', '0 3', '0 3', '0 2', '0 2', '0 1', '0 0'], overlay: overlays.yawning },
  dozing: { row: 6, frames: [0, 1, 2, 3, 2, 1, 0], dur: 4.2, translate: ['0 0', '0 1', '0 3', '0 5', '0 4', '0 2', '0 0'], rotate: ['0 96 104', '1 96 104', '2 96 104', '3 96 104', '2 96 104', '1 96 104', '0 96 104'], overlay: overlays.dozing },
  collapsing: { row: 6, frames: [0, 1, 2, 3, 4, 5, 5, 0], dur: 2.8, translate: ['0 0', '0 2', '1 5', '2 9', '3 13', '4 17', '4 17', '0 0'], rotate: ['0 96 104', '2 96 104', '4 96 104', '6 96 104', '8 96 104', '10 96 104', '10 96 104', '0 96 104'] },
  sleeping: {
    row: 6,
    frames: [5, 5, 5, 5],
    dur: 3.6,
    translate: ['0 13', '0 15', '0 13', '0 15'],
    rotate: ['4 96 104', '5 96 104', '4 96 104', '5 96 104'],
    overlay: `<g stroke="#6b4137" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="74" cy="76" rx="8" ry="13" fill="#fff9ed" stroke="none"/>
          <ellipse cx="116" cy="76" rx="8" ry="13" fill="#fff9ed" stroke="none"/>
          <path d="M66 78 Q74 86 82 78 M108 78 Q116 86 124 78" fill="none"/>
          <path d="M27 119 Q55 103 96 108 Q133 111 157 137 L153 169 Q101 180 42 161 Z" fill="#f5bfd4"/>
          <path d="M45 137 Q73 125 105 132 M81 159 Q111 147 143 151" fill="none" opacity="0.38"/>
        </g>`,
  },
  waking: { row: 5, frames: [7, 6, 5, 4, 3, 2, 1, 0, 0], dur: 2.15, translate: ['0 9', '0 7', '0 5', '0 2', '0 -3', '0 -6', '0 -2', '0 0', '0 0'], overlay: overlays.waking },
}

function keyTimes(length) {
  return Array.from({ length }, (_, index) => (index / (length - 1)).toFixed(4)).join(';')
}

function animation(values, attributeName, duration, type = '') {
  if (!values?.length) return ''
  const typeAttr = type ? ` type="${type}"` : ''
  const tag = type ? 'animateTransform' : 'animate'
  return `<${tag} attributeName="${attributeName}"${typeAttr} values="${values.join(';')}" keyTimes="${keyTimes(values.length)}" dur="${duration}s" calcMode="discrete" repeatCount="indefinite"/>`
}

function makeSvg(name, spec, atlasHref = 'spritesheet.webp') {
  const xValues = spec.frames.map(frame => String(-frame * WIDTH))
  const y = -spec.row * HEIGHT
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208" role="img" aria-label="月薪喵 ${name}">
  <title>月薪喵 ${name}</title>
  <desc>基于 kiffin 发布的 yuexinmiao1 Codex Pet 原始表情包帧编排的 CCM 补充动作。</desc>
  <defs><clipPath id="cell"><rect width="192" height="208"/></clipPath></defs>
  <g clip-path="url(#cell)">
    <g>
      ${animation(spec.translate, 'transform', spec.dur, 'translate')}
      <g>
        ${animation(spec.rotate, 'transform', spec.dur, 'rotate')}
        <image href="${atlasHref}" x="${xValues[0]}" y="${y}" width="${ATLAS_WIDTH}" height="${ATLAS_HEIGHT}" preserveAspectRatio="none">
          ${animation(xValues, 'x', spec.dur)}
        </image>
        ${spec.overlay || ''}
      </g>
    </g>
  </g>
</svg>
`.replace(/[ \t]+\n/g, '\n')
}

const sourceText = `月薪喵 yuexinmiao1 source attribution\n\nCreator: kiffin\nSource: https://codex-pet.org/zh/pets/yuexinmiao1/\nPackage endpoint: https://codex-pet.org/api/pets/yuexinmiao1/files/spritesheet.webp\nImported for local CCM use on 2026-07-19.\nThe source package did not include an explicit license. Do not redistribute it until permission is confirmed.\nSupplemental SVG animations are CCM-specific frame choreography around the attributed source atlas.\n`

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true })
  const atlasPath = path.join(target, 'spritesheet.webp')
  if (!fs.existsSync(atlasPath)) throw new Error(`Missing source atlas: ${atlasPath}`)
  const embeddedAtlas = `data:image/webp;base64,${fs.readFileSync(atlasPath).toString('base64')}`
  for (const [name, spec] of Object.entries(states)) {
    fs.writeFileSync(path.join(target, `${name}.svg`), makeSvg(name, spec, embeddedAtlas), 'utf8')
  }
  fs.writeFileSync(path.join(target, 'SOURCE.txt'), sourceText, 'utf8')
  fs.writeFileSync(path.join(target, 'pet.json'), JSON.stringify({
    id: 'yuexinmiao1',
    displayName: '月薪喵',
    description: "A cartoon kitten character named 'Yuexin Miao' with actions derived from sticker packs.",
    spritesheetPath: 'spritesheet.webp',
    spriteVersionNumber: 2,
    spriteRows: 9,
    sourceCreator: 'kiffin',
    sourceUrl: 'https://codex-pet.org/zh/pets/yuexinmiao1/',
  }, null, 2), 'utf8')
}

const sourceAtlas = path.join(root, 'frontend/public/pets/yuexinmiao1/spritesheet.webp')
const baseAtlas = `data:image/webp;base64,${fs.readFileSync(sourceAtlas).toString('base64')}`
const baseSvg = makeSvg('待机', { row: 0, frames: [0, 1, 2, 3, 4, 5, 0], dur: 2.4 }, baseAtlas)
fs.writeFileSync(path.join(root, 'ccm-package/public/pets/yuexinmiao.svg'), baseSvg, 'utf8')
fs.writeFileSync(path.join(root, 'ccm-package/pet/assets/yuexinmiao.svg'), baseSvg, 'utf8')
fs.writeFileSync(path.join(root, 'frontend/public/pets/yuexinmiao.svg'), baseSvg, 'utf8')

console.log(JSON.stringify({ success: true, states: Object.keys(states).length, targets: targets.length }, null, 2))
