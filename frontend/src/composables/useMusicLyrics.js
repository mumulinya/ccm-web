import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useMusicLyrics(options = {}) {
  const currentTime = options.currentTime || { value: 0 }
  const isPlaying = options.isPlaying || { value: false }
  const notifyMusicPetSpeech = options.notifyMusicPetSpeech || (() => {})
  const currentTrack = options.currentTrack || { value: null }

  const lyrics = ref([])
  const currentLyricIndex = ref(-1)
  const compactViewport = ref(false)
  const lyricTimingOffsetMs = ref(0)
  const showLyricTranslation = ref(true)
  let lastPetLyricIndex = -1
  let compactViewportQuery = null
  let lyricsLoadGeneration = 0
  let lyricsLoadController = null

  const updateViewportMetrics = () => {
    compactViewport.value = compactViewportQuery?.matches === true
  }

  const lyricsOffset = computed(() => {
    const lineH = compactViewport.value ? 30 : 38
    const wrapH = compactViewport.value ? 112 : 190
    if (currentLyricIndex.value < 0) return 0
    return (wrapH / 2) - (currentLyricIndex.value * lineH) - (lineH / 2)
  })

  const effectiveLyricTime = computed(() => Math.max(0, Number(currentTime.value || 0) + lyricTimingOffsetMs.value / 1000))
  const currentWordIndex = computed(() => {
    const words = lyrics.value[currentLyricIndex.value]?.words || []
    let index = -1
    for (let i = 0; i < words.length; i++) {
      if (effectiveLyricTime.value >= Number(words[i].start || 0)) index = i
      else break
    }
    return index
  })

  const loadOffsetMap = () => {
    try { return JSON.parse(localStorage.getItem('aura_lyric_timing_offsets_v1') || '{}') || {} }
    catch { return {} }
  }

  const persistLyricOffset = () => {
    const filename = currentTrack.value?.filename
    if (!filename) return
    const map = loadOffsetMap()
    if (lyricTimingOffsetMs.value) map[filename] = lyricTimingOffsetMs.value
    else delete map[filename]
    localStorage.setItem('aura_lyric_timing_offsets_v1', JSON.stringify(map))
  }

  const adjustLyricTiming = (deltaMs) => {
    lyricTimingOffsetMs.value = Math.max(-5000, Math.min(5000, lyricTimingOffsetMs.value + Number(deltaMs || 0)))
    persistLyricOffset()
    updateCurrentLyrics()
  }

  const resetLyricTiming = () => {
    lyricTimingOffsetMs.value = 0
    persistLyricOffset()
    updateCurrentLyrics()
  }

  onMounted(() => {
    compactViewportQuery = window.matchMedia('(max-width: 760px)')
    updateViewportMetrics()
    compactViewportQuery.addEventListener?.('change', updateViewportMetrics)
  })

  onUnmounted(() => compactViewportQuery?.removeEventListener?.('change', updateViewportMetrics))

  const resetPetLyricIndex = () => {
    lastPetLyricIndex = -1
  }

  const resetLyrics = () => {
    lyrics.value = []
    currentLyricIndex.value = -1
    resetPetLyricIndex()
  }

  const getLyricsTrackKey = (track) => {
    if (!track) return ''
    const filename = String(track.filename || '').trim()
    if (filename) return `filename:${filename}`
    const bvid = String(track.bvid || '').trim()
    const title = String(track.title || '').trim()
    const artist = String(track.artist || track.author || '').trim()
    if (!bvid && !title && !artist) return ''
    return [bvid, title, artist].join('|')
  }

  const invalidateLyricsRequest = () => {
    lyricsLoadGeneration += 1
    lyricsLoadController?.abort()
    lyricsLoadController = null
  }

  const isLyricsRequestCurrent = (generation, controller, trackKey) => (
    generation === lyricsLoadGeneration
    && controller === lyricsLoadController
    && getLyricsTrackKey(currentTrack.value) === trackKey
  )

  const updateCurrentLyrics = () => {
    if (lyrics.value.length === 0) return
    let activeIdx = -1
    for (let i = 0; i < lyrics.value.length; i++) {
      if (effectiveLyricTime.value >= lyrics.value[i].time) {
        activeIdx = i
      } else {
        break
      }
    }
    currentLyricIndex.value = activeIdx
    if (isPlaying.value && activeIdx >= 0 && activeIdx !== lastPetLyricIndex) {
      const lyricText = lyrics.value[activeIdx]?.text?.trim()
      if (lyricText) {
        lastPetLyricIndex = activeIdx
        notifyMusicPetSpeech(lyricText, { role: 'assistant', mode: 'replace', source: 'music-lyrics' })
      }
    }
  }

  const loadLyrics = async (track) => {
    if (!track) {
      invalidateLyricsRequest()
      resetLyrics()
      return
    }

    const trackKey = getLyricsTrackKey(track)
    if (!trackKey) {
      invalidateLyricsRequest()
      resetLyrics()
      return
    }

    invalidateLyricsRequest()
    const generation = lyricsLoadGeneration
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    lyricsLoadController = controller
    try {
      lyricTimingOffsetMs.value = Number(loadOffsetMap()[track.filename] || 0)
      const res = await fetch(`/api/music/lyric?filename=${encodeURIComponent(track.filename || '')}&bvid=${encodeURIComponent(track.bvid || '')}&title=${encodeURIComponent(track.title || '')}`, {
        ...(controller ? { signal: controller.signal } : {}),
      })
      if (!isLyricsRequestCurrent(generation, controller, trackKey)) return
      const data = await res.json()
      if (!isLyricsRequestCurrent(generation, controller, trackKey)) return
      if (data.success && data.lyrics) {
        lyrics.value = data.lyrics
      } else {
        lyrics.value = []
      }
      if (!isLyricsRequestCurrent(generation, controller, trackKey)) return
      currentLyricIndex.value = -1
      resetPetLyricIndex()
      updateCurrentLyrics()
    } catch (err) {
      if (!isLyricsRequestCurrent(generation, controller, trackKey) || err?.name === 'AbortError') return
      console.error('Failed to load lyrics:', err)
      lyrics.value = []
      currentLyricIndex.value = -1
      resetPetLyricIndex()
    } finally {
      if (lyricsLoadController === controller) lyricsLoadController = null
    }
  }

  return {
    lyrics,
    currentLyricIndex,
    currentWordIndex,
    lyricsOffset,
    lyricTimingOffsetMs,
    showLyricTranslation,
    effectiveLyricTime,
    adjustLyricTiming,
    resetLyricTiming,
    loadLyrics,
    updateCurrentLyrics,
    resetLyrics,
    invalidateLyricsRequest,
    resetPetLyricIndex,
  }
}
