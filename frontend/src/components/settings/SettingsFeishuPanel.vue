<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AlertTriangle, Bell, CheckCircle2, CircleAlert, HelpCircle, MessageCircle, Play, Plus, QrCode, RefreshCw, RotateCcw, Save, Send, ShieldCheck, Square, Trash2, UserRound } from '@lucide/vue'
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
const deliveryLoading = ref(false)
const deliveries = ref([])
const deliverySummary = ref({ pending: 0, exhausted: 0, sent: 0 })
const observedUsers = ref([])
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
  control_bot_ready: false,
  control_bot_access_mode: 'open',
  control_bot_users: []
})

const reportReady = computed(() => config.value.enabled && (secrets.value.webhook || !!config.value.webhook_url.trim()))
const taskReady = computed(() => config.value.control_bot_enabled && config.value.control_bot_ready && connection.value.healthy)

const applyConfig = data => {
  const next = data?.config || {}
  observedUsers.value = Array.isArray(next.observed_users) ? next.observed_users : []
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

const loadDeliveries = async () => {
  deliveryLoading.value = true
  try {
    const response = await fetch('/api/feishu/channel/deliveries?limit=50')
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取飞书投递记录失败')
    deliveries.value = Array.isArray(data.deliveries) ? data.deliveries : []
    deliverySummary.value = data.summary || { pending: 0, exhausted: 0, sent: 0 }
    if (Array.isArray(data.identities)) observedUsers.value = data.identities
  } catch (error) {
    toast.error(error?.message || '读取飞书投递记录失败')
  } finally {
    deliveryLoading.value = false
  }
}

const mappedUsers = computed(() => Array.isArray(config.value.control_bot_users) ? config.value.control_bot_users : [])
const identityKey = user => user.open_id || user.user_id || user.union_id || ''
const isMapped = user => mappedUsers.value.some(item => identityKey(item) === identityKey(user))
const addUser = (source = {}) => {
  if (identityKey(source) && isMapped(source)) return
  config.value.control_bot_users = [...mappedUsers.value, {
    open_id: source.open_id || '', user_id: source.user_id || '', union_id: source.union_id || '',
    name: source.name || '', role: 'operator', enabled: true
  }]
}
const removeUser = index => {
  config.value.control_bot_users = mappedUsers.value.filter((_, itemIndex) => itemIndex !== index)
}

const retryDelivery = async delivery => {
  deliveryLoading.value = true
  try {
    const response = await fetch('/api/feishu/channel/outbox/retry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_id: delivery?.id || '' })
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || data.delivery?.error || '重试仍未成功')
    toast.success('飞书消息已重新发送')
  } catch (error) {
    toast.error(error?.message || '飞书投递重试失败')
  } finally {
    await loadDeliveries()
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
  delete payload.observed_users
  delete payload.authorized_user
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

onMounted(() => Promise.all([loadConfig(), loadConnection(), loadDeliveries()]))
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

        <div class="feishu-access-section">
          <div class="feishu-section-heading">
            <div><ShieldCheck :size="17" /><span><strong>用户身份与权限</strong><small>控制谁可以从飞书询问、创建任务和批准权限。</small></span></div>
            <select v-model="config.control_bot_access_mode" class="settings-input feishu-access-mode">
              <option value="open">允许所有已识别用户</option>
              <option value="mapped">仅允许名单用户</option>
            </select>
          </div>
          <div class="feishu-role-hint">
            <span>查看者：问答与状态</span><span>操作员：创建和控制任务</span><span>管理员：包含权限审批</span>
          </div>
          <div v-if="mappedUsers.length" class="feishu-user-list">
            <div v-for="(user, index) in mappedUsers" :key="identityKey(user) || index" class="feishu-user-row">
              <UserRound :size="16" />
              <input v-model="user.name" class="settings-input" placeholder="显示名称">
              <input v-model="user.open_id" class="settings-input" placeholder="open_id">
              <select v-model="user.role" class="settings-input">
                <option value="viewer">查看者</option><option value="operator">操作员</option><option value="admin">管理员</option>
              </select>
              <label class="feishu-user-enabled"><input v-model="user.enabled" type="checkbox"> 启用</label>
              <button type="button" class="settings-icon-button danger" title="移除用户" @click="removeUser(index)"><Trash2 :size="14" /></button>
            </div>
          </div>
          <button type="button" class="settings-button compact" @click="addUser()"><Plus :size="14" /> 手动添加用户</button>
          <div v-if="observedUsers.some(user => !isMapped(user))" class="feishu-observed-users">
            <small>最近识别到的飞书用户</small>
            <button v-for="user in observedUsers.filter(item => !isMapped(item)).slice(0, 8)" :key="identityKey(user)" type="button" @click="addUser(user)">
              <Plus :size="12" /> {{ user.name || user.open_id || user.user_id }}
            </button>
          </div>
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
          <ol><li>应用需要启用机器人能力。</li><li>在事件订阅中添加 <code>im.message.receive_v1</code>，并选择 WebSocket 长连接。</li><li>启用消息卡片回传交互；事件回调入口为 <code>/api/feishu/bot/event</code>。</li><li>把机器人加入目标群，在群内 @ 它发送需求。</li></ol>
        </div>
      </details>

      <section class="feishu-delivery-section">
        <div class="feishu-section-heading">
          <div><Send :size="17" /><span><strong>任务消息投递</strong><small>回复原消息、任务卡更新和失败恢复记录。</small></span></div>
          <button type="button" class="settings-button compact" :disabled="deliveryLoading" @click="loadDeliveries"><RefreshCw :size="14" /> 刷新</button>
        </div>
        <div class="feishu-delivery-summary">
          <span><b>{{ deliverySummary.pending || 0 }}</b> 待重试</span>
          <span :class="{ danger: deliverySummary.exhausted }"><b>{{ deliverySummary.exhausted || 0 }}</b> 已耗尽</span>
          <span><b>{{ deliverySummary.sent || 0 }}</b> 已发送</span>
        </div>
        <div v-if="deliveries.length" class="feishu-delivery-list">
          <div v-for="delivery in deliveries.slice(0, 20)" :key="delivery.id" class="feishu-delivery-row">
            <CheckCircle2 v-if="delivery.status === 'sent'" :size="15" class="success" />
            <AlertTriangle v-else :size="15" :class="{ danger: delivery.exhausted }" />
            <span><strong>{{ delivery.title || delivery.stage }}</strong><small>{{ delivery.delivery_mode || '等待发送' }} · {{ delivery.attempts }} 次</small></span>
            <code>{{ delivery.id }}</code>
            <button v-if="delivery.status !== 'sent'" type="button" class="settings-icon-button" title="重新发送" :disabled="deliveryLoading" @click="retryDelivery(delivery)"><RotateCcw :size="14" /></button>
          </div>
        </div>
        <div v-else class="feishu-empty-deliveries">暂无任务消息投递记录</div>
      </section>
    </template>

    <ControlBotQrModal v-if="showQr" :qr-image="qrImage" :qr-url="qrUrl" :qr-status="qrStatus" :loading="qrLoading" @start="startQrSetup" @close="showQr = false" />
  </section>
</template>

<style scoped>
.feishu-access-section,.feishu-delivery-section{display:grid;gap:12px;padding-top:16px;border-top:1px solid var(--border-color)}
.feishu-section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}
.feishu-section-heading>div{display:flex;align-items:center;gap:9px;min-width:0;color:var(--text-primary)}
.feishu-section-heading span{display:grid;gap:2px}.feishu-section-heading strong{font-size:12.5px}.feishu-section-heading small{color:var(--text-secondary);font-size:10.5px}
.feishu-access-mode{width:min(270px,100%)}
.feishu-role-hint{display:flex;flex-wrap:wrap;gap:6px 16px;color:var(--text-secondary);font-size:10.5px}
.feishu-user-list{display:grid;border-top:1px solid var(--border-color)}
.feishu-user-row{display:grid;grid-template-columns:18px minmax(100px,.8fr) minmax(150px,1.4fr) 100px auto 34px;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-color)}
.feishu-user-enabled{display:flex;align-items:center;gap:5px;color:var(--text-secondary);font-size:11px;white-space:nowrap}
.settings-icon-button{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-card);color:var(--text-secondary);cursor:pointer}.settings-icon-button:hover{border-color:var(--accent-primary);color:var(--text-primary)}.settings-icon-button.danger:hover{border-color:var(--accent-red);color:var(--accent-red)}
.settings-button.compact{min-height:32px;padding:0 10px;justify-self:start}
.feishu-observed-users{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.feishu-observed-users>small{width:100%;color:var(--text-secondary)}.feishu-observed-users button{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-card);color:var(--text-secondary);font-size:10.5px;cursor:pointer}
.feishu-delivery-summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border-color);border-radius:7px;overflow:hidden}.feishu-delivery-summary span{display:flex;align-items:baseline;gap:6px;padding:9px 12px;color:var(--text-secondary);font-size:10.5px}.feishu-delivery-summary span+span{border-left:1px solid var(--border-color)}.feishu-delivery-summary b{color:var(--text-primary);font-size:15px}.danger{color:var(--accent-red)!important}.success{color:var(--accent-green)}
.feishu-delivery-list{display:grid;max-height:320px;overflow:auto;border-top:1px solid var(--border-color)}.feishu-delivery-row{display:grid;grid-template-columns:18px minmax(0,1fr) auto 34px;align-items:center;gap:9px;padding:9px 4px;border-bottom:1px solid var(--border-color)}.feishu-delivery-row>span{display:grid;min-width:0;gap:2px}.feishu-delivery-row strong{overflow:hidden;color:var(--text-primary);font-size:11.5px;text-overflow:ellipsis;white-space:nowrap}.feishu-delivery-row small{color:var(--text-secondary);font-size:10px}.feishu-delivery-row code{color:var(--text-muted);font-size:9.5px}.feishu-empty-deliveries{padding:20px;text-align:center;color:var(--text-muted);font-size:11px}
@media(max-width:760px){.feishu-section-heading{align-items:stretch;flex-direction:column}.feishu-access-mode{width:100%}.feishu-user-row{grid-template-columns:18px minmax(0,1fr) 92px 34px}.feishu-user-row input:nth-of-type(2){grid-column:2/5}.feishu-user-enabled{display:none}.feishu-delivery-row{grid-template-columns:18px minmax(0,1fr) 34px}.feishu-delivery-row code{display:none}}
</style>
