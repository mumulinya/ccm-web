<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useMusicPlayer } from './useMusicPlayer.js'
import { useMusicVisualExperience } from '../../composables/useMusicVisualExperience.js'
import { ChevronDown, ChevronUp, Download, Heart, ListMusic, Maximize2, MessageCircle, Minimize2, MoreHorizontal, PanelRightClose, Pause, Pencil, Play, Plus, Repeat1, Repeat2, Search, Shuffle, SkipBack, SkipForward, Trash2, Upload, Volume2, VolumeX, X } from '@lucide/vue'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' }
})

const {
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
  sessionAnimeCover,
  analyser,
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
  deletePlaylist,
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
  savePlaylistRename,
  saveAgentConfig,
  scrollChat,
  seekTo,
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
  toggleFavorite,
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
  MusicDownloadCenter,
} = useMusicPlayer({ agentLabel: props.agentLabel })

const musicAssistantOpen = ref(false)
const immersiveMode = ref(false)
const mobilePlayerExpanded = ref(false)
const { coverUrl, trackBackdropStyle, trackVisualKey, visualCssVars } = useMusicVisualExperience({ currentTrack, sessionAnimeCover })

const toggleMusicAssistant = async (force) => {
  const open = typeof force === 'boolean' ? force : !musicAssistantOpen.value
  musicAssistantOpen.value = open
  if (!open) return
  await nextTick()
  setTimeout(() => document.querySelector('#music-assistant .aura-command-input')?.focus({ preventScroll: true }), 280)
}

const openPlaybackQueueFromPlayer = () => {
  activeLibraryView.value = 'queue'
}

const toggleImmersiveMode = () => {
  immersiveMode.value = !immersiveMode.value
  if (immersiveMode.value) musicAssistantOpen.value = false
}

const handleExperienceKeydown = (event) => {
  if (event.key === 'Escape' && immersiveMode.value) immersiveMode.value = false
  if (event.code !== 'Space' || event.repeat || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
  if (target?.closest('.aura-player button')) return
  const visibleModal = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
    .some(element => element.getClientRects().length > 0)
  if (visibleModal) return
  event.preventDefault()
  togglePlay()
}

onMounted(() => window.addEventListener('keydown', handleExperienceKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleExperienceKeydown))
</script>

<template src="./MusicPlayer.template.html"></template>

<style scoped src="./MusicPlayer.css"></style>
<style scoped src="./MusicPlayerPanels.css"></style>
<style scoped src="./MusicPlayerAtmosphere.css"></style>
