<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({ evidence: { type: Array, default: () => [] }, focusedEvidenceId: { type: String, default: '' } })
const emit = defineEmits(['open-code-changes'])
const openGroups = ref(new Set(['test', 'code']))
const groups = computed(() => {
  const rows = [
    { id: 'test', title: 'TestAgent 真实验证', items: props.evidence.filter(item => !['code_changes', 'verification'].includes(item.type)) },
    { id: 'code', title: '代码与命令记录', items: props.evidence.filter(item => ['code_changes', 'verification'].includes(item.type)) },
  ]
  return rows.filter(row => row.items.length)
})
const toggle = (id) => {
  const next = new Set(openGroups.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openGroups.value = next
}
const isOpen = (id) => openGroups.value.has(id)
const sizeLabel = (bytes) => {
  const value = Number(bytes || 0)
  if (!value) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
const codeChangeMeta = (item) => {
  const total = Number(item.file_count || item.files?.length || item.items?.length || 0)
  const available = Number(item.diff_available_count || item.files?.filter(file => file?.diff?.available).length || 0)
  if (!total) return '没有文件记录'
  if (available === total) return `${total} 个文件均可查看逐行变更`
  if (available > 0) return `${available}/${total} 个文件可查看逐行变更`
  return `${total} 个文件仅保留变更统计`
}
watch(() => props.focusedEvidenceId, async (id) => {
  if (!id) return
  const group = groups.value.find(row => row.items.some(item => item.id === id))
  if (group) openGroups.value = new Set([...openGroups.value, group.id])
  await nextTick()
  document.getElementById(`replay-evidence-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
</script>

<template>
  <aside class="task-replay-evidence">
    <header><strong>验证证据</strong><span>{{ evidence.length }} 项</span></header>
    <div v-if="!evidence.length" class="evidence-empty">此任务没有保存独立证据</div>
    <section v-for="group in groups" :key="group.id" class="evidence-group">
      <button type="button" class="group-toggle" :aria-expanded="isOpen(group.id)" @click="toggle(group.id)">
        <span>{{ group.title }}</span><em>{{ group.items.length }}</em>
      </button>
      <div v-if="isOpen(group.id)" class="evidence-list">
        <article v-for="item in group.items" :id="`replay-evidence-${item.id}`" :key="item.id" :class="['evidence-item', { focused: focusedEvidenceId === item.id, expired: item.status === 'expired' || item.retention_status === 'expired' }]">
          <a v-if="item.preview_kind === 'image' && item.url" :href="item.url" target="_blank" rel="noopener" class="evidence-image-link">
            <img :src="item.url" :alt="item.title" loading="lazy" />
          </a>
          <div class="evidence-copy">
            <strong>{{ item.title }}</strong>
            <span v-if="item.project">{{ item.project }}</span>
            <ul v-if="item.items?.length"><li v-for="row in item.items" :key="row">{{ row }}</li></ul>
            <div class="evidence-meta">
              <span>{{ item.status === 'expired' || item.retention_status === 'expired' ? '证据已过期' : item.type === 'code_changes' ? codeChangeMeta(item) : '可查看' }}</span>
              <span v-if="sizeLabel(item.size_bytes)">{{ sizeLabel(item.size_bytes) }}</span>
            </div>
            <button v-if="item.type === 'code_changes' && item.files?.length" type="button" class="open-code-change" @click="emit('open-code-changes', item)">查看具体代码变更</button>
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener">{{ item.preview_kind === 'download' ? '下载原始证据' : '打开原始证据' }}</a>
            <p v-else-if="item.status === 'expired' || item.retention_status === 'expired'">保留期已结束，时间线摘要仍然保留。</p>
          </div>
        </article>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.task-replay-evidence { min-width:0; border-left:1px solid var(--border-color); padding-left:14px; }
.task-replay-evidence>header { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:10px; }.task-replay-evidence>header strong { font-size:13px; }.task-replay-evidence>header span { color:var(--text-muted); font-size:11px; }
.evidence-empty { padding:24px 10px; color:var(--text-muted); font-size:12px; text-align:center; }
.evidence-group { border-top:1px solid var(--border-color); }.group-toggle { display:flex; width:100%; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border:0; background:transparent; color:var(--text-primary); font-size:12px; font-weight:750; cursor:pointer; }.group-toggle em { display:grid; place-items:center; min-width:22px; height:20px; padding:0 5px; border-radius:4px; background:var(--bg-secondary); color:var(--text-muted); font-size:10px; font-style:normal; }
.evidence-list { display:grid; gap:8px; padding-bottom:10px; }.evidence-item { overflow:hidden; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); }.evidence-item.focused { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.12); }.evidence-item.expired { opacity:.72; }
.evidence-image-link { display:block; aspect-ratio:16/9; overflow:hidden; border-bottom:1px solid var(--border-color); background:#f1f5f9; }.evidence-image-link img { width:100%; height:100%; object-fit:contain; }
.evidence-copy { padding:9px; }.evidence-copy>strong { display:block; color:var(--text-primary); font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.evidence-copy>span { display:block; margin-top:3px; color:var(--text-muted); font-size:10px; }.evidence-copy ul { max-height:150px; margin:7px 0 0; padding-left:17px; overflow:auto; }.evidence-copy li { margin:3px 0; color:var(--text-secondary); font-size:10px; overflow-wrap:anywhere; }.evidence-meta { display:flex; flex-wrap:wrap; gap:6px 10px; margin-top:7px; color:var(--text-muted); font-size:10px; }.evidence-copy a { display:inline-block; margin-top:7px; color:var(--accent-blue); font-size:10px; font-weight:750; }.evidence-copy p { margin:7px 0 0; color:var(--text-muted); font-size:10px; line-height:1.45; }
.open-code-change { margin-top:8px; padding:5px 8px; border:1px solid var(--accent-blue); border-radius:5px; background:transparent; color:var(--accent-blue); font-size:10px; font-weight:750; cursor:pointer; }
@media (max-width:980px) { .task-replay-evidence { border-left:0; border-top:1px solid var(--border-color); padding:14px 0 0; } .evidence-list { grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); } }
</style>
