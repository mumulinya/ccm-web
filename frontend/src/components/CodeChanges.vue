<script setup>
import { ref, onMounted, computed } from 'vue'
import { projectsApi } from '../api/index.js'

const projects = ref([])
const selectedProject = ref('')
const files = ref([])
const selectedFile = ref(null)
const diffHunks = ref([])
const diffRaw = ref('')
const diffReason = ref('')
const diffTruncated = ref(false)
const branch = ref('')
const showStaged = ref(false)

// 过滤与搜索
const fileFilter = ref('')
const diffSearchQuery = ref('')

// 提交相关
const commitMsg = ref('')
const committing = ref(false)
const selectedFiles = ref(new Set())

// 历史相关
const showHistory = ref(false)
const commitLog = ref([])

const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
  // 自动选择第一个项目
  if (projects.value.length > 0 && !selectedProject.value) {
    selectedProject.value = projects.value[0].name
    loadGitStatus()
  }
}

const loadGitStatus = async () => {
  if (!selectedProject.value) return
  try {
    const res = await fetch(`/api/git/status?project=${encodeURIComponent(selectedProject.value)}`)
    const data = await res.json()
    if (data.success) {
      files.value = data.files || []
      branch.value = data.branch || ''
      selectedFile.value = null
      diffHunks.value = []
      diffRaw.value = ''
      diffReason.value = ''
      diffTruncated.value = false
      selectedFiles.value = new Set()
    } else {
      files.value = []
      branch.value = ''
      selectedFile.value = null
      diffHunks.value = []
      diffRaw.value = ''
      diffReason.value = data.error || '加载状态失败'
      diffTruncated.value = false
      selectedFiles.value = new Set()
    }
  } catch (e) {
    files.value = []
    branch.value = ''
    selectedFile.value = null
    diffHunks.value = []
    diffRaw.value = ''
    diffReason.value = '加载失败: ' + e.message
    diffTruncated.value = false
    selectedFiles.value = new Set()
  }
}

const loadDiff = async (filePath) => {
  selectedFile.value = filePath
  try {
    const staged = showStaged.value ? '&staged=true' : ''
    const res = await fetch(`/api/git/diff?project=${encodeURIComponent(selectedProject.value)}&file=${encodeURIComponent(filePath)}${staged}`)
    const data = await res.json()
    if (data.success) {
      diffHunks.value = data.hunks || []
      diffRaw.value = data.raw || ''
      diffReason.value = data.reason || ''
      diffTruncated.value = !!data.truncated
    } else {
      diffHunks.value = []
      diffRaw.value = ''
      diffReason.value = data.error || '获取 diff 失败'
      diffTruncated.value = false
    }
  } catch (e) {
    diffHunks.value = []
    diffRaw.value = ''
    diffReason.value = '加载失败: ' + e.message
    diffTruncated.value = false
  }
}

const getRawDiffLines = () => diffRaw.value ? diffRaw.value.split('\n') : []

const getRawDiffLineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'diff-meta'
  if (line.startsWith('+')) return 'diff-add'
  if (line.startsWith('-')) return 'diff-remove'
  return 'diff-context'
}

const toggleStaged = () => {
  showStaged.value = !showStaged.value
  if (selectedFile.value) loadDiff(selectedFile.value)
}

const toggleFileSelect = (filePath) => {
  const s = new Set(selectedFiles.value)
  if (s.has(filePath)) s.delete(filePath)
  else s.add(filePath)
  selectedFiles.value = s
}

const selectAllFiles = () => {
  if (selectedFiles.value.size === files.value.length) {
    selectedFiles.value = new Set()
  } else {
    selectedFiles.value = new Set(files.value.map(f => f.path))
  }
}

const rollbackFile = async () => {
  if (!selectedFile.value || !confirm(`确定回滚 ${selectedFile.value}？`)) return
  try {
    const res = await fetch('/api/git/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, file: selectedFile.value, staged: showStaged.value })
    })
    const data = await res.json()
    if (data.success) {
      loadGitStatus()
    }
  } catch {}
}

const commitChanges = async () => {
  if (!commitMsg.value.trim()) return alert('请输入提交信息')
  committing.value = true
  try {
    const fileList = selectedFiles.value.size > 0 ? [...selectedFiles.value] : null
    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: selectedProject.value, message: commitMsg.value.trim(), files: fileList })
    })
    const data = await res.json()
    if (data.success) {
      commitMsg.value = ''
      loadGitStatus()
    } else {
      alert(data.error || '提交失败')
    }
  } catch (e) { alert('提交失败: ' + e.message) }
  committing.value = false
}

const loadLog = async () => {
  if (!selectedProject.value) return
  try {
    const res = await fetch(`/api/git/log?project=${encodeURIComponent(selectedProject.value)}`)
    const data = await res.json()
    if (data.success) {
      commitLog.value = data.commits || []
    }
  } catch {}
}

const openHistory = () => {
  showHistory.value = true
  loadLog()
}

const diffMode = ref('unified') // 'unified' | 'split'

// =================== 算法与高亮辅助逻辑 ===================

// HTML 转义
const escapeHtml = (text) => {
  return String(text || "")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 单词/字符级 Token 分割
const tokenize = (str) => {
  return str.match(/[a-zA-Z0-9_]+|[^a-zA-Z0-9_]/g) || []
}

// LCS 词级 Diff 算法
const diffTokens = (oldStr, newStr) => {
  const oldTokens = tokenize(oldStr)
  const newTokens = tokenize(newStr)
  
  const n = oldTokens.length
  const m = newTokens.length
  
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  const oldResult = []
  const newResult = []
  
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      const tok = oldTokens[i - 1]
      oldResult.unshift({ text: tok, type: 'same' })
      newResult.unshift({ text: tok, type: 'same' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newResult.unshift({ text: newTokens[j - 1], type: 'add' })
      j--
    } else {
      oldResult.unshift({ text: oldTokens[i - 1], type: 'remove' })
      i--
    }
  }
  
  return { oldResult, newResult }
}

// 简易正则语法高亮
const highlightCode = (code, ext) => {
  const escaped = escapeHtml(code)
  if (!ext) return escaped
  
  const lowerExt = ext.toLowerCase()
  if (!['js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'css', 'py', 'toml', 'sh', 'bat', 'md'].includes(lowerExt)) {
    return escaped
  }
  
  const placeholders = []
  let working = escaped
  
  let commentRegex = null
  if (['py', 'toml', 'sh', 'yaml'].includes(lowerExt)) {
    commentRegex = /#.*/g
  } else {
    commentRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)/g
  }
  
  working = working.replace(commentRegex, (match) => {
    const id = `___COMMENT_PLACEHOLDER_${placeholders.length}___`
    placeholders.push({ id, content: `<span class="hl-comment">${match}</span>` })
    return id
  })
  
  const stringRegex = /(&quot;[\s\S]*?&quot;|&#039;[\s\S]*?&#039;|`[\s\S]*?`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g
  working = working.replace(stringRegex, (match) => {
    const id = `___STRING_PLACEHOLDER_${placeholders.length}___`
    placeholders.push({ id, content: `<span class="hl-string">${match}</span>` })
    return id
  })
  
  let keywords = []
  if (['js', 'ts', 'jsx', 'tsx', 'vue'].includes(lowerExt)) {
    keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case', 'default', 'class', 'import', 'export', 'from', 'as', 'true', 'false', 'null', 'undefined', 'this', 'new', 'typeof', 'instanceof', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'extends', 'interface', 'type', 'public', 'private', 'protected', 'readonly', 'static', 'get', 'set', 'keyof', 'any', 'void', 'never', 'unknown', 'string', 'number', 'boolean']
  } else if (lowerExt === 'py') {
    keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'import', 'from', 'as', 'True', 'False', 'None', 'try', 'except', 'finally', 'raise', 'assert', 'in', 'is', 'not', 'and', 'or', 'lambda', 'with', 'pass', 'global', 'nonlocal']
  } else if (lowerExt === 'css') {
    keywords = ['@media', '@import', '@keyframes', '@font-face', 'important', 'root']
  } else if (lowerExt === 'toml') {
    keywords = ['true', 'false']
  }
  
  if (keywords.length > 0) {
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
    working = working.replace(kwRegex, '<span class="hl-keyword">$1</span>')
  }
  
  working = working.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')
  
  if (lowerExt === 'css') {
    working = working.replace(/\b(\d+(px|em|rem|%|vh|vw|ms|s|deg))\b/g, '<span class="hl-number">$1</span>')
  }
  
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const p = placeholders[i]
    working = working.replace(p.id, p.content)
  }
  
  return working
}

// 搜索关键字高亮
const highlightSearch = (htmlText, query) => {
  if (!query || !query.trim()) return htmlText
  const escapedQuery = escapeHtml(query.trim())
  const regex = new RegExp(`(<[^>]*>)|(${escapedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  return htmlText.replace(regex, (match, p1, p2) => {
    if (p1) return p1
    if (p2) return `<span class="hl-match">${p2}</span>`
    return match
  })
}

// 侧边栏文件过滤
const filteredFiles = computed(() => {
  if (!fileFilter.value.trim()) return files.value
  const q = fileFilter.value.toLowerCase().trim()
  return files.value.filter(f => f.path.toLowerCase().includes(q))
})

// 应用单个 Hunk 的 Patch
const applyHunkPatch = async (hunk, revert, cached) => {
  if (!selectedProject.value || !selectedFile.value) return
  
  const filePath = selectedFile.value
  let patchText = `diff --git a/${filePath} b/${filePath}\n`
  patchText += `--- a/${filePath}\n`
  patchText += `+++ b/${filePath}\n`
  patchText += `${hunk.header}\n`
  hunk.changes.forEach(c => {
    if (c.type === 'add') {
      patchText += `+${c.content}\n`
    } else if (c.type === 'remove') {
      patchText += `-${c.content}\n`
    } else {
      patchText += ` ${c.content}\n`
    }
  })
  
  try {
    const res = await fetch('/api/git/apply-patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: selectedProject.value,
        patchText,
        revert,
        cached
      })
    })
    const data = await res.json()
    if (data.success) {
      await loadGitStatus()
      if (filePath) {
        await loadDiff(filePath)
      }
    } else {
      alert(data.error || '操作失败')
    }
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

// 解析 Unified Diff 为分栏对比的对齐行数据 (升级版)
const parseSplitDiff = (rawDiff) => {
  const lines = (rawDiff || '').split('\n')
  const hunks = []
  let currentHunk = null

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/)
      if (match) {
        if (currentHunk) hunks.push(currentHunk)
        currentHunk = {
          header: line,
          oldStart: parseInt(match[1]),
          newStart: parseInt(match[3]),
          splitLines: [],
          changes: []
        }
      }
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.splitLines.push({ type: 'add', content: line.substring(1) })
        currentHunk.changes.push({ type: 'add', content: line.substring(1) })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.splitLines.push({ type: 'remove', content: line.substring(1) })
        currentHunk.changes.push({ type: 'remove', content: line.substring(1) })
      } else if (!line.startsWith('---') && !line.startsWith('+++')) {
        const content = line.startsWith(' ') ? line.substring(1) : line
        currentHunk.splitLines.push({ type: 'context', content })
        currentHunk.changes.push({ type: 'context', content })
      }
    }
  }
  if (currentHunk) hunks.push(currentHunk)

  const ext = selectedFile.value ? selectedFile.value.split('.').pop() : ''

  return hunks.map(hunk => {
    const aligned = []
    let leftIdx = hunk.oldStart
    let rightIdx = hunk.newStart

    let i = 0
    const rawLines = hunk.splitLines
    while (i < rawLines.length) {
      const removes = []
      const adds = []

      while (i < rawLines.length && rawLines[i].type === 'remove') {
        removes.push(rawLines[i])
        i++
      }
      while (i < rawLines.length && rawLines[i].type === 'add') {
        adds.push(rawLines[i])
        i++
      }

      if (removes.length > 0 || adds.length > 0) {
        const maxLen = Math.max(removes.length, adds.length)
        for (let k = 0; k < maxLen; k++) {
          const hasLeft = k < removes.length
          const hasRight = k < adds.length
          
          let leftContent = hasLeft ? removes[k].content : ''
          let rightContent = hasRight ? adds[k].content : ''
          
          let leftHtml = ''
          let rightHtml = ''
          
          if (hasLeft && hasRight) {
            // LCS 词级比对
            const { oldResult, newResult } = diffTokens(leftContent, rightContent)
            leftHtml = oldResult.map(tok => {
              const esc = escapeHtml(tok.text)
              return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
            }).join('')
            rightHtml = newResult.map(tok => {
              const esc = escapeHtml(tok.text)
              return tok.type === 'add' ? `<span class="word-add">${esc}</span>` : esc
            }).join('')
          } else {
            if (hasLeft) leftHtml = highlightCode(leftContent, ext)
            if (hasRight) rightHtml = highlightCode(rightContent, ext)
          }

          const leftRow = hasLeft ? {
            type: 'remove',
            content: leftHtml,
            isHtml: true,
            lineNum: leftIdx++
          } : { type: 'empty', content: '', isHtml: false, lineNum: '' }

          const rightRow = hasRight ? {
            type: 'add',
            content: rightHtml,
            isHtml: true,
            lineNum: rightIdx++
          } : { type: 'empty', content: '', isHtml: false, lineNum: '' }

          aligned.push({ left: leftRow, right: rightRow })
        }
      } else {
        const ctx = rawLines[i]
        const ctxHtml = highlightCode(ctx.content, ext)
        aligned.push({
          left: { type: 'context', content: ctxHtml, isHtml: true, lineNum: leftIdx++ },
          right: { type: 'context', content: ctxHtml, isHtml: true, lineNum: rightIdx++ }
        })
        i++
      }
    }
    return {
      header: hunk.header,
      changes: hunk.changes,
      lines: aligned
    }
  })
}

// 处理单栏 Unified Diff (升级版)
const processUnifiedHunks = computed(() => {
  const ext = selectedFile.value ? selectedFile.value.split('.').pop() : ''
  return diffHunks.value.map(hunk => {
    const processedChanges = []
    const changes = hunk.changes
    let i = 0
    while (i < changes.length) {
      const current = changes[i]
      const next = changes[i + 1]
      if (current.type === 'remove' && next && next.type === 'add') {
        const { oldResult, newResult } = diffTokens(current.content, next.content)
        const leftHtml = oldResult.map(tok => {
          const esc = escapeHtml(tok.text)
          return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
        }).join('')
        const rightHtml = newResult.map(tok => {
          const esc = escapeHtml(tok.text)
          return tok.type === 'add' ? `<span class="word-add">${esc}</span>` : esc
        }).join('')
        
        processedChanges.push({ type: 'remove', htmlContent: leftHtml })
        processedChanges.push({ type: 'add', htmlContent: rightHtml })
        i += 2
      } else {
        processedChanges.push({
          type: current.type,
          htmlContent: highlightCode(current.content, ext)
        })
        i++
      }
    }
    return {
      ...hunk,
      processedChanges
    }
  })
})

// 处理原始 raw diff (无 hunk 或 fallback 状态)
const processRawDiffLines = computed(() => {
  const lines = getRawDiffLines()
  const processed = []
  const ext = selectedFile.value ? selectedFile.value.split('.').pop() : ''
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    const isMeta = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index')
    
    if (isMeta) {
      processed.push({ type: 'meta', sign: ' ', htmlContent: escapeHtml(line) })
      i++
    } else if (line.startsWith('-') && !line.startsWith('---') && nextLine && nextLine.startsWith('+') && !nextLine.startsWith('+++')) {
      const { oldResult, newResult } = diffTokens(line.substring(1), nextLine.substring(1))
      const leftHtml = oldResult.map(tok => {
        const esc = escapeHtml(tok.text)
        return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
      }).join('')
      const rightHtml = newResult.map(tok => {
        const esc = escapeHtml(tok.text)
        return tok.type === 'add' ? `<span class="word-add">${esc}</span>` : esc
      }).join('')
      
      processed.push({ type: 'remove', sign: '-', htmlContent: leftHtml })
      processed.push({ type: 'add', sign: '+', htmlContent: rightHtml })
      i += 2
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      processed.push({ type: 'add', sign: '+', htmlContent: highlightCode(line.substring(1), ext) })
      i++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      processed.push({ type: 'remove', sign: '-', htmlContent: highlightCode(line.substring(1), ext) })
      i++
    } else {
      const content = line.startsWith(' ') ? line.substring(1) : line
      processed.push({ type: 'context', sign: ' ', htmlContent: highlightCode(content, ext) })
      i++
    }
  }
  return processed
})

onMounted(loadProjects)
</script>

<template>
  <div class="code-changes">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <select v-model="selectedProject" @change="loadGitStatus" class="select">
          <option value="">选择项目</option>
          <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.name }}</option>
        </select>
        <span v-if="branch" class="branch-tag">🌿 {{ branch }}</span>
        <button class="btn btn-outline btn-sm" @click="loadGitStatus">↻ 刷新</button>
        <button class="btn btn-outline btn-sm" :class="{ active: showStaged }" @click="toggleStaged">
          {{ showStaged ? '📦 暂存区' : '📂 工作区' }}
        </button>
        <button class="btn btn-outline btn-sm" @click="openHistory">📜 历史</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="diff-mode-toggle" v-if="selectedFile">
          <button class="btn btn-outline btn-sm" :class="{ active: diffMode === 'unified' }" @click="diffMode = 'unified'">单栏对比</button>
          <button class="btn btn-outline btn-sm" :class="{ active: diffMode === 'split' }" @click="diffMode = 'split'">分栏对比</button>
        </div>
        <button class="btn btn-outline btn-sm" :disabled="!selectedFile" @click="rollbackFile">↩ 回滚</button>
      </div>
    </div>

    <div class="main-content">
      <!-- 文件列表 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <span>📁 变更文件</span>
          <span class="badge">{{ files.length }}</span>
        </div>
        <div class="sidebar-filter-wrapper">
          <input v-model="fileFilter" class="sidebar-filter-input" placeholder="过滤文件名..." />
        </div>
        <div v-if="filteredFiles.length > 0" class="select-all-bar" @click="selectAllFiles">
          <input type="checkbox" :checked="selectedFiles.size === filteredFiles.length && filteredFiles.length > 0" />
          <span style="font-size:12px;color:var(--text-muted)">全选过滤文件</span>
        </div>
        <div class="file-list">
          <div v-if="!selectedProject" class="empty-sm">选择项目查看变更</div>
          <div v-else-if="filteredFiles.length === 0" class="empty-sm">✅ 没有找到匹配的变更</div>
          <div v-else>
            <div v-for="file in filteredFiles" :key="file.path"
              class="file-item"
              :class="{ active: selectedFile === file.path }"
              @click="loadDiff(file.path)">
              <input type="checkbox" :checked="selectedFiles.has(file.path)" @click.stop="toggleFileSelect(file.path)" />
              <span class="dot" :style="{ background: file.statusColor }"></span>
              <span class="file-name">{{ file.path }}</span>
              <span class="file-status" :style="{ color: file.statusColor }">{{ file.statusText }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Diff 内容 -->
      <div class="content">
        <div class="content-header">
          <span>{{ selectedFile || '选择文件查看 diff' }}</span>
          <div style="display:flex;align-items:center;gap:12px">
            <input v-if="selectedFile" v-model="diffSearchQuery" class="diff-search-input" placeholder="在 diff 中搜索..." />
            <span v-if="selectedFile && showStaged" style="font-size:11px;color:var(--accent-yellow)">暂存区</span>
            <span v-if="selectedFile && diffTruncated" class="diff-warning">已截断</span>
          </div>
        </div>
        <div class="diff-viewer">
          <div v-if="!selectedFile" class="empty">选择文件查看代码变更</div>
          <div v-else-if="diffHunks.length === 0 && !diffRaw" class="empty">{{ diffReason || '没有差异' }}</div>
          <div v-else class="diff-rendered">
            <div v-if="diffReason" class="diff-reason">{{ diffReason }}</div>
            <template v-if="diffHunks.length > 0">
              <!-- Split Mode -->
              <template v-if="diffMode === 'split'">
                <div v-for="(hunk, hi) in parseSplitDiff(diffRaw)" :key="hi" class="hunk">
                  <div class="hunk-header">
                    <span>{{ hunk.header }}</span>
                    <div class="hunk-actions" v-if="selectedFile">
                      <template v-if="!showStaged">
                        <button class="hunk-btn stage" @click.stop="applyHunkPatch(hunk, false, true)">暂存此块</button>
                        <button class="hunk-btn rollback" @click.stop="applyHunkPatch(hunk, true, false)">回滚此块</button>
                      </template>
                      <template v-else>
                        <button class="hunk-btn unstage" @click.stop="applyHunkPatch(hunk, true, true)">取消暂存</button>
                      </template>
                    </div>
                  </div>
                  <div class="split-diff-container">
                    <!-- 左侧 旧代码 -->
                    <div class="split-left-pane">
                      <div v-for="(row, ri) in hunk.lines" :key="ri" 
                        class="diff-line split-line-row" 
                        :class="row.left.type === 'remove' ? 'diff-remove' : row.left.type === 'context' ? 'diff-context' : 'diff-empty-line'">
                        <span class="diff-line-no">{{ row.left.lineNum }}</span>
                        <span class="diff-sign">{{ row.left.type === 'remove' ? '-' : ' ' }}</span>
                        <pre class="diff-text"><code v-html="row.left.isHtml ? highlightSearch(row.left.content, diffSearchQuery) : highlightSearch(escapeHtml(row.left.content), diffSearchQuery)"></code></pre>
                      </div>
                    </div>
                    <!-- 右侧 新代码 -->
                    <div class="split-right-pane">
                      <div v-for="(row, ri) in hunk.lines" :key="ri" 
                        class="diff-line split-line-row" 
                        :class="row.right.type === 'add' ? 'diff-add' : row.right.type === 'context' ? 'diff-context' : 'diff-empty-line'">
                        <span class="diff-line-no">{{ row.right.lineNum }}</span>
                        <span class="diff-sign">{{ row.right.type === 'add' ? '+' : ' ' }}</span>
                        <pre class="diff-text"><code v-html="row.right.isHtml ? highlightSearch(row.right.content, diffSearchQuery) : highlightSearch(escapeHtml(row.right.content), diffSearchQuery)"></code></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- Unified Mode -->
              <template v-else>
                <div v-for="(hunk, hi) in processUnifiedHunks" :key="hi" class="hunk">
                  <div class="hunk-header">
                    <span>@@ -{{ hunk.oldStart }},{{ hunk.oldLines }} +{{ hunk.newStart }},{{ hunk.newLines }} @@ {{ hunk.context }}</span>
                    <div class="hunk-actions" v-if="selectedFile">
                      <template v-if="!showStaged">
                        <button class="hunk-btn stage" @click.stop="applyHunkPatch(hunk, false, true)">暂存此块</button>
                        <button class="hunk-btn rollback" @click.stop="applyHunkPatch(hunk, true, false)">回滚此块</button>
                      </template>
                      <template v-else>
                        <button class="hunk-btn unstage" @click.stop="applyHunkPatch(hunk, true, true)">取消暂存</button>
                      </template>
                    </div>
                  </div>
                  <div v-for="(line, li) in hunk.processedChanges" :key="li"
                    class="diff-line"
                    :class="{ 'diff-add': line.type === 'add', 'diff-remove': line.type === 'remove', 'diff-context': line.type === 'context' }">
                    <span class="diff-sign">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}</span>
                    <span class="diff-text" v-html="highlightSearch(line.htmlContent, diffSearchQuery)"></span>
                  </div>
                </div>
              </template>
            </template>
            <template v-else>
              <div v-for="(line, li) in processRawDiffLines" :key="li"
                class="diff-line"
                :class="{ 'diff-add': line.type === 'add', 'diff-remove': line.type === 'remove', 'diff-context': line.type === 'context', 'diff-meta': line.type === 'meta' }">
                <span class="diff-sign">{{ line.sign }}</span>
                <span class="diff-text" v-html="highlightSearch(line.htmlContent, diffSearchQuery)"></span>
              </div>
            </template>
          </div>
        </div>

        <!-- 提交栏 -->
        <div v-if="files.length > 0" class="commit-bar">
          <input v-model="commitMsg" class="commit-input" placeholder="提交信息..." @keydown.enter="commitChanges" />
          <button class="btn btn-primary btn-sm" :disabled="committing || !commitMsg.trim()" @click="commitChanges">
            {{ committing ? '提交中...' : '✓ 提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 历史弹窗 -->
    <div v-if="showHistory" class="modal-overlay" @click.self="showHistory = false">
      <div class="modal" style="max-width:700px">
        <div class="modal-header">
          <h3>📜 提交历史</h3>
          <button class="close-btn" @click="showHistory = false">&times;</button>
        </div>
        <div class="log-list">
          <div v-if="commitLog.length === 0" class="empty-sm">没有提交记录</div>
          <div v-for="c in commitLog" :key="c.hash" class="log-item">
            <div class="log-hash">{{ c.shortHash }}</div>
            <div class="log-msg">{{ c.message }}</div>
            <div class="log-meta">{{ c.author }} · {{ new Date(c.timestamp).toLocaleString('zh-CN') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-changes { display: flex; flex-direction: column; height: 100%; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 8px; }
.select { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); font-size: 13px; outline: none; }
.branch-tag { font-size: 11px; padding: 3px 8px; background: rgba(16, 185, 129, 0.08); color: var(--accent-green); border-radius: 6px; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-outline.active { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.main-content { display: flex; flex: 1; overflow: hidden; }
.sidebar { width: 300px; background: rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; }
.sidebar-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 14px; font-weight: 600; color: var(--text-secondary); }
.sidebar-filter-wrapper { padding: 8px 16px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.sidebar-filter-input { width: 100%; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.08); font-size: 12px; outline: none; background: rgba(255, 255, 255, 0.6); }
.sidebar-filter-input:focus { border-color: var(--accent-blue); }
[data-theme="dark"] .sidebar-filter-input { background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
.select-all-bar { display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); cursor: pointer; }
.badge { font-size: 10px; padding: 2px 6px; background: rgba(0, 0, 0, 0.04); border-radius: 4px; }
.file-list { flex: 1; overflow-y: auto; }
.file-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; cursor: pointer; border-left: 3px solid transparent; transition: all 0.2s; }
.file-item:hover { background: rgba(59, 130, 246, 0.04); }
.file-item.active { background: rgba(59, 130, 246, 0.08); border-left-color: var(--accent-blue); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.file-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
.file-status { font-size: 11px; }
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content-header { padding: 12px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 14px; font-weight: 600; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; }
.diff-search-input { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.08); font-size: 12px; outline: none; background: rgba(255, 255, 255, 0.6); width: 180px; }
.diff-search-input:focus { border-color: var(--accent-blue); }
[data-theme="dark"] .diff-search-input { background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
.diff-warning { font-size: 11px; color: #f59e0b; margin-left: 8px; }
.diff-viewer { flex: 1; overflow: auto; }
.diff-rendered { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; }
.diff-reason { padding: 8px 16px; color: #b45309; background: rgba(245, 158, 11, 0.08); border-bottom: 1px solid rgba(245, 158, 11, 0.16); }
.hunk { margin-bottom: 4px; }
.hunk-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 16px; background: rgba(59, 130, 246, 0.06); color: var(--accent-blue); font-size: 11px; }
.hunk-actions { display: flex; gap: 6px; }
.hunk-btn { border: none; padding: 2px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500; }
.hunk-btn.stage { background: rgba(16, 185, 129, 0.15); color: #059669; }
.hunk-btn.stage:hover { background: #10b981; color: white; }
.hunk-btn.rollback { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.hunk-btn.rollback:hover { background: #ef4444; color: white; }
.hunk-btn.unstage { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.hunk-btn.unstage:hover { background: #f59e0b; color: white; }
.diff-line { display: flex; padding: 0 16px; }
.diff-sign { width: 16px; flex-shrink: 0; text-align: center; user-select: none; }
.diff-text { flex: 1; white-space: pre-wrap; word-break: break-all; }
.diff-add { background: rgba(16, 185, 129, 0.08); color: #065f46; }
.diff-remove { background: rgba(239, 68, 68, 0.08); color: #991b1b; }
.diff-context { color: var(--text-muted); }
.diff-meta { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); }
.empty-sm { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
.commit-bar { display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid rgba(0, 0, 0, 0.05); background: rgba(255, 255, 255, 0.45); }
.commit-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); font-size: 13px; outline: none; }
.commit-input:focus { border-color: var(--accent-blue); }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; width: 90%; max-width: 700px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal::before, .modal::after { content: ''; position: absolute; width: 10px; height: 10px; border: 2px solid rgba(59, 130, 246, 0.45); pointer-events: none; }
.modal::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.modal::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.modal-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
.close-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0, 0, 0, 0.02); color: var(--text-secondary); cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.log-list { flex: 1; overflow-y: auto; padding: 12px; }
.log-item { display: flex; align-items: baseline; gap: 12px; padding: 10px 12px; border-radius: 8px; transition: background 0.2s; }
.log-item:hover { background: rgba(59, 130, 246, 0.04); }
.log-hash { font-family: monospace; font-size: 12px; color: var(--accent-blue); flex-shrink: 0; }
.log-msg { flex: 1; font-size: 13px; color: var(--text-primary); }
.log-meta { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
@media (max-width: 768px) {
  .main-content { flex-direction: column; }
  .sidebar { width: 100% !important; min-width: 0 !important; max-height: 35vh; border-right: none !important; border-bottom: 1px solid rgba(0, 0, 0, 0.04); }
  .modal { width: 100% !important; max-height: 90vh; border-radius: 16px 16px 0 0 !important; }
}

.split-diff-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  background: var(--bg-primary);
}
.split-left-pane {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}
.split-right-pane {
  overflow-x: auto;
}
.split-line-row {
  display: flex;
  align-items: center;
  min-height: 22px;
  padding: 0 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}
.split-line-row .diff-line-no {
  width: 45px;
  text-align: right;
  padding-right: 8px;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  margin-right: 8px;
  user-select: none;
  color: var(--text-muted);
  opacity: 0.6;
}
.split-line-row .diff-sign {
  width: 14px;
  text-align: center;
  user-select: none;
  margin-right: 4px;
  font-weight: bold;
}
.split-line-row .diff-text {
  flex: 1;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  overflow: visible;
  white-space: pre;
}
.split-line-row .diff-text code {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  padding: 0;
  color: inherit;
}
.diff-empty-line {
  background: rgba(0, 0, 0, 0.02);
  min-height: 22px;
}
[data-theme="dark"] .diff-empty-line {
  background: rgba(255, 255, 255, 0.02) !important;
}
[data-theme="dark"] .split-diff-container {
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
}
[data-theme="dark"] .split-left-pane {
  border-right-color: rgba(255, 255, 255, 0.08) !important;
}

/* 单词级比对高亮背景色 */
.word-remove { background-color: rgba(239, 68, 68, 0.28); text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
.word-add { background-color: rgba(16, 185, 129, 0.28); font-weight: bold; border-radius: 2px; padding: 0 1px; }

/* 语法高亮颜色 */
.hl-comment { color: #6b7280; font-style: italic; }
.hl-string { color: #0d9488; }
.hl-keyword { color: #2563eb; font-weight: bold; }
.hl-number { color: #ea580c; }

[data-theme="dark"] .hl-comment { color: #9ca3af; }
[data-theme="dark"] .hl-string { color: #2dd4bf; }
[data-theme="dark"] .hl-keyword { color: #60a5fa; }
[data-theme="dark"] .hl-number { color: #f97316; }

/* 搜索匹配高亮 */
.hl-match { background-color: rgba(234, 179, 8, 0.4); border-bottom: 2px solid #eab308; color: inherit; font-weight: bold; }
</style>

