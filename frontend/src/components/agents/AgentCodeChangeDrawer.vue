<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '代码改动' },
  subtitle: { type: String, default: '' },
  project: { type: String, default: '' },
  fileChanges: { type: Object, default: null },
  files: { type: Array, default: () => [] },
  selectedPath: { type: String, default: '' },
})

const emit = defineEmits(['close', 'open-changes'])

const selected = ref('')
const mode = ref('unified')
const searchQuery = ref('')
const loadingDiff = ref(false)
const loadingFile = ref(false)
const fetchedDiffs = ref({})
const fileContents = ref({})
const loadError = ref('')
const fileKey = (file) => `${file?.project || props.project || ''}|${file?.path || ''}`

const escapeHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const normalizeFile = (item) => {
  if (!item) return null
  if (typeof item === 'string') return { path: item, statusText: '变更', statusColor: '#64748b', diff: null }
  const path = item.path || item.file || item.name || ''
  if (!path) return null
  return {
    ...item,
    path,
    project: item.project || item.target_project || item.projectName || item.agent || '',
    statusText: item.statusText || item.status || '变更',
    statusColor: item.statusColor || '#64748b',
    diff: item.diff || ((item.additions || item.deletions) ? { additions: Number(item.additions || 0), deletions: Number(item.deletions || 0), available: false } : null),
  }
}

const changeFiles = computed(() => {
  const fromChanges = Array.isArray(props.fileChanges?.files) ? props.fileChanges.files : []
  const raw = fromChanges.length ? fromChanges : props.files
  const seen = new Set()
  return raw.map(normalizeFile).filter(file => {
    const key = fileKey(file)
    if (!file || seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const totals = computed(() => changeFiles.value.reduce((acc, file) => {
  const diff = file.diff || fetchedDiffs.value[`${file.project || props.project || ''}|${file.path}`] || {}
  acc.additions += Number(diff.additions || 0)
  acc.deletions += Number(diff.deletions || 0)
  return acc
}, { additions: 0, deletions: 0 }))

const selectedFile = computed(() => changeFiles.value.find(file => fileKey(file) === selected.value) || changeFiles.value[0] || null)
const selectedProject = computed(() => selectedFile.value?.project || props.project || '')

const selectedDiff = computed(() => {
  const file = selectedFile.value
  if (!file) return null
  return file.diff || fetchedDiffs.value[`${selectedProject.value}|${file.path}`] || null
})

const rawDiff = computed(() => {
  const diff = selectedDiff.value || {}
  return diff.diff || diff.raw || ''
})

const ext = computed(() => {
  const path = selectedFile.value?.path || ''
  const parts = path.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
})

const highlightSearch = (htmlText) => {
  const query = searchQuery.value.trim()
  if (!query) return htmlText
  const safe = escapeHtml(query).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const regex = new RegExp(`(<[^>]*>)|(${safe})`, 'gi')
  return String(htmlText || '').replace(regex, (match, tag, hit) => tag || `<span class="hl-match">${hit}</span>`)
}

const highlightCode = (code) => {
  let escaped = escapeHtml(code)
  if (!['js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'css', 'py', 'md', 'sh', 'toml', 'yaml', 'yml'].includes(ext.value)) return escaped
  escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|interface|type|def|True|False|None)\b/g, '<span class="hl-keyword">$1</span>')
  escaped = escaped.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')
  return escaped.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g, '<span class="hl-string">$1</span>')
}

const unifiedLines = computed(() => {
  if (!rawDiff.value) return []
  return rawDiff.value.split('\n').map(line => {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index')) {
      return { type: 'meta', sign: ' ', html: escapeHtml(line) }
    }
    if (line.startsWith('+')) return { type: 'add', sign: '+', html: highlightCode(line.slice(1)) }
    if (line.startsWith('-')) return { type: 'remove', sign: '-', html: highlightCode(line.slice(1)) }
    return { type: 'context', sign: ' ', html: highlightCode(line.startsWith(' ') ? line.slice(1) : line) }
  })
})

const splitRows = computed(() => {
  const rows = []
  let oldLine = 1
  let newLine = 1
  for (const line of rawDiff.value.split('\n')) {
    if (!line || line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) continue
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLine = Number(match[1])
        newLine = Number(match[2])
      }
      rows.push({ meta: line })
    } else if (line.startsWith('-')) {
      rows.push({ left: { line: oldLine++, type: 'remove', html: highlightCode(line.slice(1)) }, right: null })
    } else if (line.startsWith('+')) {
      rows.push({ left: null, right: { line: newLine++, type: 'add', html: highlightCode(line.slice(1)) } })
    } else {
      const content = line.startsWith(' ') ? line.slice(1) : line
      const html = highlightCode(content)
      rows.push({ left: { line: oldLine++, type: 'context', html }, right: { line: newLine++, type: 'context', html } })
    }
  }
  return rows
})

const currentFileContent = computed(() => {
  const file = selectedFile.value
  if (!file) return null
  return fileContents.value[`${selectedProject.value}|${file.path}`] || null
})

const currentFileLines = computed(() => String(currentFileContent.value?.text || '').split('\n'))

const selectFile = (file) => {
  selected.value = fileKey(file)
  searchQuery.value = ''
  loadError.value = ''
}

const fetchDiffIfNeeded = async () => {
  const file = selectedFile.value
  const project = selectedProject.value
  const key = fileKey(file)
  if (!project || !file || file.diff || fetchedDiffs.value[key] || mode.value === 'file') return
  loadingDiff.value = true
  loadError.value = ''
  try {
    const res = await fetch(`/api/git/diff?project=${encodeURIComponent(project)}&file=${encodeURIComponent(file.path)}`)
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '获取 diff 失败')
    fetchedDiffs.value = {
      ...fetchedDiffs.value,
      [key]: {
        available: !!data.raw,
        raw: data.raw || '',
        diff: data.raw || '',
        reason: data.reason || '',
        truncated: !!data.truncated,
        additions: String(data.raw || '').split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).length,
        deletions: String(data.raw || '').split('\n').filter(line => line.startsWith('-') && !line.startsWith('---')).length,
      }
    }
  } catch (error) {
    loadError.value = error?.message || '获取 diff 失败'
  } finally {
    loadingDiff.value = false
  }
}

const fetchFileIfNeeded = async () => {
  const file = selectedFile.value
  const project = selectedProject.value
  const key = fileKey(file)
  if (!project || !file || fileContents.value[key] || mode.value !== 'file') return
  loadingFile.value = true
  loadError.value = ''
  try {
    const res = await fetch(`/api/git/file?project=${encodeURIComponent(project)}&file=${encodeURIComponent(file.path)}`)
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '读取文件失败')
    fileContents.value = { ...fileContents.value, [key]: data }
  } catch (error) {
    loadError.value = error?.message || '读取文件失败'
  } finally {
    loadingFile.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (!visible) return
  const preferred = changeFiles.value.find(file => file.path === props.selectedPath)
  selected.value = preferred ? fileKey(preferred) : (changeFiles.value[0] ? fileKey(changeFiles.value[0]) : '')
  mode.value = 'unified'
  searchQuery.value = ''
  loadError.value = ''
  fetchDiffIfNeeded()
}, { immediate: true })

watch([selectedFile, mode], () => {
  fetchDiffIfNeeded()
  fetchFileIfNeeded()
})
</script>

<template>
  <div v-if="visible" class="code-drawer-overlay" @click.self="emit('close')">
    <aside class="code-drawer">
      <header class="code-drawer-head">
        <div>
          <span class="drawer-kicker">Agent 代码改动</span>
          <h3>{{ title }}</h3>
          <p>{{ subtitle || (project ? `项目：${project}` : '本次任务的文件变更') }}</p>
        </div>
        <button class="drawer-close" type="button" @click="emit('close')">×</button>
      </header>

      <div class="drawer-summary">
        <strong>{{ changeFiles.length }}</strong><span>个文件</span>
        <strong class="plus">+{{ totals.additions }}</strong>
        <strong class="minus">-{{ totals.deletions }}</strong>
        <button v-if="selectedProject" type="button" @click="emit('open-changes', selectedProject)">打开变更页</button>
      </div>

      <div v-if="!changeFiles.length" class="drawer-empty">
        暂无可展示的代码改动。
      </div>

      <div v-else class="drawer-body">
        <nav class="drawer-files">
          <button
            v-for="file in changeFiles"
            :key="fileKey(file)"
            type="button"
            :class="{ active: fileKey(selectedFile) === fileKey(file) }"
            @click="selectFile(file)"
          >
            <span class="file-dot" :style="{ background: file.statusColor }"></span>
            <span class="file-path">{{ file.path }}</span>
            <small>
              <template v-if="file.project">{{ file.project }} · </template>{{ file.statusText }}
              <template v-if="(file.diff || fetchedDiffs[fileKey(file)])?.additions || (file.diff || fetchedDiffs[fileKey(file)])?.deletions">
                · +{{ (file.diff || fetchedDiffs[fileKey(file)])?.additions || 0 }} -{{ (file.diff || fetchedDiffs[fileKey(file)])?.deletions || 0 }}
              </template>
            </small>
          </button>
        </nav>

        <section class="drawer-diff">
          <div class="diff-toolbar">
            <div>
              <strong>{{ selectedProject ? `${selectedProject} · ` : '' }}{{ selectedFile?.path }}</strong>
              <span v-if="selectedDiff?.truncated">已截断</span>
              <span v-if="loadingDiff || loadingFile">加载中…</span>
            </div>
            <div class="diff-actions">
              <input v-model="searchQuery" placeholder="搜索代码…" />
              <button type="button" :class="{ active: mode === 'unified' }" @click="mode = 'unified'">单栏</button>
              <button type="button" :class="{ active: mode === 'split' }" @click="mode = 'split'">左右</button>
              <button type="button" :class="{ active: mode === 'file' }" :disabled="!selectedProject" @click="mode = 'file'">完整文件</button>
            </div>
          </div>

          <div v-if="loadError" class="diff-empty">{{ loadError }}</div>
          <div v-else-if="mode !== 'file' && !rawDiff" class="diff-empty">
            {{ selectedDiff?.reason || (selectedProject ? '没有可展示的文本差异' : '当前入口只有文件名，没有绑定项目 diff 数据') }}
          </div>
          <div v-else-if="mode === 'file' && !selectedProject" class="diff-empty">
            当前入口没有项目上下文，无法读取完整文件。
          </div>
          <div v-else-if="mode === 'file' && currentFileContent?.binary" class="diff-empty">
            二进制文件无法预览。
          </div>
          <div v-else-if="mode === 'file' && currentFileContent && !currentFileContent.exists" class="diff-empty">
            当前文件不存在，可能已被删除。
          </div>
          <div v-else-if="mode === 'file' && currentFileContent" class="file-preview">
            <div v-if="currentFileContent.truncated" class="diff-note">文件较大，仅展示前半部分内容。</div>
            <div v-for="(line, index) in currentFileLines" :key="index" class="file-line">
              <span>{{ index + 1 }}</span>
              <code v-html="highlightSearch(highlightCode(line))"></code>
            </div>
          </div>
          <div v-else-if="mode === 'split'" class="split-diff">
            <template v-for="(row, index) in splitRows" :key="index">
              <div v-if="row.meta" class="split-meta">{{ row.meta }}</div>
              <div v-else class="split-row">
                <div :class="['split-cell', row.left?.type || 'empty']">
                  <span>{{ row.left?.line || '' }}</span>
                  <code v-html="highlightSearch(row.left?.html || '')"></code>
                </div>
                <div :class="['split-cell', row.right?.type || 'empty']">
                  <span>{{ row.right?.line || '' }}</span>
                  <code v-html="highlightSearch(row.right?.html || '')"></code>
                </div>
              </div>
            </template>
          </div>
          <div v-else class="unified-diff">
            <div v-for="(line, index) in unifiedLines" :key="index" :class="['diff-line', line.type]">
              <span class="sign">{{ line.sign }}</span>
              <code v-html="highlightSearch(line.html)"></code>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.code-drawer-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; justify-content: flex-end; background: rgba(15, 23, 42, .35); backdrop-filter: blur(2px); }
.code-drawer { width: min(1180px, 94vw); height: 100%; display: flex; flex-direction: column; background: #f8fafc; color: #0f172a; box-shadow: -20px 0 60px rgba(15, 23, 42, .25); }
.code-drawer-head { display: flex; justify-content: space-between; gap: 16px; padding: 18px 22px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.drawer-kicker { font-size: 12px; color: #2563eb; font-weight: 800; }
.code-drawer-head h3 { margin: 4px 0; font-size: 18px; }
.code-drawer-head p { margin: 0; color: #64748b; font-size: 13px; }
.drawer-close { width: 34px; height: 34px; border: 0; border-radius: 10px; background: #e2e8f0; cursor: pointer; font-size: 24px; line-height: 1; }
.drawer-summary { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border-bottom: 1px solid #e2e8f0; background: #f1f5f9; font-size: 13px; }
.drawer-summary strong { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.drawer-summary .plus { color: #059669; margin-left: 12px; }
.drawer-summary .minus { color: #dc2626; }
.drawer-summary button { margin-left: auto; padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff; color: #1d4ed8; cursor: pointer; }
.drawer-empty,.diff-empty { margin: 24px; padding: 40px 24px; border: 1px dashed #cbd5e1; border-radius: 14px; color: #64748b; text-align: center; background: #fff; }
.drawer-body { min-height: 0; flex: 1; display: grid; grid-template-columns: 310px 1fr; }
.drawer-files { overflow: auto; padding: 12px; border-right: 1px solid #e2e8f0; background: #fff; }
.drawer-files button { width: 100%; display: grid; grid-template-columns: 10px 1fr; gap: 4px 8px; padding: 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; }
.drawer-files button.active { border-color: #bfdbfe; background: #eff6ff; }
.file-dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 6px; }
.file-path { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.drawer-files small { grid-column: 2; color: #64748b; font-size: 11px; }
.drawer-diff { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.diff-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.diff-toolbar strong { display: block; max-width: 460px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.diff-toolbar span { margin-left: 8px; color: #b45309; font-size: 12px; }
.diff-actions { display: flex; gap: 6px; align-items: center; }
.diff-actions input { width: 180px; padding: 6px 9px; border: 1px solid #cbd5e1; border-radius: 8px; }
.diff-actions button { padding: 6px 9px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; }
.diff-actions button.active { border-color: #2563eb; background: #dbeafe; color: #1d4ed8; }
.diff-actions button:disabled { opacity: .45; cursor: not-allowed; }
.unified-diff,.split-diff,.file-preview { flex: 1; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.55; background: #0f172a; color: #cbd5e1; }
.diff-line,.file-line { display: grid; grid-template-columns: 32px 1fr; min-width: max-content; }
.diff-line code,.file-line code,.split-cell code { white-space: pre; padding-right: 16px; }
.diff-line .sign,.file-line span,.split-cell span { user-select: none; color: #64748b; text-align: right; padding: 0 8px; border-right: 1px solid rgba(148, 163, 184, .22); margin-right: 8px; }
.diff-line.add,.split-cell.add { background: rgba(16, 185, 129, .16); color: #bbf7d0; }
.diff-line.remove,.split-cell.remove { background: rgba(239, 68, 68, .16); color: #fecaca; }
.diff-line.meta,.split-meta { color: #93c5fd; background: rgba(59, 130, 246, .14); }
.split-row { display: grid; grid-template-columns: 1fr 1fr; min-width: 900px; }
.split-cell { display: grid; grid-template-columns: 48px 1fr; min-width: 0; border-right: 1px solid rgba(148, 163, 184, .15); }
.split-cell.empty { background: rgba(15, 23, 42, .45); }
.split-meta { grid-column: 1 / -1; padding: 2px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.diff-note { padding: 8px 14px; color: #fbbf24; background: rgba(251, 191, 36, .14); }
:deep(.hl-keyword) { color: #93c5fd; font-weight: 700; }
:deep(.hl-string) { color: #fde68a; }
:deep(.hl-number) { color: #c4b5fd; }
:deep(.hl-match) { background: #facc15; color: #111827; border-radius: 3px; }
:global([data-theme="dark"]) .code-drawer { background: #0f172a; color: #e2e8f0; }
:global([data-theme="dark"]) .code-drawer-head,
:global([data-theme="dark"]) .drawer-files,
:global([data-theme="dark"]) .diff-toolbar { background: #111827; border-color: rgba(148, 163, 184, .2); }
:global([data-theme="dark"]) .drawer-summary { background: #1e293b; border-color: rgba(148, 163, 184, .2); }
:global([data-theme="dark"]) .drawer-files button.active { background: rgba(37, 99, 235, .22); border-color: rgba(96, 165, 250, .5); }
:global([data-theme="dark"]) .diff-actions input,
:global([data-theme="dark"]) .diff-actions button { background: #0f172a; border-color: rgba(148, 163, 184, .3); color: #e2e8f0; }
@media (max-width: 820px) {
  .drawer-body { grid-template-columns: 1fr; }
  .drawer-files { max-height: 220px; border-right: 0; border-bottom: 1px solid #e2e8f0; }
  .diff-toolbar { align-items: stretch; flex-direction: column; }
  .diff-actions { flex-wrap: wrap; }
}
</style>
