export const escapeHtml = text => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const tokenize = value => String(value || '').match(/[a-zA-Z0-9_]+|[^a-zA-Z0-9_]/g) || []

const tokenDiff = (oldValue, newValue) => {
  const oldTokens = tokenize(oldValue)
  const newTokens = tokenize(newValue)
  if (oldTokens.length * newTokens.length > 30_000) {
    return { oldHtml: escapeHtml(oldValue), newHtml: escapeHtml(newValue) }
  }
  const matrix = Array.from({ length: oldTokens.length + 1 }, () => Array(newTokens.length + 1).fill(0))
  for (let i = 1; i <= oldTokens.length; i += 1) {
    for (let j = 1; j <= newTokens.length; j += 1) {
      matrix[i][j] = oldTokens[i - 1] === newTokens[j - 1]
        ? matrix[i - 1][j - 1] + 1
        : Math.max(matrix[i - 1][j], matrix[i][j - 1])
    }
  }
  const oldResult = []
  const newResult = []
  let i = oldTokens.length
  let j = newTokens.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      oldResult.unshift(escapeHtml(oldTokens[i - 1]))
      newResult.unshift(escapeHtml(newTokens[j - 1]))
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      newResult.unshift(`<span class="word-add">${escapeHtml(newTokens[j - 1])}</span>`)
      j -= 1
    } else {
      oldResult.unshift(`<span class="word-remove">${escapeHtml(oldTokens[i - 1])}</span>`)
      i -= 1
    }
  }
  return { oldHtml: oldResult.join(''), newHtml: newResult.join('') }
}

export const highlightCode = (value, extension = '') => {
  let html = escapeHtml(value)
  if (!['js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'css', 'py', 'md', 'sh', 'toml', 'yaml', 'yml'].includes(extension.toLowerCase())) return html
  const placeholders = []
  html = html.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g, match => {
    const token = `___STRING_${placeholders.length}___`
    placeholders.push(`<span class="hl-string">${match}</span>`)
    return token
  })
  html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|interface|type|def|True|False|None|null|undefined|boolean|string|number)\b/g, '<span class="hl-keyword">$1</span>')
  html = html.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')
  placeholders.forEach((replacement, index) => { html = html.replace(`___STRING_${index}___`, replacement) })
  return html
}

export const highlightSearch = (html, query) => {
  const value = String(query || '').trim()
  if (!value) return html
  const safe = escapeHtml(value).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  return String(html || '').replace(new RegExp(`(<[^>]*>)|(${safe})`, 'gi'), (match, tag, hit) => tag || `<mark class="diff-match">${hit}</mark>`)
}

export const buildUnifiedHunks = (hunks, filePath, compact = false) => {
  const extension = String(filePath || '').split('.').pop() || ''
  return (hunks || []).map(hunk => {
    let oldLine = Number(hunk.oldStart || 1)
    let newLine = Number(hunk.newStart || 1)
    const rows = []
    const changes = hunk.changes || []
    for (let index = 0; index < changes.length; index += 1) {
      const change = changes[index]
      const next = changes[index + 1]
      if (change.type === 'remove' && next?.type === 'add') {
        const pair = tokenDiff(change.content, next.content)
        rows.push({ type: 'remove', oldLine: oldLine++, newLine: '', html: pair.oldHtml })
        rows.push({ type: 'add', oldLine: '', newLine: newLine++, html: pair.newHtml })
        index += 1
        continue
      }
      if (change.type === 'remove') rows.push({ type: 'remove', oldLine: oldLine++, newLine: '', html: highlightCode(change.content, extension) })
      else if (change.type === 'add') rows.push({ type: 'add', oldLine: '', newLine: newLine++, html: highlightCode(change.content, extension) })
      else {
        const row = { type: 'context', oldLine: oldLine++, newLine: newLine++, html: highlightCode(change.content, extension) }
        if (!compact) rows.push(row)
      }
    }
    return { ...hunk, rows }
  })
}

export const buildRawRows = (raw, filePath, compact = false) => {
  const extension = String(filePath || '').split('.').pop() || ''
  return String(raw || '').split('\n').map(line => {
    if (/^(diff|index|---|\+\+\+|@@)/.test(line)) return { type: 'meta', sign: ' ', html: escapeHtml(line) }
    if (line.startsWith('+')) return { type: 'add', sign: '+', html: highlightCode(line.slice(1), extension) }
    if (line.startsWith('-')) return { type: 'remove', sign: '-', html: highlightCode(line.slice(1), extension) }
    return { type: 'context', sign: ' ', html: highlightCode(line.startsWith(' ') ? line.slice(1) : line, extension) }
  }).filter(row => !compact || row.type !== 'context')
}

export const buildSplitHunks = (raw, filePath, compact = false) => {
  const extension = String(filePath || '').split('.').pop() || ''
  const hunks = []
  let current = null
  for (const line of String(raw || '').split('\n')) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (current) hunks.push(current)
      current = { header: line, oldLine: Number(match?.[1] || 1), newLine: Number(match?.[2] || 1), changes: [] }
    } else if (current && !/^(diff|index|---|\+\+\+)/.test(line)) {
      current.changes.push({ type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context', content: line.startsWith(' ') || line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line })
    }
  }
  if (current) hunks.push(current)
  return hunks.map(hunk => {
    const rows = []
    let oldLine = hunk.oldLine
    let newLine = hunk.newLine
    let index = 0
    while (index < hunk.changes.length) {
      const removed = []
      const added = []
      while (hunk.changes[index]?.type === 'remove') removed.push(hunk.changes[index++])
      while (hunk.changes[index]?.type === 'add') added.push(hunk.changes[index++])
      if (removed.length || added.length) {
        const length = Math.max(removed.length, added.length)
        for (let rowIndex = 0; rowIndex < length; rowIndex += 1) {
          const left = removed[rowIndex]
          const right = added[rowIndex]
          const pair = left && right ? tokenDiff(left.content, right.content) : null
          rows.push({
            left: left ? { type: 'remove', line: oldLine++, html: pair?.oldHtml || highlightCode(left.content, extension) } : null,
            right: right ? { type: 'add', line: newLine++, html: pair?.newHtml || highlightCode(right.content, extension) } : null,
          })
        }
        continue
      }
      const context = hunk.changes[index++]
      if (!context) continue
      const html = highlightCode(context.content, extension)
      const row = { left: { type: 'context', line: oldLine++, html }, right: { type: 'context', line: newLine++, html } }
      if (!compact) rows.push(row)
    }
    return { ...hunk, rows }
  })
}
