<script setup>
import { onMounted, ref, watch } from 'vue'
import { CircleCheck, Settings2 } from '@lucide/vue'
import SettingsSidebar from './SettingsSidebar.vue'
import SettingsFeishuPanel from './SettingsFeishuPanel.vue'
import SettingsModelPanel from './SettingsModelPanel.vue'
import SettingsExperiencePanel from './SettingsExperiencePanel.vue'
import SettingsSystemPanel from './SettingsSystemPanel.vue'
import SettingsAgentProvidersPanel from './SettingsAgentProvidersPanel.vue'
import SettingsSecurityPanel from './SettingsSecurityPanel.vue'
import SettingsTestAgentPanel from './SettingsTestAgentPanel.vue'
import './settings.css'

const authRole = window.__CCM_AUTH__?.user?.role || 'user'
const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated'])
const authFeatures = new Set(window.__CCM_AUTH__?.access?.features || [])
const canPlatformSettings = authRole === 'admin' || authFeatures.has('platform_settings')
const activeSection = ref(canPlatformSettings ? 'channels' : 'security')
const systemStatus = ref(null)

const loadSystemStatus = async () => {
  try {
    const response = await fetch('/api/system/settings-status')
    const data = await response.json()
    if (response.ok && data.success) systemStatus.value = data
  } catch {}
}

const applyNavigation = target => {
  if (target?.tab !== 'settings') return
  const requested = String(target.section || '')
  const allowed = new Set(['channels', 'models', 'agent-providers', 'test-agent', 'experience', 'security', 'system'])
  if (allowed.has(requested) && (canPlatformSettings || requested === 'security')) activeSection.value = requested
  emit('navigated')
}

watch(() => props.navigateTo, applyNavigation, { deep: true })
onMounted(() => {
  loadSystemStatus()
  applyNavigation(props.navigateTo)
})
</script>

<template>
  <div class="settings-page">
    <header class="settings-page-header">
      <div class="settings-page-title">
        <span class="settings-title-icon"><Settings2 :size="20" /></span>
        <div>
          <h1>设置中心</h1>
          <p>管理外部通道、统一模型、开发 Agent 和界面偏好。</p>
        </div>
      </div>
      <span class="settings-service-state" :class="{ online: systemStatus?.service?.status === 'online' }">
        <CircleCheck :size="15" />
        {{ systemStatus?.service?.status === 'online' ? '服务在线' : '正在检查' }}
      </span>
    </header>

    <div class="settings-layout">
      <SettingsSidebar
        v-model:active-section="activeSection"
        :version="systemStatus?.version || ''"
        :role="authRole"
        :features="[...authFeatures]"
      />
      <main class="settings-content">
        <SettingsFeishuPanel v-if="activeSection === 'channels' && authRole === 'admin'" />
        <SettingsModelPanel v-else-if="activeSection === 'models'" />
        <SettingsAgentProvidersPanel v-else-if="activeSection === 'agent-providers'" />
        <SettingsTestAgentPanel v-else-if="activeSection === 'test-agent'" />
        <SettingsExperiencePanel v-else-if="activeSection === 'experience'" />
        <SettingsSecurityPanel v-else-if="activeSection === 'security'" />
        <SettingsSystemPanel
          v-else-if="authRole === 'admin'"
          :initial-status="systemStatus"
          @status="systemStatus = $event"
        />
      </main>
    </div>
  </div>
</template>
