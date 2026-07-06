<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const searchQuery = ref('')

watch(() => props.visible, (visible) => {
  if (!visible) searchQuery.value = ''
})

const escapeHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const tokenize = (str) => str.match(/[a-zA-Z0-9_]+|[^a-zA-Z0-9_]/g) || []

const diffTokens = (oldStr, newStr) => {
  const oldTokens = tokenize(oldStr)
  const newTokens = tokenize(newStr)
  const n = oldTokens.length
  const m = newTokens.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = oldTokens[i - 1] === newTokens[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const oldResult = []
  const newResult = []
  let i = n
  let j = m
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

const highlightCode = (code, ext) => {
  const escaped = escapeHtml(code)
  if (!ext) return escaped

  const lowerExt = ext.toLowerCase()
  if (!['js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'css', 'py', 'toml', 'sh', 'bat', 'md', 'yaml'].includes(lowerExt)) {
    return escaped
  }

  const placeholders = []
  let working = escaped
  const commentRegex = ['py', 'toml', 'sh', 'yaml'].includes(lowerExt)
    ? /#.*/g
    : /(\/\/.*|\/\*[\s\S]*?\*\/)/g

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

const unifiedLines = computed(() => {
  const rawDiff = props.file?.diff?.diff || ''
  const lines = rawDiff ? rawDiff.split('\n') : []
  const processed = []
  const ext = props.file?.path ? props.file.path.split('.').pop() : ''

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
      const leftHtml = oldResult.map((tok) => {
        const esc = escapeHtml(tok.text)
        return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
      }).join('')
      const rightHtml = newResult.map((tok) => {
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
</script>

<template>
  <div v-if="visible" class="modal-overlay diff-overlay" @click.self="emit('close')">
    <div class="modal diff-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <div class="diff-header">
        <div>
          <h3>{{ file?.path }}</h3>
          <div class="diff-sub">
            <span :style="{ color: file?.statusColor }">{{ file?.statusText }}</span>
            <span v-if="file?.diff?.available">+{{ file?.diff?.additions || 0 }} -{{ file?.diff?.deletions || 0 }}</span>
            <span v-if="file?.diff?.truncated">已截断</span>
          </div>
        </div>
        <input v-if="file?.diff?.available" v-model="searchQuery" class="diff-search-input" placeholder="在 diff 中搜索..." />
      </div>
      <div v-if="file?.diff?.truncated" class="diff-note">
        文件较大，当前只展示前半部分可读差异。
      </div>
      <div v-if="file?.diff?.available" class="diff-viewer">
        <div
          v-for="(line, index) in unifiedLines"
          :key="index"
          class="diff-line"
          :class="[`diff-${line.type}`, line.type]"
        >
          <span class="diff-sign">{{ line.sign }}</span>
          <span class="diff-text" v-html="highlightSearch(line.htmlContent, searchQuery)"></span>
        </div>
      </div>
      <div v-else class="diff-empty">
        {{ file?.diff?.reason || '没有可展示的文本差异' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-overlay {
  padding: 24px;
  background: rgba(15, 23, 42, 0.18);
}

.diff-modal {
  position: relative;
  width: min(1100px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.5);
}

.diff-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  word-break: break-all;
}

.diff-sub {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.diff-note {
  padding: 8px 18px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  border-bottom: 1px solid rgba(251, 191, 36, 0.16);
  font-size: 12px;
}

.diff-viewer {
  flex: 1;
  overflow: auto;
  background: rgba(15, 23, 42, 0.95);
  padding: 10px 0;
}

.diff-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 20px;
  font-family: 'JetBrains Mono', Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
}

.diff-line.add,
.diff-line.diff-add {
  background: rgba(34, 197, 94, 0.12);
  color: #bbf7d0;
}

.diff-line.remove,
.diff-line.diff-remove {
  background: rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.diff-line.meta,
.diff-line.diff-meta {
  background: rgba(59, 130, 246, 0.06);
  color: #7dd3fc;
}

.diff-line.context,
.diff-line.diff-context {
  color: rgba(255, 255, 255, 0.7);
}

.diff-sign {
  padding-right: 12px;
  color: rgba(148, 163, 184, 0.72);
  text-align: right;
  user-select: none;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
}

.diff-text {
  padding: 0 14px;
  overflow: visible;
}

.diff-empty {
  padding: 56px 24px;
  color: var(--text-muted);
  text-align: center;
}

.diff-search-input {
  width: 180px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 12px;
  outline: none;
  background: rgba(255, 255, 255, 0.6);
}

.diff-search-input:focus {
  border-color: var(--accent-blue);
}

[data-theme="dark"] .diff-modal {
  background: rgba(15, 23, 42, 0.96) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .diff-header {
  background: rgba(15, 23, 42, 0.82);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .diff-search-input {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

:deep(.word-remove) {
  background-color: rgba(239, 68, 68, 0.28);
  text-decoration: line-through;
  border-radius: 2px;
  padding: 0 1px;
}

:deep(.word-add) {
  background-color: rgba(16, 185, 129, 0.28);
  font-weight: bold;
  border-radius: 2px;
  padding: 0 1px;
}

:deep(.hl-comment) {
  color: #9ca3af;
  font-style: italic;
}

:deep(.hl-string) {
  color: #2dd4bf;
}

:deep(.hl-keyword) {
  color: #60a5fa;
  font-weight: bold;
}

:deep(.hl-number) {
  color: #f97316;
}

:deep(.hl-match) {
  background-color: rgba(234, 179, 8, 0.4);
  border-bottom: 2px solid #eab308;
  color: inherit;
  font-weight: bold;
}
</style>
