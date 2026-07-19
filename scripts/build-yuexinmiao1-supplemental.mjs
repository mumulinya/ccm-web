import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const targets = [
  path.join(root, 'frontend/public/pets/yuexinmiao1'),
  path.join(root, 'ccm-package/public/pets/yuexinmiao1'),
  path.join(root, 'ccm-package/pet/assets/yuexinmiao1'),
]
const sourceAtlasPath = path.join(root, 'frontend/public/pets/yuexinmiao1/spritesheet.webp')
if (!fs.existsSync(sourceAtlasPath)) throw new Error(`Missing source atlas: ${sourceAtlasPath}`)
const sourceAtlasData = `data:image/webp;base64,${fs.readFileSync(sourceAtlasPath).toString('base64')}`

const C = {
  line: '#6b4137',
  fur: '#fffaf0',
  patch: '#c99572',
  patchLight: '#e4bd99',
  eye: '#3f78bc',
  cheek: '#f2a9b7',
  blue: '#58bfe1',
  blueDark: '#377fb8',
  green: '#5eb783',
  red: '#e96668',
  yellow: '#f4c84e',
  pink: '#f3bfd2',
  paper: '#fffdf6',
  ink: '#526173',
}

const commonCss = `
  .cat,.tail,.arm-left,.arm-right,.prop,.accent,.head { transform-box:fill-box; }
  .cat { transform-origin:center bottom; animation:breathe 2.4s ease-in-out infinite; }
  .source-character { transform-box:view-box; transform-origin:96px 180px; }
  .tail { transform-origin:left center; animation:tail 2.6s ease-in-out infinite; }
  @keyframes breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  @keyframes tail { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(8deg)} }
  @media (prefers-reduced-motion:reduce) { * { animation-duration:1ms!important; animation-iteration-count:1!important; } }
`

function sourceFrame(col = 0, row = 0, extraClass = '') {
  const x = -(Math.max(0, Math.min(7, col)) * 192)
  const y = -(Math.max(0, Math.min(8, row)) * 208)
  return `<g class="cat source-character ${extraClass}">
    <clipPath id="source-frame-clip"><rect width="192" height="208"/></clipPath>
    <g clip-path="url(#source-frame-clip)">
      <image href="${sourceAtlasData}" x="${x}" y="${y}" width="1536" height="1872" preserveAspectRatio="none"/>
    </g>
  </g>`
}

function standardCat({ frame = [0, 0] } = {}) {
  return sourceFrame(frame[0], frame[1])
}

function lyingCat({ sleeping = false } = {}) {
  return sourceFrame(sleeping ? 1 : 0, sleeping ? 1 : 2, 'lying-cat')
}

const states = {
  thinking: {
    cat: standardCat({ frame: [0, 0] }),
    front: `<g class="prop notebook"><rect x="116" y="119" width="46" height="58" rx="5" fill="${C.paper}" stroke="${C.line}" stroke-width="5" transform="rotate(7 139 148)"/><path d="M126 133 H151 M126 145 H149 M126 157 H144" stroke="${C.blueDark}" stroke-width="4" stroke-linecap="round"/></g>`,
    css: `.head{transform-origin:center;animation:ponder 2.6s ease-in-out infinite}.notebook{animation:note 2.6s ease-in-out infinite}@keyframes ponder{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(4deg)}}@keyframes note{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`,
  },
  planning: {
    behind: `<g class="prop board"><rect x="116" y="42" width="64" height="88" rx="7" fill="${C.paper}" stroke="${C.line}" stroke-width="6"/><path d="M128 62 H146 M128 83 H153 M128 104 H146" stroke="${C.blueDark}" stroke-width="5" stroke-linecap="round"/><path d="M158 61 L164 67 L174 54 M158 82 L164 88 L174 75 M158 103 L164 109 L174 96" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    cat: standardCat({ frame: [1, 0] }),
    css: `.arm-right{transform-origin:120px 116px;animation:point 1.8s ease-in-out infinite}@keyframes point{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(7deg)}}`,
  },
  working: {
    cat: standardCat({ frame: [4, 0] }),
    front: `<g class="prop laptop"><path d="M49 111 H143 V159 H49 Z" fill="#dff4fa" stroke="${C.line}" stroke-width="6"/><path d="M59 123 H93 M59 136 H126 M59 149 H112" stroke="${C.blueDark}" stroke-width="5" stroke-linecap="round"/><path d="M42 159 H150 L143 173 H49 Z" fill="#8ea3ae" stroke="${C.line}" stroke-width="6"/></g>`,
    css: `.arm-left{animation:typeL .48s ease-in-out infinite}.arm-right{animation:typeR .48s ease-in-out infinite}@keyframes typeL{50%{transform:translateY(4px)}}@keyframes typeR{50%{transform:translateY(-4px)}}`,
  },
  building: {
    behind: `<g class="accent blocks"><rect x="137" y="120" width="29" height="29" rx="4" fill="${C.blue}" stroke="${C.line}" stroke-width="5"/><rect x="119" y="149" width="29" height="29" rx="4" fill="${C.yellow}" stroke="${C.line}" stroke-width="5"/><rect x="151" y="151" width="27" height="27" rx="4" fill="${C.green}" stroke="${C.line}" stroke-width="5"/></g>`,
    cat: standardCat({ frame: [3, 0] }),
    front: `<g class="prop wrench"><path d="M119 105 L149 135" stroke="${C.line}" stroke-width="11" stroke-linecap="round"/><path d="M143 126 Q157 117 165 128 Q156 143 146 138" fill="${C.yellow}" stroke="${C.line}" stroke-width="5"/></g>`,
    css: `.wrench{transform-origin:120px 105px;animation:hammer 1s ease-in-out infinite}.blocks{animation:blocks 1.8s ease-in-out infinite}@keyframes hammer{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}@keyframes blocks{50%{transform:translateY(-4px)}}`,
  },
  debugging: {
    behind: `<g class="accent bug"><ellipse cx="42" cy="139" rx="12" ry="15" fill="${C.red}" stroke="${C.line}" stroke-width="5"/><path d="M42 126 V153 M30 135 L19 130 M30 146 L19 151 M54 135 L65 130 M54 146 L65 151" fill="none" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/></g>`,
    cat: standardCat({ frame: [2, 0] }),
    front: `<g class="prop glass"><circle cx="42" cy="139" r="27" fill="none" stroke="${C.line}" stroke-width="7"/><path d="M61 159 L78 177" stroke="${C.line}" stroke-width="11" stroke-linecap="round"/></g>`,
    css: `.glass{transform-origin:42px 139px;animation:inspect 1.7s ease-in-out infinite}.head{transform-origin:center;animation:inspectHead 1.7s ease-in-out infinite}@keyframes inspect{0%,100%{transform:translateX(-3px)}50%{transform:translateX(4px)}}@keyframes inspectHead{50%{transform:rotate(-5deg)}}`,
  },
  reviewing: {
    cat: standardCat({ frame: [4, 0] }),
    front: `<g class="prop clipboard"><rect x="70" y="116" width="57" height="68" rx="6" fill="${C.paper}" stroke="${C.line}" stroke-width="6"/><rect x="87" y="108" width="23" height="14" rx="4" fill="${C.yellow}" stroke="${C.line}" stroke-width="4"/><path d="M82 136 L88 142 L97 131 M103 139 H117 M82 157 L88 163 L97 152 M103 160 H117" fill="none" stroke="${C.green}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    css: `.clipboard{animation:review 2s ease-in-out infinite}@keyframes review{50%{transform:translateY(-4px) rotate(-2deg)}}`,
  },
  waiting: {
    behind: `<g class="prop clock"><circle cx="145" cy="78" r="29" fill="${C.paper}" stroke="${C.line}" stroke-width="6"/><path class="clock-hand" d="M145 60 V79 L158 88" fill="none" stroke="${C.blueDark}" stroke-width="5" stroke-linecap="round"/></g>`,
    cat: standardCat({ frame: [5, 0] }),
    css: `.clock-hand{transform-origin:145px 79px;animation:tick 2s steps(4) infinite}@keyframes tick{to{transform:rotate(360deg)}}`,
  },
  juggling: {
    cat: standardCat({ frame: [3, 0] }),
    css: `.cat{animation:dance .72s ease-in-out infinite}.tail{animation:danceTail .72s ease-in-out infinite}.arm-left{animation:armDanceL .72s ease-in-out infinite}.arm-right{animation:armDanceR .72s ease-in-out infinite}@keyframes dance{0%,100%{transform:translate(-5px,0) rotate(-4deg)}50%{transform:translate(5px,-5px) rotate(4deg)}}@keyframes danceTail{50%{transform:rotate(18deg)}}@keyframes armDanceL{50%{transform:rotate(-14deg)}}@keyframes armDanceR{50%{transform:rotate(14deg)}}`,
  },
  sweeping: {
    cat: standardCat({ frame: [4, 0] }),
    front: `<g class="prop broom"><path d="M57 85 L130 166" stroke="${C.line}" stroke-width="9" stroke-linecap="round"/><path d="M117 153 L155 177 L134 194 L101 169 Z" fill="${C.yellow}" stroke="${C.line}" stroke-width="6"/><path d="M121 166 L143 182 M113 173 L132 189" stroke="#d99b2f" stroke-width="4" stroke-linecap="round"/></g>`,
    css: `.broom{transform-origin:95px 137px;animation:sweep 1.25s ease-in-out infinite}.cat{animation:sweepBody 1.25s ease-in-out infinite}@keyframes sweep{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(8deg)}}@keyframes sweepBody{50%{transform:translateX(4px)}}`,
  },
  carrying: {
    cat: standardCat({ frame: [5, 0] }),
    front: `<g class="prop box"><rect x="61" y="126" width="72" height="50" rx="5" fill="#d9a665" stroke="${C.line}" stroke-width="6"/><path d="M61 143 H133 M97 126 V143" stroke="${C.line}" stroke-width="5"/><rect x="82" y="149" width="30" height="15" rx="3" fill="${C.paper}" stroke="${C.line}" stroke-width="3"/></g>`,
    css: `.cat{animation:carry 1s ease-in-out infinite}.box{animation:box 1s ease-in-out infinite}@keyframes carry{50%{transform:translateY(-4px)}}@keyframes box{50%{transform:translateY(-3px)}}`,
  },
  notification: {
    cat: standardCat({ frame: [0, 0] }),
    front: `<g class="prop bell"><path d="M133 80 Q133 57 151 52 Q169 57 169 80 L178 94 H124 Z" fill="${C.yellow}" stroke="${C.line}" stroke-width="6"/><path d="M143 99 Q151 108 159 99" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/></g>`,
    css: `.bell{transform-origin:151px 54px;animation:ring .75s ease-in-out infinite}@keyframes ring{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}`,
  },
  attention: {
    cat: standardCat({ frame: [1, 0] }),
    front: `<g class="prop done"><rect x="126" y="47" width="52" height="45" rx="7" fill="${C.paper}" stroke="${C.line}" stroke-width="6"/><path d="M139 68 L149 78 L166 57" fill="none" stroke="${C.green}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    css: `.done{transform-origin:center;animation:done 1.4s ease-in-out infinite}@keyframes done{50%{transform:translateY(-5px) rotate(3deg)}}`,
  },
  happy: {
    cat: standardCat({ frame: [2, 0] }),
    front: `<g class="accent sparkles" fill="${C.yellow}" stroke="${C.line}" stroke-width="3"><path d="M42 51 L47 62 L58 67 L47 72 L42 84 L37 72 L26 67 L37 62 Z"/><path d="M151 43 L156 54 L167 59 L156 64 L151 76 L146 64 L135 59 L146 54 Z"/></g>`,
    css: `.cat{animation:jump .85s ease-in-out infinite}.sparkles{animation:spark .85s ease-in-out infinite}@keyframes jump{0%,100%{transform:translateY(4px)}50%{transform:translateY(-14px)}}@keyframes spark{50%{transform:scale(1.12)}}`,
  },
  error: {
    cat: standardCat({ frame: [2, 0] }),
    front: `<g class="prop error-panel"><path d="M49 113 H143 V160 H49 Z" fill="#fff0f0" stroke="${C.line}" stroke-width="6"/><path d="M63 126 L78 146 M78 126 L63 146 M91 130 H129 M91 144 H120" fill="none" stroke="${C.red}" stroke-width="6" stroke-linecap="round"/><path d="M42 160 H150 L143 174 H49 Z" fill="#9ba8b0" stroke="${C.line}" stroke-width="6"/></g>`,
    css: `.error-panel{animation:errorShake .5s ease-in-out infinite}.head{animation:headDrop 1.7s ease-in-out infinite}@keyframes errorShake{0%,100%{transform:translateX(-2px)}50%{transform:translateX(2px)}}@keyframes headDrop{50%{transform:translateY(4px) rotate(-3deg)}}`,
  },
  yawning: {
    cat: standardCat({ frame: [0, 5] }),
    css: `.head{transform-origin:center;animation:yawn 3s ease-in-out infinite}.arm-left{animation:cover 3s ease-in-out infinite}@keyframes yawn{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}@keyframes cover{50%{transform:translateY(-4px)}}`,
  },
  dozing: {
    cat: standardCat({ frame: [1, 6] }),
    css: `.head{transform-origin:center bottom;animation:doze 3s ease-in-out infinite}@keyframes doze{0%,100%{transform:rotate(-2deg) translateY(0)}60%{transform:rotate(12deg) translateY(7px)}}`,
  },
  collapsing: {
    behind: `<ellipse cx="105" cy="174" rx="67" ry="18" fill="${C.pink}" stroke="${C.line}" stroke-width="6"/>`,
    cat: lyingCat({ sleeping: false }),
    css: `.lying-cat{transform-origin:center bottom;animation:collapse 2.6s ease-in-out infinite}@keyframes collapse{0%{transform:translateY(-18px) rotate(-10deg)}45%,85%{transform:translateY(0) rotate(5deg)}100%{transform:translateY(-18px) rotate(-10deg)}}`,
  },
  sleeping: {
    behind: `<ellipse cx="105" cy="174" rx="67" ry="18" fill="#e8b4c8" stroke="${C.line}" stroke-width="6"/>`,
    cat: lyingCat({ sleeping: true }),
    front: `<path class="prop blanket" d="M37 130 Q71 111 113 122 Q145 126 166 151 L157 180 Q104 190 48 172 Z" fill="${C.pink}" stroke="${C.line}" stroke-width="6"/><path d="M55 148 Q88 134 124 144 M89 171 Q119 157 151 163" fill="none" stroke="#cf839f" stroke-width="5" stroke-linecap="round"/>`,
    css: `.cat,.blanket{transform-origin:center bottom;animation:sleep 3.2s ease-in-out infinite}@keyframes sleep{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(2px) scale(1.015)}}`,
  },
  waking: {
    cat: standardCat({ frame: [2, 5] }),
    css: `.cat{transform-origin:center bottom;animation:wake 2s ease-in-out infinite}.arm-left,.arm-right{animation:stretch 2s ease-in-out infinite}@keyframes wake{0%,100%{transform:translateY(5px) scaleY(.96)}50%{transform:translateY(-5px) scaleY(1.04)}}@keyframes stretch{50%{transform:translateY(-7px)}}`,
  },
}

function makeSvg(name, spec) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208" role="img" aria-label="月薪喵 ${name}">
  <title>月薪喵 ${name}</title>
  <desc>CCM 月薪喵业务动作 SVG：保留来源角色帧，并独立绘制业务场景和动画。</desc>
  <style>${commonCss}${spec.css || ''}</style>
  ${spec.behind || ''}
  ${spec.cat}
  ${spec.front || ''}
</svg>\n`
}

const sourceText = `月薪喵 yuexinmiao1 source attribution\n\nCreator: kiffin\nSource: https://codex-pet.org/zh/pets/yuexinmiao1/\nPackage endpoint: https://codex-pet.org/api/pets/yuexinmiao1/files/spritesheet.webp\nImported for local CCM use on 2026-07-19.\nThe source package did not include an explicit license. Do not redistribute it until permission is confirmed.\nCCM business-state SVG animations preserve the exact source character by embedding selected atlas frames and add independently drawn business props and motion.\n`

for (const target of targets) {
  fs.mkdirSync(target, { recursive: true })
  const atlasPath = path.join(target, 'spritesheet.webp')
  if (!fs.existsSync(atlasPath)) throw new Error(`Missing source atlas: ${atlasPath}`)
  for (const [name, spec] of Object.entries(states)) {
    fs.writeFileSync(path.join(target, `${name}.svg`), makeSvg(name, spec), 'utf8')
  }
  fs.writeFileSync(path.join(target, 'SOURCE.txt'), sourceText, 'utf8')
  fs.writeFileSync(path.join(target, 'pet.json'), JSON.stringify({
    id: 'yuexinmiao1',
    displayName: '月薪喵',
    description: "The source Yuexin Miao character with CCM-specific SVG action compositions.",
    spritesheetPath: 'spritesheet.webp',
    spriteVersionNumber: 2,
    spriteRows: 9,
    sourceCreator: 'kiffin',
    sourceUrl: 'https://codex-pet.org/zh/pets/yuexinmiao1/',
  }, null, 2), 'utf8')
}

const sourceAtlas = path.join(root, 'frontend/public/pets/yuexinmiao1/spritesheet.webp')
const baseAtlas = `data:image/webp;base64,${fs.readFileSync(sourceAtlas).toString('base64')}`
const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208"><clipPath id="c"><rect width="192" height="208"/></clipPath><g clip-path="url(#c)"><image href="${baseAtlas}" x="0" y="0" width="1536" height="1872" preserveAspectRatio="none"/></g></svg>\n`
fs.writeFileSync(path.join(root, 'ccm-package/public/pets/yuexinmiao.svg'), baseSvg, 'utf8')
fs.writeFileSync(path.join(root, 'ccm-package/pet/assets/yuexinmiao.svg'), baseSvg, 'utf8')
fs.writeFileSync(path.join(root, 'frontend/public/pets/yuexinmiao.svg'), baseSvg, 'utf8')

console.log(JSON.stringify({ success: true, states: Object.keys(states).length, targets: targets.length, sourceFaithfulSvgComposition: true }, null, 2))
