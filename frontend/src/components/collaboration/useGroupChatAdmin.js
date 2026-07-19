import { ref, watch, nextTick } from 'vue'
import { groupsApi, projectsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import { buildGroupConversationKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { normalizeGroupTools } from './groupChatHelpers.js'

export function useGroupChatAdmin({ currentGroup, groups, projects, messages, groupMemory, currentGroupSessionId, showCreate, showRename, showMembers, showTools, showSharedFiles, showLogs, newGroupName, renameName, groupTools, groupAllTools, groupToolAudit, groupAuthorizationReadiness, groupConnectionPreflight, groupToolVerification, loadGroups, selectGroup }) {
  const updateCreateGroupProjectSelection = ({ name, selected }) => {
    const project = projects.value.find(p => p.name === name)
    if (project) project.selected = selected
  }

  // 创建群聊
  const submitCreateGroup = async () => {
    if (!newGroupName.value.trim()) { toast.warning('请输入群聊名称'); return }

    const selectedProjects = projects.value.filter(p => p.selected).map(p => ({
      project: p.name,
      agent: p.agent || 'claudecode'
    }))

    const res = await groupsApi.create({ name: newGroupName.value, members: selectedProjects })
    if (res.success) {
      showCreate.value = false
      newGroupName.value = ''
      await loadGroups()
      selectGroup(res.group.id)
      toast.success('群聊创建成功！')
    } else {
      toast.error('创建失败: ' + (res.error || '未知错误'))
    }
  }

  // 重命名群聊
  const submitRename = async () => {
    if (!renameName.value.trim()) { toast.warning('请输入名称'); return }
    await groupsApi.rename({ id: currentGroup.value.id, name: renameName.value })
    currentGroup.value.name = renameName.value
    showRename.value = false
    loadGroups()
    toast.success('群聊已重命名')
  }

  // 删除群聊
  const deleteGroup = async () => {
    const confirmed = await confirmDialog(`确定删除群聊 "${currentGroup.value.name}"？删除后无法恢复。`)
    if (!confirmed) return
    await groupsApi.delete(currentGroup.value.id)
    currentGroup.value = null
    messages.value = []
    groupMemory.value = null
    loadGroups()
    toast.success('群聊已删除')
  }

  const clearGroupMessages = async () => {
    if (!currentGroup.value) return
    const clearMemory = await confirmDialog(`是否同时清空群聊“${currentGroup.value.name}”的压缩记忆？\n选择“确定”会清消息和记忆；选择“取消”只清消息。`)
    const confirmed = clearMemory || await confirmDialog(`确定只清空群聊“${currentGroup.value.name}”的聊天消息？`)
    if (!confirmed) return
    const res = await fetch('/api/groups/messages/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, session_id: currentGroupSessionId.value, clear_memory: clearMemory })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      toast.error(data.error || '清空群聊失败')
      return
    }
    messages.value = []
    if (data.memory_cleared) groupMemory.value = null
    toast.success(`已清空 ${data.cleared || 0} 条群聊消息`)
  }

  const saveCurrentGroupConversationKnowledge = async () => {
    if (!currentGroup.value || messages.value.length === 0) return toast.info('当前群聊还没有可沉淀的内容')
    try {
      const data = await postKnowledgeCapture(buildGroupConversationKnowledgePayload({
        group: currentGroup.value,
        messages: messages.value,
      }))
      toast.success(`已保存到知识库：${data.entry?.title || '群聊对话'}`)
    } catch (error) {
      toast.error(error?.message || '保存群聊知识失败')
    }
  }

  // 加载群聊日志
  const logs = ref([])
  const logFilter = ref('')
  let logEventSource = null
  let logsResizeObserver = null

  watch(showLogs, (newVal) => {
    if (newVal) {
      nextTick(() => {
        if (typeof ResizeObserver === 'undefined') return
        const outer = document.getElementById('logsContent')
        const inner = document.getElementById('logsContentInner')
        if (outer && inner) {
          if (logsResizeObserver) logsResizeObserver.disconnect()
          logsResizeObserver = new ResizeObserver(() => {
            outer.scrollTop = outer.scrollHeight
          })
          logsResizeObserver.observe(inner)
        }
      })
    } else {
      if (logsResizeObserver) {
        logsResizeObserver.disconnect()
        logsResizeObserver = null
      }
    }
  })

  const scrollLogsToBottom = () => {
    nextTick(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    })
    setTimeout(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    }, 60)
    setTimeout(() => {
      const el = document.getElementById('logsContent')
      if (el) el.scrollTop = el.scrollHeight
    }, 220)
  }

  watch(logFilter, () => {
    scrollLogsToBottom()
  })

  const loadLogs = async () => {
    if (!currentGroup.value) return

    // 加载历史日志
    const res = await fetch(`/api/groups/logs?id=${currentGroup.value.id}&limit=100`)
    const data = await res.json()
    logs.value = data.logs || []
    showLogs.value = true

    // 启动实时日志流
    startLogStream()

    scrollLogsToBottom()
  }

  const startLogStream = () => {
    if (logEventSource) logEventSource.close()
    if (!currentGroup.value) return

    logEventSource = new EventSource(`/api/groups/logs/stream?id=${currentGroup.value.id}`)

    logEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'log') {
          logs.value.push(data.log)
          // 滚动到底部
          nextTick(() => {
            const el = document.getElementById('logsContent')
            if (el) el.scrollTop = el.scrollHeight
          })
        }
      } catch {}
    }

    logEventSource.onerror = () => {
      console.log('日志流连接断开')
    }
  }

  const stopLogStream = () => {
    if (logEventSource) {
      logEventSource.close()
      logEventSource = null
    }
  }

  const clearLogs = async () => {
    const confirmed = await confirmDialog('确定清空群聊日志？清空后无法恢复。')
    if (!confirmed) return
    await fetch('/api/groups/logs/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id })
    })
    logs.value = []
    toast.success('日志已清空')
  }

  // 群聊成员管理

  const loadAvailableGroupTools = async () => {
    const options = await fetch('/api/tools/authorization-options').then(r => r.json()).catch(() => ({ mcp: [], skill: [] }))
    groupAllTools.value = {
      mcp: options.mcp || [],
      skill: options.skill || []
    }
  }

  const loadGroupTools = async () => {
    if (!currentGroup.value) return
    const [data] = await Promise.all([
      fetch(`/api/groups/tools?id=${currentGroup.value.id}`).then(r => r.json()),
      loadAvailableGroupTools()
    ])
    groupTools.value = normalizeGroupTools(data.tools)
    groupToolAudit.value = data.tool_audit || null
    groupAuthorizationReadiness.value = data.authorization_readiness || null
    groupConnectionPreflight.value = data.connection_preflight || null
    const verification = await fetch(`/api/tools/chain-verification?groupId=${encodeURIComponent(currentGroup.value.id)}`).then(r => r.json()).catch(() => ({ rows: [] }))
    groupToolVerification.value = verification.rows?.[0] || null
    showTools.value = true
  }

  const toggleGroupTool = (type, name) => {
    const normalized = normalizeGroupTools(groupTools.value)
    const list = normalized[type] || []
    const index = list.indexOf(name)
    if (index >= 0) {
      list.splice(index, 1)
    } else {
      list.push(name)
      if (type === 'mcp' && !String(name).includes('/')) {
        normalized.mcp = normalized.mcp.filter(item => item === name || !item.startsWith(`${name}/`))
      }
    }
    groupTools.value = normalized
  }

  const saveGroupTools = async () => {
    groupTools.value = normalizeGroupTools(groupTools.value)
    const res = await fetch('/api/groups/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, tools: groupTools.value })
    })
    const data = await res.json()
    if (!data.success) {
      toast.error('工具配置保存失败: ' + (data.error || '未知错误'))
      return
    }
    groupTools.value = normalizeGroupTools(data.tools)
    groupToolAudit.value = data.tool_audit || null
    groupAuthorizationReadiness.value = data.authorization_readiness || null
    groupConnectionPreflight.value = data.connection_preflight || null
    showTools.value = false
    if (data.authorization_readiness && data.authorization_readiness.dispatchReady === false) {
      toast.warning('工具配置已保存，但有授权项当前不可用')
    } else {
      toast.success('工具配置已保存')
    }
  }

  // 群聊共享文件
  const groupFiles = ref([])

  const loadGroupFiles = async () => {
    if (!currentGroup.value) return
    const data = await fetch(`/api/groups/shared?id=${currentGroup.value.id}`).then(r => r.json())
    groupFiles.value = data.files || []
    showSharedFiles.value = true
  }

  const addGroupFile = async () => {
    // 使用弹窗代替 prompt
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      <h3>新建共享文件</h3>
      <div class="form-group">
        <label>文件名</label>
        <input type="text" id="newGroupFileName" placeholder="如 api-docs.md">
      </div>
      <div class="form-group">
        <label>文件内容</label>
        <textarea id="newGroupFileContent" rows="8" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(15,23,42,0.6);color:var(--text-primary);font-size:13px;resize:vertical;outline:none" placeholder="输入文件内容..."></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="submitAddGroupFile()">创建</button>
      </div>
    </div>`;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  const submitAddGroupFile = async () => {
    const name = document.getElementById("newGroupFileName")?.value?.trim();
    const content = document.getElementById("newGroupFileContent")?.value || "";
    if (!name) { toast.warning('请输入文件名'); return }

    await fetch('/api/groups/shared/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, name, content })
    });
    document.querySelector('.modal-overlay')?.remove();
    loadGroupFiles();
    toast.success('文件创建成功');
  }

  const deleteGroupFile = async (name) => {
    const confirmed = await confirmDialog(`确定删除文件 "${name}"？删除后无法恢复。`)
    if (!confirmed) return
    await fetch('/api/groups/shared/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: currentGroup.value.id, name })
    })
    loadGroupFiles()
    toast.success('文件已删除')
  }

  // 获取可添加的项目
  const getAvailableProjects = () => {
    if (!currentGroup.value) return []
    const currentMembers = currentGroup.value.members?.map(m => m.project) || []
    return projects.value.filter(p => !currentMembers.includes(p.name))
  }

  // 群聊成员管理
  const addGroupMember = async (project, agent) => {
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentGroup.value.id, add: [{ project, agent }] })
    })
    const data = await res.json()
    if (data.success) {
      currentGroup.value = data.group
      loadGroups()
      toast.success(`已添加 ${project} 到群聊`)
      // 刷新成员列表
      showMembers.value = false
      nextTick(() => { showMembers.value = true })
    } else {
      toast.error('添加失败: ' + (data.error || '未知错误'))
    }
  }

  const removeGroupMember = async (project) => {
    const confirmed = await confirmDialog(`确定移除 ${project}？`)
    if (!confirmed) return
    const res = await fetch('/api/groups/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentGroup.value.id, remove: [project] })
    })
    const data = await res.json()
    if (data.success) {
      currentGroup.value = data.group
      loadGroups()
      toast.success(`已移除 ${project}`)
      // 刷新成员列表
      showMembers.value = false
      nextTick(() => { showMembers.value = true })
    } else {
      toast.error('移除失败: ' + (data.error || '未知错误'))
    }
  }

  return {
    updateCreateGroupProjectSelection,
    submitCreateGroup,
    submitRename,
    deleteGroup,
    clearGroupMessages,
    saveCurrentGroupConversationKnowledge,
    logs,
    logFilter,
    logEventSource,
    logsResizeObserver,
    scrollLogsToBottom,
    loadLogs,
    startLogStream,
    stopLogStream,
    clearLogs,
    loadAvailableGroupTools,
    loadGroupTools,
    toggleGroupTool,
    saveGroupTools,
    groupFiles,
    loadGroupFiles,
    addGroupFile,
    submitAddGroupFile,
    deleteGroupFile,
    getAvailableProjects,
    addGroupMember,
    removeGroupMember,
  }
}
