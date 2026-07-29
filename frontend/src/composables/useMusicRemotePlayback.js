const MUSIC_MODE_KEY = 'ccm-music-preferred-mode'

export function getPreferredMusicMode() {
  try {
    const mode = String(localStorage.getItem(MUSIC_MODE_KEY) || '').trim()
    if (['local', 'cloud', 'netease'].includes(mode)) return mode
  } catch {}
  return 'cloud'
}

export function setPreferredMusicMode(mode) {
  const normalized = String(mode || '').trim()
  if (!['local', 'cloud', 'netease'].includes(normalized)) return
  try { localStorage.setItem(MUSIC_MODE_KEY, normalized) } catch {}
}

export async function playMusicViaGlobalHost(keyword, options = {}) {
  const mode = String(options.mode || getPreferredMusicMode() || 'cloud')
  if (typeof window.__cc_global_play_music !== 'function') {
    return { success: false, error: '音乐播放引擎尚未就绪，请稍候再试' }
  }
  return window.__cc_global_play_music(keyword, { ...options, mode })
}

export async function playMusicDecisionViaGlobalHost(decision, options = {}) {
  if (typeof window.__cc_global_play_music !== 'function') {
    return { success: false, error: '音乐播放引擎尚未就绪，请稍候再试' }
  }
  return window.__cc_global_play_music(decision?.searchQuery || decision?.selectedCandidate?.title || '__decision__', {
    ...options,
    mode: decision?.sourceMode || options.mode || getPreferredMusicMode(),
    playbackDecision: decision,
    requestText: decision?.originalRequest || options.requestText || '',
  })
}

export async function stopMusicViaGlobalHost(options = {}) {
  if (typeof window.__cc_global_stop_music !== 'function') {
    return { success: false, error: '音乐播放引擎尚未就绪，请稍候再试' }
  }
  return window.__cc_global_stop_music(options)
}

export async function takeMusicRemoteCommand(id) {
  if (!id) return null
  try {
    const res = await fetch('/api/music/remote-command/take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    return data.command || null
  } catch {
    return null
  }
}

export async function ackMusicRemoteCommand(id, status, error = '') {
  if (!id) return
  try {
    await fetch('/api/music/remote-command/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, error }),
    })
  } catch {}
}

async function claimMusicRemoteCommandV2(command) {
  if (!command?.id) return null
  const response = await fetch(`/api/music/playback/commands/${encodeURIComponent(command.id)}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation: command.generation }),
  })
  const data = await response.json().catch(() => ({}))
  return response.ok && data.success ? data.command : null
}

async function heartbeatMusicRemoteCommandV2(command, status = 'playing') {
  if (!command?.id) return false
  const response = await fetch(`/api/music/playback/commands/${encodeURIComponent(command.id)}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation: command.generation, status }),
  })
  return response.ok
}

async function completeMusicRemoteCommandV2(command, result = {}) {
  if (!command?.id) return false
  const needsGesture = result?.errorName === 'NotAllowedError'
  const response = await fetch(`/api/music/playback/commands/${encodeURIComponent(command.id)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generation: command.generation,
      success: result?.success === true,
      status: needsGesture ? 'needs_user_gesture' : undefined,
      error: result?.error || '',
      result: result?.success ? { title: result.title || '', source: result.source || '' } : undefined,
    }),
  })
  if (needsGesture && response.ok) {
    const commandIdentity = { id: command.id, generation: command.generation }
    window.__cc_complete_music_gesture = async (playResult = {}) => {
      try {
        return await completeMusicRemoteCommandV2(commandIdentity, {
          success: true,
          title: playResult.title || '',
          source: playResult.source || 'user-gesture',
        })
      } finally {
        if (window.__cc_complete_music_gesture) delete window.__cc_complete_music_gesture
      }
    }
  } else if (response.ok && window.__cc_complete_music_gesture) {
    delete window.__cc_complete_music_gesture
  }
  return response.ok
}

/**
 * client_effect path: take pending command first; play only if we own it.
 * If take fails (already claimed / missing), skip so the App poller is the sole player.
 * Must wait for the real audio engine (__cc_global_play_music), not just the remote host wrapper.
 */
export async function playMusicFromClientEffect(params = {}) {
  const keyword = String(params.keyword || '').trim()
  const mode = String(params.mode || '').trim()
  const requestText = String(params.requestText || params.request_text || keyword).trim()
  const commandId = String(params.commandId || params.command_id || '').trim()
  if (!keyword) return { success: false, error: '缺少要播放的歌曲关键词' }

  // Remote host mounts before MusicPlayer finishes loadTracks; only the engine is "ready".
  if (typeof window.__cc_global_play_music !== 'function') {
    return { success: false, skipped: true, reason: 'engine_not_ready' }
  }

  const playFn = typeof window.__cc_music_remote_play === 'function'
    ? window.__cc_music_remote_play
    : window.__cc_global_play_music

  let ownedViaTake = false
  let takenCommand = null
  if (commandId) {
    const taken = await takeMusicRemoteCommand(commandId)
    if (!taken) {
      return { success: false, skipped: true, reason: 'already_claimed' }
    }
    ownedViaTake = true
    takenCommand = taken
  }

  try {
    const resolvedRequestText = String(takenCommand?.request_text || requestText || keyword).trim()
    let heartbeat = null
    if (takenCommand) {
      heartbeat = setInterval(async () => {
        const alive = await heartbeatMusicRemoteCommandV2(takenCommand, 'playing').catch(() => false)
        if (!alive) window.__cc_global_cancel_music_command?.(takenCommand.id)
      }, 5_000)
      const initialLease = await heartbeatMusicRemoteCommandV2(takenCommand, 'playing').catch(() => false)
      if (!initialLease) {
        window.__cc_global_cancel_music_command?.(takenCommand.id)
        clearInterval(heartbeat)
        return { success: false, skipped: true, reason: 'superseded' }
      }
    }
    let result
    try {
      result = takenCommand?.decision
        ? await playMusicDecisionViaGlobalHost(takenCommand.decision, { remote: true, commandId, requestText: resolvedRequestText })
        : await playFn(keyword, { mode, remote: true, commandId, requestText: resolvedRequestText })
    } finally {
      if (heartbeat) clearInterval(heartbeat)
    }
    if (ownedViaTake) await completeMusicRemoteCommandV2(takenCommand, result)
    return result
  } catch (error) {
    if (ownedViaTake && takenCommand) await completeMusicRemoteCommandV2(takenCommand, { success: false, error: error?.message || String(error) })
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * client_effect path for stop: take pending command first; stop only if we own it.
 */
export async function stopMusicFromClientEffect(params = {}) {
  const commandId = String(params.commandId || params.command_id || '').trim()
  if (typeof window.__cc_global_stop_music !== 'function') {
    return { success: false, skipped: true, reason: 'engine_not_ready' }
  }
  let ownedViaTake = false
  if (commandId) {
    const taken = await takeMusicRemoteCommand(commandId)
    if (!taken) {
      return { success: false, skipped: true, reason: 'already_claimed' }
    }
    ownedViaTake = true
  }
  try {
    const result = await stopMusicViaGlobalHost({ remote: true, commandId })
    if (ownedViaTake) await completeMusicRemoteCommandV2({ id: commandId }, result)
    return result
  } catch (error) {
    if (ownedViaTake) await completeMusicRemoteCommandV2({ id: commandId }, { success: false, error: error?.message || String(error) })
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * App-level remote command poller. Requires MusicPlayer to register play/stop hosts.
 */
export function startMusicRemoteCommandPoller(options = {}) {
  const intervalMs = Number(options.intervalMs || 2500)
  let timer = null
  let busy = false
  const onPlayed = typeof options.onPlayed === 'function' ? options.onPlayed : null
  const onStopped = typeof options.onStopped === 'function' ? options.onStopped : null
  const onError = typeof options.onError === 'function' ? options.onError : null
  const onEngineRequired = typeof options.onEngineRequired === 'function' ? options.onEngineRequired : null

  const tick = async () => {
    if (busy) return
    const playReady = typeof window.__cc_global_play_music === 'function'
    const stopReady = typeof window.__cc_global_stop_music === 'function'
    busy = true
    try {
      const res = await fetch('/api/music/playback/commands/head')
      const data = await res.json()
      const pending = data.command
      if (!pending?.id) return
      if (!playReady && !stopReady) {
        onEngineRequired?.(pending)
        return
      }

      if (pending.type === 'play' && !playReady) {
        onEngineRequired?.(pending)
        return
      }
      if (pending.type === 'stop' && !stopReady) {
        onEngineRequired?.(pending)
        return
      }
      const command = await claimMusicRemoteCommandV2(pending)
      if (!command) return

      if (command.type === 'stop') {
        const result = await stopMusicViaGlobalHost({ remote: true, commandId: command.id })
        await completeMusicRemoteCommandV2(command, result)
        if (result?.success) {
          onStopped?.(result, command)
        } else {
          onError?.(result?.error || '停止失败', command)
        }
        return
      }

      if (command.type !== 'play' || !command.keyword) return
      let heartbeat = setInterval(async () => {
        const alive = await heartbeatMusicRemoteCommandV2(command, 'playing').catch(() => false)
        if (!alive) window.__cc_global_cancel_music_command?.(command.id)
      }, 5_000)
      const initialLease = await heartbeatMusicRemoteCommandV2(command, 'playing').catch(() => false)
      if (!initialLease) {
        window.__cc_global_cancel_music_command?.(command.id)
        clearInterval(heartbeat)
        return
      }
      let result
      try {
        result = command.decision
          ? await playMusicDecisionViaGlobalHost(command.decision, { remote: true, commandId: command.id })
          : await playMusicViaGlobalHost(command.keyword, {
              mode: command.mode || getPreferredMusicMode(),
              remote: true,
              commandId: command.id,
              requestText: command.request_text || command.keyword,
            })
      } catch (error) {
        result = { success: false, error: error?.message || String(error) }
      } finally {
        clearInterval(heartbeat)
        heartbeat = null
      }
      await completeMusicRemoteCommandV2(command, result)
      if (result?.success) {
        onPlayed?.(result, command)
      } else if (result?.skipped && result?.reason === 'superseded') {
        // The server has already terminalized the older generation.
      } else {
        onError?.(result?.errorName === 'NotAllowedError' ? '浏览器需要你点击一次播放按钮' : (result?.error || '播放失败'), command)
      }
    } catch (error) {
      onError?.(error?.message || String(error), null)
    } finally {
      busy = false
    }
  }

  timer = setInterval(tick, intervalMs)
  tick()
  return () => {
    if (timer) clearInterval(timer)
    timer = null
  }
}
