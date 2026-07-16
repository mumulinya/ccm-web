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

/**
 * App-level remote command poller. Requires MusicPlayer to register __cc_global_play_music.
 */
export function startMusicRemoteCommandPoller(options = {}) {
  const intervalMs = Number(options.intervalMs || 2500)
  let timer = null
  let busy = false
  const onPlayed = typeof options.onPlayed === 'function' ? options.onPlayed : null
  const onError = typeof options.onError === 'function' ? options.onError : null

  const tick = async () => {
    if (busy) return
    if (typeof window.__cc_global_play_music !== 'function') return
    busy = true
    try {
      const res = await fetch('/api/music/remote-command')
      const data = await res.json()
      const command = data.command
      if (!command?.id || command.type !== 'play' || !command.keyword) return
      const result = await playMusicViaGlobalHost(command.keyword, {
        mode: command.mode || getPreferredMusicMode(),
        remote: true,
        commandId: command.id,
      })
      if (result?.success) {
        await ackMusicRemoteCommand(command.id, 'success')
        onPlayed?.(result, command)
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
