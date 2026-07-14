<script setup>
import { computed, ref } from 'vue'
import { AlertCircle, CheckSquare2, FileCode2, Search } from '@lucide/vue'

const props = defineProps({ files: { type: Array, default: () => [] }, selectedPath: { type: String, default: '' }, checkedPaths: { type: Object, required: true } })
const emit = defineEmits(['select', 'toggle', 'toggle-visible'])
const query = ref('')
const filter = ref('all')
const tabs = computed(() => [
  { id: 'all', label: '全部', count: props.files.length },
  { id: 'staged', label: '暂存', count: props.files.filter(file => file.staged).length },
  { id: 'working', label: '工作区', count: props.files.filter(file => file.unstaged).length },
  { id: 'conflict', label: '冲突', count: props.files.filter(file => file.conflict).length },
])
const visibleFiles = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.files.filter(file => (!needle || file.path.toLowerCase().includes(needle)) && (
    filter.value === 'all' || filter.value === 'staged' && file.staged || filter.value === 'working' && file.unstaged || filter.value === 'conflict' && file.conflict
  ))
})
const grouped = computed(() => {
  const definitions = [
    ['冲突', file => file.conflict],
    ['同时存在暂存与工作区改动', file => !file.conflict && file.staged && file.unstaged],
    ['已暂存', file => !file.conflict && file.staged && !file.unstaged],
    ['工作区', file => !file.conflict && !file.untracked && file.unstaged && !file.staged],
    ['未跟踪', file => !file.conflict && file.untracked],
  ]
  return definitions.map(([label, predicate]) => ({ label, files: visibleFiles.value.filter(predicate) })).filter(group => group.files.length)
})
const allVisibleChecked = computed(() => visibleFiles.value.length > 0 && visibleFiles.value.every(file => props.checkedPaths.has(file.path)))
</script>

<template>
  <aside class="change-files" aria-label="变更文件">
    <div class="files-title"><span><FileCode2 :size="15" />变更文件</span><strong>{{ files.length }}</strong></div>
    <label class="file-search"><Search :size="14" /><input v-model="query" placeholder="搜索文件路径" /></label>
    <div class="file-tabs" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: filter === tab.id, danger: tab.id === 'conflict' && tab.count }" @click="filter = tab.id">{{ tab.label }} {{ tab.count }}</button>
    </div>
    <button class="select-visible" :disabled="!visibleFiles.length" @click="emit('toggle-visible', visibleFiles)"><CheckSquare2 :size="14" />{{ allVisibleChecked ? '取消当前选择' : '选择当前文件' }}</button>
    <div class="file-scroll">
      <div v-if="!files.length" class="empty-files">没有未提交文件</div>
      <div v-else-if="!grouped.length" class="empty-files">没有匹配的文件</div>
      <section v-for="group in grouped" :key="group.label" class="file-group">
        <h4>{{ group.label }} <span>{{ group.files.length }}</span></h4>
        <button v-for="file in group.files" :key="file.path" class="file-row" :class="{ active: selectedPath === file.path, conflict: file.conflict }" @click="emit('select', file.path)">
          <input type="checkbox" :checked="checkedPaths.has(file.path)" :aria-label="`选择 ${file.path}`" @click.stop="emit('toggle', file.path)" />
          <span class="file-copy">
            <strong :title="file.path">{{ file.path }}</strong>
            <small><span :style="{ color: file.statusColor }">{{ file.statusText }}</span><span class="adds">+{{ file.additions || 0 }}</span><span class="deletes">-{{ file.deletions || 0 }}</span><span v-if="file.large">大文件</span><span v-if="file.binary">二进制</span></small>
          </span>
          <AlertCircle v-if="file.conflict" :size="15" class="conflict-icon" />
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.change-files { width:320px; flex:0 0 320px; min-height:0; display:flex; flex-direction:column; border-right:1px solid var(--border-color,rgba(15,23,42,.09)); background:color-mix(in srgb,var(--bg-primary,#fff) 96%,#f8fafc); }
.files-title { padding:12px 14px 9px; display:flex; align-items:center; justify-content:space-between; }.files-title span { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:650; color:var(--text-primary); }.files-title strong { font-size:11px; color:var(--text-muted); }
.file-search { margin:0 12px 9px; height:32px; padding:0 9px; display:flex; align-items:center; gap:7px; border:1px solid var(--border-color,rgba(15,23,42,.1)); border-radius:6px; color:var(--text-muted); }.file-search:focus-within { border-color:#3b82f6; }.file-search input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--text-primary); font-size:12px; }
.file-tabs { display:grid; grid-template-columns:repeat(4,1fr); padding:0 12px 9px; gap:4px; }.file-tabs button { min-width:0; border:0; border-radius:5px; padding:5px 2px; background:transparent; color:var(--text-muted); font-size:10px; cursor:pointer; white-space:nowrap; }.file-tabs button.active { background:rgba(37,99,235,.09); color:#2563eb; }.file-tabs button.danger { color:#b91c1c; }
.select-visible { margin:0 12px 8px; padding:6px 8px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border-color,rgba(15,23,42,.09)); border-radius:6px; background:transparent; color:var(--text-secondary); font-size:11px; cursor:pointer; }.select-visible:disabled { opacity:.45; cursor:not-allowed; }
.file-scroll { flex:1; min-height:0; overflow:auto; }.file-group h4 { margin:0; padding:8px 14px 5px; color:var(--text-muted); font-size:10px; font-weight:650; text-transform:none; }.file-group h4 span { margin-left:4px; font-weight:400; }
.file-row { width:100%; min-height:47px; padding:7px 12px; display:flex; align-items:center; gap:8px; border:0; border-left:3px solid transparent; background:transparent; color:inherit; text-align:left; cursor:pointer; }.file-row:hover { background:rgba(37,99,235,.045); }.file-row.active { border-left-color:#2563eb; background:rgba(37,99,235,.08); }.file-row.conflict { border-left-color:#dc2626; }
.file-row input { flex-shrink:0; }.file-copy { min-width:0; flex:1; }.file-copy strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:550; color:var(--text-primary); }.file-copy small { display:flex; align-items:center; gap:7px; margin-top:3px; color:var(--text-muted); font-size:10px; }.adds { color:#047857; }.deletes,.conflict-icon { color:#b91c1c; }.empty-files { padding:38px 16px; text-align:center; color:var(--text-muted); font-size:12px; }
@media(max-width:768px){.change-files{width:100%;flex:0 0 auto;max-height:320px;border-right:0;border-bottom:1px solid var(--border-color,rgba(15,23,42,.09))}.file-scroll{max-height:170px}.file-tabs button{font-size:9px}}
</style>
