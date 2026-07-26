const trackId = (track) => String(track?.filename || track || '').trim()

export function dedupeMusicQueue(tracks = []) {
  const seen = new Set()
  return tracks.filter((track) => {
    const id = trackId(track)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function appendMusicQueue(queue = [], track) {
  return dedupeMusicQueue([...queue, track])
}

export function insertMusicQueueNext(queue = [], track, currentFilename = '') {
  const id = trackId(track)
  if (!id) return dedupeMusicQueue(queue)
  const withoutTrack = dedupeMusicQueue(queue).filter(item => trackId(item) !== id)
  const currentIndex = withoutTrack.findIndex(item => trackId(item) === currentFilename)
  const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0
  return [...withoutTrack.slice(0, insertAt), track, ...withoutTrack.slice(insertAt)]
}

export function removeMusicQueueTrack(queue = [], filename = '') {
  return dedupeMusicQueue(queue).filter(track => trackId(track) !== filename)
}

export function moveMusicQueueTrack(queue = [], filename = '', direction = 0) {
  const next = dedupeMusicQueue(queue)
  const index = next.findIndex(track => trackId(track) === filename)
  const target = index + Number(direction || 0)
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function reorderMusicQueue(queue = [], fromIndex = -1, toIndex = -1) {
  const next = dedupeMusicQueue(queue)
  const from = Number(fromIndex)
  const to = Number(toIndex)
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= next.length || to >= next.length || from === to) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function musicQueueFromTrack(queue = [], filename = '') {
  const next = dedupeMusicQueue(queue)
  const index = next.findIndex(track => trackId(track) === filename)
  return index < 0 ? next : next.slice(index)
}
