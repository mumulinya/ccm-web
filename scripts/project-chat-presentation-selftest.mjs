import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const backendModule = path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'project-chat-intent.js')
const frontendUtility = fs.readFileSync(path.join(root, 'frontend', 'src', 'utils', 'projectChatPresentation.js'), 'utf8')
const projectManager = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'ProjectManager.vue'), 'utf8')
const projectMessage = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'ProjectAgentMessage.vue'), 'utf8')

const { classifyProjectChatIntent, runProjectChatIntentSelfTest } = await import(pathToFileURL(backendModule).href)
const classifier = runProjectChatIntentSelfTest()

assert.equal(classifier.success, true)
assert.equal(classifyProjectChatIntent('你是什么模型').mode, 'conversation')
assert.equal(classifyProjectChatIntent('这个项目是什么架构？').mode, 'project_analysis')
assert.equal(classifyProjectChatIntent('修改登录接口并运行测试').mode, 'task')
assert.equal(classifyProjectChatIntent('看一下附件', [{ name: 'requirement.pdf' }]).mode, 'task')
assert.match(frontendUtility, /shouldShowProjectTaskCard/)
assert.match(projectManager, /data\.type === 'presentation'/)
assert.match(projectManager, /项目 Agent 正在回复/)
assert.match(projectMessage, /isTaskMessage/)

console.log(JSON.stringify({
  success: true,
  checks: [
    'ordinary question uses conversation presentation',
    'read-only project question uses project_analysis presentation',
    'explicit implementation request uses task presentation',
    'attachments keep task presentation',
    'project UI consumes presentation mode and hides task-only details',
  ],
}, null, 2))
