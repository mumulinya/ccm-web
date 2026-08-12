const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false || data?.error) throw new Error(data?.error || `请求失败 (${response.status})`)
  return data?.result || data
}

export const openTemporaryAside = ({ scope, scopeId = '', exactSessionId, question = '', submit = false }) => {
  window.dispatchEvent(new CustomEvent('ccm:conversation-aside', {
    detail: { identityKey: `${scope}:${scopeId || (scope === 'global' ? 'global' : '')}:${exactSessionId}`, question, submit },
  }))
}

export const consumeAsideCommand = (text, identity) => {
  const match = String(text || '').match(/^\/btw(?:\s+([\s\S]*))?$/i)
  if (!match) return false
  openTemporaryAside({ ...identity, question: match[1] || '', submit: !!String(match[1] || '').trim() })
  return true
}

const ACTIONS = [
  { value: 'both', label: '恢复代码和会话', detail: '回到本轮开始前，代码与对话一起恢复' },
  { value: 'code', label: '仅恢复代码', detail: '保留聊天记录，只撤销本轮代码交付' },
  { value: 'conversation', label: '仅恢复会话', detail: '代码保持不变，恢复对话边界' },
  { value: 'summarize_from', label: '从这里开始总结', detail: '保留之前内容，将这里到末尾压缩为摘要' },
  { value: 'summarize_up_to', label: '总结到这里', detail: '将开头到这里压缩为摘要，保留之后内容' },
]

const chooseTurnAction = () => new Promise(resolve => {
  const host = document.createElement('div')
  host.className = 'ccm-turn-action-backdrop'
  host.innerHTML = `<section class="ccm-turn-action-panel" role="dialog" aria-modal="true" aria-labelledby="ccm-turn-action-title">
    <header><strong id="ccm-turn-action-title">选择会话操作</strong><span>原始历史会保留，可稍后恢复</span></header>
    <div>${ACTIONS.map(item => `<button type="button" data-action="${item.value}"><strong>${item.label}</strong><small>${item.detail}</small></button>`).join('')}</div>
    <button type="button" class="ccm-turn-action-cancel">取消</button>
  </section>`
  if (!document.getElementById('ccm-turn-action-style')) {
    const style = document.createElement('style')
    style.id = 'ccm-turn-action-style'
    style.textContent = `.ccm-turn-action-backdrop{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.36);backdrop-filter:blur(2px)}.ccm-turn-action-panel{box-sizing:border-box;width:min(430px,100%);padding:14px;border:1px solid var(--border-color);border-radius:15px;background:var(--surface);box-shadow:0 24px 70px rgba(15,23,42,.24)}.ccm-turn-action-panel header{display:grid;gap:3px;margin:2px 3px 12px}.ccm-turn-action-panel header strong{font-size:15px}.ccm-turn-action-panel header span,.ccm-turn-action-panel small{color:var(--text-muted);font-size:11px}.ccm-turn-action-panel>div{display:grid;gap:5px}.ccm-turn-action-panel button{font:inherit}.ccm-turn-action-panel [data-action]{display:grid;gap:3px;width:100%;padding:10px 11px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.ccm-turn-action-panel [data-action]:hover,.ccm-turn-action-panel [data-action]:focus-visible{border-color:color-mix(in srgb,var(--accent-blue) 36%,var(--border-color));background:var(--bg-secondary);outline:none}.ccm-turn-action-panel [data-action] strong{font-size:13px}.ccm-turn-action-cancel{width:100%;margin-top:8px;padding:8px;border:0;border-top:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer}`
    document.head.appendChild(style)
  }
  const finish = value => { document.removeEventListener('keydown', onKey); host.remove(); resolve(value) }
  const onKey = event => { if (event.key === 'Escape') finish('') }
  host.addEventListener('click', event => {
    const action = event.target.closest?.('[data-action]')?.dataset?.action
    if (action) finish(action)
    else if (event.target === host || event.target.closest?.('.ccm-turn-action-cancel')) finish('')
  })
  document.addEventListener('keydown', onKey)
  document.body.appendChild(host)
  host.querySelector('[data-action]')?.focus()
})

async function summarizeConversation({ identity, action }) {
  const preview = await requestJson('/api/conversations/summarize/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, action }),
  })
  const label = action === 'summarize_from' ? '从这里开始总结' : '总结到这里'
  if (!window.confirm(`${label}？\n\n将压缩 ${preview.count} 条消息。原始内容不会删除，可在历史分支中恢复。`)) return null
  const receipt = await requestJson('/api/conversations/summarize/execute', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ...identity,
      action,
      revision: preview.revision,
      generation: preview.generation,
      conversationChecksum: preview.conversationChecksum,
      previewToken: preview.previewToken,
    }),
  })
  window.dispatchEvent(new CustomEvent('ccm:conversation-history-branches-changed'))
  return receipt
}

export async function rewindConversationTurn({ scope, scopeId = '', exactSessionId, anchorMessageId, mode = '' }) {
  if (!mode) {
    mode = await chooseTurnAction()
    if (!mode) return null
  }
  const identity = { scope, scopeId: scopeId || (scope === 'global' ? 'global' : ''), exactSessionId, anchorMessageId }
  if (mode === 'summarize_from' || mode === 'summarize_up_to') return summarizeConversation({ identity, action: mode })
  identity.mode = mode
  const preview = await requestJson('/api/conversations/rewind/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identity),
  })
  if (preview.conflicts?.length) throw new Error(`有 ${preview.conflicts.length} 个文件已被后续修改，未执行任何恢复`)
  if (!preview.canExecute) throw new Error('当前回退点包含不可用的历史文件检查点')
  const codeFiles = (preview.codePreviews || []).reduce((count, item) => count + (item.files?.length || 0), 0)
  const modeLabel = mode === 'code' ? '只恢复代码' : mode === 'conversation' ? '只恢复会话' : '恢复代码和会话'
  const confirmed = window.confirm(`${modeLabel}到本轮开始前？\n\n将移出 ${preview.removeMessages} 条消息${mode !== 'conversation' ? `，恢复 ${codeFiles} 个文件` : ''}。后续消息会保存在历史分支中。`)
  if (!confirmed) return null
  const receipt = await requestJson('/api/conversations/rewind/execute', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      ...identity,
      revision: preview.revision,
      generation: preview.generation,
      conversationChecksum: preview.conversationChecksum,
      planChecksum: preview.planChecksum,
    }),
  })
  window.dispatchEvent(new CustomEvent('ccm:conversation-history-branches-changed'))
  return receipt
}
