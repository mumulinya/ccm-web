<script setup>
import { computed, ref, watch } from 'vue'
import { AlertCircle, Boxes, CheckSquare2, FileCode2, FolderTree, ListFilter, Search } from '@lucide/vue'
import CodeChangeTreeNode from './CodeChangeTreeNode.vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
  selectedPath: { type: String, default: '' },
  checkedPaths: { type: Object, required: true },
  filter: { type: String, default: 'all' },
  totalCount: { type: Number, default: 0 },
  hasMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'toggle', 'toggle-visible', 'filter-change', 'load-more'])
const query = ref('')
const storedGroupingMode = typeof localStorage === 'undefined' ? '' : localStorage.getItem('ccm-code-change-grouping')
const groupingMode = ref(['directory', 'module', 'status'].includes(storedGroupingMode) ? storedGroupingMode : 'directory')
const expandedPaths = ref(new Set())
let initializedDirectorySignature = ''

const tabs = computed(() => [
  { id: 'all', label: '全部', count: props.files.filter(file => !file.indexResidual).length },
  { id: 'staged', label: '暂存', count: props.files.filter(file => file.staged && !file.indexResidual).length },
  { id: 'working', label: '工作区', count: props.files.filter(file => file.unstaged && !file.indexResidual).length },
  { id: 'residual', label: '索引', count: props.files.filter(file => file.indexResidual).length },
  { id: 'conflict', label: '冲突', count: props.files.filter(file => file.conflict).length },
])
const visibleFiles = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.files.filter(file => (!needle || file.path.toLowerCase().includes(needle)) && (
    props.filter === 'all' && !file.indexResidual
    || props.filter === 'staged' && file.staged && !file.indexResidual
    || props.filter === 'working' && file.unstaged && !file.indexResidual
    || props.filter === 'residual' && file.indexResidual
    || props.filter === 'conflict' && file.conflict
  ))
})
const statusGroups = computed(() => {
  const definitions = [
    ['冲突', file => file.conflict],
    ['索引残留', file => !file.conflict && file.indexResidual],
    ['同时存在暂存与工作区改动', file => !file.conflict && !file.indexResidual && file.staged && file.unstaged],
    ['已暂存', file => !file.conflict && !file.indexResidual && file.staged && !file.unstaged],
    ['工作区', file => !file.conflict && !file.indexResidual && !file.untracked && file.unstaged && !file.staged],
    ['未跟踪', file => !file.conflict && !file.indexResidual && file.untracked],
  ]
  return definitions.map(([label, predicate]) => ({ label, files: visibleFiles.value.filter(predicate) })).filter(group => group.files.length)
})
const moduleGroups = computed(() => {
  const groups = new Map()
  for (const file of visibleFiles.value) {
    const parts = String(file.path || '').split('/').filter(Boolean)
    const module = parts.length > 1 ? parts[0] : '项目根目录'
    if (!groups.has(module)) groups.set(module, [])
    groups.get(module).push({ ...file, moduleRelativePath: parts.length > 1 ? parts.slice(1).join('/') : parts[0] })
  }
  return [...groups.entries()].map(([label, files]) => ({ label, files: files.sort((a, b) => a.path.localeCompare(b.path)) })).sort((a, b) => a.label.localeCompare(b.label))
})

const buildDirectoryTree = files => {
  const root = { type: 'directory', name: '', path: '', childrenByName: new Map(), children: [], descendantFiles: [] }
  for (const file of files) {
    const parts = String(file.path || '').split('/').filter(Boolean)
    if (!parts.length) continue
    let parent = root
    for (const segment of parts.slice(0, -1)) {
      const nodePath = parent.path ? `${parent.path}/${segment}` : segment
      if (!parent.childrenByName.has(segment)) parent.childrenByName.set(segment, { type: 'directory', name: segment, path: nodePath, childrenByName: new Map(), children: [], descendantFiles: [] })
      parent = parent.childrenByName.get(segment)
    }
    parent.children.push({ type: 'file', name: parts.at(-1), path: file.path, file })
  }
  const finalize = node => {
    const directories = [...node.childrenByName.values()].map(finalize).sort((a, b) => a.name.localeCompare(b.name))
    const files = node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.children = [...directories, ...files]
    node.descendantFiles = node.children.flatMap(child => child.type === 'file' ? [child.file] : child.descendantFiles)
    delete node.childrenByName
    return node
  }
  return finalize(root).children
}
const directoryTree = computed(() => buildDirectoryTree(visibleFiles.value))
const selectableVisibleFiles = computed(() => visibleFiles.value.filter(file => !file.indexResidual))
const allVisibleChecked = computed(() => selectableVisibleFiles.value.length > 0 && selectableVisibleFiles.value.every(file => props.checkedPaths.has(file.path)))
const hasVisibleRows = computed(() => groupingMode.value === 'directory' ? directoryTree.value.length : groupingMode.value === 'module' ? moduleGroups.value.length : statusGroups.value.length)
const changeFilter = id => {
  emit('filter-change', id)
}

const toggleExpanded = path => {
  const next = new Set(expandedPaths.value)
  next.has(path) ? next.delete(path) : next.add(path)
  expandedPaths.value = next
}
const directoryPaths = files => {
  const paths = new Set()
  for (const file of files) {
    const parts = String(file.path || '').split('/').filter(Boolean)
    for (let index = 1; index < parts.length; index += 1) paths.add(parts.slice(0, index).join('/'))
  }
  return paths
}
watch(() => props.files.map(file => file.path).sort().join('|'), signature => {
  const topSignature = [...new Set(props.files.map(file => String(file.path || '').split('/')[0]).filter(Boolean))].sort().join('|')
  if (!signature) { expandedPaths.value = new Set(); initializedDirectorySignature = ''; return }
  if (topSignature === initializedDirectorySignature) return
  initializedDirectorySignature = topSignature
  const paths = [...directoryPaths(props.files)]
  expandedPaths.value = new Set(paths.filter(path => props.files.length <= 100 || path.split('/').length <= 2))
}, { immediate: true })
watch(groupingMode, value => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('ccm-code-change-grouping', value)
})
</script>

<template>
  <aside class="change-files" aria-label="变更文件">
    <div class="files-title">
      <span><FileCode2 :size="15" />变更文件</span>
      <strong>{{ tabs[0].count }}<template v-if="totalCount > files.length"> / {{ totalCount }}</template></strong>
    </div>
    <label class="file-search">
      <Search :size="14" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        aria-label="搜索文件或目录"
        placeholder="搜索文件或目录"
        autocomplete="off"
        spellcheck="false"
      />
    </label>
    <div class="grouping-switch" role="group" aria-label="分组依据">
      <button type="button" :class="{ active: groupingMode === 'directory' }" title="按目录树分组" @click="groupingMode = 'directory'"><FolderTree :size="13" />目录</button>
      <button type="button" :class="{ active: groupingMode === 'module' }" title="按首级模块分组" @click="groupingMode = 'module'"><Boxes :size="13" />模块</button>
      <button type="button" :class="{ active: groupingMode === 'status' }" title="按 Git 状态分组" @click="groupingMode = 'status'"><ListFilter :size="13" />状态</button>
    </div>
    <div class="file-tabs" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: filter === tab.id, danger: (tab.id === 'conflict' || tab.id === 'residual') && tab.count }" @click="changeFilter(tab.id)">{{ tab.label }} {{ tab.count }}</button>
    </div>
    <button class="select-visible" :disabled="!selectableVisibleFiles.length" @click="emit('toggle-visible', selectableVisibleFiles)"><CheckSquare2 :size="14" />{{ allVisibleChecked ? '取消当前选择' : '选择当前文件' }}</button>
    <div class="file-scroll">
      <div v-if="!files.length" class="empty-files">没有未提交文件</div>
      <div v-else-if="!hasVisibleRows" class="empty-files">没有匹配的文件</div>

      <div v-else-if="groupingMode === 'directory'" class="directory-tree" role="tree" aria-label="变更目录树">
        <CodeChangeTreeNode
          v-for="node in directoryTree"
          :key="node.path"
          :node="node"
          :selected-path="selectedPath"
          :checked-paths="checkedPaths"
          :expanded-paths="expandedPaths"
          :force-expanded="!!query.trim()"
          @select="emit('select', $event)"
          @toggle="emit('toggle', $event)"
          @toggle-directory="emit('toggle-visible', $event)"
          @toggle-expand="toggleExpanded"
        />
      </div>

      <template v-else>
        <section v-for="group in groupingMode === 'module' ? moduleGroups : statusGroups" :key="group.label" class="file-group">
          <h4>{{ group.label }} <span>{{ group.files.length }}</span></h4>
          <button v-for="file in group.files" :key="file.path" class="file-row" :class="{ active: selectedPath === file.path, conflict: file.conflict }" @click="emit('select', file.path)">
            <input type="checkbox" :checked="checkedPaths.has(file.path)" :disabled="file.indexResidual" :aria-label="`选择 ${file.path}`" @click.stop="emit('toggle', file.path)" />
            <span class="file-copy">
              <strong :title="file.path">{{ groupingMode === 'module' ? file.moduleRelativePath : file.path }}</strong>
              <small><span :style="{ color: file.statusColor }">{{ file.statusText }}</span><span class="adds">+{{ file.additions || 0 }}</span><span class="deletes">-{{ file.deletions || 0 }}</span><span v-if="file.large">大文件</span><span v-if="file.binary">二进制</span></small>
            </span>
            <AlertCircle v-if="file.conflict" :size="15" class="conflict-icon" />
          </button>
        </section>
      </template>
      <button v-if="hasMore" type="button" class="load-more" :disabled="loadingMore" @click="emit('load-more')">{{ loadingMore ? '正在加载更多变更' : `继续加载（已加载 ${files.length} / ${totalCount}）` }}</button>
    </div>
  </aside>
</template>

<style scoped>
.change-files { width:100%; min-width:0; min-height:0; height:100%; align-self:stretch; display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color,rgba(15,23,42,.09)); border-radius:7px; background:color-mix(in srgb,var(--bg-primary,#fff) 96%,#f8fafc); box-shadow:var(--shadow-sm); }
.files-title { padding:12px 14px 9px; display:flex; align-items:center; justify-content:space-between; }.files-title span { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:650; color:var(--text-primary); }.files-title strong { font-size:11px; color:var(--text-muted); }
.file-search { margin:0 12px 8px; height:34px; padding:0 10px; display:flex; align-items:center; gap:7px; border:1px solid var(--border-color,rgba(15,23,42,.1)); border-radius:6px; background:var(--surface,var(--bg-primary,#fff)); color:var(--text-muted); transition:border-color .15s ease,box-shadow .15s ease,background .15s ease; }.file-search:focus-within { border-color:var(--accent-blue,#2563eb); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue,#2563eb) 12%,transparent); }.file-search input,.file-search input:focus { min-width:0; width:100%; height:auto; min-height:0; flex:1; padding:0; border:0; border-radius:0; outline:0; box-shadow:none; background:transparent; color:var(--text-primary); font-size:12px; }.file-search input::-webkit-search-cancel-button { cursor:pointer; }
.grouping-switch { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin:0 12px 8px; padding:3px; border:1px solid var(--border-color,rgba(15,23,42,.09)); border-radius:6px; background:var(--bg-secondary,#f8fafc); }.grouping-switch button { min-width:0; height:27px; display:flex; align-items:center; justify-content:center; gap:4px; border:0; border-radius:4px; background:transparent; color:var(--text-muted); font-size:10px; cursor:pointer; }.grouping-switch button.active { background:var(--bg-primary,#fff); color:#2563eb; box-shadow:0 1px 3px rgba(15,23,42,.08); }
.file-tabs { display:grid; grid-template-columns:repeat(5,1fr); padding:0 12px 8px; gap:3px; }.file-tabs button { min-width:0; border:0; border-radius:5px; padding:5px 1px; background:transparent; color:var(--text-muted); font-size:9px; cursor:pointer; white-space:nowrap; }.file-tabs button.active { background:rgba(37,99,235,.09); color:#2563eb; }.file-tabs button.danger { color:#b45309; }.file-tabs button.danger:last-child { color:#b91c1c; }
.select-visible { margin:0 12px 8px; padding:6px 8px; display:flex; align-items:center; justify-content:center; gap:6px; border:1px solid var(--border-color,rgba(15,23,42,.09)); border-radius:6px; background:transparent; color:var(--text-secondary); font-size:11px; cursor:pointer; }.select-visible:disabled { opacity:.45; cursor:not-allowed; }
.file-scroll { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }.file-group h4 { margin:0; padding:8px 14px 5px; color:var(--text-muted); font-size:10px; font-weight:650; text-transform:none; }.file-group h4 span { margin-left:4px; font-weight:400; }
.file-row { width:100%; min-height:47px; padding:7px 12px; display:flex; align-items:center; gap:8px; border:0; border-left:3px solid transparent; background:transparent; color:inherit; text-align:left; cursor:pointer; }.file-row:hover { background:rgba(37,99,235,.045); }.file-row.active { border-left-color:#2563eb; background:rgba(37,99,235,.08); }.file-row.conflict { border-left-color:#dc2626; }
.file-row input { flex-shrink:0; }.file-copy { min-width:0; flex:1; }.file-copy strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:550; color:var(--text-primary); }.file-copy small { display:flex; align-items:center; gap:7px; margin-top:3px; color:var(--text-muted); font-size:10px; }.adds { color:#047857; }.deletes,.conflict-icon { color:#b91c1c; }.empty-files { padding:38px 16px; text-align:center; color:var(--text-muted); font-size:12px; }
.load-more { width:calc(100% - 24px); min-height:34px; margin:10px 12px 14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); color:var(--text-secondary); font-size:11px; cursor:pointer; }.load-more:hover:not(:disabled) { border-color:#2563eb; color:#2563eb; }.load-more:disabled { opacity:.55; cursor:wait; }
@media(max-width:768px){.change-files{width:100%;height:100%;min-height:0}.file-tabs button{font-size:9px}}
</style>
