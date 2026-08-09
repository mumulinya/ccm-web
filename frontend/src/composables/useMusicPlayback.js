import { ref, watch } from 'vue'
import { toast } from '../utils/toast.js'
import { formatTrackLabel, rememberPlayedTrack, selectNextPlaybackTrack } from '../utils/musicTrackHelpers.js'

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
    invalidateLyricsRequest,
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
    persistPlaybackState,
    recordPlaybackHistory,
    markTrackPlaybackFailure,
    clearTrackPlaybackFailure,
    fadeSeconds,
    setOutputGain,
    getSavedPlaybackProgress,
    consumeInitialPlaybackProgress,
    clearSavedPlaybackProgress,
    savePlaybackProgress,
    volumeNormalization,
    setVolumeNormalization,
  } = deps

  const prevVolume = ref(0.7)
  const playbackHistory = ref([])
  const beginPlaybackIntent = (metadata = {}) => playbackCoordinator?.beginPlaybackIntent(metadata) || null
  const isPlaybackIntentCurrent = (intent) => !intent || !playbackCoordinator || playbackCoordinator.isCurrent(intent)
  const supersededResult = (intent) => playbackCoordinator?.supersededResult(intent) || {
    success: false,
    skipped: true,
    reason: 'superseded',
  }
  let activePlayCalls = 0
  let runtimeRecoveryActive = false
  let playbackLoadGeneration = 0
  let pendingMetadataPosition = null

  const clearPendingMetadataPosition = () => {
    if (!pendingMetadataPosition) return
    pendingMetadataPosition.el?.removeEventListener?.('loadedmetadata', pendingMetadataPosition.handler)
    pendingMetadataPosition = null
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
    el.addEventListener('error', () => {
      if (activePlayCalls > 0 || runtimeRecoveryActive || !currentTrack.value) return
      const mediaError = el.error
      const reason = mediaError?.message
        || ({ 1: '播放被中止', 2: '音源网络读取失败', 3: '音频文件无法解码', 4: '音源格式不受支持或已失效' }[mediaError?.code])
        || '音源读取失败'
      runtimeRecoveryActive = true
      markTrackPlaybackFailure?.(currentTrack.value, {
        reason,
        attempts: 1,
        failedAt: new Date().toISOString(),
      })
      play(currentTrack.value, {
        source: '播放错误恢复',
        maxAttempts: 3,
        startPosition: Number(el.currentTime || currentTime.value || 0),
      })
        .finally(() => { runtimeRecoveryActive = false })
    })
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
      const completeGestureCommand = globalThis.window?.__cc_complete_music_gesture
      if (typeof completeGestureCommand === 'function') {
        await completeGestureCommand({
          title: formatTrackLabel(track),
          source: options.source || 'user-gesture',
        }).catch(() => {})
      }
      return { success: true }
    } catch (err) {
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
      isPlaying.value = false
      syncUiFromAudio()
      const message = err?.name === 'NotAllowedError'
        ? '浏览器拦截了远程自动播放，请在 CCM 页面点击一次播放按钮或允许该站点自动播放后重试'
        : (err?.message || '无法开始播放')
      if (!options.silentFailure) {
        notifyMusicPet('error', `播放失败：${message}`, track)
        if (options.remote) toast.error(`远程点歌已准备好，但播放被拦截：${message}`, 8000)
      }
      return { success: false, error: message, errorName: err?.name || '' }
    }
  }

  // 频谱与弹幕控制器

  const executePlay = async (track, options = {}) => {
    if (!track) return { success: false, error: '没有可播放的歌曲' }
    const playbackIntent = options.playbackIntent || beginPlaybackIntent({
      keyword: formatTrackLabel(track),
      commandId: options.commandId,
      source: options.source || (options.remote ? 'remote-track' : 'player-track'),
    })
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    const previousFilename = currentTrack.value?.filename || ''
    const fadeDuration = Math.max(0, Math.min(8, Number(fadeSeconds?.value ?? fadeSeconds ?? 0)))
    if (fadeDuration > 0 && audioEl.value && !audioEl.value.paused && previousFilename && previousFilename !== track.filename) {
      setOutputGain?.(0, fadeDuration / 2)
      await new Promise(resolve => setTimeout(resolve, fadeDuration * 500))
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    }
    let idx = playlist.value.findIndex(t => t.filename === track.filename)
    // Keep UI (currentTrack / controls) aligned with the audio actually playing.
    if (idx === -1) {
      playlist.value = [...playlist.value, track]
      idx = playlist.value.length - 1
    }
    if (options.recordHistory !== false && previousFilename && previousFilename !== track.filename) {
      playbackHistory.value = [...playbackHistory.value, previousFilename].slice(-100)
    }
    currentIndex.value = idx
    if (activePlaybackFilename) activePlaybackFilename.value = track.filename || ''
    if (persistPlaybackState) {
      try {
        await persistPlaybackState(playlist.value, {
          currentFilename: track.filename || '',
          playMode: playMode.value,
          source: options.source || (options.remote ? '远程点歌' : '播放器'),
          sourceFilename: track.filename || '',
        })
      } catch (error) {
        toast.error(error?.message || '保存播放队列失败')
      }
    }
    const src = `/api/music/stream?file=${encodeURIComponent(track.filename)}`
    if (!audioEl.value) return { success: false, error: '播放器未准备就绪' }
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    const loadGeneration = ++playbackLoadGeneration
    clearPendingMetadataPosition()
    audioEl.value.src = src
    audioEl.value.volume = volume.value
    initAnalyser()
    setVolumeNormalization?.(volumeNormalization?.value ?? volumeNormalization ?? false)
    if (fadeDuration > 0) setOutputGain?.(0, 0)
    const explicitStartPosition = Number(options.startPosition)
    const restoreSavedProgress = !Number.isFinite(explicitStartPosition)
      && options.restoreSavedProgress !== false
      && (options.restoreSavedProgress === true || consumeInitialPlaybackProgress?.(track) === true)
    const saved = restoreSavedProgress
      ? Number(getSavedPlaybackProgress?.(track) || 0)
      : 0
    const knownDuration = Number(audioEl.value?.duration || track.durationSec || 0)
    const startPosition = Number.isFinite(explicitStartPosition)
      ? Math.max(0, explicitStartPosition)
      : (saved > 2 && (!knownDuration || saved < knownDuration - 10) ? saved : 0)
    const applyStartPosition = () => {
      if (
        loadGeneration !== playbackLoadGeneration
        || !isPlaybackIntentCurrent(playbackIntent)
        || activePlaybackFilename?.value !== track.filename
      ) return
      const el = audioEl.value
      if (!el) return
      const knownDuration = Number(audioEl.value?.duration || track.durationSec || 0)
      const safePosition = knownDuration > 0
        ? Math.min(startPosition, Math.max(0, knownDuration - 0.1))
        : startPosition
      try { el.currentTime = safePosition } catch {}
      currentTime.value = safePosition
    }
    const applyStartPositionAfterMetadata = () => {
      applyStartPosition()
      if (pendingMetadataPosition?.handler === applyStartPositionAfterMetadata) pendingMetadataPosition = null
    }
    pendingMetadataPosition = { el: audioEl.value, handler: applyStartPositionAfterMetadata }
    audioEl.value.addEventListener?.('loadedmetadata', applyStartPositionAfterMetadata, { once: true })
    applyStartPosition()
    resetPetLyricIndex()
    // 加载弹幕
    loadDanmaku(track.bvid, track.title, track.artist)
    // 加载歌词
    loadLyrics(track)
    const maxAttempts = Math.max(1, Math.min(5, Number(options.maxAttempts || 3)))
    let result = null
    let attempts = 0
    while (attempts < maxAttempts) {
      attempts += 1
      result = await startAudioPlayback(track, {
        ...options,
        playbackIntent,
        silentFailure: attempts < maxAttempts,
      })
      if (result?.success || result?.skipped || result?.errorName === 'NotAllowedError') break
      if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 220 * attempts))
        if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
        try {
          audioEl.value.src = `${src}&retry=${attempts}`
          audioEl.value.load?.()
        } catch {}
      }
    }
    if (!isPlaybackIntentCurrent(playbackIntent)) return supersededResult(playbackIntent)
    syncUiFromAudio()
    if (result?.success) {
      if (fadeDuration > 0) setOutputGain?.(1, fadeDuration)
      rememberPlayedTrack(track)
      clearTrackPlaybackFailure?.(track)
      try { await recordPlaybackHistory?.(track, options.source || '播放器') } catch {}
      return { ...result, attempts }
    }

    const failure = {
      reason: result?.error || '无法播放该音源',
      attempts,
      failedAt: new Date().toISOString(),
    }
    markTrackPlaybackFailure?.(track, failure)
    const shouldSkip = options.autoSkip !== false
      && result?.errorName !== 'NotAllowedError'
      && playlist.value.length > 1
    if (shouldSkip) {
      const failedFilenames = new Set([...(options.failedFilenames || []), track.filename])
      const candidates = playlist.value.filter(item => !failedFilenames.has(item.filename))
      const next = selectNextPlaybackTrack(candidates, {
        currentIndex: Math.max(-1, candidates.findIndex(item => item.filename === track.filename)),
        currentTrack: track,
        playMode: playMode.value === 'single' ? 'list' : playMode.value,
      }) || candidates[0]
      if (next) {
        toast.warning(`“${formatTrackLabel(track)}”播放失败，已跳到下一首`, 5000)
        const skipped = await play(next, {
          ...options,
          source: options.source || '失败后自动跳过',
          failedFilenames: Array.from(failedFilenames),
        })
        return { success: false, error: failure.reason, attempts, skippedTo: next.filename, recovery: skipped }
      }
    }
    return result
  }

  const play = async (track, options = {}) => {
    activePlayCalls += 1
    try { return await executePlay(track, options) }
    finally { activePlayCalls = Math.max(0, activePlayCalls - 1) }
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
    invalidateLyricsRequest?.()
    if (audioEl.value) {
      audioEl.value.pause()
      if (options.resetPosition !== false) audioEl.value.currentTime = 0
      syncUiFromAudio()
      if (options.notify !== false) notifyMusicPetIdle('已停止播放', currentTrack.value)
      if (options.resetPosition !== false) resetLyrics()
    }
    return { success: true }
  }

  const nextTrack = (options = {}) => {
    if (!playlist.value.length) return
    const automatic = options.automatic === true
    if (automatic && playMode.value === 'single' && currentTrack.value) {
      play(currentTrack.value, { recordHistory: false, source: 'player-repeat' })
      return
    }
    const preselected = nextRecommendTrack?.value
    const candidateIsCurrent = preselected?.filename && preselected.filename === currentTrack.value?.filename
    const candidateInPlaylist = playlist.value.some(track => track.filename === preselected?.filename)
    const candidateAllowed = candidateInPlaylist
      && (!candidateIsCurrent || playlist.value.length === 1)
      && playMode.value !== 'single'
    const next = candidateAllowed
      ? preselected
      : selectNextPlaybackTrack(playlist.value, {
          currentIndex: currentIndex.value,
          currentTrack: currentTrack.value,
          playMode: playMode.value === 'single' ? 'list' : playMode.value,
        })
    if (next) play(next)
  }

  const prevTrack = () => {
    if (!playlist.value.length) return
    if (audioEl.value && audioEl.value.currentTime > 3) {
      audioEl.value.currentTime = 0
      currentTime.value = 0
      startAudioPlayback(currentTrack.value, { source: 'player-restart-current' })
      return
    }
    if (playMode.value === 'random') {
      while (playbackHistory.value.length) {
        const filename = playbackHistory.value.pop()
        const previous = playlist.value.find(track => track.filename === filename)
        if (previous) {
          play(previous, { recordHistory: false, source: 'player-random-history' })
          return
        }
      }
    }
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
      savePlaybackProgress?.(currentTrack.value, currentTime.value, duration.value)
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
    if (currentTrack.value) clearSavedPlaybackProgress?.(currentTrack.value)
    if (!playlist.value.length) notifyMusicPetIdle('播放结束', currentTrack.value)
    nextTrack({ automatic: true })
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
