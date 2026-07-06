import { formatTrackLabel, toPetTrack } from '../utils/musicTrackHelpers.js'

export function useMusicPetNotifications(options = {}) {
  const currentTrack = options.currentTrack || { value: null }
  let speechQueue = Promise.resolve()

  const resolveTrack = (track) => track || currentTrack.value

  const notifyMusicPet = (state, detail = '', track = currentTrack.value) => {
    const targetTrack = resolveTrack(track)
    fetch('/api/music/pet-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        detail: detail || formatTrackLabel(targetTrack),
        track: toPetTrack(targetTrack)
      })
    }).catch(() => {})
  }

  const notifyMusicPetSpeech = (text, options = {}) => {
    const content = String(text || '')
    if (!content.trim() && !options.final) return
    speechQueue = speechQueue.catch(() => {}).then(() => fetch('/api/music/pet-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: options.role || 'assistant',
        text: content,
        mode: options.mode || 'replace',
        final: !!options.final,
        source: options.source || 'music'
      })
    }).catch(() => {}))
    return speechQueue
  }

  const notifyMusicPetPlaying = (track = currentTrack.value) => {
    const targetTrack = resolveTrack(track)
    notifyMusicPet('juggling', `正在播放：${formatTrackLabel(targetTrack)}`, targetTrack)
  }

  const notifyMusicPetIdle = (detail = '音乐播放器待命', track = currentTrack.value) => {
    notifyMusicPet('idle', detail, resolveTrack(track))
  }

  return {
    notifyMusicPet,
    notifyMusicPetSpeech,
    notifyMusicPetPlaying,
    notifyMusicPetIdle,
  }
}
