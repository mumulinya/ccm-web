<script setup>
import { Check, ChevronDown, FolderKanban, Globe2, MessagesSquare, Search, X } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '__global__' },
  options: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const query = ref('')
const root = ref(null)
const searchInput = ref(null)

const selected = computed(() => props.options.find(item => item.id === props.modelValue) || props.options[0] || {})
const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const filtered = computed(() => props.options.filter((item) => {
  if (!normalizedQuery.value) return true
  return [item.name, item.id, item.hint, item.agent, item.summary]
    .some(value => String(value || '').toLowerCase().includes(normalizedQuery.value))
}))
const groups = computed(() => ([
  { type: 'global', title: '全局 Agent', rows: filtered.value.filter(item => item.type === 'global') },
  { type: 'group', title: '群聊', rows: filtered.value.filter(item => item.type === 'group') },
  { type: 'project', title: '项目', rows: filtered.value.filter(item => item.type === 'project') },
]).filter(group => group.rows.length))

const iconFor = type => type === 'global' ? Globe2 : type === 'group' ? MessagesSquare : FolderKanban
const toggle = async () => {
  open.value = !open.value
  if (!open.value) { query.value = ''; return }
  await nextTick()
  searchInput.value?.focus?.()
}
const select = (id) => {
  emit('update:modelValue', id)
  open.value = false
  query.value = ''
}
const close = () => { open.value = false; query.value = '' }
const onDocumentPointer = event => { if (open.value && !root.value?.contains(event.target)) close() }
const onKeydown = (event) => {
  if (event.key === 'Escape') close()
  if (event.key === 'Enter' && open.value && filtered.value.length) select(filtered.value[0].id)
}
onMounted(() => document.addEventListener('pointerdown', onDocumentPointer))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointer))
</script>

<template>
  <div ref="root" class="metrics-scope-picker" @keydown="onKeydown">
    <button type="button" class="scope-picker-trigger" :aria-expanded="open" aria-haspopup="listbox" @click="toggle">
      <span class="scope-picker-icon"><component :is="iconFor(selected.type)" :size="16" /></span>
      <span class="scope-picker-copy">
        <strong>{{ selected.name || '选择范围' }}</strong>
        <small>{{ selected.hint || '全局、群聊或项目' }}</small>
      </span>
      <ChevronDown :size="15" :class="{ rotated: open }" />
    </button>

    <div v-if="open" class="scope-picker-popover" role="listbox" aria-label="性能监控范围">
      <div class="scope-picker-mobile-head">
        <strong>选择监控范围</strong>
        <button type="button" aria-label="关闭" @click="close"><X :size="18" /></button>
      </div>
      <div class="scope-picker-search">
        <Search :size="15" />
        <input ref="searchInput" v-model="query" type="search" placeholder="搜索全局、群聊或项目" autocomplete="off">
      </div>
      <div class="scope-picker-list">
        <section v-for="group in groups" :key="group.type" class="scope-picker-group">
          <header><span>{{ group.title }}</span><b>{{ group.rows.length }}</b></header>
          <button
            v-for="item in group.rows"
            :key="item.id"
            type="button"
            class="scope-picker-option"
            :class="{ active: item.id === modelValue }"
            :aria-selected="item.id === modelValue"
            @click="select(item.id)"
          >
            <span class="option-icon"><component :is="iconFor(item.type)" :size="16" /></span>
            <span class="option-copy">
              <strong>{{ item.name }}</strong>
              <small>{{ item.summary || item.hint }}</small>
            </span>
            <Check v-if="item.id === modelValue" class="option-check" :size="17" />
          </button>
        </section>
        <div v-if="!groups.length" class="scope-picker-empty">没有找到匹配的范围</div>
      </div>
    </div>
    <div v-if="open" class="scope-picker-scrim" @click="close"></div>
  </div>
</template>

<style scoped>
.metrics-scope-picker{position:relative;min-width:240px}.scope-picker-trigger{height:42px;width:100%;display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:9px;padding:0 11px;border:1px solid var(--border-color);border-radius:10px;background:var(--control-bg,var(--bg-card));color:var(--text-primary);cursor:pointer;text-align:left}.scope-picker-trigger:hover,.scope-picker-trigger:focus-visible{border-color:var(--accent-blue);box-shadow:var(--focus-ring)}.scope-picker-icon,.option-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--accent-soft);color:var(--accent-blue)}.scope-picker-copy,.option-copy{min-width:0;display:flex;flex-direction:column;gap:2px}.scope-picker-copy strong,.option-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.scope-picker-copy small,.option-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:9px}.scope-picker-trigger>svg{color:var(--text-muted);transition:transform .18s}.scope-picker-trigger>svg.rotated{transform:rotate(180deg)}
.scope-picker-popover{position:absolute;z-index:80;top:calc(100% + 7px);right:0;width:min(400px,calc(100vw - 32px));overflow:hidden;border:1px solid var(--border-color);border-radius:13px;background:var(--bg-card);box-shadow:0 18px 48px rgba(15,23,42,.18)}.scope-picker-mobile-head{display:none}.scope-picker-search{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid var(--border-color);background:var(--bg-card);color:var(--text-muted)}.scope-picker-search input{height:34px;min-width:0;flex:1;border:0;background:transparent;color:var(--text-primary);font-size:11px;outline:0}.scope-picker-list{max-height:390px;overflow:auto;padding:7px}.scope-picker-group header{position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;padding:9px 9px 6px;background:var(--bg-card);color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.04em}.scope-picker-group header b{font:9px ui-monospace,monospace}.scope-picker-option{width:100%;display:grid;grid-template-columns:32px minmax(0,1fr) 20px;align-items:center;gap:9px;margin:1px 0;padding:8px;border:0;border-radius:9px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.scope-picker-option:hover,.scope-picker-option.active{background:var(--accent-soft)}.scope-picker-option.active .option-icon{background:var(--accent-blue);color:#fff}.option-check{color:var(--accent-blue)}.scope-picker-empty{padding:32px 12px;text-align:center;color:var(--text-muted);font-size:11px}.scope-picker-scrim{display:none}
@media(max-width:700px){.metrics-scope-picker{position:static;min-width:0}.scope-picker-popover{position:fixed;inset:auto 0 0;width:auto;max-height:min(76vh,620px);border-radius:18px 18px 0 0;z-index:101}.scope-picker-mobile-head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px 8px}.scope-picker-mobile-head strong{font-size:14px}.scope-picker-mobile-head button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:var(--panel-muted);color:var(--text-primary)}.scope-picker-list{max-height:calc(76vh - 118px)}.scope-picker-scrim{display:block;position:fixed;inset:0;z-index:100;background:rgba(15,23,42,.38);backdrop-filter:blur(2px)}}
</style>
