<script setup>
import { onMounted, onUnmounted } from 'vue'
import { toast } from '../../utils/toast.js'
import { startMusicRemoteCommandPoller, playMusicViaGlobalHost, getPreferredMusicMode } from '../../composables/useMusicRemotePlayback.js'

const emit = defineEmits(['switch-tab', 'played'])

let stopPoller = null

const syncMusicUi = () => {
  try {
    if (typeof window.__cc_global_sync_music_ui === 'function') window.__cc_global_sync_music_ui()
  } catch {}
}

const waitForMusicEngine = async (timeoutMs = 10_000) => {
  if (typeof window.__cc_global_play_music === 'function') return true
  emit('switch-tab', 'music')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (typeof window.__cc_global_play_music === 'function') return true
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  return false
}

onMounted(() => {
  stopPoller = startMusicRemoteCommandPoller({
    onPlayed: (result, command) => {
      const title = result?.title || command?.keyword || '音乐'
      toast.success(`远程点歌已播放：${title}`)
      emit('played', { result, command })
      syncMusicUi()
      emit('switch-tab', 'music')
      // Tab paint can lag one frame behind switch; sync again after show.
      setTimeout(syncMusicUi, 50)
      setTimeout(syncMusicUi, 300)
    },
    onStopped: () => {
      toast.success('已停止音乐播放')
      syncMusicUi()
      emit('switch-tab', 'music')
      setTimeout(syncMusicUi, 50)
    },
    onError: (error) => {
      if (error) toast.error(`远程点歌失败：${error}`)
    },
    onEngineRequired: () => {
      emit('switch-tab', 'music')
    },
  })

  window.__cc_music_remote_play = async (keyword, options = {}) => {
    const ready = await waitForMusicEngine()
    if (!ready) return { success: false, error: '音乐播放引擎加载超时，请重试' }
    const result = await playMusicViaGlobalHost(keyword, {
      mode: options.mode || getPreferredMusicMode(),
      ...options,
    })
    if (result?.success) {
      syncMusicUi()
      emit('switch-tab', 'music')
      setTimeout(syncMusicUi, 50)
      setTimeout(syncMusicUi, 300)
    }
    return result
  }

  document.addEventListener('visibilitychange', syncMusicUi)
})

onUnmounted(() => {
  if (typeof stopPoller === 'function') stopPoller()
  stopPoller = null
  document.removeEventListener('visibilitychange', syncMusicUi)
  if (window.__cc_music_remote_play) delete window.__cc_music_remote_play
})
</script>

<template>
  <!-- Always-mounted lightweight host; it wakes the lazy audio engine when a command arrives. -->
  <span class="music-remote-host" aria-hidden="true" />
</template>

<style scoped>
.music-remote-host {
  display: none;
}
</style>
