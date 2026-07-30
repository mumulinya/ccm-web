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
  let loadGeneration = 0
  let loadController = null

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
    const generation = ++loadGeneration
    loadController?.abort()
    loadController = new AbortController()
    libraryStateLoading.value = true
    try {
      const res = await fetch('/api/music/library-state', { signal: loadController.signal })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '音乐库操作失败')
      if (generation === loadGeneration && data.state) libraryState.value = data.state
    } catch (error) {
      if (error?.name !== 'AbortError') throw error
    } finally {
      if (generation === loadGeneration) libraryStateLoading.value = false
    }
  }

  const toggleFavorite = (track) => request('/api/music/library-state/favorite', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: track.filename, favorite: !isFavorite(track.filename), expected_revision: libraryState.value.revision })
  })

  const createPlaylist = (name) => request('/api/music/library-state/playlists', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, expected_revision: libraryState.value.revision })
  })

  const updatePlaylist = (id, updates) => request(`/api/music/library-state/playlists/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...updates, expected_revision: libraryState.value.revision })
  })

  const deletePlaylist = (id) => request(`/api/music/library-state/playlists/${encodeURIComponent(id)}?expected_revision=${libraryState.value.revision}`, { method: 'DELETE' })

  const setPlaybackQueue = (tracks, options = {}) => request('/api/music/library-state/queue', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracks: tracks.map(track => track.filename || track),
      currentFilename: options.currentFilename,
      playMode: options.playMode,
      queueSources: options.queueSources,
      expected_revision: libraryState.value.revision,
    })
  })

  const recordPlaybackHistory = (track, source = '播放器') => request('/api/music/library-state/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: track?.filename || track, source, expected_revision: libraryState.value.revision }),
  })

  const clearPlaybackHistory = () => request(`/api/music/library-state/history?expected_revision=${libraryState.value.revision}`, { method: 'DELETE' })

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
