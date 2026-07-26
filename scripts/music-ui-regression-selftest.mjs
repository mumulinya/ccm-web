import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const template = read('frontend/src/components/music/MusicPlayer.template.html')
const panel = read('frontend/src/components/music/MusicPlayerPanel.vue')
const player = read('frontend/src/components/music/useMusicPlayer.js')
const chat = read('frontend/src/composables/useMusicAgentChat.js')
const css = read('frontend/src/components/music/MusicPlayer.css')
const atmosphereCss = read('frontend/src/components/music/MusicPlayerAtmosphere.css')

assert.match(template, />\s*网易\s*<\/button>/, 'music source switch should display 网易')
assert.doesNotMatch(template, /网易云/, 'music player template should not display 网易云')
assert.match(css, /\.switch-glass-container\.triple \.switch-btn[\s\S]*?white-space:\s*nowrap;[\s\S]*?word-break:\s*keep-all;/, 'music source labels must stay on one line')
assert.match(atmosphereCss, /\.aura-player \.header-switch-section\s*\{[^}]*min-width:\s*154px;/, 'desktop source switch should retain enough width for three labels')
assert.match(atmosphereCss, /@media \(max-width:\s*760px\)[\s\S]*?\.aura-player \.header-switch-section\s*\{[^}]*min-width:\s*142px;/, 'mobile source switch should retain enough width for three labels')

assert.match(player, /streaming:\s*true/, 'model response should own one streaming message')
assert.match(chat, /hasStreamingAgentMessage/, 'chat state should expose the active streaming response')
assert.match(panel, /agentLoading\.value\s*&&\s*!hasStreamingAgentMessage\.value/, 'standalone loading row must be hidden while the streaming response is visible')
assert.match(template, /v-if="showStandaloneAgentLoading"/, 'template should use the deduplicated loading state')
assert.doesNotMatch(template, /v-if="agentLoading"\s+class="aura-chat-row agent"/, 'template must not render a second unconditional agent loading row')

assert.match(css, /\.floating-bubble\s*\{[\s\S]*?left:\s*100%;[\s\S]*?right:\s*auto;/, 'comment bubble should start beyond the right edge')
assert.match(css, /@keyframes bubble-slide-left[\s\S]*?100%\s*\{[\s\S]*?left:\s*0;[\s\S]*?translate3d\(-100%,\s*-2px,\s*0\)/, 'comment bubble should finish fully beyond the left edge')

console.log(JSON.stringify({
  pass: true,
  checks: [
    'netease label',
    'single-line source switch',
    'single streaming reply frame',
    'empty message suppression',
    'full-width floating comment animation',
  ],
}, null, 2))
