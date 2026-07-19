<script setup>
import { usePetMenu } from './usePetMenu.js'

const props = defineProps({
  agents: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['agents-updated'])

const {
  PetAgentList, PetSkinGrid, PetAssetGrid, PetGenerationModal, PetSprite, rightTab,
  selectedAgent, agentLabelDraft, desktopPetRunning, petConfigs, petPositions, actionPetType,
  assetVersion, uploadInputs, uploadingAsset, projectPetStrategy, GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME,
  customPetTypes, imageErrors, handleImageError, isPixelated, loadConfigs, saveConfigs,
  checkDesktopPet, launchDesktopPet, closeDesktopPet, BUILTIN_FALLBACK_PET_TYPE, fallbackPetTypes, petTypes,
  editablePetTypes, getPetTypeInfo, isV2PetType, assetsReadonlyNotice, actionPetSkin, normalizePetType, normalizePetConfigs, getPetIconPath,
  stateActions, reactionActions, fallbackProjectPetStrategy, getStateLabel, formatStrategyDuration, loadPetActionStrategy,
  stateFileMap, defaultReactions, specialPetAssets, getPetAssetSpec, makeAssetPath, actionAssetRows,
  assetUrl, assetFileName, canUploadAsset, setUploadInput, chooseAssetFile, uploadAssetFile,
  getAgentLabel, agentStateLabels, getAgentStateLabel, getAgentStateDetail, getDefaultType, getConfig,
  selectedAgentInfo, isMusicAgentSelected, isSystemAgentSelected, workspaceMood, companionSignals, syncAgentLabelDraft,
  saveAgentLabel, updatePetType, togglePet, selectAgent, allEnabled, toggleAll,
  showGenerationModal, allPetAgents, handleGenerationCompleted, isCustomSkin, deleteCustomSkin,
  skinNameDrafts, beginRenameSkin, setSkinNameDraft, saveCustomSkinName, cancelRenameSkin, renamingSkinId,
} = usePetMenu(props, emit)
</script>

<template src="./PetMenu.template.html"></template>

<style scoped src="./PetMenu.css"></style>
