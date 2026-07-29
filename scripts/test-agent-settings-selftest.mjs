import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-test-agent-settings-'))
process.env.CCM_TEST_AGENT_SETTINGS_FILE = path.join(scratch, 'test-agent-settings.json')

const settingsModule = await import(`${pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'system', 'test-agent-settings.js')).href}?t=${Date.now()}`)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const projectMain = read('backend/modules/projects/project-main-agent.ts')
const groupReview = read('backend/modules/collaboration/collaboration-runtime-coordinator-review.ts')
const groupStatus = read('backend/modules/collaboration/collaboration-runtime-status-helpers.ts')
const directExecutor = read('backend/modules/collaboration/collaboration-task-executor.ts')
const settingsApi = read('backend/modules/system/settings.ts')
const settingsUi = read('frontend/src/components/settings/SettingsTestAgentPanel.vue')
const settingsSidebar = read('frontend/src/components/settings/SettingsSidebar.vue')
const sourceIngestion = read('backend/modules/requirements/source-ingestion.ts')
const server = read('backend/server.ts')

const defaultSettings = settingsModule.loadTestAgentSettings()
const disabledSettings = settingsModule.saveTestAgentSettings({ enabled: false })
const persistedDisabled = settingsModule.loadTestAgentSettings()
const enabledSettings = settingsModule.saveTestAgentSettings({ enabled: true })

const checks = {
  defaultsToEnabled: defaultSettings.enabled === true,
  disablePersists: disabledSettings.enabled === false && persistedDisabled.enabled === false,
  enablePersists: enabledSettings.enabled === true && settingsModule.isTestAgentEnabled() === true,
  settingsApiRoundTrip: settingsApi.includes('/api/system/test-agent') && settingsApi.includes('saveTestAgentSettings'),
  settingsUiExplainsModes: settingsUi.includes('它负责什么') && settingsUi.includes('开启后') && settingsUi.includes('关闭后') && settingsUi.includes('不产生独立验收结论'),
  settingsNavigationVisible: settingsSidebar.includes("key: 'test-agent'") && settingsSidebar.includes("label: 'TestAgent'"),
  projectMainSupportsSingleSelfVerification: projectMain.includes('runProjectMainAgentSelfVerification') && projectMain.includes('main_agent_self_verifying') && projectMain.includes('max_rounds: 1'),
  groupMainSupportsSingleSelfVerification: groupReview.includes('group_main_self_verification_started') && groupReview.includes('runMainAgentSelfVerification') && groupReview.includes('acceptancePolicy'),
  directProjectSupportsSelfVerification: directExecutor.includes('runMainAgentSelfVerification') && directExecutor.includes('mainAgentSelfVerification'),
  independentGateUsesTaskSnapshot: directExecutor.includes('resolveTaskAcceptancePolicy(task') && groupStatus.includes('task?.test_agent_enabled !== false'),
  publicTencentDocsRemainSupported: sourceIngestion.includes('tencent-docs-public-page') && sourceIngestion.includes('public_link_only'),
  privateAuthorizationCodeRemoved: !fs.existsSync(path.join(root, 'backend/modules/requirements/online-document-authorization.ts'))
    && !fs.existsSync(path.join(root, 'backend/modules/requirements/tencent-docs-oauth-relay.ts'))
    && !fs.existsSync(path.join(root, 'frontend/src/components/settings/SettingsDocumentsPanel.vue'))
    && !server.includes('handleTencentDocsOAuthPublicCallback'),
  settingsNoLongerExposeTencentAuthorization: !settingsSidebar.includes("key: 'documents'") && !settingsUi.includes('Client ID'),
}

for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
if (!Object.values(checks).every(Boolean)) process.exitCode = 1
