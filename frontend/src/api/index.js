// API 调用封装
export async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || data.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (e) {
    console.error('API Error:', path, e.message);
    throw e;
  }
}

// 项目相关 API
export const projectsApi = {
  list: () => api('/api/projects'),
  create: (data) => api('/api/projects/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  update: (data) => api('/api/projects/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (name) => api('/api/projects/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  start: (project, agent) => api('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project, agent }) }),
  stop: (project) => api('/api/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project }) }),
};

// 会话相关 API
export const sessionsApi = {
  list: (project) => api(`/api/projects/${encodeURIComponent(project)}/sessions`),
  detail: (project, sessionId) => api(`/api/projects/${encodeURIComponent(project)}/sessions/${encodeURIComponent(sessionId)}`),
  create: (data) => api('/api/sessions/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (data) => api('/api/sessions/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  rename: (data) => api('/api/sessions/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  saveMessage: (data) => api('/api/sessions/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteMessage: (data) => api('/api/sessions/message/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  replaceMessages: (data) => api('/api/sessions/messages/replace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};

// 群聊相关 API
export const groupsApi = {
  list: () => api('/api/groups'),
  create: (data) => api('/api/groups/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (id) => api('/api/groups/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }),
  rename: (data) => api('/api/groups/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  messages: (id, limit = 100) => api(`/api/groups/messages?id=${id}&limit=${limit}`),
  send: (data) => data instanceof FormData
    ? fetch('/api/groups/send?stream=1', { method: 'POST', body: data })
    : fetch('/api/groups/send?stream=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  members: (data) => api('/api/groups/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};

// 任务相关 API
export const tasksApi = {
  list: () => api('/api/tasks'),
  create: (data) => api('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  update: (data) => api('/api/tasks/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  retry: (data) => api('/api/tasks/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  cancel: (data) => api('/api/tasks/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  executions: (taskId) => api(`/api/tasks/executions?task_id=${encodeURIComponent(taskId)}`),
  rollbackExecution: (data) => api('/api/tasks/execution/rollback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  mergeExecution: (data) => api('/api/tasks/execution/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  cleanupExecution: (data) => api('/api/tasks/execution/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (id) => api('/api/tasks/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }),
};

// 工具相关 API
export const toolsApi = {
  authorizationInventory: () => api('/api/tools/authorization-inventory'),
  chainVerification: (input = {}) => {
    const params = new URLSearchParams()
    ;['scope', 'scopeId', 'groupId', 'project', 'projectName', 'status'].forEach((key) => {
      if (input[key]) params.set(key, String(input[key]))
    })
    const query = params.toString()
    return api(`/api/tools/chain-verification${query ? `?${query}` : ''}`)
  },
  invocationAudit: (input = 80) => {
    const params = new URLSearchParams()
    if (typeof input === 'number') {
      params.set('limit', String(input))
    } else {
      const payload = input || {}
      params.set('limit', String(payload.limit || 80))
      ;['runtime', 'project', 'projectName', 'projectAlias', 'groupId', 'taskId', 'category', 'source'].forEach((key) => {
        if (payload[key]) params.set(key, String(payload[key]))
      })
      if (Array.isArray(payload.projectAliases) && payload.projectAliases.length) {
        params.set('projectAliases', payload.projectAliases.join(','))
      } else if (payload.projectAliases) {
        params.set('projectAliases', String(payload.projectAliases))
      }
    }
    return api(`/api/tools/invocation-audit?${params.toString()}`)
  },
  runtimeReadiness: (deep = false) => api(`/api/tools/runtime-readiness?deep=${deep ? '1' : '0'}`),
  runtimeResync: (data = {}) => api('/api/tools/runtime-resync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  mcp: {
    list: () => api('/api/mcp'),
    create: (data) => api('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (name) => api('/api/mcp/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  },
  skills: {
    list: () => api('/api/skills'),
    listCustomizations: () => api('/api/skills/customizations'),
    create: (data) => api('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (name) => api('/api/skills/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  },
  marketplace: {
    list: (source = 'local', url = '') => api(`/api/marketplace/list?source=${encodeURIComponent(source)}&url=${encodeURIComponent(url)}`),
    installations: () => api('/api/marketplace/installations'),
    operations: (limit = 20) => api(`/api/marketplace/operations?limit=${encodeURIComponent(limit)}`),
    sources: () => api('/api/marketplace/sources'),
    saveSource: (data) => api('/api/marketplace/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    deleteSource: (id) => api('/api/marketplace/sources/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }),
    preview: (data) => api('/api/marketplace/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    authorizationImpact: (data) => api('/api/marketplace/authorization-impact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    install: (data) => api('/api/marketplace/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (data) => api('/api/marketplace/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    uninstall: (data) => api('/api/marketplace/uninstall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  smithery: {
    getKey: () => api('/api/smithery/config'),
    saveKey: (key) => api('/api/smithery/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }),
  }
};

// 共享文件 API
export const sharedApi = {
  list: () => api('/api/shared'),
  read: (name) => api(`/api/shared/read?name=${encodeURIComponent(name)}`),
  write: (data) => api('/api/shared/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  delete: (name) => api('/api/shared/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
};

// 终端 API
export const terminalApi = {
  exec: (data) => api('/api/terminal/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  info: () => api('/api/terminal/info'),
};
