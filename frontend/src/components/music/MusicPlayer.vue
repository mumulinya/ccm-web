<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { confirmDialog, toast } from '../../utils/toast.js'
import { useMusicAgentChat } from '../../composables/useMusicAgentChat.js'
import { useMusicAtmosphere } from '../../composables/useMusicAtmosphere.js'
import { useMusicLyrics } from '../../composables/useMusicLyrics.js'
import { useMusicPetNotifications } from '../../composables/useMusicPetNotifications.js'
import { findLocalTrackByKeyword as findTrackInList, formatTrackLabel } from '../../utils/musicTrackHelpers.js'
import MusicAgentSettingsModal from './MusicAgentSettingsModal.vue'
import MusicDownloadCenter from './MusicDownloadCenter.vue'
import { useMusicDownloadJobs } from '../../composables/useMusicDownloadJobs.js'
import { useMusicLibraryState } from '../../composables/useMusicLibraryState.js'
import { getPreferredMusicMode, setPreferredMusicMode } from '../../composables/useMusicRemotePlayback.js'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' }
})
const musicAgentLabel = computed(() => props.agentLabel?.trim() || '乖乖')

// === 基础核心状态 ===
const mode = ref(getPreferredMusicMode()) // local | cloud(B站) | netease(网易云)
watch(mode, (value) => setPreferredMusicMode(value))
const tracks = ref([])
const playlist = ref([])
const currentIndex = ref(-1)
const currentTrack = computed(() => playlist.value[currentIndex.value] || null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const playMode = ref('list') // list | random | single
const filterText = ref('')
const audioEl = ref(null)
const leftCanvasRef = ref(null)
const rightCanvasRef = ref(null)
const headerCanvasRef = ref(null)
const newPlaylistName = ref('')
const selectedPlaylistId = ref('')

const {
  libraryState,
  activeLibraryView,
  isFavorite,
  loadLibraryState,
  toggleFavorite: persistFavorite,
  createPlaylist,
  updatePlaylist,
  deletePlaylist: persistDeletePlaylist,
  setPlaybackQueue,
} = useMusicLibraryState()

const {
  downloadJobs,
  downloadCenterOpen,
  activeDownloadCount,
  loadDownloadJobs,
  createDownloadJob,
  cancelDownloadJob,
  retryDownloadJob,
  clearFinishedDownloadJobs,
  waitForJob,
} = useMusicDownloadJobs({ onCompleted: async () => loadTracks() })

const {
  notifyMusicPet,
  notifyMusicPetSpeech,
  notifyMusicPetPlaying,
  notifyMusicPetIdle,
} = useMusicPetNotifications({ currentTrack })

const {
  lyrics,
  currentLyricIndex,
  lyricsOffset,
  loadLyrics,
  updateCurrentLyrics,
  resetLyrics,
  resetPetLyricIndex,
} = useMusicLyrics({ currentTime, isPlaying, notifyMusicPetSpeech })

const {
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
} = useMusicAtmosphere({ currentTrack, playlist, currentIndex, playMode })

const floatingComments = ref([])
let lastTrackIndex = 0

const addBubbleComment = (text, type = 'lyric') => {
  if (!text || !text.trim()) return
  if (floatingComments.value.some(c => c.text === text)) return
  if (floatingComments.value.length >= 4) return

  const id = Date.now() + Math.random()
  const randomIdx = Math.floor(Math.random() * 4) + 1
  const avatar = `/anime_covers/anime_${randomIdx}.png`
  const track = lastTrackIndex
  lastTrackIndex = (lastTrackIndex + 1) % 5 // 5 条轨道
  const y = 12 + track * 15 + Math.random() * 3 // 分轨定位，适应高度
  const duration = 12 + Math.random() * 6 // 12-18秒随机时间，错开层次
  
  floatingComments.value.push({
    id,
    text,
    avatar,
    y,
    duration,
    type
  })
  
  // 动画结束后自动移除，防内存泄露
  setTimeout(() => {
    const idx = floatingComments.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      floatingComments.value.splice(idx, 1)
    }
  }, duration * 1000 + 500)
}

watch(currentLyricIndex, (newIdx) => {
  if (newIdx >= 0 && lyrics.value[newIdx]?.text) {
    addBubbleComment(lyrics.value[newIdx].text, 'lyric')
  }
})
// === 弹幕与频谱状态 ===
const audioCtx = ref(null)
const analyser = ref(null)
const canvasRef = ref(null)
const dataArray = ref(null)
const danmakuCanvas = ref(null)
const danmakuItems = ref([])
const danmakuEnabled = ref(true)
const activeDanmaku = ref([])

// 粒子悬浮与渐变封面状态
const leftCaps = ref([])
const rightCaps = ref([])
const coverStyle = computed(() => {
  if (currentTrack.value?.pic) return {}
  const title = currentTrack.value?.title || currentTrack.value?.filename || 'Aura'
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c1 = `hsl(${Math.abs(hash) % 360}, 60%, 40%)`
  const c2 = `hsl(${(Math.abs(hash) + 120) % 360}, 65%, 20%)`
  return {
    background: `linear-gradient(135deg, ${c1}, ${c2})`
  }
})

const ambientBgStyle = computed(() => {
  if (currentTrack.value?.pic) {
    return {
      backgroundImage: `linear-gradient(to bottom, rgba(10, 8, 24, 0.1), rgba(10, 8, 24, 0.3)), url(${currentTrack.value.pic})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      opacity: '0.9',
      filter: 'none',
      animation: 'none'
    }
  }
  const title = currentTrack.value?.title || currentTrack.value?.filename || 'Aura'
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const c1 = `hsl(${Math.abs(hash) % 360}, 60%, 40%)`
  const c2 = `hsl(${(Math.abs(hash) + 120) % 360}, 65%, 20%)`
  return {
    background: `linear-gradient(135deg, ${c1}, ${c2})`,
    opacity: '0.25',
    filter: 'blur(100px) saturate(150%)'
  }
})

const cyclePlayMode = () => {
  if (playMode.value === 'list') {
    playMode.value = 'random'
  } else if (playMode.value === 'random') {
    playMode.value = 'single'
  } else {
    playMode.value = 'list'
  }
}

const toggleDanmaku = () => {
  danmakuEnabled.value = !danmakuEnabled.value
}

const getPlayModeIcon = () => {
  if (playMode.value === 'single') return '🔂'
  if (playMode.value === 'random') return '🔀'
  return '🔁'
}

const getPlayModeTitle = () => {
  if (playMode.value === 'single') return '单曲循环'
  if (playMode.value === 'random') return '随机播放'
  return '列表循环'
}

const findLocalTrackByKeyword = (keyword) => findTrackInList(keyword, tracks.value)

const startAudioPlayback = async (track = currentTrack.value, options = {}) => {
  if (!audioEl.value) return { success: false, error: '播放器未准备就绪' }
  if (audioCtx.value && audioCtx.value.state === 'suspended') {
    try { await audioCtx.value.resume() } catch {}
  }
  resetPetLyricIndex()
  try {
    const playResult = audioEl.value.play()
    if (playResult && typeof playResult.then === 'function') {
      await playResult
    }
    isPlaying.value = true
    notifyMusicPetPlaying(track)
    return { success: true }
  } catch (err) {
    isPlaying.value = false
    const message = err?.name === 'NotAllowedError'
      ? '浏览器拦截了远程自动播放，请在 CCM 页面点击一次播放按钮或允许该站点自动播放后重试'
      : (err?.message || '无法开始播放')
    notifyMusicPet('error', `播放失败：${message}`, track)
    if (options.remote) toast.error(`远程点歌已准备好，但播放被拦截：${message}`, 8000)
    return { success: false, error: message }
  }
}

// 频谱与弹幕控制器
let animFrame = null
let danmakuFrame = null

let companionTimer = null
let weatherTimer = null
let remoteCommandTimer = null

// Agent 对话
const {
  agentMessages,
  agentInput,
  agentLoading,
  agentChatEl,
  pushAgentMessage,
  appendAgentMessageContent,
  setAgentMessageContent,
  setAgentMessageResults,
  buildAgentRequestHistory,
  getAgentMessageKey,
  captureAgentChatScroll,
  updateAgentChatScrollState,
  scrollChat,
  attachAgentChatResizeObserver,
  detachAgentChatResizeObserver,
  loadChatMessages,
  clearChatHistory,
  beginAgentRequest,
  finishAgentRequest,
  stopAgentRequest,
  lastUserMessage,
} = useMusicAgentChat({
  confirmClear: () => confirmDialog('确定要清除聊天历史记录吗？'),
  nowLabel: () => formatTimeHHMMSS(),
})

// 下载状态
const converting = ref({})
const uploading = ref(false)

// 上传音乐文件
const uploadFiles = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files || files.length === 0) return
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > 100 * 1024 * 1024) {
    toast.error('一次上传的音频不能超过 100 MB')
    e.target.value = ''
    return
  }
  uploading.value = true
  const formData = new FormData()
  for (const file of files) formData.append('file', file)
  try {
    const res = await fetch('/api/music/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.success && data.uploaded?.length > 0) {
      await loadTracks()
      toast.success(`已上传 ${data.uploaded.length} 个音频文件`)
    } else {
      toast.error(data.error || '上传失败，请检查音频格式')
    }
  } catch (error) { toast.error(error?.message || '上传失败') }
  uploading.value = false
  e.target.value = ''
}

// Agent 配置
const showSettings = ref(false)
const agentConfig = ref({
  enabled: true,
  apiUrl: 'https://api.openai.com/v1',
  model: '',
  format: 'openai-compatible',
  proxy: '',
  hasKey: false,
  sourceLabel: '系统设置 / 统一大模型配置'
})
const agentConfigLoaded = ref(false)

const loadAgentConfig = async () => {
  try {
    const res = await fetch('/api/music/config')
    const data = await res.json()
    if (data.success) {
      agentConfig.value = { ...agentConfig.value, ...data.config }
      agentConfigLoaded.value = true
    }
  } catch {}
}

const saveAgentConfig = async () => {
  try {
    const res = await fetch('/api/music/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proxy: agentConfig.value.proxy
      })
    })
    const data = await res.json()
    if (data.success && data.config) {
      agentConfig.value = { ...agentConfig.value, ...data.config }
    }
    showSettings.value = false
  } catch {}
}

// === 音乐列表 ===
const loadTracks = async () => {
  try {
    const res = await fetch('/api/music/list')
    const data = await res.json()
    tracks.value = data.tracks || []
    const savedQueue = (libraryState.value.queue || []).map(filename => tracks.value.find(track => track.filename === filename)).filter(Boolean)
    playlist.value = savedQueue.length ? savedQueue : tracks.value
    updatePreselectedTrack()
    if (playlist.value.length > 0 && currentIndex.value === -1) {
      currentIndex.value = 0
    }
  } catch {}
}

const deleteTrack = async (track) => {
  const confirmed = await confirmDialog(`确定要物理删除该歌曲吗？\n${track.title}`)
  if (!confirmed) return
  try {
    const res = await fetch('/api/music/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: track.filename })
    })
    const data = await res.json()
    if (data.success) {
      if (currentTrack.value && currentTrack.value.filename === track.filename) {
        stopPlayback()
        currentIndex.value = -1
        currentTime.value = 0
        duration.value = 0
      }
      await loadTracks()
    } else {
      toast.error(`删除失败: ${data.error || '未知错误'}`)
    }
  } catch (err) {
    toast.error(`删除出错: ${err.message}`)
  }
}

const filteredTracks = computed(() => {
  let source = tracks.value
  if (activeLibraryView.value === 'favorites') {
    source = source.filter(track => isFavorite(track.filename))
  } else if (activeLibraryView.value === 'queue') {
    source = (libraryState.value.queue || []).map(filename => tracks.value.find(track => track.filename === filename)).filter(Boolean)
  } else if (activeLibraryView.value.startsWith('playlist:')) {
    const id = activeLibraryView.value.slice('playlist:'.length)
    const item = (libraryState.value.playlists || []).find(list => list.id === id)
    source = (item?.tracks || []).map(filename => tracks.value.find(track => track.filename === filename)).filter(Boolean)
  }
  if (!filterText.value) return source
  const q = filterText.value.toLowerCase()
  return source.filter(t => t.title.toLowerCase().includes(q) || (t.artist && t.artist.toLowerCase().includes(q)))
})

const toggleTrackFavorite = async (track) => {
  try { await persistFavorite(track) }
  catch (error) { toast.error(error.message || '更新收藏失败') }
}

const syncPlaybackQueue = async (nextTracks) => {
  try {
    const currentFilename = currentTrack.value?.filename
    await setPlaybackQueue(nextTracks)
    playlist.value = nextTracks.length ? nextTracks : tracks.value
    currentIndex.value = currentFilename ? playlist.value.findIndex(track => track.filename === currentFilename) : (playlist.value.length ? 0 : -1)
    if (currentIndex.value < 0 && playlist.value.length) currentIndex.value = 0
  } catch (error) { toast.error(error.message || '更新播放队列失败') }
}

const addTrackToQueue = (track) => {
  const current = (libraryState.value.queue || []).map(filename => tracks.value.find(item => item.filename === filename)).filter(Boolean)
  if (!current.some(item => item.filename === track.filename)) current.push(track)
  return syncPlaybackQueue(current)
}

const removeTrackFromQueue = (track) => syncPlaybackQueue(
  (libraryState.value.queue || []).filter(filename => filename !== track.filename).map(filename => tracks.value.find(item => item.filename === filename)).filter(Boolean)
)

const submitPlaylist = async () => {
  const name = newPlaylistName.value.trim()
  if (!name) return
  try { await createPlaylist(name); newPlaylistName.value = '' }
  catch (error) { toast.error(error.message || '创建歌单失败') }
}

const addTrackToSelectedPlaylist = async (track) => {
  const item = (libraryState.value.playlists || []).find(list => list.id === selectedPlaylistId.value)
  if (!item) return toast.error('请先选择歌单')
  try { await updatePlaylist(item.id, { tracks: [...new Set([...(item.tracks || []), track.filename])] }) }
  catch (error) { toast.error(error.message || '添加到歌单失败') }
}

const removeTrackFromActivePlaylist = async (track) => {
  const id = activeLibraryView.value.slice('playlist:'.length)
  const item = (libraryState.value.playlists || []).find(list => list.id === id)
  if (!item) return
  try { await updatePlaylist(id, { tracks: item.tracks.filter(filename => filename !== track.filename) }) }
  catch (error) { toast.error(error.message || '移出歌单失败') }
}

const deleteActivePlaylist = async () => {
  if (!activeLibraryView.value.startsWith('playlist:')) return
  const id = activeLibraryView.value.slice('playlist:'.length)
  try { await persistDeletePlaylist(id); activeLibraryView.value = 'all' }
  catch (error) { toast.error(error.message || '删除歌单失败') }
}

// === 播放控制 ===
const play = async (track, options = {}) => {
  if (!track) return { success: false, error: '没有可播放的歌曲' }
  const idx = playlist.value.findIndex(t => t.filename === track.filename)
  if (idx !== -1) currentIndex.value = idx
  const src = `/api/music/stream?file=${encodeURIComponent(track.filename)}`
  if (!audioEl.value) return { success: false, error: '播放器未准备就绪' }
  audioEl.value.src = src
  audioEl.value.volume = volume.value
  initAnalyser()
  resetPetLyricIndex()
  // 加载弹幕
  loadDanmaku(track.bvid, track.title, track.artist)
  // 加载歌词
  loadLyrics(track)
  return startAudioPlayback(track, options)
}

const togglePlay = () => {
  if (!audioEl.value || !currentTrack.value) {
    if (playlist.value.length) play(playlist.value[0])
    return
  }
  if (isPlaying.value) {
    audioEl.value.pause()
    isPlaying.value = false
    notifyMusicPetIdle(`已暂停：${formatTrackLabel(currentTrack.value)}`)
  } else {
    const currentSrc = audioEl.value.src || ''
    if (!currentSrc || !currentSrc.includes('/api/music/stream')) {
      play(currentTrack.value)
    } else {
      startAudioPlayback(currentTrack.value)
    }
  }
}

const stopPlayback = () => {
  if (audioEl.value) {
    audioEl.value.pause()
    audioEl.value.currentTime = 0
    isPlaying.value = false
    notifyMusicPetIdle('已停止播放', currentTrack.value)
    resetLyrics()
  }
}

const nextTrack = () => {
  if (!playlist.value.length) return
  if (playMode.value === 'random') {
    if (nextRecommendTrack.value) {
      play(nextRecommendTrack.value)
    } else {
      play(playlist.value[Math.floor(Math.random() * playlist.value.length)])
    }
  } else {
    const next = playMode.value === 'single' ? currentIndex.value : (currentIndex.value + 1) % playlist.value.length
    play(playlist.value[next])
  }
}

const prevTrack = () => {
  if (!playlist.value.length) return
  const prev = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
  play(playlist.value[prev])
}

const seekTo = (e) => {
  if (!audioEl.value || !duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  audioEl.value.currentTime = ((e.clientX - rect.left) / rect.width) * duration.value
}

const setVolume = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  volume.value = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  if (audioEl.value) audioEl.value.volume = volume.value
}

const onTimeUpdate = () => {
  if (audioEl.value) {
    currentTime.value = audioEl.value.currentTime
    duration.value = audioEl.value.duration || 0
    updateCurrentLyrics()
    
    // 实时的弹幕气泡检测与添加
    if (danmakuItems.value.length > 0) {
      const now = currentTime.value
      danmakuItems.value.forEach(item => {
        if (Math.abs(item.time - now) < 0.25 && !item.shown) {
          item.shown = true
          addBubbleComment(item.content, 'danmaku')
        }
      })
    }
  }
}

const onEnded = () => {
  if (!playlist.value.length) notifyMusicPetIdle('播放结束', currentTrack.value)
  nextTrack()
}

// === 频谱 ===
const initAnalyser = () => {
  if (audioCtx.value) {
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume()
    }
    return
  }
  try {
    audioCtx.value = new (window.AudioContext || window.webkitAudioContext)()
    analyser.value = audioCtx.value.createAnalyser()
    analyser.value.fftSize = 128
    const source = audioCtx.value.createMediaElementSource(audioEl.value)
    source.connect(analyser.value)
    analyser.value.connect(audioCtx.value.destination)
    dataArray.value = new Uint8Array(analyser.value.frequencyBinCount)
    
    if (audioCtx.value.state === 'suspended') {
      audioCtx.value.resume()
    }
  } catch {}
}

let spectrumFrameId = null

const drawSpectrums = () => {
  spectrumFrameId = requestAnimationFrame(drawSpectrums)
  
  let hasData = false
  if (analyser.value && dataArray.value) {
    analyser.value.getByteFrequencyData(dataArray.value)
    hasData = true
  }

  // 提取低音 (Bass) 和高音 (Treble) 能量值并绑定至容器 CSS 变量
  if (hasData) {
    let bassSum = 0
    const bassCount = Math.min(6, dataArray.value.length)
    for (let i = 0; i < bassCount; i++) {
      bassSum += dataArray.value[i]
    }
    const bassNormalized = bassSum / (bassCount * 255.0)

    let trebleSum = 0
    const len = dataArray.value.length
    const trebleStart = Math.floor(len * 0.6)
    const trebleCount = len - trebleStart
    for (let i = trebleStart; i < len; i++) {
      trebleSum += dataArray.value[i]
    }
    const trebleNormalized = trebleSum / (trebleCount * 255.0)

    const playerEl = document.querySelector('.aura-player')
    if (playerEl) {
      playerEl.style.setProperty('--audio-bass', bassNormalized.toFixed(3))
      playerEl.style.setProperty('--audio-treble', trebleNormalized.toFixed(3))
    }
  } else {
    const playerEl = document.querySelector('.aura-player')
    if (playerEl) {
      playerEl.style.setProperty('--audio-bass', '0')
      playerEl.style.setProperty('--audio-treble', '0')
    }
  }
  
  // 0. 绘制页眉中间紫色对称频谱
  if (headerCanvasRef.value) {
    const canvas = headerCanvasRef.value
    const ctx = canvas.getContext('2d')
    if (canvas.parentElement) {
      const w = canvas.width = canvas.parentElement.clientWidth
      const h = canvas.height = canvas.parentElement.clientHeight
      ctx.clearRect(0, 0, w, h)
      
      const barCount = 75
      const gap = 2
      const barWidth = (w - (barCount - 1) * gap) / barCount
      const dataLen = hasData ? dataArray.value.length : 0
      
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#7c3aed')    // 左侧紫色
      grad.addColorStop(0.35, '#a78bfa')  // 中偏左亮紫
      grad.addColorStop(0.5, '#4f46e5')   // 中间靛蓝
      grad.addColorStop(0.65, '#a78bfa')  // 中偏右亮紫
      grad.addColorStop(1, '#7c3aed')    // 右侧紫色
      
      ctx.fillStyle = grad
      
      for (let i = 0; i < barCount; i++) {
        const mappingIdx = i < barCount / 2 ? i : (barCount - 1 - i)
        const val = dataLen > 0 ? dataArray.value[mappingIdx % dataLen] / 255.0 : 0
        const barHeight = isPlaying.value ? val * (h * 0.72) + 1 : 1
        
        const x = i * (barWidth + gap)
        const y = (h / 2) - (barHeight / 2)
        
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }
  }
  
  // 1. 绘制左侧对称渐变密集音柱 (左紫右青)
  if (leftCanvasRef.value) {
    const canvas = leftCanvasRef.value
    const ctx = canvas.getContext('2d')
    if (canvas.parentElement) {
      const w = canvas.width = canvas.parentElement.clientWidth
      const h = canvas.height = canvas.parentElement.clientHeight
      ctx.clearRect(0, 0, w, h)
      
      const barCount = 45
      const gap = 1.5
      const barWidth = (w - (barCount - 1) * gap) / barCount
      const dataLen = hasData ? dataArray.value.length : 0
      
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#7c3aed')    // 左侧：紫色
      grad.addColorStop(0.65, '#3b82f6') // 中间：蓝色
      grad.addColorStop(1, '#6feee1')    // 右侧靠近圆键：亮青色
      
      ctx.fillStyle = grad
      ctx.shadowBlur = isPlaying.value ? val * 12 + 3 : 2
      ctx.shadowColor = '#3b82f6'
      
      if (leftCaps.value.length !== barCount) {
        leftCaps.value = new Array(barCount).fill(0).map(() => ({ y1: h / 2, y2: h / 2, speed1: 0, speed2: 0 }))
      }
      
      for (let i = 0; i < barCount; i++) {
        // 左侧频谱：靠近右侧低频振幅大，所以进行倒序映射
        const dataIdx = barCount - 1 - i
        const val = dataLen > 0 ? dataArray.value[dataIdx % dataLen] / 255.0 : 0
        const barHeight = isPlaying.value ? val * (h * 0.78) + 2 : 2
        
        const x = i * (barWidth + gap)
        const y = (h / 2) - (barHeight / 2)
        if (barWidth <= 0 || barHeight <= 0) continue
        
        // 绘制圆角音柱
        const radius = Math.max(0, Math.min(barWidth / 2, barHeight / 2, 2))
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, radius)
        ctx.fill()

        // 更新粒子状态
        const cap = leftCaps.value[i]
        const y_top = y
        const y_bottom = y + barHeight
        
        if (y_top < cap.y1) {
          cap.y1 = y_top
          cap.speed1 = 0
        } else {
          cap.speed1 += 0.12
          cap.y1 += cap.speed1
          if (cap.y1 > h / 2) cap.y1 = h / 2
        }
        
        if (y_bottom > cap.y2) {
          cap.y2 = y_bottom
          cap.speed2 = 0
        } else {
          cap.speed2 += 0.12
          cap.y2 -= cap.speed2
          if (cap.y2 < h / 2) cap.y2 = h / 2
        }
      }

      // 绘制粒子
      ctx.fillStyle = '#6feee1'
      ctx.shadowColor = '#6feee1'
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap)
        const cap = leftCaps.value[i]
        if (cap.y1 < h / 2 - 2) {
          const val = dataLen > 0 ? dataArray.value[(barCount - 1 - i) % dataLen] / 255.0 : 0
          ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
          ctx.fillRect(x, cap.y1, barWidth, 1.5)
        }
        if (cap.y2 > h / 2 + 2) {
          const val = dataLen > 0 ? dataArray.value[(barCount - 1 - i) % dataLen] / 255.0 : 0
          ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
          ctx.fillRect(x, cap.y2 - 1.5, barWidth, 1.5)
        }
      }
      ctx.shadowBlur = 0
    }
  }
  
  // 2. 绘制右侧对称渐变密集音柱 (左青右紫)
  if (rightCanvasRef.value) {
    const canvas = rightCanvasRef.value
    const ctx = canvas.getContext('2d')
    if (canvas.parentElement) {
      const w = canvas.width = canvas.parentElement.clientWidth
      const h = canvas.height = canvas.parentElement.clientHeight
      ctx.clearRect(0, 0, w, h)
      
      const barCount = 45
      const gap = 1.5
      const barWidth = (w - (barCount - 1) * gap) / barCount
      const dataLen = hasData ? dataArray.value.length : 0
      
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#6feee1')    // 左侧靠近圆键：亮青色
      grad.addColorStop(0.35, '#3b82f6') // 中间：蓝色
      grad.addColorStop(1, '#7c3aed')    // 右侧：紫色
      
      ctx.fillStyle = grad
      ctx.shadowBlur = isPlaying.value ? val * 12 + 3 : 2
      ctx.shadowColor = '#3b82f6'
      
      if (rightCaps.value.length !== barCount) {
        rightCaps.value = new Array(barCount).fill(0).map(() => ({ y1: h / 2, y2: h / 2, speed1: 0, speed2: 0 }))
      }
      
      for (let i = 0; i < barCount; i++) {
        const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
        const barHeight = isPlaying.value ? val * (h * 0.78) + 2 : 2
        
        const x = i * (barWidth + gap)
        const y = (h / 2) - (barHeight / 2)
        if (barWidth <= 0 || barHeight <= 0) continue
        
        // 绘制圆角音柱
        const radius = Math.max(0, Math.min(barWidth / 2, barHeight / 2, 2))
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, radius)
        ctx.fill()

        // 更新粒子状态
        const cap = rightCaps.value[i]
        const y_top = y
        const y_bottom = y + barHeight
        
        if (y_top < cap.y1) {
          cap.y1 = y_top
          cap.speed1 = 0
        } else {
          cap.speed1 += 0.12
          cap.y1 += cap.speed1
          if (cap.y1 > h / 2) cap.y1 = h / 2
        }
        
        if (y_bottom > cap.y2) {
          cap.y2 = y_bottom
          cap.speed2 = 0
        } else {
          cap.speed2 += 0.12
          cap.y2 -= cap.speed2
          if (cap.y2 < h / 2) cap.y2 = h / 2
        }
      }

      // 绘制粒子
      ctx.fillStyle = '#6feee1'
      ctx.shadowColor = '#6feee1'
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap)
        const cap = rightCaps.value[i]
        if (cap.y1 < h / 2 - 2) {
          const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
          ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
          ctx.fillRect(x, cap.y1, barWidth, 1.5)
        }
        if (cap.y2 > h / 2 + 2) {
          const val = dataLen > 0 ? dataArray.value[i % dataLen] / 255.0 : 0
          ctx.shadowBlur = isPlaying.value ? val * 10 + 2 : 2
          ctx.fillRect(x, cap.y2 - 1.5, barWidth, 1.5)
        }
      }
      ctx.shadowBlur = 0
    }
  }
}

const prevVolume = ref(0.7)
const toggleMute = () => {
  if (volume.value > 0) {
    prevVolume.value = volume.value
    volume.value = 0
  } else {
    volume.value = prevVolume.value
  }
  if (audioEl.value) audioEl.value.volume = volume.value
}

// === 弹幕 ===
const loadDanmaku = async (bvid, title = '', artist = '') => {
  if (!bvid && !title) return
  try {
    let url = ''
    if (bvid) {
      url = `/api/music/danmaku?bvid=${bvid}`
    } else {
      url = `/api/music/danmaku?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    }
    const res = await fetch(url)
    const data = await res.json()
    danmakuItems.value = (data.danmaku || []).map(d => ({ ...d, shown: false }))
  } catch { danmakuItems.value = [] }
}

const drawDanmaku = () => {
  if (!danmakuCanvas.value) return
  const ctx = danmakuCanvas.value.getContext('2d')
  const draw = () => {
    danmakuFrame = requestAnimationFrame(draw)
    const w = danmakuCanvas.value.parentElement.clientWidth
    const h = danmakuCanvas.value.parentElement.clientHeight
    if (danmakuCanvas.value.width !== w || danmakuCanvas.value.height !== h) {
      danmakuCanvas.value.width = w
      danmakuCanvas.value.height = h
    }
    ctx.clearRect(0, 0, w, h)
    if (!danmakuEnabled.value || !isPlaying.value) return
    const now = currentTime.value
    // 添加新弹幕
    for (const item of danmakuItems.value) {
      if (Math.abs(item.time - now) < 0.5 && !activeDanmaku.value.find(d => d.content === item.content && Math.abs(d.startTime - item.time) < 1)) {
        activeDanmaku.value.push({
          ...item,
          x: w,
          y: 15 + Math.random() * (h - 35),
          speed: 1.2 + Math.random() * 1.5,
          startTime: item.time
        })
      }
    }
    // 绘制和移动
    activeDanmaku.value = activeDanmaku.value.filter(d => {
      d.x -= d.speed
      ctx.font = '13px "JetBrains Mono", monospace'
      ctx.fillStyle = d.color || '#6feee1'
      ctx.globalAlpha = 0.85
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 3
      ctx.fillText(d.content, d.x, d.y)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      return d.x > -250
    })
  }
  draw()
}

onMounted(async () => {
  await loadLibraryState().catch(() => {})
  await loadTracks()
  loadDownloadJobs()
  loadAgentConfig()
  loadChatMessages()
  
  window.__cc_global_play_music = async (keyword, options = {}) => {
    console.log('[GlobalPlay] 收到全局播放指令:', keyword, options)
    const kw = String(keyword || '').trim()
    const playModeHint = String(options.mode || mode.value || getPreferredMusicMode() || 'cloud').trim()
    if (['local', 'cloud', 'netease'].includes(playModeHint) && mode.value !== playModeHint) {
      mode.value = playModeHint
    }

    if (!tracks.value.length) {
      await loadTracks()
    }

    const playCloudByMode = async (query) => {
      const q = String(query || '').trim()
      if (!q) return { success: false, error: '缺少搜索关键词' }
      if (playModeHint === 'local') {
        return { success: false, error: '本地模式未找到可播放歌曲' }
      }
      if (playModeHint === 'netease') {
        console.log('[GlobalPlay] 网易云搜索:', q)
        const res = await fetch(`/api/music/search-netease?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success && data.results?.length) {
          return await convertNeteaseAndPlay(data.results[0], { remote: true })
        }
        return { success: false, error: data.error || '网易云未找到相关歌曲' }
      }
      console.log('[GlobalPlay] B站搜索:', q)
      const biliRes = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`)
      const biliData = await biliRes.json()
      if (biliData.success && biliData.results?.length) {
        return await convertAndPlay(biliData.results[0], { remote: true })
      }
      return { success: false, error: biliData.error || 'B站未找到相关歌曲' }
    }

    if (isRandomMusicKeyword(kw)) {
      const pool = (playlist.value.length ? playlist.value : tracks.value).filter(track => track?.filename)
      if (pool.length) {
        const randomTrack = pool[Math.floor(Math.random() * pool.length)]
        console.log('[GlobalPlay] 随机播放本地音乐:', randomTrack.title || randomTrack.filename)
        const playResult = await play(randomTrack, { remote: true })
        if (!playResult?.success) return { success: false, error: playResult?.error || '播放失败' }
        return { success: true, source: 'local-random', title: formatTrackLabel(randomTrack) }
      }
      // Local empty: fall back to cloud/netease random search.
      const cloudQuery = playModeHint === 'netease' ? '热门歌曲' : '热门流行音乐'
      try {
        const cloud = await playCloudByMode(cloudQuery)
        if (cloud.success) return { ...cloud, source: `${cloud.source || playModeHint}-random` }
        return cloud
      } catch (err) {
        return { success: false, error: err?.message || '随机播放失败' }
      }
    }

    // 1. Local match first.
    const matchedLocal = findLocalTrackByKeyword(kw)
    if (matchedLocal) {
      console.log('[GlobalPlay] 本地匹配成功，直接播放:', formatTrackLabel(matchedLocal))
      const playResult = await play(matchedLocal, { remote: true })
      if (!playResult?.success) return { success: false, error: playResult?.error || '播放失败' }
      return { success: true, source: 'local', title: formatTrackLabel(matchedLocal) }
    }

    // 2. Mode-aware cloud search.
    try {
      return await playCloudByMode(kw)
    } catch (err) {
      console.error('[GlobalPlay] 云端播放失败:', err)
      return { success: false, error: err?.message || '未在本地或网络搜索到相关歌曲' }
    }
  }

  // 播放时长：仅在播放状态下计时，每秒存储到 localStorage
  companionTimer = setInterval(() => {
    recordCompanionSecond(isPlaying.value)
  }, 1000)
  // 初始获取天气
  fetchWeather()
  // 每30分钟刷新一次天气
  weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000)
  
  drawDanmaku()
  drawSpectrums()
  notifyMusicPetIdle('音乐播放器待命')
  
  nextTick(() => {
    attachAgentChatResizeObserver()
    scrollChat({ force: true })
  })
})

onUnmounted(() => {
  if (window.__cc_global_play_music) {
    delete window.__cc_global_play_music
  }
  if (animFrame) cancelAnimationFrame(animFrame)
  if (danmakuFrame) cancelAnimationFrame(danmakuFrame)
  if (spectrumFrameId) cancelAnimationFrame(spectrumFrameId)
  if (remoteCommandTimer) {
    clearInterval(remoteCommandTimer)
    remoteCommandTimer = null
  }
  if (companionTimer) clearInterval(companionTimer)
  if (weatherTimer) clearInterval(weatherTimer)
  detachAgentChatResizeObserver()
  notifyMusicPetIdle('音乐播放器已关闭')
})

// === Agent 对话 ===
const formatTimeHHMMSS = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const autoplayFromAgentAction = async (action) => {
  if (!action || action.type !== 'play_music') return null
  if (action.source !== 'agent') return null
  const keyword = String(action.keyword || '').trim()
  if (!keyword || typeof window.__cc_global_play_music !== 'function') return null
  const result = await window.__cc_global_play_music(keyword)
  if (result?.success) {
    toast.success(`Agent 已播放：${result.title}`)
  } else {
    toast.error(`Agent 播放失败：${result?.error || '未找到歌曲'}`)
  }
  return result
}

const sendAgentMessage = async () => {
  const msg = agentInput.value.trim()
  if (!msg || agentLoading.value) return
  agentInput.value = ''
  
  const time = formatTimeHHMMSS()
  pushAgentMessage({ role: 'operator', content: msg, time })
  notifyMusicPetSpeech(msg, { role: 'user', mode: 'replace', final: true, source: 'music-chat' })
  
  agentLoading.value = true
  const signal = beginAgentRequest()
  notifyMusicPet(isPlaying.value ? 'juggling' : 'thinking', isPlaying.value ? `正在播放：${formatTrackLabel(currentTrack.value)}` : '音乐助手正在找歌', currentTrack.value)
  notifyMusicPetSpeech('音乐助手正在思考...', { role: 'status', mode: 'replace', source: 'music-chat' })
  await nextTick()
  scrollChat({ force: true })

  // 检查统一大模型配置是否可用
  try {
    if (agentConfig.value.enabled && agentConfig.value.hasKey && agentConfig.value.model) {
      await sendToClaudeAgent(msg, signal)
    } else {
      await sendToSimpleAgent(msg, signal)
    }
  } finally {
    finishAgentRequest()
    agentLoading.value = false
    if (isPlaying.value) notifyMusicPetPlaying(currentTrack.value)
    else notifyMusicPetIdle('音乐助手待命', currentTrack.value)
    await nextTick()
    scrollChat()
  }
}

const sendToClaudeAgent = async (msg, signal) => {
  const agentMsg = pushAgentMessage({ role: 'agent', content: '', time: formatTimeHHMMSS() })
  const requestHistory = buildAgentRequestHistory({ exclude: agentMsg })
  scrollChat()
  let petStreamStarted = false
  let petStreamHadError = false
  let musicAction = null
  try {
    const res = await fetch('/api/music/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, mode: mode.value, history: requestHistory }),
      signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'text') {
            const anchor = captureAgentChatScroll()
            appendAgentMessageContent(agentMsg, data.text)
            scrollChat({ anchor })
            notifyMusicPetSpeech(data.text, {
              role: 'assistant',
              mode: petStreamStarted ? 'append' : 'replace',
              source: 'music-chat'
            })
            petStreamStarted = true
          } else if (data.type === 'music_action') {
            musicAction = data.action || null
          } else if (data.type === 'music_results') {
            setAgentMessageResults(agentMsg, data.results || [])
          } else if (data.type === 'error') {
            const anchor = captureAgentChatScroll()
            appendAgentMessageContent(agentMsg, `\n❌ ${data.text}`)
            scrollChat({ anchor })
            petStreamHadError = true
            notifyMusicPetSpeech(data.text, { role: 'error', mode: 'replace', final: true, source: 'music-chat' })
          }
        } catch {}
      }
    }
    if (petStreamStarted && !petStreamHadError) {
      notifyMusicPetSpeech('', { role: 'assistant', mode: 'append', final: true, source: 'music-chat' })
    }
    const playResult = await autoplayFromAgentAction(musicAction)
    // if (playResult) {
    //   pushAgentMessage({
    //     role: 'system',
    //     content: playResult.success
    //       ? `🎵 已按“本地优先，B站兜底”播放：${playResult.title}（${playResult.source}）`
    //       : `❌ 自动播放失败：${playResult.error || '未找到歌曲'}`,
    //     time: formatTimeHHMMSS()
    //   })
    //   scrollChat()
    // }
  } catch (error) {
    const anchor = captureAgentChatScroll()
    const stopped = error?.name === 'AbortError'
    setAgentMessageContent(agentMsg, stopped ? '已停止本次回复。' : '连接失败，请检查系统设置里的统一大模型配置。')
    scrollChat({ anchor })
    notifyMusicPetSpeech(stopped ? '已停止回复' : '连接失败，请检查系统设置里的统一大模型配置', { role: stopped ? 'status' : 'error', mode: 'replace', final: true, source: 'music-chat' })
  }
}

const sendToSimpleAgent = async (msg, signal) => {
  try {
    const res = await fetch('/api/music/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, mode: mode.value, history: agentMessages.value.slice(-10) }),
      signal,
    })
    const data = await res.json()
    if (data.success) {
      const replyText = data.reply || '...'
      pushAgentMessage({
        role: 'agent',
        content: replyText,
        time: formatTimeHHMMSS(),
        results: [
          ...(data.localResults || []).map(t => ({ type: 'local', track: t })),
          ...(data.biliResults || []).map(r => ({ type: 'bilibili', ...r })),
          ...(data.neteaseResults || []).map(r => ({ type: 'netease', ...r }))
        ].slice(0, 8) || []
      })
      scrollChat()
      notifyMusicPetSpeech(replyText, { role: 'assistant', mode: 'replace', final: true, source: 'music-chat' })
      if (data.action?.type === 'play_music') {
        const result = await autoplayFromAgentAction(data.action)
        // if (result) {
        //   pushAgentMessage({
        //     role: 'system',
        //     content: result.success
        //       ? `🎵 已按“本地优先，B站兜底”播放：${result.title}（${result.source}）`
        //       : `❌ 自动播放失败：${result.error || '未找到歌曲'}`,
        //     time: formatTimeHHMMSS()
        //   })
        //   scrollChat()
        // }
      }
    } else {
      const errorText = `出错: ${data.error}`
      pushAgentMessage({ role: 'agent', content: errorText, time: formatTimeHHMMSS() })
      scrollChat()
      notifyMusicPetSpeech(errorText, { role: 'error', mode: 'replace', final: true, source: 'music-chat' })
    }
  } catch (error) {
    const errorText = error?.name === 'AbortError' ? '已停止本次回复。' : '请求失败，请稍后再试。'
    pushAgentMessage({ role: 'agent', content: errorText, time: formatTimeHHMMSS() })
    scrollChat()
    notifyMusicPetSpeech(errorText, { role: 'error', mode: 'replace', final: true, source: 'music-chat' })
  }
}

const stopAgentGeneration = () => {
  if (stopAgentRequest()) toast.info('已停止音乐助手回复')
}

const retryLastAgentMessage = async () => {
  if (agentLoading.value) return
  const previous = lastUserMessage()
  if (!previous?.content) return
  agentInput.value = previous.content
  await sendAgentMessage()
}

const playLocalTrack = (track) => { play(track) }

const downloadResult = async (item, options = {}) => {
  const identifier = item.type === 'netease' ? item.songId : item.bvid
  const title = String(item.title || '').replace(/<[^>]*>/g, '')
  converting.value = { ...converting.value, [identifier]: true }
  try {
    const job = await createDownloadJob(item)
    if (options.wait === false) return { success: true, queued: true, jobId: job.id, source: item.type, title }
    const completed = await waitForJob(job.id)
    await loadTracks()
    const newTrack = tracks.value.find(track => track.filename === completed.filename)
    if (!newTrack) throw new Error('下载完成，但歌曲没有出现在本地曲库')
    if (options.play !== false) {
      const playResult = await play(newTrack, options)
      if (!playResult?.success) throw new Error(playResult?.error || '播放失败')
    } else {
      await addTrackToQueue(newTrack)
    }
    return { success: true, source: item.type, title: newTrack.title || title, filename: completed.filename }
  } catch (error) {
    const message = error?.message || '下载失败'
    if (!options.silent) toast.error(message)
    return { success: false, source: item.type, title, error: message }
  } finally {
    converting.value = { ...converting.value, [identifier]: false }
  }
}

const convertAndPlay = (item, options = {}) => downloadResult({ type: 'bilibili', ...item }, options)
const convertNeteaseAndPlay = (item, options = {}) => downloadResult({ type: 'netease', ...item }, options)

const isTrackAdded = (identifier) => {
  return tracks.value.some(t => t.bvid === identifier || t.filename.includes(identifier))
}

const playAddedTrack = (bvid) => {
  const track = tracks.value.find(t => t.bvid === bvid || t.filename.includes(bvid))
  if (track) play(track)
}

const addAllTracks = async (results) => {
  if (!results || results.length === 0) return
  let queued = 0
  for (const r of results) {
    if (r.type === 'bilibili') {
      const result = await convertAndPlay(r, { wait: false, play: false, silent: true })
      if (result.success) queued += 1
    } else if (r.type === 'netease') {
      const result = await convertNeteaseAndPlay(r, { wait: false, play: false, silent: true })
      if (result.success) queued += 1
    } else if (r.type === 'local') {
      await addTrackToQueue(r.track)
      queued += 1
    }
  }
  if (queued) toast.success(`已加入 ${queued} 首，网络歌曲可在下载中心查看进度`)
}

// === 工具 ===
const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

const parseMessageTracks = (content) => {
  if (!content) return null;
  const FENCED_RE = /```(?:tracks|json)?\s*\n([\s\S]*?)```/g;
  let match;
  FENCED_RE.lastIndex = 0;
  while ((match = FENCED_RE.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const tracks = Array.isArray(parsed) ? parsed : (parsed.tracks || []);
      if (Array.isArray(tracks)) {
        return tracks.map(t => {
          if (t.bvid) {
            return {
              type: 'bilibili',
              bvid: t.bvid,
              title: t.title,
              author: t.author || t.artist || '未知UP主',
              duration: t.duration || ''
            };
          } else if (t.songId) {
            const cleanArtist = (t.artist && t.artist !== 'undefined' && t.artist !== 'null') ? t.artist : '';
            const cleanAuthor = (t.author && t.author !== 'undefined' && t.author !== 'null') ? t.author : '';
            const finalArtist = cleanArtist || cleanAuthor || '未知歌手';
            return {
              type: 'netease',
              songId: t.songId,
              title: t.title,
              artist: finalArtist,
              author: finalArtist,
              duration: t.duration || ''
            };
          } else {
            return {
              type: 'local',
              track: {
                filename: t.filename,
                title: t.title,
                artist: t.artist || t.author || '未知歌手'
              }
            };
          }
        });
      }
    } catch {}
  }
  return null;
}

const displayMessageContent = (content) => {
  if (!content) return '';
  return content.replace(/```(?:tracks|json)?\s*\n[\s\S]*?```/g, '').trim();
}

const getMessageResults = (msg) => {
  if (msg.results && msg.results.length > 0) return msg.results;
  return parseMessageTracks(msg.content);
}
</script>

<template>
  <div class="aura-player scanline-overlay dot-matrix-bg" :class="{ 'is-playing': isPlaying }">
    <!-- 清晰音乐封面大背景层（最底层，不模糊） -->
    <div class="music-cover-bg" :style="currentTrack?.pic ? { backgroundImage: `linear-gradient(to right, #090616 5%, rgba(9, 6, 22, 0.6) 30%, rgba(9, 6, 22, 0.1) 100%), linear-gradient(to bottom, rgba(9, 6, 22, 0) 80%, #090616 100%), url(${currentTrack.pic})` } : {}"></div>

    <!-- 沉浸式动态模糊流光大背景层 -->
    <div class="ambient-glow-background" :style="ambientBgStyle"></div>

    <!-- 深夜极光氛围背景流光 -->
    <div class="aurora-glow aurora-glow-1"></div>
    <div class="aurora-glow aurora-glow-2"></div>
    <div class="aurora-glow aurora-glow-3"></div>

    <!-- 主窗口 -->
    <div class="aura-main-container">
      
      <!-- 顶部 Header 栏 -->
      <header class="aura-header">
        <div class="header-logo-section">
          <div class="header-logo-vinyl" :class="{ 'is-playing': isPlaying }">
            <div class="header-logo-center"></div>
          </div>
          <div class="header-logo-text-group">
            <h1 class="header-title">Aura Music</h1>
            <span class="header-subtitle">让音乐更有温度</span>
          </div>
        </div>

        <!-- 顶部三联状态看板 -->
        <div class="header-dashboard-widgets">
          <div class="header-widget-card">
            <span class="widget-icon">🎧</span>
            <div class="widget-text-group">
              <span class="widget-label">今日陪伴时长</span>
              <span class="widget-value">{{ companionTimeStr }}</span>
            </div>
          </div>
          <div class="header-widget-card">
            <span class="widget-icon">😊</span>
            <div class="widget-text-group">
              <span class="widget-label">当前情绪</span>
              <span class="widget-value">{{ currentEmotion }}</span>
            </div>
          </div>
          <div class="header-widget-card">
            <span class="widget-icon" style="display: flex; align-items: center; justify-content: center;">
              <img v-if="weatherIcon && !weatherIconError" :src="weatherIcon" @error="weatherIconError = true" style="width: 24px; height: 24px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
              <span v-else style="font-size: 20px; line-height: 1;">{{ weatherEmoji }}</span>
            </span>
            <div class="widget-text-group">
              <span class="widget-label">天气</span>
              <span class="widget-value">{{ currentWeather }}</span>
            </div>
          </div>
        </div>

        <div class="header-spectrum-section">
          <canvas ref="headerCanvasRef" class="header-spectrum-canvas"></canvas>
        </div>

        <div class="header-switch-section">
          <div class="switch-glass-container triple">
            <button 
              class="switch-btn" 
              :class="{ active: mode === 'local' }" 
              @click="mode = 'local'"
            >
              本地
            </button>
            <button 
              class="switch-btn" 
              :class="{ active: mode === 'cloud' }" 
              @click="mode = 'cloud'"
            >
              B站
            </button>
            <button 
              class="switch-btn" 
              :class="{ active: mode === 'netease' }" 
              @click="mode = 'netease'"
            >
              网易云
            </button>
            <div class="switch-slider" :class="{ 'slide-bili': mode === 'cloud', 'slide-netease': mode === 'netease' }"></div>
          </div>
        </div>
      </header>

      <!-- 中间四格 OS 网格布局 (改为 2行 3列 布局，彻底防止挤压重合) -->
      <div class="aura-body aura-os-grid">
        
        <!-- 1. 氛围歌词漂浮气泡墙 (左上) -->
        <div class="aura-card atmosphere-card" :style="currentTrack?.pic ? { backgroundImage: `linear-gradient(to bottom, rgba(10, 8, 24, 0.1), rgba(10, 8, 24, 0.4)), url(${currentTrack.pic})` } : {}">
          <div class="atmosphere-header">
            <div class="card-header-status">
              <span class="pulse-dot-green"></span>
              <span class="status-text-green">播放动态</span>
              <span class="status-subtext-blue">已连接</span>
            </div>
          </div>
          
          <!-- 漂浮歌词评论区 -->
          <div class="atmosphere-bubble-container">

            <!-- 动态歌词气泡与弹幕 -->
            <div v-for="bubble in floatingComments" :key="bubble.id"
              class="floating-bubble comment-bubble"
              :class="bubble.type"
              :style="{ top: bubble.y + '%', '--bubble-duration': bubble.duration + 's' }">
              <img :src="bubble.avatar" class="bubble-avatar" />
              <span class="bubble-text">{{ bubble.text }}</span>
            </div>
          </div>

          <div class="atmosphere-footer">
            <span class="now-playing-tag">正在播放：{{ currentTrack ? formatTrackLabel(currentTrack) : '未播放' }}</span>
          </div>
        </div>

        <!-- 2. 当前歌词 + 半露黑胶唱盘 + Aura小助手合并大卡片 (中上 & 右上，占 col 2 / span 2) -->
        <div class="aura-card lyric-vinyl-assistant-card" :class="{ 'is-playing': isPlaying }">
          <!-- 左侧：当前歌词 -->
          <div class="lyric-section">
            <div class="lyric-vinyl-header">
              <span class="panel-tag-title">当前歌词</span>
            </div>
            <div class="lyric-vinyl-body">
              <!-- 左侧大字歌词 -->
              <div class="lyric-panel-left">
                <div class="turntable-lyrics-wrap">
                  <div class="turntable-lyrics-list" :style="{ transform: `translateY(${lyricsOffset}px)` }">
                    <div v-for="(line, idx) in lyrics" :key="idx" 
                      class="lyric-line" 
                      :class="{ 'lyric-line-active': currentLyricIndex === idx }">
                      {{ line.text }}
                    </div>
                    <div v-if="lyrics.length === 0" class="lyric-empty">
                      Aura Music
                    </div>
                  </div>
                </div>
                <div class="lyric-time-indicator">
                  {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 中间：拟物黑胶大唱盘 -->
          <div class="vinyl-section">
            <div class="vinyl-wrapper">
              <div class="vinyl-record" :class="{ playing: isPlaying }">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-highlight-overlay"></div>
                <div class="vinyl-cover" :style="coverStyle">
                  <img v-if="currentTrack?.pic" :src="currentTrack.pic" class="vinyl-cover-img" />
                  <div v-else class="cover-placeholder">🎵</div>
                </div>
              </div>
              <!-- 唱针 -->
              <div class="tonearm-arm" :class="{ 'play-stylus': isPlaying }">
                <div class="tonearm-base"></div>
                <div class="tonearm-shaft"></div>
                <div class="tonearm-head"></div>
              </div>
            </div>
          </div>

          <!-- 右侧：Aura小助手 -->
          <div class="assistant-section">

            <div class="assistant-content-box">

              <div class="assistant-quote-bubble">
                <span class="quote-label">💬 今日一句</span>
                <div class="quote-bubble-content">
                  <p class="quote-text">{{ aiSongQuote }}</p>
                </div>
              </div>
              
              <!-- 下一首推荐 -->
              <div v-if="nextRecommendTrack" class="recommend-mini-card" @click="play(nextRecommendTrack)">
                <div class="rec-header">
                  <span class="rec-title-tag">🎵 下一首推荐</span>
                </div>
                <div class="rec-body">
                  <div class="rec-cover-wrap">
                    <img v-if="nextRecommendTrack.pic" :src="nextRecommendTrack.pic" class="rec-cover-img" />
                    <div v-else class="rec-cover-placeholder">🎵</div>
                  </div>
                  <div class="rec-info">
                    <span class="rec-title">{{ nextRecommendTrack.title }}</span>
                    <span class="rec-artist">{{ nextRecommendTrack.artist || '未知艺术家' }}</span>
                  </div>
                  <button class="rec-play-btn">▶</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 本地歌曲库 (左下 & 中下，跨两列) -->
        <div class="aura-card local-library-card">
          <div class="queue-header">
            <div class="queue-heading">
              <span class="queue-title-log">本地歌曲库</span>
              <span class="queue-count">{{ tracks.length }} 首</span>
            </div>
            <div class="queue-tools">
              <div class="search-input-wrapper">
                <span class="search-icon">🔍</span>
                <input v-model="filterText" class="queue-filter-input" placeholder="搜索歌曲/艺术家/专辑" />
              </div>
              <label class="upload-btn">
                <span>{{ uploading ? '上传中' : '↑ 上传' }}</span>
                <input type="file" multiple accept="audio/*" class="hidden-file-input" @change="uploadFiles" :disabled="uploading" />
              </label>
              <button class="download-center-button" @click="downloadCenterOpen = !downloadCenterOpen" title="打开下载中心">
                下载<span v-if="activeDownloadCount">{{ activeDownloadCount }}</span>
              </button>
            </div>
          </div>

          <div class="library-toolbar">
            <div class="library-tabs" aria-label="音乐库视图">
              <button :class="{ active: activeLibraryView === 'all' }" @click="activeLibraryView = 'all'">全部</button>
              <button :class="{ active: activeLibraryView === 'favorites' }" @click="activeLibraryView = 'favorites'">收藏</button>
              <button :class="{ active: activeLibraryView === 'queue' }" @click="activeLibraryView = 'queue'">播放队列</button>
              <button v-for="item in libraryState.playlists" :key="item.id" :class="{ active: activeLibraryView === `playlist:${item.id}` }" @click="activeLibraryView = `playlist:${item.id}`">{{ item.name }}</button>
            </div>
            <div class="playlist-tools">
              <input v-model="newPlaylistName" maxlength="80" placeholder="新歌单名称" @keydown.enter="submitPlaylist" />
              <button @click="submitPlaylist" :disabled="!newPlaylistName.trim()">新建</button>
              <select v-model="selectedPlaylistId" title="选择要添加的歌单">
                <option value="">添加到歌单</option>
                <option v-for="item in libraryState.playlists" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
              <button v-if="activeLibraryView.startsWith('playlist:')" class="danger-text" @click="deleteActivePlaylist">删除当前歌单</button>
            </div>
          </div>

          <!-- 列表头 -->
          <div class="queue-list-head">
            <span class="qi-num">#</span>
            <span>歌曲</span>
            <span>艺术家</span>
            <span>时长</span>
            <span class="text-right">操作</span>
          </div>

          <!-- 歌曲列表 -->
          <div class="queue-list">
            <div v-for="(track, idx) in filteredTracks" :key="track.filename" 
              class="queue-item" 
              :class="{ 'queue-item-active': currentTrack && currentTrack.filename === track.filename }"
              @click="play(track)"
            >
              <div class="qi-num">
                <span v-if="currentTrack && currentTrack.filename === track.filename && isPlaying" class="mini-spectrum-icon">
                  <span class="bar bar-1"></span>
                  <span class="bar bar-2"></span>
                  <span class="bar bar-3"></span>
                </span>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <div class="qi-track-info">
                <div class="qi-cover-wrap">
                  <img v-if="track.pic" :src="track.pic" class="qi-cover-img" />
                  <div v-else class="qi-cover">🎵</div>
                </div>
                <div class="qi-info">
                  <span class="qi-title" :title="track.title">{{ track.title }}</span>
                </div>
              </div>
              <div class="qi-artist-col" :title="track.artist || '未知'">{{ track.artist || '未知' }}</div>
              <div class="qi-duration-col">{{ track.duration || '--:--' }}</div>
              <div class="qi-actions-group" @click.stop>
                <button class="qi-like-btn" :class="{ liked: isFavorite(track.filename) }" :title="isFavorite(track.filename) ? '取消收藏' : '收藏'" @click="toggleTrackFavorite(track)">{{ isFavorite(track.filename) ? '♥' : '♡' }}</button>
                <button v-if="activeLibraryView === 'queue'" class="qi-action" title="移出播放队列" @click="removeTrackFromQueue(track)">−</button>
                <button v-else class="qi-action" title="加入播放队列" @click="addTrackToQueue(track)">＋</button>
                <button v-if="selectedPlaylistId" class="qi-action" title="添加到所选歌单" @click="addTrackToSelectedPlaylist(track)">≡</button>
                <button v-if="activeLibraryView.startsWith('playlist:')" class="qi-action" title="移出当前歌单" @click="removeTrackFromActivePlaylist(track)">×</button>
                <button class="qi-del" @click="deleteTrack(track)" title="物理删除">🗑️</button>
              </div>
            </div>
          </div>

          <div class="queue-footer-action">
            <button class="view-all-tracks-btn" @click="filterText = ''; activeLibraryView = 'all'">查看全部歌曲 &rarr;</button>
          </div>
        </div>

        <!-- 5. 音乐助手 (右下) -->
        <div class="aura-card chat-console-card">
          <div class="agent-header-row">
            <div class="agent-title-area">
              <span class="pulse-dot-cyan"></span>
              <span class="agent-title-text">音乐助手</span>
            </div>
            <div class="agent-status-tags">
              <span class="status-tag standby">{{ agentLoading ? '思考中' : '待命' }}</span>
              <span class="status-tag ok">{{ agentConfigLoaded && agentConfig.hasKey ? '模型已连接' : '基础模式' }}</span>
              <button class="settings-btn-icon" @click="retryLastAgentMessage" :disabled="agentLoading || !lastUserMessage()" title="重试上一条">↻</button>
              <button class="settings-btn-icon" @click="clearChatHistory" title="清除历史">🧹</button>
              <button class="settings-btn-icon" @click="showSettings = true" title="助手设置">⚙️</button>
            </div>
          </div>

          <div class="agent-chat-messages" id="agent-chat" ref="agentChatEl" @scroll="updateAgentChatScrollState">
            <div v-for="msg in agentMessages" :key="getAgentMessageKey(msg)" class="aura-chat-row" :class="msg.role">
              
              <!-- 消息气泡 -->
              <div class="chat-bubble-container">
                <div class="chat-meta">
                  <span class="meta-role">{{ msg.role === 'agent' ? musicAgentLabel : msg.role === 'operator' ? '我' : '系统' }}</span>
                  <span class="meta-time">{{ msg.time || '00:00:00' }}</span>
                </div>
                <div class="chat-body-text">{{ displayMessageContent(msg.content) }}</div>
                
                <!-- 推荐歌曲卡片列表 -->
                <div v-if="getMessageResults(msg)" class="tracks-card-box">
                  <div class="tracks-card-header">
                    <span class="tracks-count">{{ getMessageResults(msg).length }} 首歌曲</span>
                    <button class="tracks-action-btn" @click="addAllTracks(getMessageResults(msg))" :disabled="getMessageResults(msg).some(item => item.type !== 'local' && !item.downloadToken)">全部添加</button>
                  </div>
                  <div class="tracks-list-container">
                    <div v-for="(r, j) in getMessageResults(msg)" :key="j" class="track-list-item">
                      <div class="t-info">
                        <span class="t-title">{{ r.type === 'local' ? r.track.title : (r.title || '').replace(/<[^>]*>/g, '') }}</span>
                        <span class="t-meta">
                          {{ r.type === 'local' ? r.track.artist : ((((r.artist && r.artist !== 'undefined' && r.artist !== 'null' ? r.artist : '') || (r.author && r.author !== 'undefined' && r.author !== 'null' ? r.author : '') || '未知歌手')) + ' · ' + r.duration) }}
                        </span>
                      </div>
                      <div class="t-actions">
                        <button v-if="r.type === 'local'" class="aura-add-btn added" @click="playLocalTrack(r.track)">播放</button>
                        <template v-else-if="r.type === 'netease'">
                          <button v-if="isTrackAdded(String(r.songId))" class="aura-add-btn added" @click="playAddedTrack(String(r.songId))">播放</button>
                          <button v-else class="aura-add-btn" @click="convertNeteaseAndPlay(r)" :disabled="converting[r.songId] || !r.downloadToken">
                            {{ !r.downloadToken ? '重新搜索' : converting[r.songId] ? '处理中' : '添加' }}
                          </button>
                        </template>
                        <template v-else>
                          <button v-if="isTrackAdded(r.bvid)" class="aura-add-btn added" @click="playAddedTrack(r.bvid)">播放</button>
                          <button v-else class="aura-add-btn" @click="convertAndPlay(r)" :disabled="converting[r.bvid] || !r.downloadToken">
                            {{ !r.downloadToken ? '重新搜索' : converting[r.bvid] ? '处理中' : '添加' }}
                          </button>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="agentLoading" class="aura-chat-row agent">
              <div class="chat-bubble-container">
                <div class="chat-meta">
                  <span class="meta-role">{{ musicAgentLabel }}</span>
                </div>
                <div class="chat-body-text blink-cursor">正在理解你的需求...</div>
              </div>
            </div>
            <div id="agent-chat-end"></div>
          </div>

          <!-- 输入栏 -->
          <div class="agent-input-container">
            <span class="prompt-arrow">▶</span>
            <input v-model="agentInput" class="aura-command-input" placeholder="告诉我你想听什么..." @keydown.enter="sendAgentMessage" :disabled="agentLoading" />
            <button v-if="agentLoading" class="aura-send-btn-micro stop" @click="stopAgentGeneration">停止</button>
            <button v-else class="aura-send-btn-micro" @click="sendAgentMessage" :disabled="!agentInput.trim()">发送</button>
          </div>
        </div>

      </div>

      <!-- 全局底部半嵌入式大唱片播放控制条 -->
      <footer class="bottom-mega-player" :class="{ 'is-playing': isPlaying }">
        <!-- 底部主内容 -->
        <div class="mega-player-content">
          
          <!-- 1. 左侧：歌曲信息与封面（已裁剪） -->
          <div class="mega-section left-section">
            <div class="mega-cover-box" :class="{ 'is-playing': isPlaying }">
              <img v-if="currentTrack && currentTrack.pic" :src="currentTrack.pic" class="mega-cover-img" />
              <div v-else class="mega-cover-placeholder">🎵</div>
            </div>
            <div class="mega-track-meta">
              <div class="mega-track-title-row">
                <span class="mega-track-title" :title="currentTrack ? currentTrack.title : '等待播放'">
                  {{ currentTrack ? currentTrack.title : '等待播放' }}
                </span>
              </div>
              <span class="mega-track-artist">
                {{ currentTrack ? (currentTrack.artist || '未知艺术家') : '--' }}
              </span>
            </div>
          </div>

          <!-- 2. 中间：播控区（已精简扁平化） -->
          <div class="mega-section center-section">
            <div class="mini-play-controls">
              <!-- 循环模式切换 -->
              <button class="mega-loop-btn" @click="cyclePlayMode" :title="getPlayModeTitle()">
                {{ getPlayModeIcon() }}
              </button>
              <!-- 上一首 -->
              <button class="mega-btn prev" @click="prevTrack" title="上一首">⏮</button>
              <!-- 播放/暂停 -->
              <button class="mega-play-btn" :class="{ playing: isPlaying }" @click="togglePlay" title="播放/暂停">
                <span v-if="!isPlaying">▶</span>
                <span v-else>⏸</span>
              </button>
              <!-- 下一首 -->
              <button class="mega-btn next" @click="nextTrack" title="下一首">⏭</button>
            </div>
          </div>

          <!-- 3. 右侧：进度条与音量（合并单行） -->
          <div class="mega-section right-section">
            <div class="mega-progress-row">
              <span class="mega-time">{{ formatTime(currentTime) }}</span>
              <div class="mega-progress-container" @click="seekTo">
                <div class="mega-progress-track">
                  <div class="mega-progress-fill" :style="{ width: duration ? (currentTime / duration * 100) + '%' : '0%' }"></div>
                  <div class="mega-progress-handle" :style="{ left: duration ? (currentTime / duration * 100) + '%' : '0%' }"></div>
                </div>
              </div>
              <span class="mega-time">{{ formatTime(duration) }}</span>
            </div>
            
            <div class="mega-volume-wrap">
              <button class="mega-volume-btn" @click="toggleMute">
                {{ volume > 0 ? '🔊' : '🔇' }}
              </button>
              <div class="mega-volume-slider" @click="setVolume">
                <div class="mega-volume-fill" :style="{ width: volume * 100 + '%' }"></div>
              </div>
            </div>
          </div>

        </div>
        
        <audio ref="audioEl" @timeupdate="onTimeUpdate" @ended="onEnded" preload="auto"></audio>
      </footer>

    </div>

    <MusicDownloadCenter
      :open="downloadCenterOpen"
      :jobs="downloadJobs"
      @close="downloadCenterOpen = false"
      @cancel="job => cancelDownloadJob(job).catch(error => toast.error(error.message))"
      @retry="job => retryDownloadJob(job).catch(error => toast.error(error.message))"
      @clear="clearFinishedDownloadJobs().catch(error => toast.error(error.message))"
    />

    <MusicAgentSettingsModal
      v-if="showSettings"
      :config="agentConfig"
      @update-proxy="agentConfig.proxy = $event"
      @save="saveAgentConfig"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
/* === 极光流光背景与磨砂玻璃视觉系统 === */
.aura-player {
  height: 100%; width: 100%;
  background: linear-gradient(135deg, #090616 0%, #150F2D 50%, #0F0A21 100%);
  color: #E2D8FF;
  font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  overflow: hidden;
  transition: background 1.5s ease;
}

/* 磨砂玻璃卡片 */
.aura-card {
  border: 1px solid rgba(165, 139, 255, 0.12) !important;
  background: rgba(20, 16, 38, 0.5) !important;
  backdrop-filter: blur(28px) saturate(160%) !important;
  border-radius: 8px !important;
  padding: 16px 20px !important; 
  box-sizing: border-box !important;
  box-shadow: 0 12px 48px rgba(10, 5, 20, 0.5) !important;
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s !important;
}

/* 卡片悬停微交互 */
.aura-card:hover {
  box-shadow: 0 20px 56px rgba(123, 97, 255, 0.2) !important;
  border-color: rgba(165, 139, 255, 0.25) !important;
}

/* 动态背景光晕移动 */
.music-cover-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: contain;
  background-position: right center;
  background-repeat: no-repeat;
  opacity: 0.95;
  transition: background-image 1.2s ease;
}

.ambient-glow-background {
  position: absolute;
  inset: -20%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.15;
  filter: blur(80px) saturate(120%);
  background-image: radial-gradient(circle at 30% 30%, #7B61FF 0%, transparent 60%),
                    radial-gradient(circle at 70% 70%, #A58BFF 0%, transparent 60%);
  animation: slow-halo 25s infinite alternate ease-in-out;
  transition: background-image 1.2s ease, filter 1.2s ease, opacity 1.2s ease;
}

@keyframes slow-halo {
  0% { transform: rotate(0deg) scale(1); }
  100% { transform: rotate(360deg) scale(1.15); }
}

/* 霓虹极光背景流光 */
.aurora-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  opacity: 0.22;
  mix-blend-mode: screen;
  z-index: 0;
  will-change: transform;
}
.aurora-glow-1 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgba(123, 97, 255, 0.6) 0%, transparent 80%);
  top: -10%;
  left: 10%;
  animation: aurora-float-1 28s infinite alternate ease-in-out;
}
.aurora-glow-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(165, 139, 255, 0.45) 0%, transparent 80%);
  bottom: -15%;
  right: 15%;
  animation: aurora-float-2 32s infinite alternate ease-in-out;
}
.aurora-glow-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(0, 242, 254, 0.25) 0%, transparent 80%);
  top: 30%;
  left: 45%;
  animation: aurora-float-3 24s infinite alternate ease-in-out;
}

@keyframes aurora-float-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(70px, 50px) scale(1.15); }
}
@keyframes aurora-float-2 {
  0% { transform: translate(0, 0) scale(1.1); }
  100% { transform: translate(-60px, -70px) scale(0.9); }
}
@keyframes aurora-float-3 {
  0% { transform: translate(0, 0) scale(0.95); }
  100% { transform: translate(50px, -40px) scale(1.1); }
}

/* 粒子层 */
.scanline-overlay::after {
  content: ''; position: absolute; inset: 0; z-index: 999; pointer-events: none;
  background-image: radial-gradient(rgba(165, 139, 255, 0.05) 1px, transparent 0);
  background-size: 16px 16px;
  opacity: 0.8;
}

/* 主容器 */
.aura-main-container {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  padding: 16px; box-sizing: border-box;
  z-index: 2;
  gap: 12px;
}

/* 顶部 Header */
.aura-header {
  height: 64px; 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  border: 1px solid rgba(165, 139, 255, 0.12);
  background: rgba(20, 16, 38, 0.6);
  backdrop-filter: blur(20px) saturate(140%);
  padding: 0 20px; 
  border-radius: 20px; 
  box-shadow: 0 8px 32px rgba(10, 5, 20, 0.4);
}

.header-logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo-vinyl {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2a2e 0%, #0c0c0e 65%, #18181c 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 10px rgba(0,0,0,0.4);
}
.header-logo-vinyl.is-playing {
  animation: rotate-disc 8s linear infinite;
}
.header-logo-center {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #A58BFF;
  border: 1px solid #000;
}

.header-logo-text-group {
  display: flex;
  flex-direction: column;
}
.header-title {
  font-size: 15px;
  font-weight: 800;
  color: #D8CCFF;
  margin: 0;
  letter-spacing: 0.04em;
}
.header-subtitle {
  font-size: 9px;
  color: #A58BFF;
  opacity: 0.8;
}

/* 顶部三联状态看板 */
.header-dashboard-widgets {
  display: flex;
  gap: 12px;
  align-items: center;
}
.header-widget-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(165, 139, 255, 0.08);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid rgba(165, 139, 255, 0.1);
}
.widget-icon {
  font-size: 14px;
}
.widget-text-group {
  display: flex;
  flex-direction: column;
}
.widget-label {
  font-size: 8px;
  color: #A58BFF;
  text-transform: uppercase;
}
.widget-value {
  font-size: 11px;
  font-weight: 700;
  color: #D8CCFF;
}

/* 顶部频谱 */
.header-spectrum-section {
  flex: 1;
  height: 24px;
  margin: 0 16px;
  position: relative;
  max-width: 240px;
  mask-image: linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%);
}
.header-spectrum-canvas {
  width: 100%;
  height: 100%;
}

/* 模式切换 */
.header-switch-section {
  display: flex;
  flex-shrink: 0;
  width: 160px;
  justify-content: flex-end;
}
.switch-glass-container {
  display: flex;
  background: rgba(165, 139, 255, 0.08);
  padding: 3px;
  border-radius: 14px;
  position: relative;
  border: 1px solid rgba(165, 139, 255, 0.1);
}
.switch-btn {
  background: transparent;
  border: none;
  color: #A58BFF;
  padding: 4px 12px;
  font-size: 9px;
  font-weight: 800;
  border-radius: 10px;
  cursor: pointer;
  z-index: 2;
  transition: all 0.3s;
}
.switch-btn.active {
  color: #000000;
  background: #D8CCFF;
  box-shadow: 0 4px 12px rgba(216, 204, 255, 0.3);
}
.aura-os-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 38% 62%;
  grid-template-rows: 39% 61%;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

/* 1. 氛围歌词气泡墙 */
.atmosphere-card {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 1s ease;
}

.atmosphere-header {
  z-index: 2;
}
.card-header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8px;
  letter-spacing: 0.1em;
}
.pulse-dot-green {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #52C41A;
  box-shadow: 0 0 8px #52C41A;
  animation: clockPulse 2s infinite;
}
.status-text-green {
  color: #52C41A;
  font-weight: 700;
}
.status-subtext-blue {
  color: #D8CCFF;
  font-weight: 700;
}

/* 漂浮弹幕 */
.atmosphere-bubble-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}
.floating-bubble {
  position: absolute !important;
  left: 100% !important;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(24, 18, 48, 0.75) 0%, rgba(12, 10, 24, 0.45) 100%) !important;
  backdrop-filter: blur(12px) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(165, 139, 255, 0.22) !important;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 6px 20px rgba(123, 97, 255, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.08) !important;
  font-size: 10px;
  font-weight: 500;
  color: #E2D8FF !important;
  will-change: transform;
  animation: bubble-slide-left var(--bubble-duration, 15s) linear forwards;
  transition: all 0.3s;
}
.floating-bubble:hover {
  border-color: rgba(165, 139, 255, 0.45) !important;
  background: rgba(24, 18, 48, 0.9) !important;
  box-shadow: 0 8px 24px rgba(123, 97, 255, 0.22) !important;
  transform: scale(1.03);
  z-index: 10;
}
.bubble-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid rgba(165, 139, 255, 0.3);
  box-shadow: 0 0 6px rgba(165, 139, 255, 0.2);
}
.bubble-text {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes bubble-slide-left {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0;
  }
  10% { opacity: 0.95; }
  50% {
    transform: translate3d(-350px, -4px, 0);
    opacity: 0.95;
  }
  90% { opacity: 0.95; }
  100% {
    transform: translate3d(-700px, 0, 0);
    opacity: 0;
  }
}
.atmosphere-footer {
  z-index: 2;
  margin-top: auto;
}
.now-playing-tag {
  font-size: 9px;
  color: #A58BFF;
  background: rgba(165, 139, 255, 0.1);
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid rgba(165, 139, 255, 0.15);
}

/* 2. 当前歌词 + 半露黑胶唱盘 + Aura小助手合并大卡片 */
.lyric-vinyl-assistant-card {
  grid-column: 2;
  grid-row: 1;
  display: flex !important;
  flex-direction: row !important;
  align-items: stretch !important;
  gap: 16px !important;
}

.lyric-section {
  flex: 1.05;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px 0;
  justify-content: flex-start;
}
.panel-tag-title {
  font-size: 11px;
  font-weight: 800;
  color: #D8CCFF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.lyric-vinyl-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}
.turntable-lyrics-wrap {
  width: 100%;
  height: 100px;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 25%, #000 75%, transparent 100%);
}
.turntable-lyrics-list {
  display: flex;
  flex-direction: column;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform;
}
.lyric-line {
  height: 28px;
  line-height: 28px;
  font-size: 12px;
  color: rgba(216, 204, 255, 0.35);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
.lyric-line-active {
  color: #FFF !important;
  font-weight: 800 !important;
  font-size: 15px !important;
  transform: scale(1.02) !important;
  text-shadow: 0 0 10px rgba(165, 139, 255, 0.8) !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
.lyric-empty {
  height: 90px;
  line-height: 90px;
  font-size: 10px;
  color: rgba(165, 139, 255, 0.4);
}
.lyric-time-indicator {
  font-size: 9px;
  color: #A58BFF;
  margin-top: 6px;
}

/* 拟物黑胶大唱盘 */
.vinyl-section {
  flex: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
}
.vinyl-wrapper {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vinyl-record {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2a2e 0%, #0c0c0e 25%, #1c1c20 35%, #08080a 50%, #151518 68%, #030304 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.05), -8px 8px 24px rgba(0,0,0,0.6);
  animation: rotate-disc 30s linear infinite;
  animation-play-state: paused;
  transition: animation-play-state 0.3s ease;
}
.vinyl-record.playing {
  animation-play-state: running;
}
.vinyl-record .vinyl-cover {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  border: 2px solid #000;
}
.vinyl-grooves {
  position: absolute;
  inset: 0;
  background: repeating-radial-gradient(circle, transparent, transparent 2px, rgba(255,255,255,0.03) 3px, transparent 4px);
  border-radius: 50%;
  pointer-events: none;
}
.vinyl-highlight-overlay {
  position: absolute;
  inset: 0;
  background: conic-gradient(from 45deg, transparent, rgba(255,255,255,0.05) 15%, transparent 30%, transparent 50%, rgba(255,255,255,0.05) 65%, transparent 80%);
  border-radius: 50%;
  pointer-events: none;
}
.vinyl-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tonearm-arm {
  position: absolute;
  top: -18px; 
  right: 18px;
  width: 36px; 
  height: 72px;
  pointer-events: none;
  transform-origin: top right;
  transform: rotate(-35deg);
  transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 5;
}
.tonearm-arm.play-stylus {
  transform: rotate(5deg) !important;
}
.tonearm-arm .tonearm-base {
  position: absolute;
  top: 0; right: 0;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, #3f3f3f 0%, #18181b 80%);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.tonearm-arm .tonearm-shaft {
  position: absolute;
  top: 12px; right: 7px;
  width: 2px; height: 50px;
  background: linear-gradient(to bottom, #d4d4d8, #71717a);
  transform-origin: top center;
}
.tonearm-arm .tonearm-head {
  position: absolute;
  bottom: 0; right: 2px;
  width: 6px; height: 10px;
  background: #27272a;
  border: 1px solid #3f3f46;
}

/* 右侧 Aura 小助手 */
.assistant-section {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  border-left: 1px solid rgba(165, 139, 255, 0.1);
  padding: 12px 0 12px 16px;
  justify-content: flex-start;
}
.assistant-content-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.assistant-status-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(165, 139, 255, 0.08) 0%, rgba(123, 97, 255, 0.02) 100%) !important;
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid rgba(165, 139, 255, 0.12) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
}
.assistant-status-tips:hover {
  transform: translateY(-2px);
  border-color: rgba(165, 139, 255, 0.3) !important;
  box-shadow: 0 6px 20px rgba(123, 97, 255, 0.12) !important;
  background: linear-gradient(135deg, rgba(165, 139, 255, 0.12) 0%, rgba(123, 97, 255, 0.05) 100%) !important;
}
.status-tips-icon {
  font-size: 14px;
}
.tips-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tips-label {
  font-size: 9px;
  color: #A58BFF;
  opacity: 0.85;
}
.tips-value {
  font-size: 11px;
  font-weight: bold;
  color: #E2D8FF;
}
.assistant-quote-bubble {
  display: flex;
  flex-direction: column;
}
.quote-label {
  font-size: 9px;
  color: #A58BFF;
  margin-bottom: 2px;
}
.quote-bubble-content {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 12px;
  padding: 8px 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
}
.quote-bubble-content:hover {
  transform: translateY(-2px);
  border-color: rgba(165, 139, 255, 0.25) !important;
  box-shadow: 0 6px 20px rgba(123, 97, 255, 0.12) !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%) !important;
}
.quote-text {
  font-size: 11px;
  color: #E2D8FF;
  line-height: 1.4;
  font-style: italic;
  margin: 0;
}

.recommend-mini-card {
  background: linear-gradient(135deg, rgba(20, 16, 38, 0.5) 0%, rgba(10, 5, 20, 0.3) 100%) !important;
  border: 1px solid rgba(165, 139, 255, 0.15) !important;
  border-radius: 14px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.recommend-mini-card:hover {
  transform: translateY(-2px);
  border-color: rgba(165, 139, 255, 0.35) !important;
  box-shadow: 0 8px 24px rgba(123, 97, 255, 0.2) !important;
  background: linear-gradient(135deg, rgba(20, 16, 38, 0.6) 0%, rgba(10, 5, 20, 0.4) 100%) !important;
}
.rec-header {
  font-size: 8px;
  color: #A58BFF;
}
.rec-body {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rec-cover-wrap {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  background: #A58BFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 3. Aura 小助手子类样式 */
.assistant-content-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}
.assistant-status-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(165, 139, 255, 0.06);
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid rgba(165, 139, 255, 0.1);
}
.status-tips-icon {
  font-size: 14px;
}
.tips-text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tips-label {
  font-size: 9px;
  color: #A58BFF;
  opacity: 0.85;
}
.tips-value {
  font-size: 11px;
  font-weight: bold;
  color: #E2D8FF;
}
.assistant-quote-bubble {
  display: flex;
  flex-direction: column;
}
.quote-label {
  font-size: 9px;
  color: #A58BFF;
  margin-bottom: 2px;
}
.quote-bubble-content {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px 12px;
}
.quote-text {
  font-size: 11px;
  color: #E2D8FF;
  line-height: 1.4;
  font-style: italic;
  margin: 0;
}

.rec-header {
  font-size: 8px;
  color: #A58BFF;
}
.rec-body {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rec-cover-wrap {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  background: #A58BFF;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rec-cover-placeholder {
  font-size: 8px;
  color: #FFF;
}
.rec-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rec-title {
  font-size: 10px;
  font-weight: 700;
  color: #E2D8FF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-artist {
  font-size: 8px;
  color: #A58BFF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-play-btn {
  background: #7B61FF;
  color: #FFF;
  border: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 4. 本地歌曲库 */
.local-library-card {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  flex-direction: column;
}
.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.queue-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.queue-title-log {
  font-size: 13px;
  font-weight: 800;
  color: #D8CCFF;
}
.queue-count {
  font-size: 10px;
  color: #A58BFF;
}
.queue-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  max-width: 280px;
}
.download-center-button{height:30px;border:1px solid rgba(73,197,182,.45);background:rgba(73,197,182,.08);color:#9be3da;border-radius:4px;padding:0 9px;cursor:pointer;white-space:nowrap}.download-center-button span{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;margin-left:5px;padding:0 4px;border-radius:9px;background:#49c5b6;color:#101417;font-size:10px}.library-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;min-height:30px}.library-tabs{display:flex;flex:1 1 0;gap:3px;overflow-x:auto;min-width:0;max-width:100%;padding-bottom:2px}.library-tabs button,.playlist-tools button{height:26px;border:1px solid transparent;background:transparent;color:#aaa0ba;border-radius:4px;padding:0 8px;white-space:nowrap;cursor:pointer}.library-tabs button.active{background:rgba(73,197,182,.12);border-color:rgba(73,197,182,.35);color:#b9f0e9}.playlist-tools{display:flex;align-items:center;gap:4px;flex-shrink:0}.playlist-tools input,.playlist-tools select{height:26px;max-width:120px;border:1px solid #494056;background:#16131f;color:#ddd5e8;border-radius:4px;padding:0 7px;outline:none}.playlist-tools button{border-color:#494056}.playlist-tools .danger-text{color:#ff9da6}.qi-action{width:24px;height:24px;border:0;background:transparent;color:#afa4bd;cursor:pointer;font-size:16px}.qi-action:hover{color:#78d8cb}.aura-send-btn-micro.stop{border-color:#d76a75;color:#ff9da6}
.library-toolbar{flex-direction:column;align-items:stretch;gap:5px}.library-toolbar .library-tabs{flex:0 0 auto}.playlist-tools{justify-content:flex-end;min-width:0}
.search-input-wrapper {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #A58BFF;
  pointer-events: none;
}
.queue-filter-input {
  width: 100%;
  padding: 4px 8px 4px 22px;
  border-radius: 10px;
  border: 1px solid rgba(165, 139, 255, 0.12);
  background: rgba(20, 16, 38, 0.4);
  color: #E2D8FF;
  font-size: 10px;
  outline: none;
  transition: all 0.3s;
}
.queue-filter-input:focus {
  border-color: #A58BFF;
}
.upload-btn {
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(165, 139, 255, 0.2);
  background: rgba(165, 139, 255, 0.1);
  color: #D8CCFF;
  font-size: 10px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
}
.hidden-file-input {
  display: none;
}
.queue-list-head {
  display: grid;
  grid-template-columns: 24px 2.5fr 1.5fr 70px 130px;
  gap: 8px;
  font-size: 9px;
  font-weight: 800;
  color: #A58BFF;
  padding: 4px 10px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.1);
}
.text-right {
  text-align: right;
}
.queue-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

/* 强力隔离外部样式污染 */
.queue-item {
  display: grid !important;
  grid-template-columns: 24px 2.5fr 1.5fr 70px 130px !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 4px 10px !important;
  height: 40px !important;
  box-sizing: border-box !important;
  border-radius: 10px !important;
  cursor: pointer !important;
  transition: all 0.25s !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
}
.queue-item:hover {
  background: rgba(165, 139, 255, 0.06) !important;
  border-color: rgba(165, 139, 255, 0.12) !important;
  transform: translateY(-1px) !important;
}
.queue-item.queue-item-active {
  background: rgba(123, 97, 255, 0.2) !important;
  border-color: rgba(123, 97, 255, 0.3) !important;
  box-shadow: inset 0 0 10px rgba(123, 97, 255, 0.2) !important;
}
.qi-num {
  font-size: 9px;
  color: #A58BFF;
  text-align: center;
}
.qi-track-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.qi-cover-wrap {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(165, 139, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.qi-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.qi-cover {
  font-size: 10px;
  color: #A58BFF;
}
.qi-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.qi-title {
  font-size: 11px;
  font-weight: 700;
  color: #E2D8FF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.queue-item-active .qi-title {
  color: #FFF;
}
.qi-artist-col {
  font-size: 10px;
  color: #A58BFF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qi-duration-col {
  font-size: 10px;
  color: #A58BFF;
}
.qi-actions-group {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.qi-like-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 10px;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.qi-like-btn:hover { opacity: 1; }
.qi-del {
  background: transparent;
  border: none;
  color: #A58BFF;
  cursor: pointer;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}
.queue-item:hover .qi-del {
  opacity: 0.6;
}
.queue-item:hover .qi-del:hover {
  opacity: 1;
  color: #ff4d4f;
}

.mini-spectrum-icon {
  display: inline-flex;
  align-items: flex-end;
  gap: 1.5px;
  height: 10px;
}
.mini-spectrum-icon .bar {
  width: 1.5px;
  background: #A58BFF;
  border-radius: 1px;
  animation: miniPulse 0.8s infinite alternate ease-in-out;
}
.mini-spectrum-icon .bar-1 { height: 100%; animation-delay: 0.1s; }
.mini-spectrum-icon .bar-2 { height: 60%; animation-delay: 0.3s; }
.mini-spectrum-icon .bar-3 { height: 80%; animation-delay: 0.2s; }
@keyframes miniPulse {
  0% { transform: scaleY(0.3); }
  100% { transform: scaleY(1); }
}

.queue-footer-action {
  padding-top: 6px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(165, 139, 255, 0.08);
}
.view-all-tracks-btn {
  background: transparent;
  border: none;
  color: #D8CCFF;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
}

/* 5. 音乐助手 */
.chat-console-card {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  overflow: hidden;
}
.agent-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.1);
  background: rgba(165, 139, 255, 0.03);
}
.pulse-dot-cyan {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #D8CCFF;
  box-shadow: 0 0 8px #D8CCFF;
  animation: agentPulse 2s infinite;
}
.agent-title-text {
  font-size: 10px;
  font-weight: 800;
  color: #D8CCFF;
  letter-spacing: 0.1em;
}
.agent-status-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-tag {
  font-size: 7px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 4px;
}
.status-tag.standby {
  background: rgba(165, 139, 255, 0.1);
  color: #D8CCFF;
}
.status-tag.ok {
  background: rgba(82, 196, 26, 0.1);
  color: #52C41A;
}
.settings-btn-icon {
  background: transparent;
  border: none;
  color: #A58BFF;
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
}
.agent-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.bash-log-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(165, 139, 255, 0.06);
  border: 1px solid rgba(165, 139, 255, 0.08);
  border-radius: 8px;
  font-family: monospace;
  font-size: 8px;
  color: #D8CCFF;
  overflow-x: auto;
}
.chat-bubble-container {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}
.aura-chat-row.operator { align-items: flex-end; }
.aura-chat-row.operator .chat-bubble-container { align-items: flex-end; }
.aura-chat-row.agent .chat-bubble-container { align-items: flex-start; max-width: 90%; }
.chat-meta {
  display: flex;
  gap: 4px;
  font-size: 7px;
  color: #A58BFF;
  margin-bottom: 1px;
}
.meta-role { font-weight: 800; }
.chat-body-text {
  font-size: 10px;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
}
.aura-chat-row.operator .chat-body-text {
  color: #E2D8FF;
  background: rgba(165, 139, 255, 0.12);
  padding: 6px 10px;
  border-radius: 12px 12px 2px 12px;
}
.aura-chat-row.agent .chat-body-text {
  color: #E2D8FF;
  padding: 6px 10px;
  background: rgba(20, 16, 38, 0.5);
  border: 1px solid rgba(165, 139, 255, 0.12);
  border-left: 3px solid #A58BFF;
  border-radius: 2px 12px 12px 12px;
}

/* 推荐歌曲卡片列表 */
.tracks-card-box {
  margin-top: 4px;
  width: 100%;
  background: rgba(20, 16, 38, 0.6);
  border: 1px solid rgba(165, 139, 255, 0.15);
  border-radius: 12px;
  overflow: hidden;
}
.tracks-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.1);
  background: rgba(165, 139, 255, 0.04);
}
.tracks-count { font-size: 8px; font-weight: 800; color: #A58BFF; }
.tracks-action-btn {
  background: transparent;
  border: 1px solid rgba(165, 139, 255, 0.2);
  color: #D8CCFF;
  font-size: 7px;
  padding: 1px 4px;
  border-radius: 4px;
  cursor: pointer;
}
.track-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(165, 139, 255, 0.06);
}
.t-title { font-size: 9px; font-weight: bold; color: #E2D8FF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-meta { font-size: 7px; color: #A58BFF; }
.aura-add-btn {
  background: transparent;
  border: 1px solid rgba(165, 139, 255, 0.2);
  color: #D8CCFF;
  padding: 1px 4px;
  font-size: 7px;
  border-radius: 4px;
  cursor: pointer;
}
.aura-add-btn.added { color: #A58BFF; border-color: transparent; cursor: default; }

.agent-input-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 14px 12px;
  border-radius: 0 0 24px 24px;
  border-top: 1px solid rgba(165, 139, 255, 0.1);
  background: rgba(20, 16, 38, 0.6);
}
.prompt-arrow { color: #A58BFF; font-weight: 800; font-size: 10px; }
.aura-command-input {
  flex: 1;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(165, 139, 255, 0.12);
  background: rgba(20, 16, 38, 0.4);
  color: #E2D8FF;
  font-size: 10px;
  outline: none;
}
.aura-command-input:focus { border-color: #A58BFF; }
.aura-send-btn-micro {
  background: #D8CCFF;
  color: #000;
  border: none;
  font-size: 9px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
}

/* 底部半嵌入式大唱片播放栏 */
.bottom-mega-player {
  height: 56px;
  border: 1px solid rgba(165, 139, 255, 0.15);
  background: rgba(20, 16, 38, 0.7);
  backdrop-filter: blur(28px) saturate(160%);
  padding: 0 16px;
  border-radius: 16px;
  box-shadow: 0 -12px 48px rgba(10, 5, 20, 0.5);
  display: flex;
  align-items: center;
  position: relative;
  overflow: visible;
}

.mega-player-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mega-section {
  display: flex;
  align-items: center;
}
.mega-section.left-section {
  width: 35%;
  gap: 10px;
  justify-content: flex-start;
}
.mega-cover-box {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(165, 139, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.mega-cover-box.is-playing {
  animation: cover-pulse 3s infinite alternate ease-in-out;
}
@keyframes cover-pulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.03); }
}
.mega-cover-img { width: 100%; height: 100%; object-fit: cover; }
.mega-cover-placeholder {
  font-size: 14px; color: #A58BFF; display: flex; align-items: center; justify-content: center; height: 100%;
}
.mega-track-meta { display: flex; flex-direction: column; min-width: 0; }
.mega-track-title-row { display: flex; align-items: center; gap: 4px; }
.mega-track-title {
  font-size: 11px; font-weight: 800; color: #FFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mega-track-artist { font-size: 9px; color: #A58BFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }

/* 中间：播控区（已精简扁平化） */
.mega-section.center-section {
  width: 30%;
  justify-content: center;
}
.mini-play-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}
.mega-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #D8CCFF;
  border: none;
  color: #141026;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(216, 204, 255, 0.3);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mega-play-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 0 14px rgba(216, 204, 255, 0.6);
}
.mega-btn {
  background: transparent;
  border: none;
  color: #A58BFF;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.75;
  transition: all 0.2s;
}
.mega-btn:hover {
  opacity: 1;
  color: #D8CCFF;
  transform: scale(1.1);
}
.mega-loop-btn {
  background: transparent;
  border: none;
  color: #A58BFF;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.75;
  transition: all 0.2s;
}
.mega-loop-btn:hover {
  opacity: 1;
  color: #D8CCFF;
  transform: scale(1.1);
}

/* 右侧：进度条与音量（合并单行） */
.mega-section.right-section {
  width: 35%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.mega-progress-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 120px;
  max-width: 200px;
}
.mega-time {
  font-size: 8px;
  color: #A58BFF;
  font-family: monospace;
}
.mega-progress-container {
  flex: 1;
  height: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.mega-progress-track {
  height: 3px;
  background: rgba(165, 139, 255, 0.15);
  width: 100%;
  border-radius: 2px;
  position: relative;
}
.mega-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #A58BFF 0%, #F472B6 50%, #60A5FA 100%);
  border-radius: 2px;
  position: absolute;
  left: 0; top: 0;
  box-shadow: 0 0 8px rgba(165, 139, 255, 0.6);
}
.mega-progress-handle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D8CCFF;
  border: 1.5px solid #210F2D;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(216, 204, 255, 0.8);
}
.mega-progress-container:hover .mega-progress-handle {
  transform: translate(-50%, -50%) scale(1.3);
}

.mega-volume-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mega-volume-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: #A58BFF;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.2s;
}
.mega-volume-btn:hover {
  opacity: 1;
}
.mega-volume-slider {
  width: 48px;
  height: 3px;
  background: rgba(165, 139, 255, 0.15);
  border-radius: 1.5px;
  cursor: pointer;
  position: relative;
}
.mega-volume-fill {
  height: 100%;
  background: #A58BFF;
  border-radius: 1.5px;
}

/* 动效 */
@keyframes rotate-disc {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes clockPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes agentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 1100px) {
  .aura-os-grid {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
    overflow-y: auto;
  }
  .atmosphere-card,
  .lyric-vinyl-assistant-card,
  .local-library-card,
  .chat-console-card {
    grid-column: 1 !important;
    grid-row: auto !important;
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 760px) {
  .aura-main-container {
    padding: 8px;
    gap: 8px;
  }
  .aura-header {
    height: 56px;
    padding: 0 10px;
    border-radius: 8px;
  }
  .header-dashboard-widgets,
  .header-spectrum-section {
    display: none;
  }
  .header-logo-section {
    gap: 6px;
  }
  .header-logo-vinyl {
    width: 26px;
    height: 26px;
  }
  .header-subtitle {
    display: none;
  }
  .header-switch-section {
    width: auto;
  }
  .switch-btn {
    padding: 5px 8px;
    font-size: 9px;
  }
  .aura-os-grid {
    grid-template-rows: 130px 360px 180px 390px !important;
    gap: 8px;
    padding-right: 3px;
  }
  .atmosphere-card {
    grid-row: 1 !important;
  }
  .chat-console-card {
    grid-row: 2 !important;
  }
  .lyric-vinyl-assistant-card {
    grid-row: 3 !important;
    flex-direction: row !important;
  }
  .local-library-card {
    grid-row: 4 !important;
  }
  .aura-card {
    border-radius: 8px !important;
    padding: 10px 12px !important;
  }
  .chat-console-card {
    padding: 0 !important;
  }
  .vinyl-section,
  .assistant-section {
    display: none;
  }
  .queue-header,
  .queue-tools {
    align-items: stretch;
  }
  .queue-header {
    flex-direction: column;
    gap: 8px;
  }
  .queue-tools {
    max-width: none;
  }
  .agent-status-tags {
    gap: 4px;
  }
  .status-tag {
    font-size: 8px;
    padding: 2px 5px;
  }
  .chat-body-text {
    font-size: 12px;
  }
  .bottom-mega-player {
    height: 58px;
    padding: 0 10px;
    border-radius: 8px;
    overflow: hidden;
  }
  .mega-player-content {
    gap: 8px;
  }
  .mega-section.left-section {
    width: calc(100% - 116px);
    min-width: 0;
  }
  .mega-section.center-section {
    width: 108px;
    flex: none;
  }
  .mega-section.right-section {
    display: none;
  }
  .mini-play-controls {
    gap: 8px;
  }
  .mega-cover-box {
    width: 34px;
    height: 34px;
    flex: none;
  }
  .mega-track-meta {
    max-width: calc(100% - 42px);
  }
  .mega-track-title,
  .mega-track-artist {
    max-width: 100%;
  }
}
</style>
