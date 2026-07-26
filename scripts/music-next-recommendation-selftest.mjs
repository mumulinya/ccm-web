import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { selectNextPlaybackTrack } = await import('../frontend/src/utils/musicTrackHelpers.js')

const tracks = [
  { filename: 'a.mp3', title: 'A' },
  { filename: 'b.mp3', title: 'B' },
  { filename: 'c.mp3', title: 'C' },
]

assert.equal(selectNextPlaybackTrack(tracks, {
  currentIndex: 0,
  currentTrack: tracks[0],
  playMode: 'list',
}), tracks[1], 'list mode should show the following queue item')

assert.equal(selectNextPlaybackTrack(tracks, {
  currentIndex: 2,
  currentTrack: tracks[2],
  playMode: 'list',
}), tracks[0], 'list mode should wrap at the end')

assert.equal(selectNextPlaybackTrack(tracks, {
  currentIndex: -1,
  currentTrack: null,
  playMode: 'list',
}), tracks[0], 'a list with no active track should start from the first item')

assert.equal(selectNextPlaybackTrack(tracks, {
  currentIndex: 1,
  currentTrack: tracks[1],
  playMode: 'single',
}), tracks[1], 'single mode should show the current track')

let excludedTrack = null
assert.equal(selectNextPlaybackTrack(tracks, {
  currentIndex: 0,
  currentTrack: tracks[0],
  playMode: 'random',
  randomPicker: (_list, options) => {
    excludedTrack = options.excludeTrack
    return tracks[2]
  },
}), tracks[2], 'random mode should expose the preselected random candidate')
assert.equal(excludedTrack, tracks[0], 'random mode should exclude the current track when possible')

assert.equal(selectNextPlaybackTrack([tracks[0]], {
  currentIndex: 0,
  currentTrack: tracks[0],
  playMode: 'random',
}), tracks[0], 'a one-track random queue should remain playable')

const playbackSource = readFileSync(path.join(root, 'frontend/src/composables/useMusicPlayback.js'), 'utf8')
const atmosphereSource = readFileSync(path.join(root, 'frontend/src/composables/useMusicAtmosphere.js'), 'utf8')
const templateSource = readFileSync(path.join(root, 'frontend/src/components/music/MusicPlayer.template.html'), 'utf8')

assert.match(playbackSource, /nextRecommendTrack\?\.value/, 'actual next action should consume the displayed candidate')
assert.match(atmosphereSource, /selectNextPlaybackTrack/, 'recommendation should use the shared mode resolver')
assert.match(templateSource, /随机下一首/, 'random mode should be labeled accurately')
assert.match(templateSource, /单曲循环/, 'single mode should be labeled accurately')

console.log(JSON.stringify({
  success: true,
  checks: 11,
  modes: ['list', 'random', 'single'],
}, null, 2))
