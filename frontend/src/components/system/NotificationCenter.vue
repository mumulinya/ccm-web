<script setup>
import { Bell, CheckCheck, Filter, X } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'
import { toast } from '../../utils/toast.js'

const emit = defineEmits(['navigate'])
const open = ref(false)
const loading = ref(false)
const items = ref([])
const unreadCount = ref(0)
const nextCursor = ref('')
const unreadOnly = ref(false)
let unsubscribe = null

const visibleItems = computed(() => unreadOnly.value ? items.value.filter(item => !item.read_at) : items.value)

const load = async ({ append = false } = {}) => {
  if (loading.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: '30' })
    if (append && nextCursor.value) params.set('cursor', nextCursor.value)
    if (unreadOnly.value) params.set('unread_only', '1')
    const response = await fetch(`/api/notifications?${params}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '通知读取失败')
    items.value = append ? [...items.value, ...(data.items || [])] : (data.items || [])
    nextCursor.value = data.next_cursor || ''
    unreadCount.value = Number(data.unread_count || 0)
  } catch (error) {
    toast.error(error?.message || '通知读取失败')
  } finally {
    loading.value = false
  }
}

const mutate = async (item, action) => {
  const response = await fetch(`/api/notifications/${encodeURIComponent(item.notification_id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) return
  if (action === 'read' && !item.read_at) {
    item.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  if (action === 'dismiss') items.value = items.value.filter(row => row.notification_id !== item.notification_id)
}

const openItem = async item => {
  await mutate(item, 'read')
  open.value = false
  emit('navigate', item.action || {})
}

const readAll = async () => {
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!response.ok) return
  const timestamp = new Date().toISOString()
  items.value.forEach(item => { item.read_at ||= timestamp })
  unreadCount.value = 0
}

const toggleUnreadOnly = async () => {
  unreadOnly.value = !unreadOnly.value
  await load()
}

onMounted(() => {
  void load()
  unsubscribe = subscribeRuntimeEvents('system', event => {
    if (event?.type === 'notification.created') void load()
  })
})
onUnmounted(() => unsubscribe?.())
</script>

<template>
  <div class="notification-center">
    <button class="notification-trigger" type="button" title="通知中心" aria-label="通知中心" @click="open = !open">
      <Bell :size="18" />
      <span v-if="unreadCount" class="notification-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <section v-if="open" class="notification-panel" aria-label="通知中心">
      <header>
        <div>
          <strong>通知中心</strong>
          <span>{{ unreadCount ? `${unreadCount} 条未读` : '没有未读通知' }}</span>
        </div>
        <div class="notification-actions">
          <button type="button" class="notification-filter" :class="{ active: unreadOnly }" :title="unreadOnly ? '显示全部通知' : '只看未读'" @click="toggleUnreadOnly"><Filter :size="14" /><span>{{ unreadOnly ? '未读' : '全部' }}</span></button>
          <button type="button" title="全部已读" :disabled="!unreadCount" @click="readAll"><CheckCheck :size="16" /></button>
          <button type="button" title="关闭" @click="open = false"><X :size="16" /></button>
        </div>
      </header>
      <div class="notification-list">
        <article
          v-for="item in visibleItems"
          :key="item.notification_id"
          class="notification-item"
          :class="[item.severity, { unread: !item.read_at }]"
        >
          <i aria-hidden="true"></i>
          <button type="button" class="notification-copy" @click="openItem(item)">
            <strong>{{ item.title }}</strong>
            <small>{{ item.summary }}</small>
            <time>{{ new Date(item.created_at).toLocaleString() }}</time>
          </button>
          <button type="button" class="dismiss" title="取消提醒" @click.stop="mutate(item, 'dismiss')"><X :size="14" /></button>
        </article>
        <p v-if="!loading && !visibleItems.length" class="notification-empty">目前没有通知</p>
        <button v-if="nextCursor" type="button" class="notification-more" :disabled="loading" @click="load({ append: true })">
          {{ loading ? '读取中' : '加载更多' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.notification-center{position:relative;z-index:10020;color:var(--text-primary)}
.notification-trigger{position:relative;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);color:var(--text-secondary);cursor:pointer}.notification-trigger:hover{border-color:var(--accent-blue);background:var(--control-hover);color:var(--text-primary)}
.notification-count{position:absolute;top:-5px;right:-6px;min-width:16px;height:16px;padding:0 4px;display:grid;place-items:center;border:2px solid var(--surface);border-radius:999px;background:#dc2626;color:#fff;font-size:9px;font-weight:800;line-height:1}
.notification-panel{position:absolute;top:42px;right:0;width:min(360px,calc(100vw - 20px));max-height:min(580px,calc(100vh - 68px));display:grid;grid-template-rows:auto minmax(0,1fr);border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);box-shadow:0 16px 40px rgba(15,23,42,.18);overflow:hidden}
.notification-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-bottom:1px solid var(--border-color)}.notification-panel>header div:first-child{display:grid;gap:2px}.notification-panel strong{font-size:12px}.notification-panel header span{color:var(--text-muted);font-size:10px}
.notification-actions{display:flex;align-items:center;gap:3px}.notification-actions button,.dismiss{height:28px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--text-muted);cursor:pointer}.notification-actions button:not(.notification-filter),.dismiss{width:28px}.notification-filter{grid-auto-flow:column;gap:4px;padding:0 7px;font-size:10px}.notification-actions button:hover,.notification-actions button.active,.dismiss:hover{background:var(--control-hover);color:var(--accent-blue)}
.notification-list{min-height:92px;overflow:auto}.notification-item{position:relative;width:100%;display:grid;grid-template-columns:7px minmax(0,1fr) 24px;gap:8px;padding:9px 8px 9px 12px;border:0;border-bottom:1px solid color-mix(in srgb,var(--border-color) 75%,transparent);background:transparent;color:inherit;text-align:left}.notification-item:hover{background:var(--control-hover)}.notification-item.unread{box-shadow:inset 2px 0 var(--accent-blue);background:color-mix(in srgb,var(--accent-soft) 28%,var(--surface))}
.notification-item>i{width:6px;height:6px;margin-top:5px;border-radius:50%;background:#94a3b8}.notification-item.success>i{background:#16a34a}.notification-item.warning>i{background:#d97706}.notification-item.error>i,.notification-item.critical>i{background:#dc2626}
.notification-copy{min-width:0;display:grid;gap:3px;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.notification-item small{display:-webkit-box;overflow:hidden;color:var(--text-secondary);font-size:11px;line-height:1.42;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}.notification-item time{color:var(--text-muted);font-size:9px}.dismiss{align-self:start}.notification-empty{margin:0;padding:28px 16px;color:var(--text-muted);font-size:12px;text-align:center}.notification-more{width:100%;padding:9px;border:0;background:transparent;color:var(--accent-blue);font-size:11px;font-weight:700;cursor:pointer}
@media(max-width:720px){.notification-panel{position:fixed;top:52px;right:8px;left:8px;width:auto;max-height:calc(100vh - 118px)}}
</style>
