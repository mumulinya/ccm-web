import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const compiled = path.join(root, 'ccm-package/dist/modules/projects/sessions.js')
assert.ok(fs.existsSync(compiled), '请先运行 npm run build:backend')
const sessionsRuntime = await import(`${pathToFileURL(compiled).href}?selftest=${Date.now()}`)
const runtime = sessionsRuntime.runProjectFeishuSessionSourceSelfTest()

const source = read('backend/modules/projects/sessions.ts')
const sidebar = read('frontend/src/components/projects/ProjectSessionSidebar.vue')
const manager = read('frontend/src/components/projects/useProjectManager.js')
const template = read('frontend/src/components/projects/ProjectManager.template.html')
const api = read('frontend/src/api/index.js')
const globalStyle = read('frontend/src/style.css')
const projectsApiSource = read('backend/modules/projects/projects.ts')
const acpSource = read('backend/integrations/control-bot-acp.ts')

const checks = {
  ...runtime.checks,
  project_scoped_targets_use_cc_store:
    source.includes('getProjectFeishuSessionTargets')
    && source.includes('findCcSessionFile(projectName)'),
  newest_cc_connect_store_is_authoritative:
    source.includes('mtimeMs')
    && !source.includes('const hashed = files.find'),
  project_session_sync_compares_real_history_not_only_timestamp:
    source.includes('const historyChanged = JSON.stringify(existing?.history || [])')
    && source.includes('syncFromCcToFilesystem(projectName);'),
  exact_target_must_belong_to_project:
    source.includes('飞书目标不属于当前项目或尚未被发现'),
  web_session_cannot_be_bound:
    source.includes('只能将飞书目标绑定到飞书会话'),
  deletion_cleans_active_and_historical_maps:
    source.includes('delete data.active_session[k]')
    && source.includes('data.user_sessions[k] = values.filter'),
  new_session_ids_include_feishu_history:
    source.includes('Object.values(data.active_session || {})')
    && source.includes('Object.values(data.user_sessions || {}).flatMap'),
  project_sidebar_groups_sources:
    sidebar.includes('网页会话')
    && sidebar.includes('飞书会话')
    && sidebar.includes("emit('bind-feishu', session)"),
  project_ui_creates_and_binds_feishu_sessions:
    template.includes('@create-feishu="createSession(\'feishu\')"')
    && manager.includes('updateProjectFeishuBinding')
    && api.includes("'/api/sessions/feishu-bind'"),
  project_runtime_event_refreshes_bindings:
    manager.includes("event?.type === 'project.feishu_session_binding_changed'"),
  project_feishu_messages_publish_exact_runtime_events:
    projectsApiSource.includes('project.session_messages_changed')
    && projectsApiSource.includes('session-runtime-event')
    && projectsApiSource.includes('syncSessions(project)')
    && acpSource.includes('notifyProjectSessionChanged(projectSessionId, "inbound")')
    && acpSource.includes('notifyProjectSessionChanged(projectSessionId, "reply")'),
  active_project_feishu_session_refreshes_from_sse:
    manager.includes("event?.type === 'project.session_messages_changed'")
    && manager.includes('refreshCurrentProjectSession(eventSessionId)')
    && manager.includes('project !== currentProject.value || sessionId !== currentSession.value'),
  project_feishu_session_has_low_frequency_fallback:
    manager.includes('projectFeishuFallbackTimer = window.setInterval')
    && manager.includes('}, 60000)')
    && manager.includes("selected?.source === 'feishu'"),
  stale_project_responses_cannot_replace_current_session:
    manager.includes('if (project !== currentProject.value) return false')
    && manager.includes('if (project !== currentProject.value || sessionId !== currentSession.value) return'),
  mobile_project_session_drawer_uses_full_height:
    !globalStyle.includes('.project-manager .session-list,\n  .tools-config .category-list'),
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
assert.deepEqual(failed, [], `Project Feishu session binding regression: ${failed.join(', ')}`)
console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
