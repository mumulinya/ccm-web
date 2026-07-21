<script setup>
import { onMounted, ref } from 'vue'
import { CircleCheck, Settings2 } from '@lucide/vue'
import SettingsSidebar from './SettingsSidebar.vue'
import SettingsFeishuPanel from './SettingsFeishuPanel.vue'
import SettingsModelPanel from './SettingsModelPanel.vue'
import SettingsExperiencePanel from './SettingsExperiencePanel.vue'
import SettingsSystemPanel from './SettingsSystemPanel.vue'
import SettingsAgentProvidersPanel from './SettingsAgentProvidersPanel.vue'
import './settings.css'

const activeSection = ref('channels')
const systemStatus = ref(null)

const loadSystemStatus = async () => {
  try {
    const response = await fetch('/api/system/settings-status')
    const data = await response.json()
    if (response.ok && data.success) systemStatus.value = data
  } catch {}
}

onMounted(loadSystemStatus)
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
      />
      <main class="settings-content">
        <SettingsFeishuPanel v-if="activeSection === 'channels'" />
        <SettingsModelPanel v-else-if="activeSection === 'models'" />
        <SettingsAgentProvidersPanel v-else-if="activeSection === 'agent-providers'" />
        <SettingsExperiencePanel v-else-if="activeSection === 'experience'" />
        <SettingsSystemPanel
          v-else
          :initial-status="systemStatus"
          @status="systemStatus = $event"
        />
      </main>
    </div>
  </div>
</template>
