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

async function requeueMusicRemotePlay(keyword, mode = '', source = 'client-effect-retry', requestText = '') {
  try {
    await fetch('/api/music/remote-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, mode, source, request_text: requestText || keyword }),
    })
  } catch {}
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
    const result = await playFn(keyword, { mode, remote: true, commandId, requestText: resolvedRequestText })
    // take() already removed the row; failed plays must re-queue for the poller.
    if (ownedViaTake && result && !result.success && !result.skipped) {
      await requeueMusicRemotePlay(keyword, mode, 'client-effect-retry', resolvedRequestText)
    }
    return result
  } catch (error) {
    if (ownedViaTake) await requeueMusicRemotePlay(keyword, mode, 'client-effect-retry', requestText)
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
    if (ownedViaTake && result && !result.success && !result.skipped) {
      try {
        await fetch('/api/music/remote-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stop', keyword: '__stop__', source: 'client-effect-retry' }),
        })
      } catch {}
    }
    return result
  } catch (error) {
    if (ownedViaTake) {
      try {
        await fetch('/api/music/remote-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stop', keyword: '__stop__', source: 'client-effect-retry' }),
        })
      } catch {}
    }
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
      const res = await fetch('/api/music/remote-command')
      const data = await res.json()
      const command = data.command
      if (!command?.id) return
      if (!playReady && !stopReady) {
        onEngineRequired?.(command)
        return
      }

      if (command.type === 'stop') {
        if (!stopReady) return
        const result = await stopMusicViaGlobalHost({ remote: true, commandId: command.id })
        if (result?.success) {
          await ackMusicRemoteCommand(command.id, 'success')
          onStopped?.(result, command)
        } else if (result?.skipped) {
          await ackMusicRemoteCommand(command.id, 'success')
        } else {
          await ackMusicRemoteCommand(command.id, 'failed', result?.error || '停止失败')
          onError?.(result?.error || '停止失败', command)
        }
        return
      }

      if (command.type !== 'play' || !command.keyword || !playReady) return
      const result = await playMusicViaGlobalHost(command.keyword, {
        mode: command.mode || getPreferredMusicMode(),
        remote: true,
        commandId: command.id,
        requestText: command.request_text || command.keyword,
      })
      if (result?.success) {
        await ackMusicRemoteCommand(command.id, 'success')
        onPlayed?.(result, command)
      } else if (result?.skipped) {
        await ackMusicRemoteCommand(command.id, 'success')
      } else {
        await ackMusicRemoteCommand(command.id, 'failed', result?.error || '播放失败')
        onError?.(result?.error || '播放失败', command)
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
