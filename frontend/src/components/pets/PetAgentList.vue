<script setup>
import PetSprite from './PetSprite.vue'

defineProps({
  agents: { type: Array, default: () => [] },
  selectedAgent: { type: String, default: '' },
  petTypes: { type: Array, default: () => [] },
  allEnabled: { type: Boolean, default: false },
  getConfig: { type: Function, required: true },
  getPetIconPath: { type: Function, required: true },
  getAgentLabel: { type: Function, required: true },
  getAgentStateLabel: { type: Function, required: true },
  getAgentStateDetail: { type: Function, required: true },
  systemAgentNames: { type: Array, default: () => [] }
})

const emit = defineEmits(['select-agent', 'toggle-agent', 'toggle-all', 'create-pet'])

const getPetTypeName = (petTypes, type) => petTypes.find(pet => pet.id === type)?.name || '月薪喵'
const getPetType = (petTypes, type) => petTypes.find(pet => pet.id === type) || null
</script>

<template>
  <div class="glass-panel pet-card-section flex-1">
    <div class="section-title-row">
      <div class="section-title">🤖 系统 Agent 宠物</div>
      <div class="section-actions">
        <button v-if="agents.length > 0" class="btn btn-outline btn-sm" @click="emit('toggle-all')">
          {{ allEnabled ? '全部隐藏' : '全部显示' }}
        </button>
        <button class="btn btn-primary btn-sm" @click="emit('create-pet')">
          从图片创建
        </button>
      </div>
    </div>

    <div class="pet-list-scroll">
      <div
        v-for="agent in agents"
        :key="agent.name"
        class="pet-list-item"
        :class="{ active: selectedAgent === agent.name }"
        @click="emit('select-agent', agent.name)"
      >
        <div class="pet-preview-wrap">
          <PetSprite
            v-if="Number(getPetType(petTypes, getConfig(agent.name).type)?.spriteVersionNumber) === 2"
            :type="getConfig(agent.name).type"
            :skin="getPetType(petTypes, getConfig(agent.name).type)"
            :state="agent.state || 'idle'"
            :size="42"
          />
          <img v-else :src="getPetIconPath(getConfig(agent.name).type)" width="42" height="42" alt="">
        </div>
        <div class="pet-text-info">
          <div class="agent-label-name">{{ getAgentLabel(agent) }}</div>
          <div class="pet-type-label">{{ getPetTypeName(petTypes, getConfig(agent.name).type) }}</div>
          <div v-if="systemAgentNames.includes(agent.name)" class="pet-live-status" :class="agent.state || 'idle'">
            <span>{{ getAgentStateLabel(agent) }}</span>
            <em>{{ getAgentStateDetail(agent) }}</em>
          </div>
        </div>
        <button
          class="state-toggle-btn"
          :class="{ enabled: getConfig(agent.name).enabled !== false }"
          @click.stop="emit('toggle-agent', agent.name)"
        >
          {{ getConfig(agent.name).enabled !== false ? '显示中' : '已隐藏' }}
        </button>
      </div>
      <div v-if="agents.length === 0" class="empty-state-text">
        <span>🎵</span>
        <p>系统宠物尚未连接</p>
        <p class="sub">这里只展示全局 Agent 和音乐 Agent</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-panel { background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(0,0,0,0.05); }
.flex-1 { flex: 1; }
.pet-card-section { display: flex; flex-direction: column; padding: 20px; border-radius: 16px; overflow: hidden; }
.section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.5px; }
.section-actions { display: flex; gap: 8px; }
.pet-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px; }
.pet-list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 12px; cursor: pointer; transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1); }
.pet-list-item:hover { background: rgba(59, 130, 246, 0.03); border-color: rgba(59, 130, 246, 0.1); transform: translateX(2px); }
.pet-list-item.active { background: rgba(59, 130, 246, 0.06); border-color: rgba(59, 130, 246, 0.15); box-shadow: inset 3px 0 0 var(--accent-blue); }
.pet-preview-wrap { width: 48px; height: 48px; background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(0, 0, 0, 0.03); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
.pet-text-info { flex: 1; min-width: 0; }
.agent-label-name { font-size: 14.5px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pet-type-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.pet-live-status { display: flex; align-items: center; gap: 6px; min-width: 0; margin-top: 6px; font-size: 11.5px; color: var(--text-muted); }
.pet-live-status span { flex-shrink: 0; padding: 2px 6px; border-radius: 999px; background: rgba(100, 116, 139, 0.1); color: #64748b; font-weight: 700; }
.pet-live-status em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; }
.pet-live-status.thinking span { background: rgba(99, 102, 241, 0.12); color: #4f46e5; }
.pet-live-status.planning span { background: rgba(139, 92, 246, 0.13); color: #7c3aed; }
.pet-live-status.working span, .pet-live-status.building span { background: rgba(14, 165, 233, 0.12); color: #0284c7; }
.pet-live-status.debugging span { background: rgba(244, 63, 94, 0.12); color: #e11d48; }
.pet-live-status.reviewing span { background: rgba(20, 184, 166, 0.12); color: #0f766e; }
.pet-live-status.happy span { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.pet-live-status.error span { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.pet-live-status.waiting span, .pet-live-status.notification span, .pet-live-status.attention span { background: rgba(245, 158, 11, 0.14); color: #d97706; }
.state-toggle-btn { padding: 5px 12px; font-size: 12.5px; font-weight: 600; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.06); background: rgba(255, 255, 255, 0.6); color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
.state-toggle-btn.enabled { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-color: rgba(59, 130, 246, 0.2); }
.state-toggle-btn:hover { filter: brightness(0.96); }
.empty-state-text { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 40px 20px; color: var(--text-muted); text-align: center; }
.empty-state-text span { font-size: 32px; opacity: 0.3; margin-bottom: 12px; }
.empty-state-text p { font-size: 13.5px; color: var(--text-secondary); }
.empty-state-text .sub { font-size: 11.5px; margin-top: 4px; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
:global([data-theme="dark"]) .glass-panel, :global([data-theme="dark"]) .pet-list-item { background: rgba(10, 10, 20, 0.38); border-color: rgba(255,255,255,0.06); }
</style>
