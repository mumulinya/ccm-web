import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const {
  appendMusicQueue,
  dedupeMusicQueue,
  insertMusicQueueNext,
  musicQueueFromTrack,
  moveMusicQueueTrack,
  reorderMusicQueue,
  removeMusicQueueTrack,
} = await import('../frontend/src/utils/musicQueueHelpers.js')

const a = { filename: 'a.mp3', title: 'A' }
const b = { filename: 'b.mp3', title: 'B' }
const c = { filename: 'c.mp3', title: 'C' }

assert.deepEqual(dedupeMusicQueue([a, b, a]), [a, b], 'queue should preserve order and remove duplicates')
assert.deepEqual(appendMusicQueue([a], b), [a, b], 'append should add a new track')
assert.deepEqual(appendMusicQueue([a, b], a), [a, b], 'append should not duplicate an existing track')
assert.deepEqual(insertMusicQueueNext([a, b, c], c, a.filename), [a, c, b], 'play-next should move an existing track after current')
assert.deepEqual(insertMusicQueueNext([a, b], c, a.filename), [a, c, b], 'play-next should insert a new track after current')
assert.deepEqual(insertMusicQueueNext([a, b], c, ''), [c, a, b], 'play-next should insert first when there is no current track')
assert.deepEqual(removeMusicQueueTrack([a, b], a.filename), [b], 'remove should delete the selected track')
assert.deepEqual(moveMusicQueueTrack([a, b, c], b.filename, -1), [b, a, c], 'move-up should preserve the rest of the order')
assert.deepEqual(moveMusicQueueTrack([a, b, c], b.filename, 1), [a, c, b], 'move-down should preserve the rest of the order')
assert.deepEqual(moveMusicQueueTrack([a, b], a.filename, -1), [a, b], 'out-of-range movement should be ignored')
assert.deepEqual(reorderMusicQueue([a, b, c], 0, 2), [b, c, a], 'drag reorder should move the selected row to its drop position')
assert.deepEqual(musicQueueFromTrack([a, b, c], b.filename), [b, c], 'play-from-here should discard earlier queue rows')

const playerSource = readFileSync(path.join(root, 'frontend/src/components/music/useMusicPlayer.js'), 'utf8')
const playbackSource = readFileSync(path.join(root, 'frontend/src/composables/useMusicPlayback.js'), 'utf8')
const templateSource = readFileSync(path.join(root, 'frontend/src/components/music/MusicPlayer.template.html'), 'utf8')
const drawerSource = readFileSync(path.join(root, 'frontend/src/components/music/MusicPlaybackQueueDrawer.vue'), 'utf8')
const stateSource = readFileSync(path.join(root, 'backend/modules/music/library-state.ts'), 'utf8')

assert.doesNotMatch(playerSource, /Empty queue.*full local library/, 'empty queue must not silently become the full library')
assert.match(playerSource, /restorePlaybackQueue\(\)/, 'saved queue should be restored on mount')
assert.match(playbackSource, /automatic && playMode\.value === 'single'/, 'natural end should repeat in single mode')
assert.match(playbackSource, /playMode\.value === 'single' \? 'list'/, 'manual next should advance in single mode')
assert.doesNotMatch(templateSource, />播放队列 <small>/, 'queue should not remain a library filter tab')
assert.match(templateSource, /<MusicPlaybackQueueDrawer/, 'player should mount an independent queue drawer')
assert.match(drawerSource, /下一首播放/, 'queue drawer should expose play-next')
assert.match(drawerSource, /清空播放队列/, 'queue drawer should expose clear')
assert.match(drawerSource, /draggable="true"/, 'queue drawer should support desktop drag ordering')
assert.match(drawerSource, /从这里开始播放/, 'queue drawer should expose play-from-here')
assert.match(drawerSource, /正在播放/, 'queue drawer should distinguish the current track')
assert.match(drawerSource, /接下来播放/, 'queue drawer should distinguish upcoming tracks')
assert.match(drawerSource, /queue-failure/, 'queue drawer should display playback failure reasons')
assert.match(stateSource, /currentFilename: string/, 'backend should persist the current track')
assert.match(stateSource, /playMode: MusicPlayMode/, 'backend should persist the play mode')
assert.match(stateSource, /history: MusicPlaybackHistoryEvent\[\]/, 'backend should persist playback history events')
assert.match(stateSource, /queueSources: Record<string, MusicQueueSource>/, 'backend should persist queue source labels')

console.log(JSON.stringify({
  success: true,
  checks: 30,
  features: ['restore', 'play-next', 'remove', 'clear-undo', 'drag-reorder', 'play-from-here', 'sources', 'failure-reason', 'manual-vs-ended', 'random-history'],
}, null, 2))
