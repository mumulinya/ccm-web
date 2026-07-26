import { computed, ref } from 'vue'

const emptyState = () => ({
  version: 3,
  favorites: [],
  playlists: [],
  queue: [],
  queueSources: {},
  currentFilename: '',
  playMode: 'list',
  history: [],
})

export function useMusicLibraryState() {
  const libraryState = ref(emptyState())
  const libraryStateLoading = ref(false)
  const activeLibraryView = ref('all')

  const favoriteSet = computed(() => new Set(libraryState.value.favorites || []))
  const isFavorite = (filename) => favoriteSet.value.has(filename)

  const request = async (url, options = {}) => {
    const res = await fetch(url, options)
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '音乐库操作失败')
    if (data.state) libraryState.value = data.state
    return data
  }

  const loadLibraryState = async () => {
    libraryStateLoading.value = true
    try { await request('/api/music/library-state') }
    finally { libraryStateLoading.value = false }
  }

  const toggleFavorite = (track) => request('/api/music/library-state/favorite', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: track.filename, favorite: !isFavorite(track.filename) })
  })

  const createPlaylist = (name) => request('/api/music/library-state/playlists', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  })

  const updatePlaylist = (id, updates) => request(`/api/music/library-state/playlists/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
  })

  const deletePlaylist = (id) => request(`/api/music/library-state/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' })

  const setPlaybackQueue = (tracks, options = {}) => request('/api/music/library-state/queue', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracks: tracks.map(track => track.filename || track),
      currentFilename: options.currentFilename,
      playMode: options.playMode,
      queueSources: options.queueSources,
    })
  })

  const recordPlaybackHistory = (track, source = '播放器') => request('/api/music/library-state/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: track?.filename || track, source }),
  })

  const clearPlaybackHistory = () => request('/api/music/library-state/history', { method: 'DELETE' })

  return {
    libraryState,
    libraryStateLoading,
    activeLibraryView,
    favoriteSet,
    isFavorite,
    loadLibraryState,
    toggleFavorite,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    setPlaybackQueue,
    recordPlaybackHistory,
    clearPlaybackHistory,
  }
}
