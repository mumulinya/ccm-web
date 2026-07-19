import { ref, watch } from 'vue'
import { toast } from '../utils/toast.js'
import { formatTrackLabel, pickRandomTrack, rememberPlayedTrack } from '../utils/musicTrackHelpers.js'

export function getStreamFilenameFromAudio(el) {
  if (!el) return ''
  try {
    const src = el.currentSrc || el.src || ''
    if (!src) return ''
    const url = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    return decodeURIComponent(url.searchParams.get('file') || '').trim()
  } catch {
    const match = String(el.src || '').match(/[?&]file=([^&]+)/)
    return match ? decodeURIComponent(match[1]).trim() : ''
  }
}

/** Behavior-freeze extraction: core audio playback controls for MusicPlayer. */
export function useMusicPlayback(deps) {
  const {
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
    drawDanmaku,
    danmakuItems,
    addBubbleComment,
    playbackCoordinator,
  } = deps

  const prevVolume = ref(0.7)
  const beginPlaybackIntent = (metadata = {}) => playbackCoordinator?.beginPlaybackIntent(metadata) || null
  const isPlaybackIntentCurrent = (intent) => !intent || !playbackCoordinator || playbackCoordinator.isCurrent(intent)
  const supersededResult = (intent) => playbackCoordinator?.supersededResult(intent) || {
    success: false,
    skipped: true,
    reason: 'superseded',
  }

  /** Keep Vue UI locked to the real <audio> element (global/remote play races otherwise). */
  const syncUiFromAudio = () => {
    const el = audioEl.value
    if (!el) return
    isPlaying.value = !el.paused && !el.ended
    const filename = getStreamFilenameFromAudio(el)
    if (!filename) return
    if (activePlaybackFilename) activePlaybackFilename.value = filename
    const idx = playlist.value.findIndex(track => track.filename === filename)
    if (idx >= 0) currentIndex.value = idx
  }

  let audioListenersBound = false
  let lastTimeSyncAt = 0
  const bindAudioUiSync = (el) => {
    if (!el || audioListenersBound) return
    audioListenersBound = true
    const sync = () => syncUiFromAudio()
    el.addEventListener('play', sync)
    el.addEventListener('playing', sync)
    el.addEventListener('pause', sync)
    el.addEventListener('ended', sync)
    el.addEventListener('emptied', sync)
    // Keep isPlaying/filename aligned even if Vue state was stomped mid-download.
    el.addEventListener('timeupdate', () => {
      const now = Date.now()
      if (now - lastTimeSyncAt < 500) return
      lastTimeSyncAt = now
      syncUiFromAudio()
    })
  }

  watch(audioEl, (el) => { if (el) bindAudioUiSync(el) }, { immediate: true })

  const startAudioPlayback = async (track = currentTrack.value, options = {}) => {
    const playbackIntent = options.playbackIntent || beginPlaybackIntent({
      keyword: formatTrackLabel(track),
      source: options.source || (options.remote ? 'remote-resume' : 'player-resume'),
    })
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    if (!audioEl.value) return { success: false, error: '播放器未准备就绪' }
    if (audioCtx.value && audioCtx.value.state === 'suspended') {
      try { await audioCtx.value.resume() } catch {}
    }
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    resetPetLyricIndex()
    try {
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
      const playResult = audioEl.value.play()
      if (playResult && typeof playResult.then === 'function') {
        await playResult
      }
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
      isPlaying.value = true
      syncUiFromAudio()
      notifyMusicPetPlaying(track)
      return { success: true }
    } catch (err) {
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
      isPlaying.value = false
      syncUiFromAudio()
      const message = err?.name === 'NotAllowedError'
        ? '浏览器拦截了远程自动播放，请在 CCM 页面点击一次播放按钮或允许该站点自动播放后重试'
        : (err?.message || '无法开始播放')
      notifyMusicPet('error', `播放失败：${message}`, track)
      if (options.remote) toast.error(`远程点歌已准备好，但播放被拦截：${message}`, 8000)
      return { success: false, error: message }
    }
  }

  // 频谱与弹幕控制器

  const play = async (track, options = {}) => {
    if (!track) return { success: false, error: '没有可播放的歌曲' }
    const playbackIntent = options.playbackIntent || beginPlaybackIntent({
      keyword: formatTrackLabel(track),
      commandId: options.commandId,
      source: options.source || (options.remote ? 'remote-track' : 'player-track'),
    })
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    let idx = playlist.value.findIndex(t => t.filename === track.filename)
    // Keep UI (currentTrack / controls) aligned with the audio actually playing.
    if (idx === -1) {
      playlist.value = [...playlist.value, track]
      idx = playlist.value.length - 1
    }
    currentIndex.value = idx
    if (activePlaybackFilename) activePlaybackFilename.value = track.filename || ''
    const src = `/api/music/stream?file=${encodeURIComponent(track.filename)}`
    if (!audioEl.value) return { success: false, error: '播放器未准备就绪' }
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    audioEl.value.src = src
    audioEl.value.volume = volume.value
    initAnalyser()
    resetPetLyricIndex()
    // 加载弹幕
    loadDanmaku(track.bvid, track.title, track.artist)
    // 加载歌词
    loadLyrics(track)
    const result = await startAudioPlayback(track, { ...options, playbackIntent })
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    syncUiFromAudio()
    if (result?.success) rememberPlayedTrack(track)
    return result
  }

  const togglePlay = () => {
    if (!audioEl.value) {
      if (playlist.value.length) play(playlist.value[0])
      return
    }
    // Pause the real audio element even if playlist index drifted after remote play.
    const audioPlaying = isPlaying.value || !audioEl.value.paused
    if (audioPlaying) {
      audioEl.value.pause()
      syncUiFromAudio()
      notifyMusicPetIdle(`已暂停：${formatTrackLabel(currentTrack.value)}`)
      return
    }
    syncUiFromAudio()
    if (!currentTrack.value) {
      if (playlist.value.length) play(playlist.value[0])
      return
    }
    const currentSrc = audioEl.value.src || ''
    if (!currentSrc || !currentSrc.includes('/api/music/stream')) {
      play(currentTrack.value)
    } else {
      startAudioPlayback(currentTrack.value)
    }
  }

  const stopPlayback = (options = {}) => {
    if (options.broadcast !== false) {
      playbackCoordinator?.stopEverywhere({
        commandId: options.commandId,
        source: options.source || (options.remote ? 'remote-stop' : 'player-stop'),
      })
    }
    if (audioEl.value) {
      audioEl.value.pause()
      if (options.resetPosition !== false) audioEl.value.currentTime = 0
      syncUiFromAudio()
      if (options.notify !== false) notifyMusicPetIdle('已停止播放', currentTrack.value)
      if (options.resetPosition !== false) resetLyrics()
    }
    return { success: true }
  }

  const nextTrack = () => {
    if (!playlist.value.length) return
    if (playMode.value === 'random') {
      const picked = pickRandomTrack(playlist.value, { excludeTrack: currentTrack.value })
      if (picked) play(picked)
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

  const ratioFromPointer = (e, el) => {
    const rect = el.getBoundingClientRect()
    if (!rect.width) return 0
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  const bindPointerDrag = (e, apply) => {
    const el = e.currentTarget
    if (!el) return
    e.preventDefault()
    try { el.setPointerCapture?.(e.pointerId) } catch {}
    apply(ratioFromPointer(e, el))

    const onMove = (ev) => apply(ratioFromPointer(ev, el))
    const onUp = (ev) => {
      try { el.releasePointerCapture?.(ev.pointerId) } catch {}
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  const seekTo = (e) => {
    if (!audioEl.value || !duration.value) return
    bindPointerDrag(e, (ratio) => {
      if (!audioEl.value || !duration.value) return
      audioEl.value.currentTime = ratio * duration.value
      currentTime.value = audioEl.value.currentTime
    })
  }

  const setVolume = (e) => {
    bindPointerDrag(e, (ratio) => {
      volume.value = ratio
      if (audioEl.value) audioEl.value.volume = volume.value
    })
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


  const toggleMute = () => {
    if (volume.value > 0) {
      prevVolume.value = volume.value
      volume.value = 0
    } else {
      volume.value = prevVolume.value
    }
    if (audioEl.value) audioEl.value.volume = volume.value
  }


  return {
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
    getStreamFilenameFromAudio: () => getStreamFilenameFromAudio(audioEl.value),
  }
}
