import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { confirmDialog, toast } from '../../utils/toast.js'
import { useMusicAgentChat } from '../../composables/useMusicAgentChat.js'
import { useMusicAtmosphere } from '../../composables/useMusicAtmosphere.js'
import { useMusicLyrics } from '../../composables/useMusicLyrics.js'
import { useMusicPetNotifications } from '../../composables/useMusicPetNotifications.js'
import {
  findLocalTrackByKeyword as findTrackInList,
  formatTrackLabel,
  formatDisplayTitle,
  pickBestSearchResult,
  listLocalTrackCandidates,
  MUSIC_MATCH_MIN_SCORE,
  nextCloudRandomQuery,
  normalizeTrackSearchText,
  pickRandomTrack,
} from '../../utils/musicTrackHelpers.js'
import MusicAgentSettingsModal from './MusicAgentSettingsModal.vue'
import MusicDownloadCenter from './MusicDownloadCenter.vue'
import { useMusicDownloadJobs } from '../../composables/useMusicDownloadJobs.js'
import { useMusicLibraryState } from '../../composables/useMusicLibraryState.js'
import { getPreferredMusicMode, setPreferredMusicMode } from '../../composables/useMusicRemotePlayback.js'
import { useMusicPlayback } from '../../composables/useMusicPlayback.js'
import { useMusicSpectrum } from '../../composables/useMusicSpectrum.js'
import { useMusicDanmaku } from '../../composables/useMusicDanmaku.js'
import { createMusicPlaybackCoordinator } from '../../composables/useMusicPlaybackCoordinator.js'

export function useMusicPlayer(options = {}) {

  const props = { agentLabel: options.agentLabel }
  const musicAgentLabel = computed(() => props.agentLabel?.trim() || '乖乖')
  const playbackCoordinator = createMusicPlaybackCoordinator()

  // === 基础核心状态 ===
  const mode = ref(getPreferredMusicMode()) // local | cloud(B站) | netease(网易云)
  watch(mode, (value) => setPreferredMusicMode(value))
  const tracks = ref([])
  const playlist = ref([])
  const currentIndex = ref(-1)
  /** Source of truth for what the <audio> element is actually on (survives loadTracks reshuffles). */
  const activePlaybackFilename = ref('')
  const currentTrack = computed(() => {
    const filename = activePlaybackFilename.value
    if (filename) {
      return playlist.value.find(track => track.filename === filename)
        || tracks.value.find(track => track.filename === filename)
        // 下载刚完成或队列尚未刷新时，仍展示正在播的文件名，避免界面显示「未播放」
        || { filename, title: filename, artist: '' }
    }
    return playlist.value[currentIndex.value] || null
  })
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
  const playlistDialogOpen = ref(false)
  const playlistDialogTrack = ref(null)
  const playlistRenameId = ref('')
  const playlistRenameName = ref('')

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

  const activePlaylist = computed(() => {
    if (!activeLibraryView.value.startsWith('playlist:')) return null
    const id = activeLibraryView.value.slice('playlist:'.length)
    return (libraryState.value.playlists || []).find(item => item.id === id) || null
  })

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
  } = useMusicDownloadJobs({
    onCompleted: async () => {
      await loadTracks()
      syncUiFromAudio?.()
    },
  })

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

  const {
    audioCtx,
    analyser,
    canvasRef,
    dataArray,
    leftCaps,
    rightCaps,
    initAnalyser,
    drawSpectrums,
    stopSpectrum,
  } = useMusicSpectrum({
    audioEl,
    isPlaying,
    leftCanvasRef,
    rightCanvasRef,
    headerCanvasRef,
  })

  // 弹幕保留气泡模式；画布弹幕已从模板移除。
  const {
    danmakuItems,
    loadDanmaku,
    stopDanmaku,
  } = useMusicDanmaku({
    danmakuCanvas: { value: null },
    currentTime,
    isPlaying,
  })


  const floatingComments = ref([])
  let lastTrackIndex = 0
  // 会话大背景：本地先显，外网成功后淡入；气泡仍每次外网随机
  const nextLocalAnimeCoverUrl = () => `/api/music/anime-cover?local=1&n=${1 + Math.floor(Math.random() * 8)}`
  const nextAnimeCoverUrl = () => `/api/music/anime-cover?t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const sessionAnimeCover = ref(nextLocalAnimeCoverUrl())
  let remoteCoverToken = 0
  const refreshSessionAnimeCover = () => {
    const localUrl = nextLocalAnimeCoverUrl()
    sessionAnimeCover.value = localUrl
    const token = ++remoteCoverToken
    const remoteUrl = nextAnimeCoverUrl()
    const img = new Image()
    img.onload = () => {
      if (token !== remoteCoverToken) return
      sessionAnimeCover.value = remoteUrl
    }
    img.onerror = () => {}
    img.src = remoteUrl
  }

  const addBubbleComment = (text, type = 'lyric') => {
    if (!text || !text.trim()) return
    if (floatingComments.value.some(c => c.text === text)) return
    if (floatingComments.value.length >= 4) return

    const id = Date.now() + Math.random()
    const avatar = nextAnimeCoverUrl()
    const track = lastTrackIndex
    lastTrackIndex = (lastTrackIndex + 1) % 5 // 5 条轨道
    const y = 12 + track * 15 + Math.random() * 3 // 分轨定位，适应高度
    const durationSecs = 12 + Math.random() * 6 // 12-18秒随机时间，错开层次
    
    floatingComments.value.push({
      id,
      text,
      avatar,
      y,
      duration: durationSecs,
      type
    })
    
    // 动画结束后自动移除，防内存泄露
    setTimeout(() => {
      const idx = floatingComments.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        floatingComments.value.splice(idx, 1)
      }
    }, durationSecs * 1000 + 500)
  }

  // 粒子悬浮与渐变封面状态
  const coverStyle = computed(() => {
    if (currentTrack.value?.pic) return {}
    if (sessionAnimeCover.value) {
      return {
        backgroundImage: `url(${sessionAnimeCover.value})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
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
      background: `linear-gradient(135deg, ${c1}, ${c2})`
    }
  })

  const ambientBgStyle = computed(() => {
    // 实图只走 music-cover-bg；本层只留色光，避免 78px blur 把动漫糊掉
    return {}
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
      if (!res.ok || data.success === false) {
        throw new Error(data.error || '加载本地曲库失败')
      }
      tracks.value = data.tracks || []
      const savedQueue = (libraryState.value.queue || []).map(filename => tracks.value.find(track => track.filename === filename)).filter(Boolean)
      playlist.value = savedQueue.length ? savedQueue : [...tracks.value]
      // Re-read AFTER await — download onCompleted often starts before play() sets filename.
      const preserveFilename = getStreamFilenameFromAudio?.()
        || activePlaybackFilename.value
        || ''
      if (preserveFilename) {
        let idx = playlist.value.findIndex(track => track.filename === preserveFilename)
        if (idx < 0) {
          const playing = tracks.value.find(track => track.filename === preserveFilename)
          if (playing) {
            playlist.value = [...playlist.value, playing]
            idx = playlist.value.length - 1
          }
        }
        if (idx >= 0) {
          currentIndex.value = idx
          activePlaybackFilename.value = preserveFilename
        }
        syncUiFromAudio?.()
      } else if (playlist.value.length > 0 && currentIndex.value === -1) {
        currentIndex.value = 0
      }
      updatePreselectedTrack()
    } catch (error) {
      tracks.value = []
      toast.error(error?.message || '加载本地曲库失败')
    }
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
    return source.filter((t) => {
      const title = String(t?.title || '').toLowerCase()
      const artist = String(t?.artist || '').toLowerCase()
      const album = String(t?.album || '').toLowerCase()
      const filename = String(t?.filename || '').toLowerCase()
      return title.includes(q) || artist.includes(q) || album.includes(q) || filename.includes(q)
    })
  })

  const toggleTrackFavorite = async (track) => {
    try { await persistFavorite(track) }
    catch (error) { toast.error(error.message || '更新收藏失败') }
  }

  const syncPlaybackQueue = async (nextTracks, options = {}) => {
    try {
      const focusFilename = options.focusFilename
        || getStreamFilenameFromAudio?.()
        || activePlaybackFilename.value
        || currentTrack.value?.filename
      await setPlaybackQueue(nextTracks)
      playlist.value = nextTracks.length ? nextTracks : tracks.value
      currentIndex.value = focusFilename ? playlist.value.findIndex(track => track.filename === focusFilename) : (playlist.value.length ? 0 : -1)
      if (currentIndex.value < 0 && playlist.value.length) currentIndex.value = 0
      if (focusFilename && currentIndex.value >= 0) activePlaybackFilename.value = focusFilename
      syncUiFromAudio?.()
    } catch (error) { toast.error(error.message || '更新播放队列失败') }
  }

  /** Empty queue → full local library (real-player default). */
  const ensurePlaybackQueueFromLibrary = async (options = {}) => {
    if (!tracks.value.length) return []
    const forceFullLibrary = options.forceFullLibrary === true
    const savedQueue = (libraryState.value.queue || [])
      .map(filename => tracks.value.find(track => track.filename === filename))
      .filter(Boolean)
    const next = forceFullLibrary || !savedQueue.length ? [...tracks.value] : savedQueue
    const sameAsCurrent = next.length === playlist.value.length
      && next.every((track, index) => track.filename === playlist.value[index]?.filename)
    if (!sameAsCurrent) {
      await syncPlaybackQueue(next, {
        focusFilename: options.focusFilename
          || activePlaybackFilename.value
          || currentTrack.value?.filename
          || next[0]?.filename,
      })
    } else if (!playlist.value.length) {
      playlist.value = next
    }
    return playlist.value.filter(track => track?.filename)
  }

  const resolvePlaylistTracks = (playlistItem) => (playlistItem?.tracks || [])
    .map(filename => tracks.value.find(track => track.filename === filename))
    .filter(Boolean)

  const matchSavedPlaylistByKeyword = (keyword) => {
    const raw = String(keyword || '').trim()
    const needle = normalizeTrackSearchText(raw
      .replace(/^(播放|打开|听一下|听下|来首|来一首)/, '')
      .replace(/(这个)?歌单$/, '')
      .trim())
    if (!needle) return null
    const lists = libraryState.value.playlists || []
    // 仅精确匹配歌单名，避免「郑润泽的瞬」误命中名叫「瞬」的歌单
    return lists.find(item => normalizeTrackSearchText(item.name) === needle) || null
  }

  const addTrackToQueue = (track, options = {}) => {
    const current = (libraryState.value.queue || []).map(filename => tracks.value.find(item => item.filename === filename)).filter(Boolean)
    if (!current.some(item => item.filename === track.filename)) current.push(track)
    // Prefer the freshly resolved track object when the queue only stored filenames.
    const idx = current.findIndex(item => item.filename === track.filename)
    if (idx >= 0) current[idx] = track
    return syncPlaybackQueue(current, {
      focusFilename: options.focus ? track.filename : undefined,
    })
  }

  const removeTrackFromQueue = (track) => syncPlaybackQueue(
    (libraryState.value.queue || []).filter(filename => filename !== track.filename).map(filename => tracks.value.find(item => item.filename === filename)).filter(Boolean)
  )

  const submitPlaylist = async () => {
    const name = newPlaylistName.value.trim()
    if (!name) return
    try {
      const previousIds = new Set((libraryState.value.playlists || []).map(item => item.id))
      const data = await createPlaylist(name)
      const created = (data.state?.playlists || []).find(item => !previousIds.has(item.id))
      newPlaylistName.value = ''
      if (created && playlistDialogTrack.value) {
        await addTrackToPlaylist(playlistDialogTrack.value, created.id, { close: true })
      } else if (created) {
        toast.success(`已创建歌单“${created.name}”`)
      }
      return created
    }
    catch (error) { toast.error(error.message || '创建歌单失败') }
  }

  const openPlaylistManager = () => {
    playlistDialogTrack.value = null
    playlistRenameId.value = ''
    playlistDialogOpen.value = true
  }

  const openPlaylistPicker = (track) => {
    playlistDialogTrack.value = track
    playlistRenameId.value = ''
    playlistDialogOpen.value = true
  }

  const closePlaylistDialog = () => {
    playlistDialogOpen.value = false
    playlistDialogTrack.value = null
    playlistRenameId.value = ''
    playlistRenameName.value = ''
    newPlaylistName.value = ''
  }

  const playlistContainsTrack = (item, track = playlistDialogTrack.value) => (
    !!track?.filename && (item?.tracks || []).includes(track.filename)
  )

  const addTrackToPlaylist = async (track, playlistId, options = {}) => {
    const item = (libraryState.value.playlists || []).find(list => list.id === playlistId)
    if (!item) return toast.error('歌单不存在')
    if (playlistContainsTrack(item, track)) {
      toast.info(`“${formatDisplayTitle(track.title) || track.title}”已在歌单中`)
      return item
    }
    try {
      await updatePlaylist(item.id, { tracks: [...(item.tracks || []), track.filename] })
      toast.success(`已添加到“${item.name}”`)
      if (options.close !== false) closePlaylistDialog()
      return item
    }
    catch (error) { toast.error(error.message || '添加到歌单失败') }
  }

  const openSavedPlaylist = (id) => {
    activeLibraryView.value = `playlist:${id}`
    filterText.value = ''
    closePlaylistDialog()
  }

  const beginPlaylistRename = (item) => {
    playlistRenameId.value = item.id
    playlistRenameName.value = item.name
  }

  const cancelPlaylistRename = () => {
    playlistRenameId.value = ''
    playlistRenameName.value = ''
  }

  const savePlaylistRename = async (item) => {
    const name = playlistRenameName.value.trim()
    if (!name || name === item.name) return cancelPlaylistRename()
    try {
      await updatePlaylist(item.id, { name })
      cancelPlaylistRename()
      toast.success('歌单名称已更新')
    } catch (error) { toast.error(error.message || '歌单改名失败') }
  }

  const deleteSavedPlaylist = async (item) => {
    const confirmed = await confirmDialog(`确定要删除歌单“${item?.name || ''}”吗？\n歌曲文件不会被删除。`)
    if (!confirmed) return
    try {
      await persistDeletePlaylist(item.id)
      if (activeLibraryView.value === `playlist:${item.id}`) activeLibraryView.value = 'all'
      toast.success('歌单已删除')
    } catch (error) { toast.error(error.message || '删除歌单失败') }
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
    const item = (libraryState.value.playlists || []).find(list => list.id === id)
    return item ? deleteSavedPlaylist(item) : undefined
  }

  const activePlaylistTrackPosition = (track) => activePlaylist.value?.tracks?.indexOf(track?.filename) ?? -1

  const moveTrackInActivePlaylist = async (track, direction) => {
    const item = activePlaylist.value
    if (!item) return
    const index = activePlaylistTrackPosition(track)
    const target = index + direction
    if (index < 0 || target < 0 || target >= item.tracks.length) return
    const nextTracks = [...item.tracks]
    ;[nextTracks[index], nextTracks[target]] = [nextTracks[target], nextTracks[index]]
    try { await updatePlaylist(item.id, { tracks: nextTracks }) }
    catch (error) { toast.error(error.message || '调整歌曲顺序失败') }
  }


  const {
    prevVolume,
    startAudioPlayback,
    play,
    togglePlay,
    stopPlayback,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    onTimeUpdate,
    onEnded,
    toggleMute,
    syncUiFromAudio,
    getStreamFilenameFromAudio,
  } = useMusicPlayback({
    audioEl,
    audioCtx,
    playlist,
    currentIndex,
    currentTrack,
    activePlaybackFilename,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    nextRecommendTrack,
    loadLyrics,
    resetLyrics,
    resetPetLyricIndex,
    updateCurrentLyrics,
    notifyMusicPetPlaying,
    notifyMusicPetIdle,
    notifyMusicPet,
    updatePreselectedTrack,
    loadDanmaku,
    initAnalyser,
    drawSpectrums,
    danmakuItems,
    addBubbleComment,
    playbackCoordinator,
  })

  const unregisterPlaybackStop = playbackCoordinator.registerLocalStop((intent) => {
    stopPlayback({
      broadcast: false,
      resetPosition: intent?.kind === 'stop',
      notify: false,
    })
  })

  const playPlaylistById = async (playlistId, options = {}) => {
    const item = (libraryState.value.playlists || []).find(list => list.id === playlistId)
    if (!item) {
      toast.error('歌单不存在')
      return { success: false, error: '歌单不存在' }
    }
    const list = resolvePlaylistTracks(item)
    if (!list.length) {
      toast.error('歌单里还没有歌曲')
      return { success: false, error: '歌单里还没有歌曲' }
    }
    const start = options.startTrack
      ? (list.find(track => track.filename === options.startTrack.filename) || list[0])
      : list[0]
    const playbackIntent = options.playbackIntent || playbackCoordinator.beginPlaybackIntent({
      keyword: item.name,
      commandId: options.commandId,
      source: options.source || (options.remote ? 'remote-playlist' : 'player-playlist'),
    })
    const superseded = () => playbackCoordinator.supersededResult(playbackIntent)
    if (!playbackCoordinator.isCurrent(playbackIntent)) return superseded()
    await syncPlaybackQueue(list, { focusFilename: start.filename })
    if (!playbackCoordinator.isCurrent(playbackIntent)) return superseded()
    if (!activeLibraryView.value.startsWith('playlist:')) activeLibraryView.value = 'queue'
    const playResult = await play(start, { ...options, remote: options.remote === true, playbackIntent })
    if (playResult?.skipped) return playResult
    if (!playResult?.success) return { success: false, error: playResult?.error || '播放失败' }
    if (!playbackCoordinator.isCurrent(playbackIntent)) return superseded()
    return { success: true, source: 'playlist', title: formatTrackLabel(start), playlistName: item.name, count: list.length }
  }

  const playActivePlaylistAll = async () => {
    if (!activeLibraryView.value.startsWith('playlist:')) {
      toast.error('请先打开一个歌单')
      return { success: false, error: '请先打开一个歌单' }
    }
    return playPlaylistById(activeLibraryView.value.slice('playlist:'.length))
  }

  onMounted(async () => {
    refreshSessionAnimeCover()

    // 必须先注册全局播放引擎，再 await 曲库加载；否则 client_effect 会 take 掉指令却找不到引擎
    window.__cc_global_stop_music = async (options = {}) => {
      try {
        stopPlayback({ ...options, source: options.source || 'global-stop' })
        return { success: true, message: '已停止播放' }
      } catch (err) {
        return { success: false, error: err?.message || '停止播放失败' }
      }
    }

    window.__cc_global_sync_music_ui = () => {
      try { syncUiFromAudio?.() } catch {}
    }

    window.__cc_global_play_music = async (keyword, options = {}) => {
      console.log('[GlobalPlay] 收到全局播放指令:', keyword, options)
      const kw = String(keyword || '').trim()
      if (!kw) return { success: false, error: '缺少要播放的歌曲关键词' }
      const playbackIntent = playbackCoordinator.beginPlaybackIntent({
        keyword: kw,
        commandId: options.commandId,
        source: options.source || 'global-play',
      })
      const isLatest = () => playbackCoordinator.isCurrent(playbackIntent)
      const superseded = () => playbackCoordinator.supersededResult(playbackIntent)
      if (!isLatest()) return superseded()
      const playModeHint = String(options.mode || mode.value || getPreferredMusicMode() || 'cloud').trim()
      if (['local', 'cloud', 'netease'].includes(playModeHint) && mode.value !== playModeHint) {
        mode.value = playModeHint
      }

      if (!tracks.value.length) {
        await loadTracks()
        if (!isLatest()) return superseded()
      }

      const selectTrackFromCandidates = async (query, candidates) => {
        if (!isLatest()) return superseded()
        const list = Array.isArray(candidates) ? candidates.slice(0, 8) : []
        if (!list.length) return { success: false, rejected: true, error: '没有可供选择的候选歌曲' }
        try {
          const res = await fetch('/api/music/select-track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword: query,
              candidates: list.map((item) => ({
                title: item.title || item.name || '',
                artist: item.artist || item.author || item.singer || '',
                name: item.name || '',
                author: item.author || '',
                singer: item.singer || '',
                filename: item.filename || item.track?.filename || '',
              })),
            }),
          })
          if (!isLatest()) return superseded()
          const data = await res.json()
          if (!isLatest()) return superseded()
          if (data?.rejected || data?.success === false || !Number.isInteger(data?.index) || data.index < 0) {
            return { success: false, rejected: true, error: data?.reason || '未找到足够匹配的歌曲', source: data?.source }
          }
          return {
            success: true,
            item: list[data.index],
            source: data.source || 'model',
            reason: data.reason || '',
          }
        } catch (err) {
          if (!isLatest()) return superseded()
          const best = pickBestSearchResult(query, list)
          if (!best) return { success: false, rejected: true, error: err?.message || '选曲失败' }
          return { success: true, item: best, source: 'fallback', reason: '本地规则打分兜底' }
        }
      }

      const playSelectedLocal = async (track, sourceLabel = 'local') => {
        if (!isLatest()) return superseded()
        await addTrackToQueue(track, { focus: true })
        if (!isLatest()) return superseded()
        activeLibraryView.value = 'queue'
        const playResult = await play(track, { ...options, remote: true, source: sourceLabel, playbackIntent })
        if (!isLatest()) return superseded()
        syncUiFromAudio?.()
        if (playResult?.skipped) return playResult
        if (!playResult?.success) return { success: false, error: playResult?.error || '播放失败' }
        return { success: true, source: sourceLabel, title: formatTrackLabel(track) }
      }

      const playCloudByMode = async (query) => {
        if (!isLatest()) return superseded()
        const q = String(query || '').trim()
        if (!q) return { success: false, error: '缺少搜索关键词' }
        if (playModeHint === 'local') {
          return { success: false, error: '本地模式未找到可播放歌曲' }
        }
        if (playModeHint === 'netease') {
          console.log('[GlobalPlay] 网易云搜索:', q)
          const res = await fetch(`/api/music/search-netease?q=${encodeURIComponent(q)}`)
          if (!isLatest()) return superseded()
          const data = await res.json()
          if (!isLatest()) return superseded()
          if (data.success && data.results?.length) {
            const picked = await selectTrackFromCandidates(q, data.results)
            if (!isLatest()) return superseded()
            if (!picked.success) return { success: false, error: picked.error || '网易云未找到足够匹配的歌曲' }
            const played = await convertNeteaseAndPlay(picked.item, { ...options, remote: true, playbackIntent })
            if (!isLatest()) return superseded()
            syncUiFromAudio?.()
            return played?.success ? { ...played, pickSource: picked.source } : played
          }
          return { success: false, error: data.error || '网易云未找到相关歌曲' }
        }
        console.log('[GlobalPlay] B站搜索:', q)
        const biliRes = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`)
        if (!isLatest()) return superseded()
        const biliData = await biliRes.json()
        if (!isLatest()) return superseded()
        if (biliData.success && biliData.results?.length) {
          const picked = await selectTrackFromCandidates(q, biliData.results)
          if (!isLatest()) return superseded()
          if (!picked.success) return { success: false, error: picked.error || 'B站未找到足够匹配的歌曲' }
          const played = await convertAndPlay(picked.item, { ...options, remote: true, playbackIntent })
          if (!isLatest()) return superseded()
          syncUiFromAudio?.()
          return played?.success ? { ...played, pickSource: picked.source } : played
        }
        return { success: false, error: biliData.error || 'B站未找到相关歌曲' }
      }

      // 播放指定歌单：整单入队
      const savedPlaylist = matchSavedPlaylistByKeyword(kw)
      if (savedPlaylist && !isRandomMusicKeyword(kw)) {
        const played = await playPlaylistById(savedPlaylist.id, { ...options, remote: true, playbackIntent })
        if (!isLatest()) return superseded()
        if (played.success) {
          console.log('[GlobalPlay] 播放歌单:', savedPlaylist.name, played.count)
          return played
        }
      }

      if (isRandomMusicKeyword(kw)) {
        // 有本地曲：全库入队后在队列内随机，绝不先走云端热门
        if (tracks.value.length) {
          const pool = await ensurePlaybackQueueFromLibrary({ forceFullLibrary: true })
          if (!isLatest()) return superseded()
          const randomTrack = pickRandomTrack(pool, { excludeTrack: currentTrack.value })
          if (randomTrack) {
            console.log('[GlobalPlay] 随机播放本地队列:', randomTrack.title || randomTrack.filename)
            activeLibraryView.value = 'queue'
            const playResult = await play(randomTrack, { ...options, remote: true, source: 'local-random', playbackIntent })
            if (!isLatest()) return superseded()
            syncUiFromAudio?.()
            if (playResult?.skipped) return playResult
            if (!playResult?.success) return { success: false, error: playResult?.error || '播放失败' }
            return { success: true, source: 'local-random', title: formatTrackLabel(randomTrack) }
          }
        }
        // 仅本地无曲时云端兜底，查询词轮换避免总播同一批热门
        if (playModeHint === 'local') {
          return { success: false, error: '本地曲库为空，请先导入歌曲或切换到云端模式' }
        }
        const cloudQuery = nextCloudRandomQuery(playModeHint)
        try {
          const cloud = await playCloudByMode(cloudQuery)
          if (!isLatest()) return superseded()
          if (cloud.success) return { ...cloud, source: `${cloud.source || playModeHint}-random` }
          return cloud
        } catch (err) {
          if (!isLatest()) return superseded()
          return { success: false, error: err?.message || '随机播放失败' }
        }
      }

      // 1. Local candidates → model/rule pick when multiple; single strong hit can play directly.
      const localRows = listLocalTrackCandidates(kw, tracks.value, { minScore: 40, limit: 8 })
      const strongLocal = localRows.filter(row => row.score >= MUSIC_MATCH_MIN_SCORE)
      if (strongLocal.length === 1) {
        console.log('[GlobalPlay] 本地唯一高分匹配:', formatTrackLabel(strongLocal[0].track))
        return await playSelectedLocal(strongLocal[0].track, 'local')
      }
      if (localRows.length > 0) {
        const picked = await selectTrackFromCandidates(kw, localRows.map(row => row.track))
        if (!isLatest()) return superseded()
        if (picked.success && picked.item) {
          console.log('[GlobalPlay] 本地候选已点名:', formatTrackLabel(picked.item), picked.source)
          return await playSelectedLocal(picked.item, `local-${picked.source || 'pick'}`)
        }
        // Keep going to cloud if local pick rejected.
      } else {
        const matchedLocal = findLocalTrackByKeyword(kw)
        if (matchedLocal) return await playSelectedLocal(matchedLocal, 'local')
      }

      // 2. Mode-aware cloud search + model pick.
      try {
        const played = await playCloudByMode(kw)
        if (!isLatest()) return superseded()
        return played
      } catch (err) {
        if (!isLatest()) return superseded()
        console.error('[GlobalPlay] 云端播放失败:', err)
        return { success: false, error: err?.message || '未在本地或网络搜索到相关歌曲' }
      }
    }

    await loadLibraryState().catch((error) => {
      toast.error(error?.message || '加载音乐库状态失败')
    })
    await loadTracks()
    // 空队列时用全库填充，对齐真实播放器
    await ensurePlaybackQueueFromLibrary().catch(() => {})
    loadDownloadJobs()
    loadAgentConfig()
    loadChatMessages()

    // 播放时长：仅在播放状态下计时，每秒存储到 localStorage
    companionTimer = setInterval(() => {
      recordCompanionSecond(isPlaying.value)
    }, 1000)
    // 初始获取天气
    fetchWeather()
    // 每30分钟刷新一次天气
    weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000)
    
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
    if (window.__cc_global_stop_music) {
      delete window.__cc_global_stop_music
    }
    if (window.__cc_global_sync_music_ui) {
      delete window.__cc_global_sync_music_ui
    }
    stopDanmaku()
    stopSpectrum()
    if (remoteCommandTimer) {
      clearInterval(remoteCommandTimer)
      remoteCommandTimer = null
    }
    if (companionTimer) clearInterval(companionTimer)
    if (weatherTimer) clearInterval(weatherTimer)
    detachAgentChatResizeObserver()
    unregisterPlaybackStop()
    playbackCoordinator.dispose()
    notifyMusicPetIdle('音乐播放器已关闭')
  })

  // === Agent 对话 ===
  const formatTimeHHMMSS = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  const autoplayFromAgentAction = async (action) => {
    if (!action || action.type !== 'play_music') return null
    const source = String(action.source || '').trim().toLowerCase()
    if (source && !['agent', 'fallback', 'simple-fallback'].includes(source)) return null
    const keyword = String(action.keyword || '').trim()
    if (!keyword || typeof window.__cc_global_play_music !== 'function') return null
    const result = await window.__cc_global_play_music(keyword)
    if (result?.skipped) return result
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
      if (playResult) {
        pushAgentMessage({
          role: 'system',
          content: playResult.success
            ? `🎵 已自动播放：${playResult.title}（${playResult.source}）`
            : `❌ 自动播放失败：${playResult.error || '未找到歌曲'}`,
          time: formatTimeHHMMSS()
        })
        scrollChat()
      }
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
          if (result && !result.skipped) {
            pushAgentMessage({
              role: 'system',
              content: result.success
                ? `🎵 已自动播放：${result.title}（${result.source}）`
                : `❌ 自动播放失败：${result.error || '未找到歌曲'}`,
              time: formatTimeHHMMSS()
            })
            scrollChat()
          }
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
    const shouldPlay = options.play !== false
    const playbackIntent = shouldPlay
      ? (options.playbackIntent || playbackCoordinator.beginPlaybackIntent({
          keyword: title,
          commandId: options.commandId,
          source: options.source || `${item.type || 'cloud'}-download`,
        }))
      : null
    const isLatest = () => !playbackIntent || playbackCoordinator.isCurrent(playbackIntent)
    const superseded = () => playbackCoordinator.supersededResult(playbackIntent)
    if (!isLatest()) return superseded()
    converting.value = { ...converting.value, [identifier]: true }
    try {
      const job = await createDownloadJob(item)
      if (!isLatest()) return superseded()
      if (options.wait === false) return { success: true, queued: true, jobId: job.id, source: item.type, title }
      const completed = await waitForJob(job.id)
      if (!isLatest()) return superseded()
      await loadTracks()
      if (!isLatest()) return superseded()
      const newTrack = tracks.value.find(track => track.filename === completed.filename)
      if (!newTrack) throw new Error('下载完成，但歌曲没有出现在本地曲库')
      if (!isLatest()) return superseded()
      await addTrackToQueue(newTrack, { focus: options.play !== false })
      if (!isLatest()) return superseded()
      if (options.play !== false) {
        activeLibraryView.value = 'queue'
        activePlaybackFilename.value = newTrack.filename || ''
        if (!isLatest()) return superseded()
        const playResult = await play(newTrack, { ...options, playbackIntent })
        if (!isLatest()) return superseded()
        syncUiFromAudio?.()
        if (playResult?.skipped) return playResult
        if (!playResult?.success) throw new Error(playResult?.error || '播放失败')
      }
      return { success: true, source: item.type, title: newTrack.title || title, filename: completed.filename }
    } catch (error) {
      if (!isLatest()) return superseded()
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

  return {
    activeDownloadCount,
    activeLibraryView,
    activePlaylist,
    activePlaylistTrackPosition,
    addAllTracks,
    addBubbleComment,
    addTrackToPlaylist,
    addTrackToQueue,
    agentChatEl,
    agentConfig,
    agentConfigLoaded,
    agentInput,
    agentLoading,
    agentMessages,
    aiSongQuote,
    ambientBgStyle,
    analyser,
    sessionAnimeCover,
    appendAgentMessageContent,
    attachAgentChatResizeObserver,
    audioCtx,
    audioEl,
    autoplayFromAgentAction,
    beginAgentRequest,
    buildAgentRequestHistory,
    beginPlaylistRename,
    cancelPlaylistRename,
    cancelDownloadJob,
    canvasRef,
    captureAgentChatScroll,
    clearChatHistory,
    clearFinishedDownloadJobs,
    closePlaylistDialog,
    companionTimeStr,
    companionTimer,
    convertAndPlay,
    convertNeteaseAndPlay,
    converting,
    coverStyle,
    createDownloadJob,
    createPlaylist,
    currentEmotion,
    currentIndex,
    currentLyricIndex,
    currentTime,
    currentTrack,
    currentWeather,
    cyclePlayMode,
    danmakuItems,
    dataArray,
    deleteActivePlaylist,
    deleteSavedPlaylist,
    deletePlaylist: persistDeletePlaylist,
    deleteTrack,
    detachAgentChatResizeObserver,
    displayMessageContent,
    downloadCenterOpen,
    downloadJobs,
    downloadResult,
    drawSpectrums,
    duration,
    fetchWeather,
    filterText,
    filteredTracks,
    findLocalTrackByKeyword,
    finishAgentRequest,
    floatingComments,
    formatTime,
    formatTimeHHMMSS,
    formatDisplayTitle,
    formatTrackLabel,
    getAgentMessageKey,
    getMessageResults,
    getPlayModeIcon,
    getPlayModeTitle,
    headerCanvasRef,
    initAnalyser,
    isFavorite,
    isPlaying,
    isRandomMusicKeyword,
    isTrackAdded,
    lastTrackIndex,
    lastUserMessage,
    leftCanvasRef,
    leftCaps,
    libraryState,
    loadAgentConfig,
    loadChatMessages,
    loadDanmaku,
    loadDownloadJobs,
    loadLibraryState,
    loadLyrics,
    loadTracks,
    lyrics,
    lyricsOffset,
    mode,
    moveTrackInActivePlaylist,
    musicAgentLabel,
    newPlaylistName,
    nextRecommendTrack,
    nextTrack,
    notifyMusicPet,
    notifyMusicPetIdle,
    notifyMusicPetPlaying,
    notifyMusicPetSpeech,
    onEnded,
    onTimeUpdate,
    parseMessageTracks,
    play,
    playActivePlaylistAll,
    playAddedTrack,
    playLocalTrack,
    playPlaylistById,
    playMode,
    playlist,
    playlistContainsTrack,
    playlistDialogOpen,
    playlistDialogTrack,
    playlistRenameId,
    playlistRenameName,
    ensurePlaybackQueueFromLibrary,
    prevTrack,
    prevVolume,
    pushAgentMessage,
    recordCompanionSecond,
    remoteCommandTimer,
    removeTrackFromActivePlaylist,
    removeTrackFromQueue,
    resetLyrics,
    resetPetLyricIndex,
    retryDownloadJob,
    retryLastAgentMessage,
    rightCanvasRef,
    rightCaps,
    saveAgentConfig,
    scrollChat,
    seekTo,
    savePlaylistRename,
    sendAgentMessage,
    sendToClaudeAgent,
    sendToSimpleAgent,
    setAgentMessageContent,
    setAgentMessageResults,
    setPlaybackQueue,
    setVolume,
    showSettings,
    startAudioPlayback,
    stopAgentGeneration,
    stopAgentRequest,
    stopDanmaku,
    stopPlayback,
    stopSpectrum,
    submitPlaylist,
    syncPlaybackQueue,
    toggleFavorite: persistFavorite,
    toggleMute,
    togglePlay,
    toggleTrackFavorite,
    toast,
    tracks,
    updateAgentChatScrollState,
    updateCurrentLyrics,
    updatePlaylist,
    openPlaylistManager,
    openPlaylistPicker,
    openSavedPlaylist,
    updatePreselectedTrack,
    uploadFiles,
    uploading,
    volume,
    waitForJob,
    weatherEmoji,
    weatherIcon,
    weatherIconError,
    weatherTimer,
    MusicAgentSettingsModal,
    MusicDownloadCenter
  }
}
