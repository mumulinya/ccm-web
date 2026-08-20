import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const backendModule = path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'project-chat-intent.js')
const frontendUtility = fs.readFileSync(path.join(root, 'frontend', 'src', 'utils', 'projectChatPresentation.js'), 'utf8')
const projectManager = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'useProjectManager.js'), 'utf8')
const projectMessage = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'ProjectAgentMessage.vue'), 'utf8')

const { classifyProjectChatIntent, runProjectChatIntentSelfTest } = await import(pathToFileURL(backendModule).href)
const classifier = runProjectChatIntentSelfTest()

assert.equal(classifier.success, true)
assert.throws(() => classifyProjectChatIntent('你是什么模型'), /同步关键词项目意图分类已停用/)
assert.equal(classifier.checks.find(item => item.message === '你是什么模型')?.actual, false)
assert.equal(classifier.checks.find(item => item.message === '这个项目是什么架构？')?.actual, false)
assert.equal(classifier.checks.find(item => item.message === '修改登录接口并运行测试')?.actual, true)
assert.match(frontendUtility, /shouldShowProjectTaskCard/)
assert.match(projectManager, /data\.type === 'presentation'/)
assert.match(projectManager, /agentMsg\.messageMode = mode/)
assert.match(projectMessage, /isTaskMessage/)

console.log(JSON.stringify({
  success: true,
  checks: [
    'ordinary question stays outside task presentation',
    'read-only project question is inferred from tool events',
    'explicit implementation request enters task presentation',
    'synchronous keyword classifier fails closed',
    'project UI consumes presentation mode and hides task-only details',
  ],
}, null, 2))
