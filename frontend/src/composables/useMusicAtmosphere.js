import { computed, ref, watch } from 'vue'

const RANDOM_MUSIC_KEYWORD = '__random__'
const STORAGE_KEY_DATE = 'aura_listen_date'
const STORAGE_KEY_SECS = 'aura_listen_secs'

export const isRandomMusicKeyword = (keyword) => {
  const value = String(keyword || '').trim().toLowerCase()
  return !value || [RANDOM_MUSIC_KEYWORD, 'random', '随机', '随便', '任意', '播放音乐', '听歌'].includes(value)
}

const getTodayStr = () => new Date().toISOString().slice(0, 10)

const loadTodaySeconds = () => {
  const savedDate = localStorage.getItem(STORAGE_KEY_DATE)
  const today = getTodayStr()
  if (savedDate === today) {
    return parseInt(localStorage.getItem(STORAGE_KEY_SECS) || '0', 10) || 0
  }
  localStorage.setItem(STORAGE_KEY_DATE, today)
  localStorage.setItem(STORAGE_KEY_SECS, '0')
  return 0
}

const isHealthyWeatherText = (str) => {
  if (!str) return false
  const s = str.trim()
  if (s.length > 25) return false
  if (s.includes('<') || s.includes('{') || s.includes('}') || s.includes('style') || s.includes('body')) return false
  return true
}

export const useMusicAtmosphere = ({ currentTrack, playlist, currentIndex, playMode }) => {
  const companionSeconds = ref(loadTodaySeconds())
  const currentEmotion = ref('惬意')
  const currentWeather = ref('获取中...')
  const weatherIconError = ref(false)
  const aiSongQuote = ref('你想要的是现在，而不是那遥远的未来。')
  const preselectedNextTrack = ref(null)

  const weatherIcon = computed(() => {
    const w = currentWeather.value.toLowerCase()
    let code = '999'
    if (w.includes('晴') || w.includes('sun') || w.includes('clear') || w.includes('sunny')) code = '100'
    else if (w.includes('多云') || w.includes('cloudy') || w.includes('partly')) code = '101'
    else if (w.includes('阴') || w.includes('overcast') || w.includes('cloud')) code = '104'
    else if (w.includes('雷') || w.includes('storm') || w.includes('thunder')) code = '302'
    else if (w.includes('雨') || w.includes('rain') || w.includes('shower') || w.includes('drizzle')) code = '300'
    else if (w.includes('雪') || w.includes('snow') || w.includes('sleet')) code = '400'
    else if (w.includes('雾') || w.includes('fog') || w.includes('mist')) code = '501'
    else if (w.includes('霾') || w.includes('haze') || w.includes('smoky')) code = '502'
    else if (w.includes('风') || w.includes('wind') || w.includes('gale')) code = '504'
    if (code === '999') return null
    return `https://icons.qweather.com/assets/icons/${code}.svg`
  })

  const weatherEmoji = computed(() => {
    const w = currentWeather.value.toLowerCase()
    if (w.includes('晴') || w.includes('sun') || w.includes('clear')) return '☀️'
    if (w.includes('多云') || w.includes('partly')) return '⛅'
    if (w.includes('阴') || w.includes('overcast') || w.includes('cloud')) return '☁️'
    if (w.includes('雷') || w.includes('storm')) return '⛈️'
    if (w.includes('雨') || w.includes('rain') || w.includes('shower')) return '🌧️'
    if (w.includes('雪') || w.includes('snow')) return '❄️'
    if (w.includes('雾') || w.includes('fog')) return '🌫️'
    if (w.includes('风') || w.includes('wind')) return '💨'
    return '🌡️'
  })

  const companionTimeStr = computed(() => {
    const m = Math.floor(companionSeconds.value / 60)
    const s = companionSeconds.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  const nextRecommendTrack = computed(() => preselectedNextTrack.value)

  const fetchWeather = async () => {
    try {
      const resp = await fetch('/api/music/weather')
      const data = await resp.json()
      currentWeather.value = data.success && data.weather && isHealthyWeatherText(data.weather)
        ? data.weather
        : '天气未知'
    } catch (err) {
      console.error('Weather fetch 1 failed:', err)
      currentWeather.value = '天气未知'
    }

    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const resp = await fetch(`/api/music/weather?lat=${latitude}&lon=${longitude}`)
          const data = await resp.json()
          if (data.success && data.weather && isHealthyWeatherText(data.weather)) {
            currentWeather.value = data.weather
          }
        } catch (err2) {
          console.error('Weather fetch 2 failed:', err2)
        }
      },
      (geoErr) => {
        console.warn('Geolocation failed or denied:', geoErr)
      },
      { timeout: 3000 }
    )
  }

  const updateAiEmotion = async (track) => {
    if (!track) return
    try {
      const res = await fetch('/api/music/song-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist || '' })
      })
      const data = await res.json()
      if (data.success && data.emotion) currentEmotion.value = data.emotion
    } catch {}
  }

  const updateAiSongQuote = async (track) => {
    if (!track) {
      aiSongQuote.value = '你想要的是现在，而不是那遥远的未来。'
      return
    }
    aiSongQuote.value = '正在感悟音乐意境...'
    try {
      const res = await fetch('/api/music/song-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist || '' })
      })
      const data = await res.json()
      aiSongQuote.value = data.success && data.quote ? data.quote : '聆听音符流淌...'
    } catch {
      aiSongQuote.value = '聆听音符流淌...'
    }
  }

  const updatePreselectedTrack = () => {
    if (!playlist.value.length) {
      preselectedNextTrack.value = null
      return
    }
    if (currentIndex.value === -1) {
      preselectedNextTrack.value = playlist.value[0]
      return
    }
    const nextIdx = (currentIndex.value + 1) % playlist.value.length
    preselectedNextTrack.value = playlist.value[nextIdx]
  }

  const recordCompanionSecond = (playing) => {
    if (!playing) return
    companionSeconds.value++
    localStorage.setItem(STORAGE_KEY_SECS, String(companionSeconds.value))
    const savedDate = localStorage.getItem(STORAGE_KEY_DATE)
    const today = getTodayStr()
    if (savedDate !== today) {
      companionSeconds.value = 0
      localStorage.setItem(STORAGE_KEY_DATE, today)
      localStorage.setItem(STORAGE_KEY_SECS, '0')
    }
  }

  watch(currentWeather, () => {
    weatherIconError.value = false
  })

  watch(currentTrack, (newTrack) => {
    updateAiEmotion(newTrack)
    updateAiSongQuote(newTrack)
    updatePreselectedTrack()
  })

  watch(playMode, updatePreselectedTrack)

  return {
    companionSeconds,
    currentEmotion,
    currentWeather,
    weatherIcon,
    weatherIconError,
    weatherEmoji,
    companionTimeStr,
    aiSongQuote,
    nextRecommendTrack,
    updatePreselectedTrack,
    recordCompanionSecond,
    fetchWeather,
    isRandomMusicKeyword,
  }
}
