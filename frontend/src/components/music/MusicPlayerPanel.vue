<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useMusicPlayer } from './useMusicPlayer.js'
import { useMusicVisualExperience } from '../../composables/useMusicVisualExperience.js'
import ConversationFindBar from '../common/ConversationFindBar.vue'
import ConversationMessageShell from '../common/ConversationMessageShell.vue'
import ConversationProcessingState from '../common/ConversationProcessingState.vue'
import MusicPlaybackQueueDrawer from './MusicPlaybackQueueDrawer.vue'
import MusicDuplicateManager from './MusicDuplicateManager.vue'
import MusicLyricsPanel from './MusicLyricsPanel.vue'
import MusicUnifiedSearch from './MusicUnifiedSearch.vue'
import { Check, ChevronDown, ChevronUp, Download, Files, Globe2, Heart, History, Languages, ListMusic, ListPlus, Maximize2, MessageCircle, Minimize2, MoreHorizontal, PanelRightClose, Pause, Pencil, Play, Plus, RefreshCw, Repeat1, Repeat2, Search, Shuffle, SkipBack, SkipForward, Sparkles, Trash2, Upload, Volume2, VolumeX, X } from '@lucide/vue'

const props = defineProps({
  agentLabel: { type: String, default: '乖乖' },
  active: { type: Boolean, default: true },
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
  aiAutoSelectEnabled,
  aiEmotionEnabled,
  aiRecommendationEnabled,
  aiSongQuote,
  aiSongQuoteEnabled,
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
  clearPlaybackHistory,
  clearDouyinLogin,
  clearPlaybackQueue,
  clearFinishedDownloadJobs,
  closePlaylistDialog,
  companionTimeStr,
  companionTimer,
  clearedQueueSnapshot,
  convertAndPlay,
  convertDouyinAndPlay,
  convertNeteaseAndPlay,
  converting,
  coverStyle,
  createDownloadJob,
  createPlaylist,
  currentEmotion,
  currentIndex,
  currentLyricIndex,
  currentWordIndex,
  currentTime,
  currentTrack,
  currentWeather,
  weatherDetails,
  weatherTitle,
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
  douyinLoginStarting,
  drawSpectrums,
  duration,
  fetchWeather,
  prepareDouyinRuntime,
  refreshDouyinStatus,
  startDouyinLogin,
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
  lyricTimingOffsetMs,
  showLyricTranslation,
  mode,
  moveTrackInActivePlaylist,
  moveTrackInPlaybackQueue,
  reorderPlaybackQueue,
  musicAgentLabel,
  musicMemoryContext,
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
  playLibraryTrack,
  playTrackNext,
  playQueueFromTrack,
  playbackFailures,
  playActivePlaylistAll,
  playAddedTrack,
  playLocalTrack,
  playPlaylistById,
  playMode,
  playbackSettings,
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
  refreshSongQuote,
  remoteCommandTimer,
  removeTrackFromActivePlaylist,
  removeTrackFromQueue,
  resetLyrics,
  adjustLyricTiming,
  resetLyricTiming,
  resetPetLyricIndex,
  retryDownloadJob,
  retryLastAgentMessage,
  rightCanvasRef,
  rightCaps,
  savePlaylistRename,
  saveAgentConfig,
  sleepTimerRemaining,
  scrollChat,
  seekTo,
  sendAgentMessage,
  sendToClaudeAgent,
  setAgentMessageContent,
  setAgentMessageResults,
  hasStreamingAgentMessage,
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
  toggleAiSongQuote,
  toast,
  tracks,
  queueSources,
  recentPlaybackRows,
  songQuoteLoading,
  updateAgentChatScrollState,
  updateCurrentLyrics,
  updatePlaybackSetting,
  updatePlaylist,
  handleUnifiedSearchAction,
  openPlaylistManager,
  openPlaylistPicker,
  openSavedPlaylist,
  updatePreselectedTrack,
  uploadFiles,
  undoClearPlaybackQueue,
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
const playbackQueueOpen = ref(false)
const duplicateManagerOpen = ref(false)
const unifiedSearchOpen = ref(false)
const lyricsPanelOpen = ref(false)
const nextQueueFeedbackFilename = ref('')
let nextQueueFeedbackTimer = null
const isAgentMessageVisible = (msg) => (
  String(msg?.content || '').trim()
  || getMessageResults(msg)?.length
  || msg?.streaming === true
)
const showStandaloneAgentLoading = computed(() => agentLoading.value && !hasStreamingAgentMessage.value)
const musicMemoryLabel = computed(() => {
  const current = Math.max(0, Number(musicMemoryContext.value?.currentTokens || 0))
  const threshold = Math.max(0, Number(musicMemoryContext.value?.autoCompactThreshold || 0))
  if (!threshold) return ''
  const compact = (value) => value >= 1000 ? `${Math.round(value / 100) / 10}K` : String(value)
  return `${compact(current)} / ${compact(threshold)}`
})
const { coverUrl, trackBackdropStyle, trackVisualKey, visualCssVars } = useMusicVisualExperience({ currentTrack, sessionAnimeCover })

const toggleMusicAssistant = async (force) => {
  const open = typeof force === 'boolean' ? force : !musicAssistantOpen.value
  musicAssistantOpen.value = open
  if (!open) return
  await nextTick()
  setTimeout(() => document.querySelector('#music-assistant .aura-command-input')?.focus({ preventScroll: true }), 280)
}

const openPlaybackQueueFromPlayer = () => {
  playbackQueueOpen.value = !playbackQueueOpen.value
}

const queueTrackAsNext = async (track) => {
  const updated = await playTrackNext(track)
  if (!updated) return
  nextQueueFeedbackFilename.value = track.filename
  if (nextQueueFeedbackTimer) clearTimeout(nextQueueFeedbackTimer)
  nextQueueFeedbackTimer = setTimeout(() => {
    if (nextQueueFeedbackFilename.value === track.filename) nextQueueFeedbackFilename.value = ''
    nextQueueFeedbackTimer = null
  }, 1400)
}

const toggleLyricTranslation = () => {
  showLyricTranslation.value = !showLyricTranslation.value
}

const toggleImmersiveMode = () => {
  immersiveMode.value = !immersiveMode.value
  if (immersiveMode.value) musicAssistantOpen.value = false
}

const handleExperienceKeydown = (event) => {
  if (event.key === 'Escape' && playbackQueueOpen.value) playbackQueueOpen.value = false
  else if (event.key === 'Escape' && immersiveMode.value) immersiveMode.value = false
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
onUnmounted(() => {
  window.removeEventListener('keydown', handleExperienceKeydown)
  if (nextQueueFeedbackTimer) clearTimeout(nextQueueFeedbackTimer)
})
</script>

<template src="./MusicPlayer.template.html"></template>

<style scoped src="./MusicPlayer.css"></style>
<style scoped src="./MusicPlayerPanels.css"></style>
<style scoped src="./MusicPlayerAtmosphere.css"></style>
