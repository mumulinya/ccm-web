<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, Bot, CheckCircle2, CircleAlert, HelpCircle, MessageCircle, Play, QrCode, RefreshCw, Save, Send, Square } from '@lucide/vue'
import { toast } from '../../utils/toast.js'
import ControlBotQrModal from './ControlBotQrModal.vue'

const activeChannel = ref('reports')
const loading = ref(false)
const showQr = ref(false)
const qrUrl = ref('')
const qrImage = ref('')
const qrStatus = ref('')
const qrLoading = ref(false)
const qrTimer = ref(null)
const connectionLoading = ref(false)
const secrets = ref({ webhook: false, signKey: false, appSecret: false })
const connection = ref({ running: false, pid: null, healthy: false, socket_connected: false, health: null })
const config = ref({
  enabled: false,
  webhook_url: '',
  sign_key: '',
  notification_ready: false,
  control_bot_enabled: false,
  control_bot_app_id: '',
  control_bot_app_secret: '',
  control_bot_ready: false
})

const reportReady = computed(() => config.value.enabled && (secrets.value.webhook || !!config.value.webhook_url.trim()))
const taskReady = computed(() => config.value.control_bot_enabled && config.value.control_bot_ready && connection.value.healthy)

const applyConfig = data => {
  const next = data?.config || {}
  secrets.value = {
    webhook: next.webhook_ready === true,
    signKey: next.sign_key === '******',
    appSecret: next.control_bot_app_secret === '******'
  }
  config.value = {
    ...config.value,
    ...next,
    webhook_url: '',
    sign_key: '',
    control_bot_app_secret: ''
  }
}

const loadConfig = async () => {
  try {
    const response = await fetch('/api/feishu/config')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '读取飞书配置失败')
    applyConfig(data)
  } catch (error) {
    toast.error(error?.message || '读取飞书配置失败')
  }
}

const loadConnection = async (probe = false) => {
  connectionLoading.value = true
  try {
    const [statusResponse, healthResponse] = await Promise.all([
      fetch('/api/feishu/control-bot/status'),
      fetch(probe ? '/api/feishu/health/probe' : '/api/feishu/health', probe ? { method: 'POST' } : undefined)
    ])
    const [status, health] = await Promise.all([statusResponse.json(), healthResponse.json()])
    connection.value = {
      ...(status || {}),
      health,
      healthy: health?.healthy === true,
      socket_connected: health?.socket_connected === true
    }
    if (probe) toast[connection.value.healthy ? 'success' : 'warning'](connection.value.healthy ? '任务会话通道连接正常' : '任务会话通道尚未完全就绪')
  } catch {
    connection.value = { running: false, pid: null, healthy: false, socket_connected: false, health: null }
    if (probe) toast.error('无法验证任务会话通道')
  } finally {
    connectionLoading.value = false
  }
}

const buildPayload = () => {
  const payload = { ...config.value }
  if (!payload.webhook_url && secrets.value.webhook) delete payload.webhook_url
  if (!payload.sign_key && secrets.value.signKey) delete payload.sign_key
  if (!payload.control_bot_app_secret && secrets.value.appSecret) delete payload.control_bot_app_secret
  return payload
}

const saveConfig = async (message = '飞书配置已保存') => {
  loading.value = true
  try {
    const response = await fetch('/api/feishu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '保存失败')
    toast.success(message)
    await loadConfig()
    return true
  } catch (error) {
    toast.error(error?.message || '保存飞书配置失败')
    return false
  } finally {
    loading.value = false
  }
}

const testNotification = async () => {
  if (!config.value.webhook_url.trim() && !secrets.value.webhook) {
    toast.warning('请先填写报告通知 Webhook')
    return
  }
  if (!await saveConfig('报告通知配置已保存')) return
  loading.value = true
  try {
    const response = await fetch('/api/feishu/test', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '测试通知发送失败')
    toast.success(data.message || '测试通知已发送')
  } catch (error) {
    toast.error(error?.message || '测试通知发送失败')
  } finally {
    loading.value = false
  }
}

const startConnection = async () => {
  if (!await saveConfig('任务会话配置已保存')) return
  connectionLoading.value = true
  try {
    const response = await fetch('/api/feishu/control-bot/start', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '启动长连接失败')
    toast.success(data.message || '任务会话通道已启动')
    await loadConnection(true)
  } catch (error) {
    toast.error(error?.message || '启动任务会话通道失败')
  } finally {
    connectionLoading.value = false
  }
}

const stopConnection = async () => {
  connectionLoading.value = true
  try {
    const response = await fetch('/api/feishu/control-bot/stop', { method: 'POST' })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '停止长连接失败')
    toast.success(data.message || '任务会话通道已停止')
    await loadConnection()
  } catch (error) {
    toast.error(error?.message || '停止任务会话通道失败')
  } finally {
    connectionLoading.value = false
  }
}

const openQr = () => {
  showQr.value = true
  qrUrl.value = ''
  qrImage.value = ''
  qrStatus.value = ''
}

const startQrSetup = async () => {
  qrLoading.value = true
  qrStatus.value = '正在生成扫码链接'
  try {
    const response = await fetch('/api/feishu/control-bot/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'ccm-control-bot' })
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '生成扫码链接失败')
    qrUrl.value = data.scan_url || ''
    qrImage.value = data.qr_image || ''
    qrStatus.value = '请使用飞书 App 扫码完成授权'
    let checks = 0
    clearInterval(qrTimer.value)
    qrTimer.value = setInterval(async () => {
      checks += 1
      if (checks > 100) {
        clearInterval(qrTimer.value)
        qrLoading.value = false
        qrStatus.value = '扫码已超时，请重新生成'
        return
      }
      try {
        const configResponse = await fetch('/api/feishu/config')
        const configData = await configResponse.json()
        if (configData.config?.control_bot_app_id) {
          clearInterval(qrTimer.value)
          applyConfig(configData)
          qrLoading.value = false
          qrStatus.value = '应用凭证已配置，可以启动任务会话通道'
          await loadConnection()
        }
      } catch {}
    }, 3000)
  } catch (error) {
    qrLoading.value = false
    qrStatus.value = error?.message || '生成扫码链接失败'
  }
}

onMounted(() => Promise.all([loadConfig(), loadConnection()]))
onBeforeUnmount(() => clearInterval(qrTimer.value))
</script>

<template>
  <section class="settings-panel" data-settings-panel="channels">
    <header class="settings-panel-header">
      <div class="settings-panel-heading">
        <Bell :size="20" />
        <div>
          <h2>通知与渠道</h2>
          <p>报告通知发送日报周报；任务会话接收需求并把计划、进度和验收结果返回原飞书会话。</p>
        </div>
      </div>
    </header>

    <div class="settings-segmented" aria-label="飞书通道类型">
      <button type="button" :class="{ active: activeChannel === 'reports' }" @click="activeChannel = 'reports'">
        <Send :size="15" /> 报告通知
      </button>
      <button type="button" :class="{ active: activeChannel === 'tasks' }" @click="activeChannel = 'tasks'">
        <MessageCircle :size="15" /> 任务会话
      </button>
    </div>

    <template v-if="activeChannel === 'reports'">
      <div class="settings-status-banner" :class="{ ready: reportReady }">
        <div class="settings-status-copy">
          <CheckCircle2 v-if="reportReady" :size="18" />
          <CircleAlert v-else :size="18" />
          <div>
            <strong>{{ reportReady ? '报告通知已就绪' : '报告通知待配置' }}</strong>
            <span>{{ reportReady ? '日报和周报会发送到固定通知群。' : '启用通道并填写自定义机器人 Webhook。' }}</span>
          </div>
        </div>
      </div>

      <div class="settings-form">
        <label class="settings-switch">
          <input v-model="config.enabled" type="checkbox">
          <span class="settings-switch-track"></span>
          开启报告通知
        </label>
        <div class="settings-field">
          <label for="report-webhook">报告通知 Webhook</label>
          <input id="report-webhook" v-model="config.webhook_url" class="settings-input" :placeholder="secrets.webhook ? '已安全保存，留空不修改' : 'https://open.feishu.cn/open-apis/bot/v2/hook/...'">
          <span class="settings-field-hint">在接收日报周报的固定飞书群中添加“自定义机器人”后获取。</span>
        </div>
        <div class="settings-field">
          <label for="report-sign-key">签名密钥（可选）</label>
          <input id="report-sign-key" v-model="config.sign_key" type="password" class="settings-input" :placeholder="secrets.signKey ? '已安全保存，留空不修改' : '机器人开启签名校验时填写'">
        </div>
        <div class="settings-panel-actions">
          <button type="button" class="settings-button primary" :disabled="loading" @click="saveConfig('报告通知配置已保存')"><Save :size="15" /> 保存</button>
          <button type="button" class="settings-button" :disabled="loading" @click="testNotification"><Send :size="15" /> 发送测试通知</button>
        </div>
      </div>

      <details class="settings-details">
        <summary><HelpCircle :size="14" /> 配置帮助</summary>
        <div class="settings-details-content">
          <ol><li>在目标飞书群添加自定义机器人并复制 Webhook。</li><li>机器人启用签名校验时填写签名密钥。</li><li>保存后发送测试通知；任务进度不会走这条通道。</li></ol>
        </div>
      </details>
    </template>

    <template v-else>
      <div class="settings-status-banner" :class="{ ready: taskReady }">
        <div class="settings-status-copy">
          <CheckCircle2 v-if="taskReady" :size="18" />
          <CircleAlert v-else :size="18" />
          <div>
            <strong>{{ taskReady ? '任务会话通道在线' : (connection.running ? '连接正在恢复' : '任务会话通道未启动') }}</strong>
            <span v-if="connection.running">WebSocket {{ connection.socket_connected ? '已连接' : '未连接' }}，待重试 {{ connection.health?.outbox?.pending || 0 }} 条。</span>
            <span v-else>配置飞书自建应用后启动长连接，无需公网回调地址。</span>
          </div>
        </div>
        <span v-if="connection.pid" class="settings-status-meta">PID {{ connection.pid }}</span>
      </div>

      <div class="settings-form">
        <label class="settings-switch">
          <input v-model="config.control_bot_enabled" type="checkbox">
          <span class="settings-switch-track"></span>
          开启任务会话通道
        </label>
        <div class="settings-form-grid">
          <div class="settings-field">
            <label for="task-app-id">应用 App ID</label>
            <input id="task-app-id" v-model="config.control_bot_app_id" class="settings-input" placeholder="cli_xxxxxxxxxxxxxxxx">
          </div>
          <div class="settings-field">
            <label for="task-app-secret">应用 App Secret</label>
            <input id="task-app-secret" v-model="config.control_bot_app_secret" type="password" class="settings-input" :placeholder="secrets.appSecret ? '已安全保存，留空不修改' : '输入 App Secret'">
          </div>
        </div>
        <div class="settings-inline-status">
          <div>
            <strong>扫码自动配置</strong>
            <span>自动获取应用凭证，也可以在上方手动填写。</span>
          </div>
          <button type="button" class="settings-button" @click="openQr"><QrCode :size="15" /> 扫码配置</button>
        </div>
        <div class="settings-panel-actions">
          <button type="button" class="settings-button primary" :disabled="loading" @click="saveConfig('任务会话配置已保存')"><Save :size="15" /> 保存</button>
          <button type="button" class="settings-button" :disabled="connectionLoading" @click="loadConnection(true)"><RefreshCw :size="15" /> 验证连接</button>
          <button v-if="!connection.running" type="button" class="settings-button" :disabled="connectionLoading" @click="startConnection"><Play :size="15" /> 启动</button>
          <button v-else type="button" class="settings-button danger" :disabled="connectionLoading" @click="stopConnection"><Square :size="14" /> 停止</button>
        </div>
      </div>

      <details class="settings-details">
        <summary><HelpCircle :size="14" /> 飞书开放平台要求</summary>
        <div class="settings-details-content">
          <ol><li>应用需要启用机器人能力。</li><li>在事件订阅中添加 <code>im.message.receive_v1</code>，并选择 WebSocket 长连接。</li><li>把机器人加入目标群，在群内 @ 它发送需求。</li></ol>
        </div>
      </details>
    </template>

    <ControlBotQrModal v-if="showQr" :qr-image="qrImage" :qr-url="qrUrl" :qr-status="qrStatus" :loading="qrLoading" @start="startQrSetup" @close="showQr = false" />
  </section>
</template>
