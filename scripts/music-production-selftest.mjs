import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runMusicSearchResultSelfTest, signSearchResults } = require('../ccm-package/dist/modules/music/search-results.js')
const baseUrl = (process.env.CCM_MUSIC_URL || 'http://127.0.0.1:3082').replace(/\/$/, '')
const authCookie = String(process.env.CCM_AUTH_COOKIE || '').trim()
const unique = `ccm-music-test-${Date.now()}`
const filename = `${unique}.wav`
let playlistId = ''

function makeWav() {
  const pcm = Buffer.alloc(2048)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22)
  header.writeUInt32LE(8000, 24); header.writeUInt32LE(16000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

async function json(url, init) {
  const response = await fetch(`${baseUrl}${url}`, { ...(init || {}), headers: { ...(init?.headers || {}), ...(authCookie ? { Cookie: authCookie } : {}) } })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

async function assert(condition, message) { if (!condition) throw new Error(message) }

try {
  const unit = runMusicSearchResultSelfTest()
  await assert(unit.ok, 'search result signing self-test failed')

  const health = await fetch(`${baseUrl}/api/music/list`, { headers: authCookie ? { Cookie: authCookie } : {} })
  await assert(health.ok, `music API unavailable at ${baseUrl}`)

  const exactSearch = await json('/api/music/search-netease?q=' + encodeURIComponent('晴天 周杰伦'))
  const exactFirst = exactSearch.data.results?.[0]
  await assert(exactFirst?.title === '晴天' && exactFirst?.artist === '周杰伦' && exactFirst?.downloadToken, 'exact Netease title/artist result was not ranked and signed first')

  const lifecycleResult = signSearchResults('netease', unique, [{ songId: `test-${Date.now()}`, title: unique, artist: 'CCM Test' }], 1)[0]
  const createdJob = await json('/api/music/download-jobs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'netease', downloadToken: lifecycleResult.downloadToken })
  })
  const lifecycleJobId = createdJob.data.job?.id
  await assert(createdJob.response.status === 202 && lifecycleJobId, 'signed result did not create a download job')
  const cancelledJob = await json(`/api/music/download-jobs/${encodeURIComponent(lifecycleJobId)}/cancel`, { method: 'POST' })
  await assert(cancelledJob.data.job?.status === 'cancelled', 'download job cancellation failed')
  let lifecycleCleared = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const cleared = await json(`/api/music/download-jobs/${encodeURIComponent(lifecycleJobId)}`, { method: 'DELETE' })
    lifecycleCleared = cleared.data.success === true
    if (lifecycleCleared) break
  }
  await assert(lifecycleCleared, 'cancelled download job did not finish cleanup')

  const invalidToken = await json('/api/music/download-jobs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'netease', downloadToken: 'forged.token' })
  })
  await assert(invalidToken.response.status === 400 && invalidToken.data.success === false, 'forged download token was accepted')

  const invalidForm = new FormData()
  invalidForm.append('file', new Blob(['not audio']), `${unique}-invalid.mp3`)
  const invalidUpload = await json('/api/music/upload', { method: 'POST', body: invalidForm })
  await assert(invalidUpload.response.status === 400, 'invalid audio upload was accepted')

  const form = new FormData()
  form.append('file', new Blob([makeWav()], { type: 'audio/wav' }), filename)
  const upload = await json('/api/music/upload', { method: 'POST', body: form })
  await assert(upload.data.success && upload.data.uploaded.includes(filename), 'valid WAV upload failed')

  const partial = await fetch(`${baseUrl}/api/music/stream?file=${encodeURIComponent(filename)}`, { headers: { Range: 'bytes=0-9', ...(authCookie ? { Cookie: authCookie } : {}) } })
  await assert(partial.status === 206 && (await partial.arrayBuffer()).byteLength === 10, 'valid byte range failed')
  const invalidRange = await fetch(`${baseUrl}/api/music/stream?file=${encodeURIComponent(filename)}`, { headers: { Range: 'bytes=999999-', ...(authCookie ? { Cookie: authCookie } : {}) } })
  await assert(invalidRange.status === 416 && invalidRange.headers.get('content-range')?.startsWith('bytes */'), 'invalid byte range did not return 416')

  const favorite = await json('/api/music/library-state/favorite', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, favorite: true })
  })
  await assert(favorite.data.state?.favorites?.includes(filename), 'favorite was not persisted')

  const queue = await json('/api/music/library-state/queue', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tracks: [filename] })
  })
  await assert(queue.data.state?.queue?.[0] === filename, 'playback queue was not persisted')

  const created = await json('/api/music/library-state/playlists', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: unique })
  })
  playlistId = created.data.state?.playlists?.find(item => item.name === unique)?.id || ''
  await assert(playlistId, 'playlist was not created')
  const updated = await json(`/api/music/library-state/playlists/${encodeURIComponent(playlistId)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tracks: [filename] })
  })
  await assert(updated.data.state.playlists.find(item => item.id === playlistId)?.tracks?.includes(filename), 'playlist track was not persisted')

  await json(`/api/music/library-state/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' })
  playlistId = ''
  const deleted = await json('/api/music/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename })
  })
  await assert(deleted.data.success, 'test audio cleanup failed')

  console.log(JSON.stringify({ pass: true, baseUrl, checks: ['real-exact-netease-search', 'download-create-cancel-cleanup', 'ranking-and-signature', 'forged-token-rejection', 'upload-magic', 'range-206-416', 'favorites', 'queue', 'playlists'] }, null, 2))
} catch (error) {
  try {
    if (playlistId) await json(`/api/music/library-state/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' })
    await json('/api/music/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) })
  } catch {}
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
}
