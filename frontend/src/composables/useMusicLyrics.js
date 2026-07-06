import { computed, ref } from 'vue'

export function useMusicLyrics(options = {}) {
  const currentTime = options.currentTime || { value: 0 }
  const isPlaying = options.isPlaying || { value: false }
  const notifyMusicPetSpeech = options.notifyMusicPetSpeech || (() => {})

  const lyrics = ref([])
  const currentLyricIndex = ref(-1)
  let lastPetLyricIndex = -1

  const lyricsOffset = computed(() => {
    const lineH = 28
    const wrapH = 90
    if (currentLyricIndex.value < 0) return 0
    return (wrapH / 2) - (currentLyricIndex.value * lineH) - (lineH / 2)
  })

  const resetPetLyricIndex = () => {
    lastPetLyricIndex = -1
  }

  const resetLyrics = () => {
    lyrics.value = []
    currentLyricIndex.value = -1
    resetPetLyricIndex()
  }

  const updateCurrentLyrics = () => {
    if (lyrics.value.length === 0) return
    let activeIdx = -1
    for (let i = 0; i < lyrics.value.length; i++) {
      if (currentTime.value >= lyrics.value[i].time) {
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
      resetLyrics()
      return
    }
    try {
      const res = await fetch(`/api/music/lyric?filename=${encodeURIComponent(track.filename || '')}&bvid=${encodeURIComponent(track.bvid || '')}&title=${encodeURIComponent(track.title || '')}`)
      const data = await res.json()
      if (data.success && data.lyrics) {
        lyrics.value = data.lyrics
      } else {
        lyrics.value = []
      }
    } catch (err) {
      console.error('Failed to load lyrics:', err)
      lyrics.value = []
    }
    currentLyricIndex.value = -1
    resetPetLyricIndex()
  }

  return {
    lyrics,
    currentLyricIndex,
    lyricsOffset,
    loadLyrics,
    updateCurrentLyrics,
    resetLyrics,
    resetPetLyricIndex,
  }
}
