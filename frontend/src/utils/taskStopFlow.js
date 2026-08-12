import { resolveTaskMutationGuard, taskMutationGuardFromSource } from './taskMutationGuard.js'

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error || `操作失败 (${response.status})`)
    error.code = payload?.code || ''
    error.status = response.status
    throw error
  }
  return payload
}

const postJson = (url, body) => requestJson(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
})

const ensureStyles = () => {
  if (document.getElementById('ccm-task-stop-dialog-styles')) return
  const style = document.createElement('style')
  style.id = 'ccm-task-stop-dialog-styles'
  style.textContent = `
    .task-stop-overlay{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.46);backdrop-filter:blur(2px)}
    .task-stop-dialog{width:min(520px,100%);overflow:hidden;border:1px solid var(--border-color,#d8dee8);border-radius:12px;background:var(--surface,#fff);box-shadow:0 24px 70px rgba(15,23,42,.28);font-family:inherit;color:var(--text-primary,#0f172a)}
    .task-stop-head{display:flex;gap:12px;padding:18px 18px 14px;border-bottom:1px solid var(--border-color,#e2e8f0)}.task-stop-icon{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border-radius:9px;background:#fef2f2;color:#dc2626;font-size:18px}.task-stop-head h2{margin:0;font-size:16px}.task-stop-head p{margin:4px 0 0;color:var(--text-secondary,#475569);font-size:12px;line-height:1.5}
    .task-stop-body{display:grid;gap:13px;padding:16px 18px}.task-stop-impact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.task-stop-impact span{padding:8px 9px;border:1px solid var(--border-color,#e2e8f0);border-radius:7px;background:var(--panel-muted,#f8fafc);color:var(--text-secondary,#475569);font-size:11px}.task-stop-impact strong{display:block;margin-top:2px;color:var(--text-primary,#0f172a);font-size:13px}
    .task-stop-scope{display:grid;gap:7px}.task-stop-scope label{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;padding:9px 10px;border:1px solid var(--border-color,#e2e8f0);border-radius:8px;cursor:pointer}.task-stop-scope label:has(input:checked){border-color:#ef4444;background:#fef2f2}.task-stop-scope strong,.task-stop-scope small{display:block}.task-stop-scope strong{font-size:12px}.task-stop-scope small{margin-top:2px;color:var(--text-muted,#64748b);font-size:10.5px;line-height:1.4}.task-stop-note{margin:0;color:var(--text-muted,#64748b);font-size:11px;line-height:1.55}
    .task-stop-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--border-color,#e2e8f0)}.task-stop-actions button{min-height:34px;padding:7px 13px;border:1px solid var(--border-color,#d8dee8);border-radius:7px;background:var(--surface,#fff);color:var(--text-secondary,#475569);font:700 12px inherit;cursor:pointer}.task-stop-actions button.confirm{border-color:#dc2626;background:#dc2626;color:#fff}
    @media(max-width:600px){.task-stop-overlay{align-items:end;padding:0}.task-stop-dialog{width:100%;border-radius:12px 12px 0 0}.task-stop-impact{grid-template-columns:1fr 1fr}}
  `
  document.head.appendChild(style)
}

const impactRow = (container, label, value) => {
  const item = document.createElement('span')
  item.append(document.createTextNode(label))
  const strong = document.createElement('strong')
  strong.textContent = value
  item.appendChild(strong)
  container.appendChild(item)
}

export const showTaskStopDialog = preview => new Promise(resolve => {
  ensureStyles()
  const overlay = document.createElement('div')
  overlay.className = 'task-stop-overlay'
  overlay.setAttribute('role', 'presentation')
  const dialog = document.createElement('section')
  dialog.className = 'task-stop-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', '停止任务')

  const head = document.createElement('header')
  head.className = 'task-stop-head'
  const icon = document.createElement('span')
  icon.className = 'task-stop-icon'
  icon.textContent = '■'
  const copy = document.createElement('div')
  const title = document.createElement('h2')
  title.textContent = '停止任务'
  const subtitle = document.createElement('p')
  subtitle.textContent = `“${preview?.title || '当前任务'}”将停止执行，历史记录和恢复检查点会保留。`
  copy.append(title, subtitle)
  head.append(icon, copy)

  const body = document.createElement('div')
  body.className = 'task-stop-body'
  const impact = document.createElement('div')
  impact.className = 'task-stop-impact'
  const detail = preview?.impact || {}
  impactRow(impact, '正在运行的 Agent', `${detail.activeAgentCount || 0} 个`)
  impactRow(impact, '排队任务', `${detail.queuedTaskCount || 0} 个`)
  impactRow(impact, '受影响子任务', `${detail.childTaskCount || 0} 个`)
  impactRow(impact, '隔离工作区', `${detail.worktreeCount || 0} 个`)
  body.appendChild(impact)

  const scope = document.createElement('div')
  scope.className = 'task-stop-scope'
  if ((detail.childTaskCount || 0) > 0) {
    const choices = [
      { value: 'descendants', title: `停止主任务和 ${detail.childTaskCount} 个子任务`, hint: '推荐。终止整条任务链，避免子 Agent 继续写入。' },
      { value: 'task_only', title: '仅停止主任务', hint: '子任务继续运行，适合只结束上层跟进。' },
    ]
    for (const choice of choices) {
      const label = document.createElement('label')
      const input = document.createElement('input')
      input.type = 'radio'; input.name = 'task-stop-cascade'; input.value = choice.value
      input.checked = choice.value === (preview?.recommendedCascade || preview?.cascade)
      const text = document.createElement('span')
      const strong = document.createElement('strong'); strong.textContent = choice.title
      const small = document.createElement('small'); small.textContent = choice.hint
      text.append(strong, small); label.append(input, text); scope.appendChild(label)
    }
    body.appendChild(scope)
  }
  const note = document.createElement('p')
  note.className = 'task-stop-note'
  note.textContent = preview?.canUndo
    ? `该任务尚未运行，停止后 ${preview.undoWindowSeconds || 10} 秒内可以撤销。`
    : '运行中的任务会先安全停止 Agent，再收口工作区；代码检查点和任务回放不会删除。'
  body.appendChild(note)

  const actions = document.createElement('footer')
  actions.className = 'task-stop-actions'
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '返回'
  const confirm = document.createElement('button'); confirm.type = 'button'; confirm.className = 'confirm'; confirm.textContent = '停止任务'
  actions.append(cancel, confirm)
  dialog.append(head, body, actions); overlay.appendChild(dialog); document.body.appendChild(overlay)

  const finish = value => { overlay.remove(); resolve(value) }
  cancel.onclick = () => finish(null)
  confirm.onclick = () => finish({ cascade: scope.querySelector('input:checked')?.value || preview?.cascade || 'task_only' })
  overlay.onclick = event => { if (event.target === overlay) finish(null) }
  overlay.onkeydown = event => { if (event.key === 'Escape') finish(null) }
  overlay.tabIndex = -1; overlay.focus(); confirm.focus()
})

const previewTaskStop = async (taskId, source, cascade = '') => {
  const guard = await resolveTaskMutationGuard(taskId, source)
  const payload = await postJson('/api/tasks/cancel/preview', { task_id: taskId, cascade, ...guard })
  return payload.preview
}

export const stopTaskWithPreview = async (task, options = {}) => {
  const taskId = String(task?.id || task?.taskId || task?.task_id || '')
  if (!taskId) throw new Error('当前任务没有可停止的任务 ID')
  let source = task
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let preview
    try {
      preview = await previewTaskStop(taskId, source)
    } catch (error) {
      if (attempt === 0 && (error.status === 409 || /CONFLICT/.test(error.code || ''))) {
        options.onConflict?.()
        source = {}
        continue
      }
      throw error
    }
    const choice = await showTaskStopDialog(preview)
    if (!choice) return null
    const finalPreview = choice.cascade === preview.cascade ? preview : await previewTaskStop(taskId, source, choice.cascade)
    try {
      return await postJson('/api/tasks/cancel', {
        task_id: taskId,
        cascade: choice.cascade,
        preview_token: finalPreview.previewToken,
        expected_revision: finalPreview.revision,
        generation: finalPreview.generation,
        reason: options.reason || '用户主动停止任务',
        actor: options.actor || 'local-user',
      })
    } catch (error) {
      if (attempt === 0 && (error.status === 409 || /CONFLICT/.test(error.code || ''))) {
        options.onConflict?.()
        source = {}
        continue
      }
      throw error
    }
  }
  return null
}

export const undoTaskStop = async task => {
  const taskId = String(task?.id || task?.taskId || task?.task_id || '')
  const guard = await resolveTaskMutationGuard(taskId, task)
  return postJson('/api/tasks/cancel/undo', { task_id: taskId, ...guard })
}

export const recheckTaskStop = async (task, action = 'recheck') => {
  const taskId = String(task?.id || task?.taskId || task?.task_id || '')
  const guard = await resolveTaskMutationGuard(taskId, task)
  return postJson('/api/tasks/cancel/recheck', { task_id: taskId, action, ...guard })
}

export const getTaskStopStatus = taskId => requestJson(`/api/tasks/cancel/status?task_id=${encodeURIComponent(taskId)}`, { cache: 'no-store' })

export const taskStopGuard = taskMutationGuardFromSource
