import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { LOCAL_MUSIC_QUOTES, pickLocalMusicQuote } = await import('../frontend/src/utils/musicQuoteLibrary.js')

assert.ok(LOCAL_MUSIC_QUOTES.length >= 16, 'local quote library should provide useful variety')
assert.equal(pickLocalMusicQuote('', () => 0), LOCAL_MUSIC_QUOTES[0], 'local quote selection should be deterministic with an injected random source')
assert.notEqual(pickLocalMusicQuote(LOCAL_MUSIC_QUOTES[0], () => 0), LOCAL_MUSIC_QUOTES[0], 'refresh should avoid immediately repeating the same quote')

const atmosphereSource = readFileSync(path.join(root, 'frontend/src/composables/useMusicAtmosphere.js'), 'utf8')
const templateSource = readFileSync(path.join(root, 'frontend/src/components/music/MusicPlayer.template.html'), 'utf8')
const localBranchIndex = atmosphereSource.indexOf('if (!aiSongQuoteEnabled.value)')
const quoteFetchIndex = atmosphereSource.indexOf("fetch('/api/music/song-quote'")

assert.ok(localBranchIndex >= 0 && quoteFetchIndex > localBranchIndex, 'local mode must return before the model quote request')
assert.match(atmosphereSource, /aura_ai_song_quote_enabled/, 'quote mode should persist locally')
assert.match(atmosphereSource, /requestId !== songQuoteRequestId/, 'stale quote responses should not overwrite the current track')
assert.match(templateSource, /role="switch"/, 'quote mode should use a proper binary switch')
assert.match(templateSource, /随机换一句本地文案/, 'local refresh behavior should be explicit')
assert.match(templateSource, /重新生成文案/, 'AI refresh behavior should be explicit')

console.log(JSON.stringify({
  success: true,
  checks: 9,
  localQuotes: LOCAL_MUSIC_QUOTES.length,
  paidProviderCalls: 0,
}, null, 2))
