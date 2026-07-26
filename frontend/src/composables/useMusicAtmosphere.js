import { computed, ref, watch } from 'vue'
import { selectNextPlaybackTrack } from '../utils/musicTrackHelpers.js'
import { pickLocalMusicQuote } from '../utils/musicQuoteLibrary.js'

const RANDOM_MUSIC_KEYWORD = '__random__'
const STORAGE_KEY_DATE = 'aura_listen_date'
const STORAGE_KEY_SECS = 'aura_listen_secs'
const STORAGE_KEY_AI_QUOTE = 'aura_ai_song_quote_enabled'

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

export const useMusicAtmosphere = ({ currentTrack, playlist, currentIndex, playMode, aiEmotionEnabled }) => {
  const companionSeconds = ref(loadTodaySeconds())
  const currentEmotion = ref('惬意')
  const currentWeather = ref('获取中...')
  const weatherDetails = ref(null)
  const weatherIconError = ref(false)
  const aiSongQuoteEnabled = ref(localStorage.getItem(STORAGE_KEY_AI_QUOTE) === 'true')
  const aiSongQuote = ref(pickLocalMusicQuote())
  const songQuoteLoading = ref(false)
  const preselectedNextTrack = ref(null)
  let songQuoteRequestId = 0

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

  const weatherTitle = computed(() => {
    const details = weatherDetails.value
    if (!details) return currentWeather.value
    const source = details.source === 'gps'
      ? '当前位置'
      : details.source === 'configured'
        ? '已配置城市'
        : 'IP 近似位置'
    const apparent = details.apparentTemperature !== null
      && details.apparentTemperature !== undefined
      && details.apparentTemperature !== ''
      && Number.isFinite(Number(details.apparentTemperature))
      ? `，体感 ${Number(details.apparentTemperature)}°C`
      : ''
    return `${details.location || source} · ${source}${apparent}`
  })

  const requestWeather = async (coordinates = null) => {
    const query = coordinates
      ? `?lat=${encodeURIComponent(coordinates.latitude)}&lon=${encodeURIComponent(coordinates.longitude)}`
      : ''
    const resp = await fetch(`/api/music/weather${query}`)
    const data = await resp.json()
    if (!resp.ok || !data.success || !data.weather || !isHealthyWeatherText(data.weather)) {
      throw new Error(data?.error || '天气服务没有返回有效数据')
    }
    currentWeather.value = data.weather
    weatherDetails.value = {
      source: data.source || (coordinates ? 'gps' : 'ip'),
      accuracy: data.accuracy || (coordinates ? 'precise' : 'approximate'),
      location: data.location || (coordinates ? '当前位置' : 'IP 近似位置'),
      apparentTemperature: data.apparentTemperature,
      observedAt: data.observedAt || '',
    }
    return true
  }

  const getBrowserPosition = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => {
        console.warn('Geolocation failed or denied:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000,
      }
    )
  })

  const fetchWeather = async () => {
    currentWeather.value = '获取中...'
    weatherDetails.value = null

    try {
      const position = await getBrowserPosition()
      if (position) {
        try {
          await requestWeather(position.coords)
          return
        } catch (gpsError) {
          console.warn('GPS weather fetch failed, falling back to IP location:', gpsError)
        }
      }
      await requestWeather()
    } catch (error) {
      console.error('Weather fetch failed:', error)
      currentWeather.value = '天气未知'
      weatherDetails.value = null
    }
  }

  const updateAiEmotion = async (track) => {
    if (!track) return
    if (aiEmotionEnabled?.value === false) {
      currentEmotion.value = '音乐'
      return
    }
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

  const updateSongQuote = async (track, options = {}) => {
    const requestId = ++songQuoteRequestId
    if (!track) {
      songQuoteLoading.value = false
      aiSongQuote.value = pickLocalMusicQuote(aiSongQuote.value)
      return
    }
    if (!aiSongQuoteEnabled.value) {
      songQuoteLoading.value = false
      aiSongQuote.value = pickLocalMusicQuote(options.keepCurrent ? '' : aiSongQuote.value)
      return
    }
    songQuoteLoading.value = true
    aiSongQuote.value = '正在感悟音乐意境...'
    try {
      const res = await fetch('/api/music/song-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, artist: track.artist || '' })
      })
      const data = await res.json()
      if (requestId !== songQuoteRequestId) return
      aiSongQuote.value = data.success && data.quote ? data.quote : pickLocalMusicQuote()
    } catch {
      if (requestId !== songQuoteRequestId) return
      aiSongQuote.value = pickLocalMusicQuote()
    } finally {
      if (requestId === songQuoteRequestId) songQuoteLoading.value = false
    }
  }

  const toggleAiSongQuote = () => {
    aiSongQuoteEnabled.value = !aiSongQuoteEnabled.value
    localStorage.setItem(STORAGE_KEY_AI_QUOTE, String(aiSongQuoteEnabled.value))
    updateSongQuote(currentTrack.value)
  }

  const refreshSongQuote = () => updateSongQuote(currentTrack.value)

  const updatePreselectedTrack = () => {
    preselectedNextTrack.value = selectNextPlaybackTrack(playlist.value, {
      currentIndex: currentIndex.value,
      currentTrack: currentTrack.value,
      playMode: playMode.value,
    })
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
    updateSongQuote(newTrack)
  })
  if (aiEmotionEnabled) watch(aiEmotionEnabled, () => updateAiEmotion(currentTrack.value))

  watch([currentTrack, playlist, currentIndex, playMode], updatePreselectedTrack, { immediate: true })

  return {
    companionSeconds,
    currentEmotion,
    currentWeather,
    weatherDetails,
    weatherTitle,
    weatherIcon,
    weatherIconError,
    weatherEmoji,
    companionTimeStr,
    aiSongQuote,
    aiSongQuoteEnabled,
    songQuoteLoading,
    toggleAiSongQuote,
    refreshSongQuote,
    nextRecommendTrack,
    updatePreselectedTrack,
    recordCompanionSecond,
    fetchWeather,
    isRandomMusicKeyword,
  }
}
