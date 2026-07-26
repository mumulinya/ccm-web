<script setup>
import { computed } from 'vue'
import { AlertCircle, ChevronRight, FileCode2, Folder, FolderOpen } from '@lucide/vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedPath: { type: String, default: '' },
  checkedPaths: { type: Object, required: true },
  expandedPaths: { type: Object, required: true },
  forceExpanded: Boolean,
})
const emit = defineEmits(['select', 'toggle', 'toggle-directory', 'toggle-expand'])
const descendantFiles = computed(() => props.node.descendantFiles || [])
const checkedCount = computed(() => descendantFiles.value.filter(file => props.checkedPaths.has(file.path)).length)
const allChecked = computed(() => descendantFiles.value.length > 0 && checkedCount.value === descendantFiles.value.length)
const partlyChecked = computed(() => checkedCount.value > 0 && !allChecked.value)
const expanded = computed(() => props.forceExpanded || props.expandedPaths.has(props.node.path))
</script>

<template>
  <div v-if="node.type === 'directory'" class="tree-directory">
    <div class="tree-directory-row" :style="{ '--tree-depth': depth }">
      <button type="button" class="tree-expand" :aria-label="`${expanded ? '收起' : '展开'} ${node.path}`" @click="emit('toggle-expand', node.path)">
        <ChevronRight :size="13" :class="{ expanded }" />
      </button>
      <input
        type="checkbox"
        :checked="allChecked"
        :indeterminate="partlyChecked"
        :aria-label="`选择目录 ${node.path}`"
        @change="emit('toggle-directory', descendantFiles)"
      />
      <button type="button" class="tree-directory-name" :title="node.path" @click="emit('toggle-expand', node.path)">
        <FolderOpen v-if="expanded" :size="15" />
        <Folder v-else :size="15" />
        <strong>{{ node.name }}</strong>
        <span>{{ descendantFiles.length }}</span>
      </button>
    </div>
    <div v-if="expanded" class="tree-children">
      <CodeChangeTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        :checked-paths="checkedPaths"
        :expanded-paths="expandedPaths"
        :force-expanded="forceExpanded"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @toggle-directory="emit('toggle-directory', $event)"
        @toggle-expand="emit('toggle-expand', $event)"
      />
    </div>
  </div>

  <button
    v-else
    type="button"
    class="tree-file-row"
    :class="{ active: selectedPath === node.file.path, conflict: node.file.conflict }"
    :style="{ '--tree-depth': depth }"
    @click="emit('select', node.file.path)"
  >
    <span class="tree-file-spacer"></span>
    <input type="checkbox" :checked="checkedPaths.has(node.file.path)" :aria-label="`选择 ${node.file.path}`" @click.stop="emit('toggle', node.file.path)" />
    <FileCode2 :size="14" class="tree-file-icon" />
    <span class="tree-file-copy">
      <strong :title="node.file.path">{{ node.name }}</strong>
      <small>
        <span :style="{ color: node.file.statusColor }">{{ node.file.statusText }}</span>
        <span class="adds">+{{ node.file.additions || 0 }}</span>
        <span class="deletes">-{{ node.file.deletions || 0 }}</span>
      </small>
    </span>
    <AlertCircle v-if="node.file.conflict" :size="14" class="conflict-icon" />
  </button>
</template>

<style scoped>
.tree-directory-row,.tree-file-row { padding-left:calc(8px + var(--tree-depth) * 16px); }
.tree-directory-row { min-height:34px; display:flex; align-items:center; gap:5px; color:var(--text-secondary); }
.tree-directory-row:hover,.tree-file-row:hover { background:rgba(37,99,235,.045); }
.tree-expand { width:18px; height:26px; padding:0; display:grid; place-items:center; border:0; background:transparent; color:var(--text-muted); cursor:pointer; }.tree-expand svg { transition:transform .14s ease; }.tree-expand svg.expanded { transform:rotate(90deg); }
.tree-directory-row input,.tree-file-row input { flex:none; width:14px; height:14px; margin:0; accent-color:#2563eb; }
.tree-directory-name { min-width:0; flex:1; height:30px; padding:0 8px 0 1px; display:flex; align-items:center; gap:6px; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }.tree-directory-name svg { flex:none; color:#64748b; }.tree-directory-name strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; font-weight:650; }.tree-directory-name span { margin-left:auto; color:var(--text-muted); font-size:9px; }
.tree-file-row { width:100%; min-height:43px; display:flex; align-items:center; gap:6px; border:0; border-left:3px solid transparent; background:transparent; color:inherit; text-align:left; cursor:pointer; }.tree-file-row.active { border-left-color:#2563eb; background:rgba(37,99,235,.08); }.tree-file-row.conflict { border-left-color:#dc2626; }.tree-file-spacer { flex:0 0 18px; }.tree-file-icon { flex:none; color:#64748b; }.tree-file-copy { min-width:0; flex:1; }.tree-file-copy strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); font-size:11px; font-weight:550; }.tree-file-copy small { display:flex; align-items:center; gap:6px; margin-top:3px; color:var(--text-muted); font-size:9px; }.adds { color:#047857; }.deletes,.conflict-icon { color:#b91c1c; }.conflict-icon { flex:none; margin-right:8px; }
</style>
