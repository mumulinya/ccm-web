<script setup>
import { onMounted, onUnmounted } from 'vue'
import { toast } from '../../utils/toast.js'
import { startMusicRemoteCommandPoller, playMusicViaGlobalHost, getPreferredMusicMode } from '../../composables/useMusicRemotePlayback.js'

const emit = defineEmits(['switch-tab', 'played'])

let stopPoller = null

onMounted(() => {
  stopPoller = startMusicRemoteCommandPoller({
    onPlayed: (result, command) => {
      const title = result?.title || command?.keyword || '音乐'
      toast.success(`远程点歌已播放：${title}`)
      emit('played', { result, command })
      // Optional: show the music UI after playback starts (not a prerequisite).
      emit('switch-tab', 'music')
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
    if (result?.success) emit('switch-tab', 'music')
    return result
  }
})

onUnmounted(() => {
  if (typeof stopPoller === 'function') stopPoller()
  stopPoller = null
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
