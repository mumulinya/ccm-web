<script setup>
import { ref, onMounted } from 'vue'
import PetMenu from './PetMenu.vue'

const props = defineProps({
  projects: { type: Array, default: () => [] }
})

const showMenu = ref(false)
const petConfigs = ref({})

// 加载宠物配置
const loadConfigs = async () => {
  try {
    const res = await fetch('/api/pets/config')
    const data = await res.json()
    petConfigs.value = data.configs || {}
  } catch {
    petConfigs.value = {}
  }
}

// 保存宠物配置（同时通知桌面宠物更新）
const saveConfigs = async () => {
  try {
    await fetch('/api/pets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configs: petConfigs.value })
    })
  } catch {}
}

// 更新单个宠物配置（改类型或隐藏/显示）
const updatePetConfig = ({ agent, config }) => {
  petConfigs.value = { ...petConfigs.value, [agent]: config }
  saveConfigs()
}

// 全部切换
const toggleAll = (enabled) => {
  const newConfigs = { ...petConfigs.value }
  for (const p of props.projects) {
    newConfigs[p.name] = { ...(newConfigs[p.name] || { type: 'cat' }), enabled }
  }
  petConfigs.value = newConfigs
  saveConfigs()
}

onMounted(() => {
  loadConfigs()
})
</script>

<template>
  <div class="pet-manager">
    <!-- 宠物菜单入口按钮 -->
    <button class="pet-menu-btn" @click="showMenu = true" title="桌面宠物管理">
      🐾
    </button>

    <!-- 宠物管理菜单（控制桌面宠物） -->
    <PetMenu
      v-if="showMenu"
      :agents="projects"
      :pet-configs="petConfigs"
      @close="showMenu = false"
      @update="updatePetConfig"
      @toggle-all="toggleAll"
    />
  </div>
</template>

<style scoped>
.pet-manager {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9997;
}
.pet-manager > * {
  pointer-events: auto;
}

.pet-menu-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  font-size: 20px;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pet-menu-btn:hover {
  transform: scale(1.1);
  border-color: var(--accent-blue, #38bdf8);
}
</style>
