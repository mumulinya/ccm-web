<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GitBranch, RotateCcw, X } from '@lucide/vue'

const props = defineProps({
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
})
const emit = defineEmits(['restored'])
const open = ref(false)
const loading = ref(false)
const restoring = ref('')
const state = ref({ branches: [] })

const query = () => new URLSearchParams({ scope: props.scope, scopeId: props.scopeId || (props.scope === 'global' ? 'global' : ''), exactSessionId: props.exactSessionId }).toString()
const load = async () => {
  if (!props.exactSessionId) { state.value = { branches: [] }; return }
  loading.value = true
  try {
    const response = await fetch(`/api/conversations/history-branches?${query()}`)
    const data = await response.json()
    if (!response.ok || data?.success === false) throw new Error(data?.error || '读取历史分支失败')
    state.value = data.result || data
  } finally { loading.value = false }
}
const restore = async branch => {
  if (!window.confirm('恢复这条历史分支会替换当前会话消息，当前代码不会改变。继续吗？')) return
  restoring.value = branch.snapshotId
  try {
    const response = await fetch(`/api/conversations/history-branches/${encodeURIComponent(branch.snapshotId)}/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        scope: props.scope,
        scopeId: props.scopeId || (props.scope === 'global' ? 'global' : ''),
        exactSessionId: props.exactSessionId,
        revision: state.value.revision,
        generation: state.value.generation,
        conversationChecksum: state.value.conversationChecksum,
      }),
    })
    const data = await response.json()
    if (!response.ok || data?.success === false) throw new Error(data?.error || '恢复历史分支失败')
    open.value = false
    emit('restored', data.result || data)
    window.dispatchEvent(new CustomEvent('ccm:conversation-history-branches-changed'))
    await load()
  } catch (error) { window.alert(error?.message || '恢复历史分支失败') }
  finally { restoring.value = '' }
}
watch(() => `${props.scope}:${props.scopeId}:${props.exactSessionId}`, load)
onMounted(() => { load(); window.addEventListener('ccm:conversation-history-branches-changed', load) })
onBeforeUnmount(() => window.removeEventListener('ccm:conversation-history-branches-changed', load))
</script>

<template>
  <div v-if="state.branches?.length" class="history-branches">
    <button type="button" class="history-trigger" @click="open = true"><GitBranch :size="14" />历史分支 · {{ state.branches.length }}</button>
    <div v-if="open" class="history-backdrop" @click.self="open = false">
      <section class="history-panel" role="dialog" aria-modal="true" aria-label="会话历史分支">
        <header><div><GitBranch :size="17" /><strong>会话历史分支</strong></div><button type="button" aria-label="关闭" @click="open = false"><X :size="16" /></button></header>
        <p>回退后的消息保存在这里。恢复会替换当前会话消息，但不会修改代码。</p>
        <div class="history-list">
          <article v-for="branch in state.branches" :key="branch.snapshotId">
            <div><strong>{{ branch.kind === 'summary' ? '总结前历史' : '回退前历史' }} · {{ new Date(branch.createdAt).toLocaleString() }}</strong><span>{{ branch.kind === 'summary' ? `${branch.originalMessages} 条原始消息` : `${branch.removedMessages} 条移出消息` }} · {{ branch.status === 'restored' ? '曾恢复' : '可恢复' }}</span></div>
            <button type="button" :disabled="!!restoring" @click="restore(branch)"><RotateCcw :size="13" />{{ restoring === branch.snapshotId ? '恢复中…' : '恢复' }}</button>
          </article>
          <p v-if="loading">正在读取…</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.history-branches{margin:0 0 7px}.history-trigger{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-muted);font-size:10px;cursor:pointer}.history-trigger:hover{color:var(--accent-blue);border-color:color-mix(in srgb,var(--accent-blue) 45%,var(--border-color))}.history-backdrop{position:fixed;inset:0;z-index:4000;display:flex;justify-content:flex-end;background:rgba(15,23,42,.28)}.history-panel{box-sizing:border-box;width:min(420px,100%);height:100%;padding:18px;background:var(--surface);box-shadow:-16px 0 40px rgba(15,23,42,.18)}header{display:flex;align-items:center;justify-content:space-between}header>div{display:flex;align-items:center;gap:7px}header button{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--text-muted);cursor:pointer}.history-panel>p{margin:10px 0 16px;color:var(--text-muted);font-size:11px;line-height:1.6}.history-list{display:grid;gap:8px}.history-list article{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--border-color);border-radius:10px}.history-list article>div{display:grid;gap:4px}.history-list strong{font-size:11px}.history-list span{color:var(--text-muted);font-size:9px}.history-list article button{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 9px;border:1px solid var(--border-color);border-radius:7px;background:transparent;color:var(--accent-blue);font-size:10px;cursor:pointer}@media(max-width:560px){.history-backdrop{align-items:flex-end}.history-panel{width:100%;height:min(70vh,620px);border-radius:16px 16px 0 0}}
</style>
