<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowDown, ArrowUp, Clipboard, CloudDownload, CloudUpload, Columns2, Download, FileDiff,
  GitBranch, GitCommitHorizontal, GitPullRequestArrow, History, List, RefreshCw, RotateCcw,
  Search, ShieldAlert,
} from '@lucide/vue'
import { projectsApi } from '../../api/index.js'
import { confirmDialog, toast } from '../../utils/toast.js'
import CodeChangeSummary from './code-changes/CodeChangeSummary.vue'
import CodeChangeFileList from './code-changes/CodeChangeFileList.vue'
import CodeDiffViewer from './code-changes/CodeDiffViewer.vue'
import CodeCommitPanel from './code-changes/CodeCommitPanel.vue'
import CodeCommitHistoryDrawer from './code-changes/CodeCommitHistoryDrawer.vue'
import ProjectGroupedSelector from '../projects/ProjectGroupedSelector.vue'

const slashNavigate = inject('slashNavigate', null)
const projects = ref([])
const selectedProject = ref('')
const branch = ref('')
const files = ref([])
const summary = ref({})
const repository = ref({})
const changeContext = ref({ tasks: [], latestTestAgent: null, attribution: 'none' })
const selectedFile = ref('')
const selectedFiles = ref(new Set())
const showStaged = ref(false)
const fileFilter = ref('all')
const statusLoading = ref(false)
const statusError = ref('')
const remoteBusy = ref('')
const residualCleanupBusy = ref(false)
const workspaceSnapshotChecksum = ref('')
const nextStatusCursor = ref('')
const totalStatusFiles = ref(0)
const statusLoadingMore = ref(false)
let statusRequestGeneration = 0
let diffRequestGeneration = 0
let statusController = null
let diffController = null
let contextController = null

const diffRaw = ref('')
const diffHunks = ref([])
const diffReason = ref('')
const diffTruncated = ref(false)
const diffLoading = ref(false)
const diffMode = ref('unified')
const diffSearch = ref('')
const compactDiff = ref(false)
const diffViewer = ref(null)

const commitPanelVisible = ref(false)
const commitPreview = ref(null)
const commitPreviewLoading = ref(false)
const commitMessage = ref('')
const committing = ref(false)
const commitAction = ref('')
const historyVisible = ref(false)
const historyLoading = ref(false)
const commits = ref([])

const selectedFileInfo = computed(() => files.value.find(file => file.path === selectedFile.value) || null)
const selectedAreaStats = computed(() => {
  const file = selectedFileInfo.value
  if (!file) return { additions: 0, deletions: 0 }
  return showStaged.value
    ? { additions: file.stagedAdditions || 0, deletions: file.stagedDeletions || 0 }
    : { additions: file.workingAdditions || 0, deletions: file.workingDeletions || 0 }
})
const indexResidualFiles = computed(() => files.value.filter(file => file.indexResidual))

const filesForFilter = filter => files.value.filter(file => {
  if (filter === 'staged') return file.staged && !file.indexResidual
  if (filter === 'working') return file.unstaged && !file.indexResidual
  if (filter === 'residual') return file.indexResidual
  if (filter === 'conflict') return file.conflict
  return !file.indexResidual
})

const fetchJson = async (url, options) => {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    const error = new Error(data.error || `请求失败 (${response.status})`)
    error.payload = data
    throw error
  }
  return data
}

const loadProjects = async () => {
  try {
    const data = await projectsApi.list()
    projects.value = data.projects || []
    if (!selectedProject.value && projects.value.length) {
      selectedProject.value = projects.value[0].name
      await loadGitStatus()
    }
  } catch (error) {
    statusError.value = error.message || '项目列表加载失败'
    toast.error(statusError.value)
  }
}

const resetDiff = () => {
  diffRaw.value = ''
  diffHunks.value = []
  diffReason.value = ''
  diffTruncated.value = false
  diffSearch.value = ''
}

const loadDiff = async filePath => {
  if (!selectedProject.value || !filePath) return resetDiff()
  diffController?.abort()
  diffController = new AbortController()
  const generation = ++diffRequestGeneration
  const project = selectedProject.value
  const stagedMode = showStaged.value
  const snapshotChecksum = workspaceSnapshotChecksum.value
  selectedFile.value = filePath
  diffLoading.value = true
  resetDiff()
  try {
    const staged = stagedMode ? '&staged=true' : ''
    const snapshot = snapshotChecksum ? `&workspace_snapshot_checksum=${encodeURIComponent(snapshotChecksum)}` : ''
    const data = await fetchJson(`/api/git/diff?project=${encodeURIComponent(project)}&file=${encodeURIComponent(filePath)}${staged}${snapshot}`, { signal: diffController.signal })
    if (generation !== diffRequestGeneration || selectedProject.value !== project || selectedFile.value !== filePath || showStaged.value !== stagedMode) return
    diffRaw.value = data.raw || ''
    diffHunks.value = data.hunks || []
    diffReason.value = data.reason || ''
    diffTruncated.value = !!data.truncated
  } catch (error) {
    if (error.name === 'AbortError' || generation !== diffRequestGeneration) return
    diffReason.value = error.message || '代码差异加载失败'
    toast.error(diffReason.value)
  } finally {
    if (generation === diffRequestGeneration) diffLoading.value = false
  }
}

const loadGitStatus = async ({ preserveSelection = false } = {}) => {
  if (!selectedProject.value) return
  statusController?.abort()
  contextController?.abort()
  diffController?.abort()
  statusController = new AbortController()
  const generation = ++statusRequestGeneration
  const project = selectedProject.value
  statusLoading.value = true
  statusError.value = ''
  const previousFile = preserveSelection ? selectedFile.value : ''
  try {
    const data = await fetchJson(`/api/git/status?project=${encodeURIComponent(project)}&limit=500&include_context=false`, { signal: statusController.signal })
    if (generation !== statusRequestGeneration || selectedProject.value !== project) return
    files.value = data.files || []
    branch.value = data.branch || ''
    summary.value = data.summary || {}
    repository.value = data.repository || {}
    workspaceSnapshotChecksum.value = data.workspace_snapshot_checksum || ''
    nextStatusCursor.value = data.next_cursor || ''
    totalStatusFiles.value = Number(data.rawTotal || data.total || files.value.length)
    changeContext.value = { tasks: [], latestTestAgent: null, attribution: 'pending' }
    selectedFiles.value = new Set([...selectedFiles.value].filter(file => files.value.some(item => item.path === file && !item.indexResidual)))
    let areaFiles = filesForFilter(fileFilter.value)
    if (!areaFiles.length) {
      const alternateFilter = fileFilter.value === 'staged' ? 'working' : 'all'
      const alternateFiles = filesForFilter(alternateFilter)
      if (alternateFiles.length) {
        fileFilter.value = alternateFilter
        showStaged.value = false
        areaFiles = alternateFiles
      }
    }
    const nextFile = areaFiles.some(file => file.path === previousFile) ? previousFile : areaFiles[0]?.path || ''
    selectedFile.value = nextFile
    if (nextFile) {
      const file = files.value.find(item => item.path === nextFile)
      if (file?.indexResidual || file?.staged && !file.unstaged) showStaged.value = true
      else if (file?.unstaged && !file.staged) showStaged.value = false
      await loadDiff(nextFile)
    }
    else resetDiff()
    contextController = new AbortController()
    fetchJson(`/api/git/context?project=${encodeURIComponent(project)}&workspace_snapshot_checksum=${encodeURIComponent(workspaceSnapshotChecksum.value)}`, { signal: contextController.signal })
      .then(contextData => {
        if (generation === statusRequestGeneration && selectedProject.value === project && contextData.workspace_snapshot_checksum === workspaceSnapshotChecksum.value) changeContext.value = contextData.context || { tasks: [], latestTestAgent: null, attribution: 'none' }
      })
      .catch(error => { if (error.name !== 'AbortError' && generation === statusRequestGeneration) changeContext.value = { tasks: [], latestTestAgent: null, attribution: 'unavailable' } })
  } catch (error) {
    if (error.name === 'AbortError' || generation !== statusRequestGeneration) return
    files.value = []
    summary.value = {}
    repository.value = {}
    changeContext.value = { tasks: [], latestTestAgent: null, attribution: 'none' }
    branch.value = ''
    selectedFile.value = ''
    workspaceSnapshotChecksum.value = ''
    nextStatusCursor.value = ''
    totalStatusFiles.value = 0
    resetDiff()
    statusError.value = error.message || 'Git 状态加载失败'
    toast.error(statusError.value)
  } finally {
    if (generation === statusRequestGeneration) statusLoading.value = false
  }
}

const loadMoreGitStatus = async () => {
  if (!selectedProject.value || !nextStatusCursor.value || statusLoadingMore.value) return
  const generation = statusRequestGeneration
  const project = selectedProject.value
  const cursor = nextStatusCursor.value
  statusLoadingMore.value = true
  try {
    const data = await fetchJson(`/api/git/status?project=${encodeURIComponent(project)}&limit=500&include_context=false&cursor=${encodeURIComponent(cursor)}`)
    if (generation !== statusRequestGeneration || project !== selectedProject.value || data.workspace_snapshot_checksum !== workspaceSnapshotChecksum.value) return
    const known = new Set(files.value.map(file => file.path))
    files.value = [...files.value, ...(data.files || []).filter(file => !known.has(file.path))]
    nextStatusCursor.value = data.next_cursor || ''
  } catch (error) {
    if (generation === statusRequestGeneration) toast.error(error.message || '继续加载变更文件失败')
  } finally { if (generation === statusRequestGeneration) statusLoadingMore.value = false }
}

const changeProject = projectName => {
  statusController?.abort()
  contextController?.abort()
  diffController?.abort()
  statusRequestGeneration += 1
  diffRequestGeneration += 1
  selectedProject.value = projectName
  selectedFiles.value = new Set()
  showStaged.value = false
  fileFilter.value = 'all'
  files.value = []
  selectedFile.value = ''
  workspaceSnapshotChecksum.value = ''
  nextStatusCursor.value = ''
  totalStatusFiles.value = 0
  commitPanelVisible.value = false
  historyVisible.value = false
  resetDiff()
  loadGitStatus()
}

const remoteOperationTitle = operation => {
  if (!repository.value?.remoteUrl) return '当前项目没有配置 origin 远端仓库'
  if (operation === 'pull' && repository.value?.dirty) return '请先提交或处理工作区改动，再更新本地分支'
  if (repository.value?.detached && operation !== 'fetch') return 'detached HEAD 不能更新或推送分支'
  if (operation === 'fetch') return '获取 origin 的最新分支和引用，不修改本地文件'
  if (operation === 'pull') return '拉取远端提交并使用 fast-forward only 更新当前分支'
  if (repository.value?.behind) return '远端包含本地没有的提交，请先拉取代码'
  if (repository.value?.pushState === 'up_to_date') return '当前没有待推送的本地提交'
  return repository.value?.upstream ? '推送当前分支中已经提交的代码' : '首次推送当前分支并设置 upstream'
}

const runRemoteOperation = async operation => {
  if (!selectedProject.value || remoteBusy.value) return
  if (operation !== 'fetch') {
    const description = operation === 'pull'
      ? `将从 ${repository.value.upstream || `origin/${repository.value.branch || '当前分支'}`} 更新本地代码，仅允许快进合并。`
      : `将 ${repository.value.branch || '当前分支'} 的本地提交推送到 ${repository.value.upstream || 'origin'}。`
    const approved = await confirmDialog(`${description}是否继续？`)
    if (!approved) return
  }
  remoteBusy.value = operation
  try {
    const data = await fetchJson('/api/git/remote-operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, operation, confirmed: true, expected_snapshot_checksum: workspaceSnapshotChecksum.value }),
    })
    toast.success(data.message || 'Git 远端操作完成')
    await loadGitStatus({ preserveSelection: true })
  } catch (error) {
    const suggestion = error.payload?.suggestion ? `；${error.payload.suggestion}` : ''
    toast.error(`${error.message || 'Git 远端操作失败'}${suggestion}`)
  } finally {
    remoteBusy.value = ''
  }
}

const toggleSelectedFile = filePath => {
  if (files.value.find(file => file.path === filePath)?.indexResidual) {
    toast.info('索引残留不进入普通提交，请使用“清理索引残留”')
    return
  }
  const next = new Set(selectedFiles.value)
  next.has(filePath) ? next.delete(filePath) : next.add(filePath)
  selectedFiles.value = next
}

const toggleVisibleFiles = visibleFiles => {
  const selectableFiles = visibleFiles.filter(file => !file.indexResidual)
  if (!selectableFiles.length) return toast.info('索引残留不进入普通提交，请使用“清理索引残留”')
  const next = new Set(selectedFiles.value)
  const allSelected = selectableFiles.every(file => next.has(file.path))
  selectableFiles.forEach(file => allSelected ? next.delete(file.path) : next.add(file.path))
  selectedFiles.value = next
}

const selectArea = staged => {
  const targetFilter = staged ? 'staged' : 'working'
  if (showStaged.value === staged && fileFilter.value === targetFilter && selectedFileInfo.value?.[staged ? 'staged' : 'unstaged']) return
  showStaged.value = staged
  fileFilter.value = targetFilter
  const areaFiles = filesForFilter(fileFilter.value)
  const nextFile = areaFiles.some(file => file.path === selectedFile.value) ? selectedFile.value : areaFiles[0]?.path || ''
  selectedFile.value = nextFile
  if (nextFile) loadDiff(nextFile)
  else resetDiff()
}

const selectFileFromList = filePath => {
  const file = files.value.find(item => item.path === filePath)
  if (file?.indexResidual || file?.staged && !file.unstaged) showStaged.value = true
  else if (file?.unstaged && !file.staged) showStaged.value = false
  loadDiff(filePath)
}

const changeFileFilter = filter => {
  fileFilter.value = filter
  if (filter === 'staged' || filter === 'residual') showStaged.value = true
  else if (filter === 'working') showStaged.value = false
  const nextFile = filesForFilter(filter)[0]?.path || ''
  selectedFile.value = nextFile
  if (nextFile) selectFileFromList(nextFile)
  else resetDiff()
}

const cleanupIndexResiduals = async () => {
  const residuals = indexResidualFiles.value
  if (!residuals.length || residualCleanupBusy.value) return
  const approved = await confirmDialog(`将清理 ${residuals.length} 个暂存区索引残留。这只会取消这些已不存在文件的暂存记录，不会删除当前本地有效文件。是否继续？`)
  if (!approved) return
  residualCleanupBusy.value = true
  try {
    const data = await fetchJson('/api/git/index-residuals/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, files: residuals.map(file => file.path), confirmed: true, expected_snapshot_checksum: workspaceSnapshotChecksum.value }),
    })
    toast.success(data.message || '索引残留已清理')
    fileFilter.value = 'all'
    showStaged.value = false
    await loadGitStatus()
  } catch (error) {
    toast.error(error.message || '索引残留清理失败')
  } finally {
    residualCleanupBusy.value = false
  }
}

const copyText = async (value, message) => {
  if (!value) return toast.info('当前没有可复制内容')
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  } catch {
    toast.error('复制失败，请检查浏览器剪贴板权限')
  }
}

const downloadPatch = () => {
  if (!diffRaw.value || !selectedFile.value) return toast.info('当前没有可下载的 Patch')
  const blob = new Blob([diffRaw.value], { type: 'text/x-diff;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${selectedFile.value.replace(/[\\/]/g, '-')}.${showStaged.value ? 'staged' : 'working'}.patch`
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('Patch 已下载')
}

const rollbackFile = async () => {
  const file = selectedFileInfo.value
  if (!file) return
  if (file.untracked && !showStaged.value) return toast.warning('未跟踪文件不会由页面自动删除，请确认内容后在文件系统处理')
  const action = showStaged.value ? '取消暂存' : '永久丢弃工作区改动'
  const approved = await confirmDialog(`将对 ${file.path} 执行“${action}”。${showStaged.value ? '文件内容仍会保留在工作区。' : '未提交内容无法从 Git 恢复。'}是否继续？`)
  if (!approved) return
  try {
    const data = await fetchJson('/api/git/rollback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, file: file.path, staged: showStaged.value, confirmed: true, expected_snapshot_checksum: workspaceSnapshotChecksum.value }),
    })
    toast.success(data.message || `${action}完成`)
    await loadGitStatus({ preserveSelection: true })
  } catch (error) { toast.error(error.message || `${action}失败`) }
}

const hunkPatch = hunk => {
  let patch = `diff --git a/${selectedFile.value} b/${selectedFile.value}\n--- a/${selectedFile.value}\n+++ b/${selectedFile.value}\n${hunk.header}\n`
  for (const change of hunk.changes || []) patch += `${change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' '}${change.content}\n`
  return patch
}

const applyHunkAction = async ({ hunk, action }) => {
  if (!selectedFile.value) return
  if (action === 'discard') {
    const approved = await confirmDialog(`确定永久丢弃 ${selectedFile.value} 的这一段工作区改动吗？该操作无法从 Git 恢复。`)
    if (!approved) return
  }
  const options = action === 'stage' ? { revert: false, cached: true } : action === 'unstage' ? { revert: true, cached: true } : { revert: true, cached: false }
  try {
    const data = await fetchJson('/api/git/apply-patch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, file: selectedFile.value, patchText: hunkPatch(hunk), expected_snapshot_checksum: workspaceSnapshotChecksum.value, ...options }),
    })
    toast.success(data.message || '代码块操作完成')
    await loadGitStatus({ preserveSelection: true })
  } catch (error) { toast.error(error.message || '代码块操作失败') }
}

const openCommitPanel = async () => {
  if (!selectedFiles.value.size) return toast.warning('请先明确选择本次要提交的文件')
  commitPanelVisible.value = true
  commitPreview.value = null
  commitPreviewLoading.value = true
  try {
    const data = await fetchJson('/api/git/commit-preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, files: [...selectedFiles.value], expected_snapshot_checksum: workspaceSnapshotChecksum.value }),
    })
    commitPreview.value = data.preview
  } catch (error) {
    toast.error(error.message || '提交预检失败')
    commitPanelVisible.value = false
  } finally { commitPreviewLoading.value = false }
}

const commitChanges = async ({ verification, action = 'commit' }) => {
  committing.value = true
  commitAction.value = action
  try {
    const data = await fetchJson('/api/git/commit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, message: commitMessage.value.trim(), files: [...selectedFiles.value], verification, reviewed: true, action, expected_snapshot_checksum: commitPreview.value?.workspace_snapshot_checksum || workspaceSnapshotChecksum.value }),
    })
    if (data.partialSuccess) {
      const suggestion = data.push?.suggestion ? `；${data.push.suggestion}` : ''
      toast.warning(`${data.message}：${data.push?.error || '远端推送失败'}${suggestion}`)
    } else if (data.outcome === 'no_changes') {
      toast.info(data.message || '所选文件没有可提交内容')
    } else {
      toast.success(data.message || `提交成功 ${data.hash || ''}`.trim())
    }
    commitPanelVisible.value = false
    commitMessage.value = ''
    selectedFiles.value = new Set()
    await loadGitStatus()
  } catch (error) {
    const suggestion = error.payload?.suggestion ? `；${error.payload.suggestion}` : ''
    toast.error(`${error.message || '提交失败'}${suggestion}`)
  }
  finally { committing.value = false; commitAction.value = '' }
}

const openHistory = async () => {
  historyVisible.value = true
  historyLoading.value = true
  try {
    const data = await fetchJson(`/api/git/log?project=${encodeURIComponent(selectedProject.value)}&limit=40`)
    commits.value = data.commits || []
  } catch (error) { toast.error(error.message || '提交历史加载失败') }
  finally { historyLoading.value = false }
}

const openReplay = task => {
  const target = { scope: 'orchestrator', task_id: task.taskId || '', trace_id: task.traceId || '', at: Date.now() }
  localStorage.setItem('trace-replay-target', JSON.stringify(target))
  slashNavigate?.('trace-replay')
  window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: target }))
}

onMounted(loadProjects)
onBeforeUnmount(() => { statusController?.abort(); contextController?.abort(); diffController?.abort() })
</script>

<template>
  <div class="code-changes-workbench">
    <header class="page-toolbar">
      <div class="toolbar-primary">
        <ProjectGroupedSelector v-model="selectedProject" :projects="projects" label="项目" variant="toolbar" @select="changeProject" />
        <button title="刷新 Git 状态" :disabled="statusLoading || !selectedProject" @click="loadGitStatus({ preserveSelection: true })"><RefreshCw :size="15" :class="{ spinning: statusLoading }" /><span>刷新</span></button>
        <div class="area-switch" aria-label="差异区域"><button :class="{ active: !showStaged }" @click="selectArea(false)">工作区 {{ summary.unstaged || 0 }}</button><button :class="{ active: showStaged }" @click="selectArea(true)">暂存区 {{ summary.staged || 0 }}</button></div>
      </div>
      <div class="toolbar-actions">
        <button title="查看提交历史" :disabled="!selectedProject" @click="openHistory"><History :size="15" /><span>历史</span></button>
        <button class="commit-button" title="检查所选文件后创建本地 Git 提交" :disabled="!selectedFiles.size || summary.conflicts" @click="openCommitPanel"><GitCommitHorizontal :size="15" /><span>提交代码</span><strong>{{ selectedFiles.size }}</strong></button>
      </div>
    </header>

    <section v-if="selectedProject" class="repository-toolbar" aria-label="Git 远端同步">
      <div class="repository-identity">
        <span class="repository-icon"><GitBranch :size="16" /></span>
        <div>
          <strong>{{ repository.branch || branch || '未知分支' }}</strong>
          <small v-if="repository.remoteUrl">{{ repository.upstream || '尚未设置 upstream' }} · origin</small>
          <small v-else>当前项目没有配置 origin 远端仓库</small>
        </div>
      </div>
      <div class="repository-state" aria-label="分支同步状态">
        <span :class="{ active: repository.behind }">远端领先 <strong>{{ repository.behind || 0 }}</strong></span>
        <span :class="{ active: repository.ahead }">本地领先 <strong>{{ repository.ahead || 0 }}</strong></span>
        <span :class="{ warning: repository.dirty }">
          {{ repository.dirty ? `${repository.changedFiles || 0} 个变更${repository.indexResidualFiles ? ` · ${repository.indexResidualFiles} 个索引残留` : ''}` : '工作区干净' }}
        </span>
      </div>
      <div class="repository-actions">
        <button :title="remoteOperationTitle('fetch')" :disabled="remoteBusy || !repository.canFetch" @click="runRemoteOperation('fetch')">
          <CloudDownload :size="15" :class="{ spinning: remoteBusy === 'fetch' }" /><span>获取远端</span>
        </button>
        <button :title="remoteOperationTitle('pull')" :disabled="remoteBusy || !repository.canPull" @click="runRemoteOperation('pull')">
          <GitPullRequestArrow :size="15" :class="{ spinning: remoteBusy === 'pull' }" /><span>拉取代码</span>
        </button>
        <button class="push-button" :title="remoteOperationTitle('push')" :disabled="remoteBusy || !repository.canPush" @click="runRemoteOperation('push')">
          <CloudUpload :size="15" :class="{ spinning: remoteBusy === 'push' }" /><span>推送代码</span>
        </button>
      </div>
    </section>

    <CodeChangeSummary
      :summary="summary"
      :context="changeContext"
      :branch="branch"
      :loading="statusLoading"
      :residual-cleanup-busy="residualCleanupBusy"
      @open-replay="openReplay"
      @view-residuals="changeFileFilter('residual')"
      @cleanup-residuals="cleanupIndexResiduals"
    />
    <div v-if="statusError" class="status-error"><ShieldAlert :size="16" />{{ statusError }}</div>

    <div class="changes-layout">
      <CodeChangeFileList :files="files" :total-count="totalStatusFiles" :has-more="!!nextStatusCursor" :loading-more="statusLoadingMore" :selected-path="selectedFile" :checked-paths="selectedFiles" :filter="fileFilter" @select="selectFileFromList" @filter-change="changeFileFilter" @toggle="toggleSelectedFile" @toggle-visible="toggleVisibleFiles" @load-more="loadMoreGitStatus" />
      <section class="diff-pane">
        <header class="diff-toolbar">
          <div class="file-title"><FileDiff :size="15" /><strong :title="selectedFile">{{ selectedFile || '选择文件查看差异' }}</strong><span v-if="selectedFile" class="line-stats"><b>+{{ selectedAreaStats.additions }}</b><i>-{{ selectedAreaStats.deletions }}</i></span></div>
          <div v-if="selectedFile" class="diff-tools">
            <label class="diff-search">
              <Search :size="13" aria-hidden="true" />
              <input
                v-model="diffSearch"
                type="search"
                aria-label="搜索当前差异"
                placeholder="搜索 Diff"
                autocomplete="off"
                spellcheck="false"
              />
            </label>
            <button title="上一个改动" @click="diffViewer?.navigateHunk(-1)"><ArrowUp :size="14" /></button>
            <button title="下一个改动" @click="diffViewer?.navigateHunk(1)"><ArrowDown :size="14" /></button>
            <button title="仅显示变更行" :class="{ active: compactDiff }" @click="compactDiff = !compactDiff"><List :size="14" /></button>
            <button title="统一 Diff" :class="{ active: diffMode === 'unified' }" @click="diffMode = 'unified'"><FileDiff :size="14" /></button>
            <button title="左右对比" :class="{ active: diffMode === 'split' }" @click="diffMode = 'split'"><Columns2 :size="14" /></button>
            <button title="复制文件路径" @click="copyText(selectedFile, '文件路径已复制')"><Clipboard :size="14" /></button>
            <button title="下载 Patch" @click="downloadPatch"><Download :size="14" /></button>
            <button class="danger-action" :title="showStaged ? '取消暂存当前文件' : '丢弃当前文件工作区改动'" @click="rollbackFile"><RotateCcw :size="14" /></button>
          </div>
        </header>
        <CodeDiffViewer ref="diffViewer" :file="selectedFile" :raw="diffRaw" :hunks="diffHunks" :reason="diffReason" :truncated="diffTruncated" :staged="showStaged" :mode="diffMode" :search="diffSearch" :compact="compactDiff" :loading="diffLoading" @hunk-action="applyHunkAction" />
      </section>
    </div>

    <CodeCommitPanel v-model:message="commitMessage" :visible="commitPanelVisible" :preview="commitPreview" :loading="commitPreviewLoading" :committing="committing" :busy-action="commitAction" :can-push="repository.canCommitAndPush !== false && !!repository.remoteUrl" :push-target="repository.pushTarget || repository.upstream || ''" @close="commitPanelVisible = false" @commit="commitChanges" />
    <CodeCommitHistoryDrawer :visible="historyVisible" :commits="commits" :loading="historyLoading" @close="historyVisible = false" />
  </div>
</template>

<style scoped>
.code-changes-workbench { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-primary,#fff); color:var(--text-primary); }
.page-toolbar { min-height:52px; padding:8px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--border-color,rgba(15,23,42,.09)); background:var(--bg-primary,#fff); }.toolbar-primary,.toolbar-actions,.diff-tools { display:flex; align-items:center; gap:7px; }
.page-toolbar button,.diff-toolbar button { min-height:30px;padding:0 9px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-color,rgba(15,23,42,.1));border-radius:6px;background:transparent;color:var(--text-secondary);font-size:11px;cursor:pointer;white-space:nowrap }.page-toolbar button:hover,.diff-toolbar button:hover { background:rgba(37,99,235,.06);color:#2563eb }.page-toolbar button:disabled { opacity:.42;cursor:not-allowed }.page-toolbar .commit-button { border-color:#2563eb;background:#2563eb;color:#fff }.commit-button strong { min-width:17px;padding:1px 4px;border-radius:4px;background:rgba(255,255,255,.2);font-size:10px }
.area-switch { display:flex;padding:2px;border:1px solid var(--border-color,rgba(15,23,42,.1));border-radius:6px }.area-switch button { min-height:26px;border:0;border-radius:4px }.area-switch button.active { background:rgba(37,99,235,.1);color:#1d4ed8 }
.repository-toolbar { min-height:58px;padding:9px 16px;display:grid;grid-template-columns:minmax(220px,1fr) auto auto;align-items:center;gap:18px;border-bottom:1px solid var(--border-color,rgba(15,23,42,.09));background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 62%,transparent) }
.repository-identity { min-width:0;display:flex;align-items:center;gap:9px }.repository-icon { width:32px;height:32px;flex:0 0 auto;display:grid;place-items:center;border:1px solid color-mix(in srgb,#2563eb 22%,transparent);border-radius:6px;background:color-mix(in srgb,#2563eb 8%,transparent);color:#2563eb }.repository-identity>div { min-width:0 }.repository-identity strong,.repository-identity small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }.repository-identity strong { color:var(--text-primary);font:600 12px ui-monospace,SFMono-Regular,Consolas,monospace }.repository-identity small { margin-top:3px;color:var(--text-muted);font-size:10px }
.repository-state { display:flex;align-items:center;gap:7px }.repository-state>span { min-height:25px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;border:1px solid var(--border-color,rgba(15,23,42,.09));border-radius:5px;color:var(--text-muted);font-size:10px;white-space:nowrap }.repository-state strong { color:var(--text-secondary);font-size:11px }.repository-state .active { border-color:color-mix(in srgb,#2563eb 22%,transparent);background:color-mix(in srgb,#2563eb 6%,transparent);color:#2563eb }.repository-state .warning { border-color:color-mix(in srgb,#d97706 28%,transparent);background:color-mix(in srgb,#f59e0b 7%,transparent);color:#b45309 }
.repository-actions { display:flex;align-items:center;gap:6px }.repository-actions button { min-height:32px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-color,rgba(15,23,42,.11));border-radius:6px;background:var(--surface,var(--bg-primary,#fff));color:var(--text-secondary);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap }.repository-actions button:hover:not(:disabled) { border-color:color-mix(in srgb,#2563eb 30%,transparent);background:color-mix(in srgb,#2563eb 6%,transparent);color:#2563eb }.repository-actions .push-button { border-color:color-mix(in srgb,#2563eb 28%,transparent);color:#2563eb }.repository-actions button:disabled { opacity:.42;cursor:not-allowed }
.code-changes-workbench > :deep(.change-summary) { flex:0 0 auto; }
.changes-layout { flex:1;min-height:0;display:grid;grid-template-columns:340px minmax(0,1fr);align-items:stretch;gap:10px;padding:10px;overflow:hidden;background:color-mix(in srgb,var(--bg-secondary,#f8fafc) 55%,transparent) }.diff-pane { min-width:0;min-height:0;height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-color,rgba(15,23,42,.09));border-radius:7px;background:var(--surface,var(--bg-primary,#fff));box-shadow:var(--shadow-sm) }.diff-toolbar { position:relative;z-index:2;flex:0 0 auto;min-height:46px;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border-color,rgba(15,23,42,.09));background:color-mix(in srgb,var(--bg-primary,#fff) 97%,#f1f5f9) }.file-title { min-width:0;display:flex;align-items:center;gap:7px }.file-title strong { max-width:min(420px,35vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600 }.line-stats { display:flex;gap:5px;font:10px ui-monospace,monospace }.line-stats b { color:#047857 }.line-stats i { color:#b91c1c;font-style:normal }.diff-search { width:150px;height:30px;padding:0 8px;display:flex;align-items:center;gap:6px;border:1px solid var(--border-color,rgba(15,23,42,.1));border-radius:6px;background:var(--surface,var(--bg-primary,#fff));color:var(--text-muted);transition:border-color .15s ease,box-shadow .15s ease,background .15s ease }.diff-search:focus-within { border-color:var(--accent-blue,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-blue,#2563eb) 12%,transparent) }.diff-search input,.diff-search input:focus { min-width:0;width:100%;height:auto;min-height:0;padding:0;border:0;border-radius:0;outline:0;box-shadow:none;background:transparent;color:var(--text-primary);font-size:11px }.diff-search input::-webkit-search-cancel-button { cursor:pointer }.diff-toolbar button { width:30px;padding:0 }.diff-toolbar button.active { border-color:rgba(37,99,235,.35);background:rgba(37,99,235,.1);color:#2563eb }.diff-toolbar .danger-action { color:#b91c1c }.status-error { flex:0 0 auto;padding:9px 16px;display:flex;align-items:center;gap:7px;background:#fef2f2;color:#b91c1c;font-size:12px }
.spinning { animation:spin .8s linear infinite }@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1180px){.repository-toolbar{grid-template-columns:minmax(180px,1fr) auto}.repository-state{display:none}.diff-search{display:none}.file-title strong{max-width:220px}.change-summary+:deep(*){min-width:0}}
@media(max-width:768px){.code-changes-workbench{overflow-y:auto;overscroll-behavior:contain}.page-toolbar{align-items:stretch;flex-direction:column;padding:8px 10px}.toolbar-primary,.toolbar-actions{width:100%}.toolbar-actions{justify-content:flex-end}.repository-toolbar{grid-template-columns:minmax(0,1fr);gap:8px;padding:9px 10px}.repository-actions{min-width:0;width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.repository-actions button{min-width:0;width:100%;padding:0 5px;white-space:nowrap}.repository-actions button span{font-size:10px}.changes-layout{flex:0 0 auto;height:920px;min-height:920px;grid-template-columns:minmax(0,1fr);grid-template-rows:repeat(2,minmax(0,1fr));overflow:visible}.diff-pane{height:100%;min-height:0}.diff-toolbar{align-items:flex-start;flex-direction:column}.diff-tools{width:100%;overflow-x:auto;padding-bottom:2px}.file-title strong{max-width:calc(100vw - 130px)}.diff-toolbar button[title="左右对比"]{display:none}.page-toolbar button span{display:none}.page-toolbar .commit-button span{display:inline}.toolbar-primary>.page-toolbar button{width:32px}}
.status-error { background:var(--danger-soft); color:var(--accent-red); }
</style>
