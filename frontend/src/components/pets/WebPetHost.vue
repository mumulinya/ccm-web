<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import DesktopPet from './DesktopPet.vue'

const emit = defineEmits(['navigate'])

const config = ref({ revision: 0, configs: {}, positions: {}, settings: { webFallback: true, agentProgressMode: 'milestones' } })
const agents = ref([])
const agentState = ref('idle')
const notification = ref(null)
const desktopRunning = ref(true)
const clientId = `web-pet:${Date.now()}:${Math.random().toString(16).slice(2)}`
let stream = null
let reconnectTimer = null
let statusTimer = null

const globalAgent = computed(() => agents.value.find(item => item.name === 'global-agent') || agents.value[0] || null)
const globalConfig = computed(() => config.value.configs?.[globalAgent.value?.name || 'global-agent'] || {})
const position = computed(() => config.value.positions?.[globalAgent.value?.name || 'global-agent'] || {})
const shouldShow = computed(() => !desktopRunning.value
  && config.value.settings?.webFallback !== false
  && globalConfig.value.enabled !== false
  && !!globalAgent.value)

const acknowledge = async item => {
  if (!item?.delivery_id) return
  try {
    await fetch(`/api/pets/runtime/deliveries/${encodeURIComponent(item.delivery_id)}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, notification_id: item.notification_id }),
    })
  } catch {}
}

const showPetMessage = (item, durable = false) => {
  if (!item || !shouldShow.value) return
  notification.value = item
  agentState.value = item.pet_state || item.milestone?.petState
    || (item.role === 'ask' ? 'waiting' : item.role === 'error' ? 'error' : item.role === 'assistant' ? 'happy' : 'notification')
  if (!durable) return
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (document.visibilityState === 'visible' && notification.value?.delivery_id === item.delivery_id) {
      void acknowledge(item)
    }
  }))
}

const showNotification = item => showPetMessage(item, true)

const loadBootstrap = async () => {
  const response = await fetch('/api/pets/runtime/bootstrap')
  if (!response.ok) throw new Error('网页宠物初始化失败')
  const data = await response.json()
  config.value = data.config || config.value
  agents.value = Array.isArray(data.agents) ? data.agents : []
  const global = globalAgent.value
  agentState.value = global?.state || 'idle'
}

const refreshDesktopStatus = async () => {
  try {
    const response = await fetch('/api/pets/status')
    const data = await response.json()
    const wasRunning = desktopRunning.value
    desktopRunning.value = data.running === true && data.runtime?.status === 'ready'
    if (wasRunning && !desktopRunning.value) {
      await loadBootstrap()
      connectStream()
    } else if (desktopRunning.value && stream) {
      stream.close()
      stream = null
    }
  } catch {
    desktopRunning.value = false
  }
}

const scheduleReconnect = () => {
  if (reconnectTimer || desktopRunning.value) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectStream()
  }, 3_000)
}

const connectStream = () => {
  if (stream || desktopRunning.value || typeof EventSource === 'undefined') return
  stream = new EventSource(`/api/pets/runtime/stream?client_id=${encodeURIComponent(clientId)}`)
  stream.onmessage = event => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'snapshot') {
        agents.value = Array.isArray(data.agents) ? data.agents : agents.value
        agentState.value = globalAgent.value?.state || agentState.value
      } else if (data.type === 'state' && data.agent === globalAgent.value?.name) {
        agentState.value = data.state || 'idle'
      } else if (data.type === 'notification') {
        showNotification(data.notification)
      } else if (data.type === 'speech' && data.milestone?.schema === 'ccm-pet-agent-milestone-v1') {
        showPetMessage({
          ...data,
          title: data.title || data.milestone.title,
          summary: data.text || data.milestone.summary,
          pet_state: data.pet_state || data.milestone.petState,
          hold_ms: data.hold_ms || 8_000,
          action: data.action || data.milestone.action || {},
        })
      } else if (data.type === 'config') {
        void loadBootstrap()
      }
    } catch {}
  }
  stream.onerror = () => {
    stream?.close()
    stream = null
    scheduleReconnect()
  }
}

const savePosition = async value => {
  const agent = String(value?.agent || globalAgent.value?.name || 'global-agent')
  try {
    const response = await fetch('/api/pets/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision: config.value.revision,
        patch: { positions: { [agent]: { x: value.x, y: value.y } } },
      }),
    })
    const data = await response.json()
    if (response.status === 409 && data.current) config.value = data.current
    else if (data.config) config.value = data.config
  } catch {}
}

onMounted(async () => {
  await refreshDesktopStatus()
  await loadBootstrap().catch(() => {})
  if (!desktopRunning.value) connectStream()
  statusTimer = window.setInterval(refreshDesktopStatus, 5_000)
})

onUnmounted(() => {
  stream?.close()
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<template>
  <DesktopPet
    v-if="shouldShow"
    :agent="globalAgent.name"
    :display-name="globalAgent.displayName || globalAgent.label || '全局 Agent'"
    :pet-label="globalAgent.petLabel || ''"
    :pet-type="globalConfig.type || 'yuexinmiao'"
    :agent-state="agentState"
    :initial-x="Number.isFinite(Number(position.x)) ? Number(position.x) : null"
    :initial-y="Number.isFinite(Number(position.y)) ? Number(position.y) : null"
    :notification="notification"
    @move="savePosition"
    @activate="emit('navigate', $event)"
  />
</template>
