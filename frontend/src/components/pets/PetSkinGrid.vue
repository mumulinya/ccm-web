<script setup>
import PetSprite from './PetSprite.vue'

defineProps({
  petTypes: { type: Array, default: () => [] },
  selectedType: { type: String, default: '' },
  getPetIconPath: { type: Function, required: true },
  isPixelated: { type: Function, required: true }
})

const emit = defineEmits(['select-skin', 'create-skin'])
</script>

<template>
  <div class="skins-grid">
    <div
      v-for="petType in petTypes"
      :key="petType.id"
      class="skin-card"
      :class="{ active: selectedType === petType.id }"
      @click="emit('select-skin', petType.id)"
    >
      <div class="skin-avatar-wrap" :style="selectedType === petType.id ? `border-color: ${petType.color || '#3b82f6'};` : ''">
        <PetSprite v-if="Number(petType.spriteVersionNumber) === 2" :type="petType.id" :skin="petType" state="idle" :size="44" />
        <img v-else :src="getPetIconPath(petType.id)" width="44" height="44" :class="{ pixelated: isPixelated(petType.id) }" alt="">
      </div>
      <span class="skin-name">{{ petType.name }}</span>
      <span v-if="selectedType === petType.id" class="skin-indicator">✓ 已装扮</span>
    </div>
    <div class="skin-card skin-card-add" @click="emit('create-skin')">
      <div class="skin-avatar-wrap add-icon">
        <span>➕</span>
      </div>
      <span class="skin-name">新建宠物皮肤</span>
      <span class="skin-indicator muted">从参考图生成</span>
    </div>
  </div>
</template>

<style scoped>
.skins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
.skin-card { display: flex; flex-direction: column; align-items: center; padding: 16px; background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 14px; cursor: pointer; transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; }
.skin-card:hover { border-color: rgba(59, 130, 246, 0.25); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.02); }
.skin-card.active { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.05); box-shadow: 0 4px 14px rgba(59, 130, 246, 0.08); }
.skin-avatar-wrap { width: 56px; height: 56px; background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.skin-name { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
.skin-indicator { font-size: 9px; color: var(--accent-blue); font-weight: 700; margin-top: 4px; }
.skin-indicator.muted { color: var(--text-muted); }
.skin-card-add { border-style: dashed; }
.skin-card-add .add-icon { color: var(--text-muted); font-size: 18px; }
.pixelated { image-rendering: pixelated; }
:global([data-theme="dark"]) .skin-card, :global([data-theme="dark"]) .skin-avatar-wrap { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
</style>
