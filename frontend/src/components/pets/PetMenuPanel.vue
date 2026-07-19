<script setup>
import { usePetMenu } from './usePetMenu.js'
import {
  Bot, Download, Eye, EyeOff, Library, Monitor, Play, RefreshCw,
  Search, Settings2, ShieldCheck, Trash2, X,
} from '@lucide/vue'

const props = defineProps({
  agents: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['agents-updated'])

const {
  PetAgentList, PetSkinGrid, PetAssetGrid, PetSprite, rightTab,
  selectedAgent, agentLabelDraft, desktopPetRunning, petConfigs, petPositions, actionPetType,
  assetVersion, uploadInputs, uploadingAsset, projectPetStrategy, GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME,
  customPetTypes, imageErrors, handleImageError, isPixelated, loadConfigs, saveConfigs,
  checkDesktopPet, launchDesktopPet, closeDesktopPet, BUILTIN_FALLBACK_PET_TYPE, fallbackPetTypes, petTypes,
  editablePetTypes, getPetTypeInfo, isV2PetType, usesStatefulPetRenderer, assetsReadonlyNotice, actionPetSkin, normalizePetType, normalizePetConfigs, getPetIconPath,
  stateActions, reactionActions, fallbackProjectPetStrategy, getStateLabel, formatStrategyDuration, loadPetActionStrategy,
  stateFileMap, defaultReactions, specialPetAssets, getPetAssetSpec, makeAssetPath, actionAssetRows,
  assetUrl, assetFileName, canUploadAsset, setUploadInput, chooseAssetFile, uploadAssetFile,
  getAgentLabel, agentStateLabels, getAgentStateLabel, getAgentStateDetail, getDefaultType, getConfig,
  selectedAgentInfo, isMusicAgentSelected, isSystemAgentSelected, workspaceMood, companionSignals, syncAgentLabelDraft,
  saveAgentLabel, updatePetType, togglePet, selectAgent, allEnabled, toggleAll,
  allPetAgents, isCustomSkin, deleteCustomSkin,
  skinNameDrafts, beginRenameSkin, setSkinNameDraft, saveCustomSkinName, cancelRenameSkin, renamingSkinId,
  skinSearch, skinFilter, libraryPetType, previewState, detailOpen, configsLoading, configsError, engineBusy,
  filteredPetTypes, selectedLibrarySkin, selectLibraryPet, applyLibraryPet, exportSelectedPet,
} = usePetMenu(props, emit)

const detailTabs = [
  { id: 'config', label: '形象与应用', icon: Settings2 },
  { id: 'strategy', label: '状态策略', icon: ShieldCheck },
  { id: 'assets', label: '动画与资源', icon: Play },
]
</script>

<template src="./PetMenu.template.html"></template>

<style scoped src="./PetMenu.css"></style>
