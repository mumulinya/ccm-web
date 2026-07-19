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
  })

  window.__cc_music_remote_play = async (keyword, options = {}) => {
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
  <!-- Always-mounted host: no UI; MusicPlayer (also always mounted) owns the audio engine. -->
  <span class="music-remote-host" aria-hidden="true" />
</template>

<style scoped>
.music-remote-host {
  display: none;
}
</style>
