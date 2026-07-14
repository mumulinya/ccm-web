import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const manager = read('frontend/src/components/tasks/TaskManager.vue')
const header = read('frontend/src/components/tasks/TaskDispatchHeader.vue')
const listItem = read('frontend/src/components/tasks/TaskListItem.vue')
const renderRegression = read('scripts/task-dispatch-render-regression.mjs')
const packageJson = read('package.json')

const checks = {
  dedicatedHeaderComponent: manager.includes("import TaskDispatchHeader from './TaskDispatchHeader.vue'")
    && manager.includes('<TaskDispatchHeader'),
  threeBusinessViews: ['overview', 'all', 'advanced'].every(view => header.includes(`id: '${view}'`))
    && manager.includes("activeTaskView === 'overview'")
    && manager.includes("activeTaskView === 'all'")
    && manager.includes("activeTaskView === 'advanced'"),
  unifiedCreateEntry: header.includes('＋</span> 新建任务')
    && header.includes("chooseCreateType('business')")
    && header.includes("chooseCreateType('standard')")
    && !manager.includes('>业务开发任务</button>')
    && !manager.includes('>+ 新建任务</button>'),
  runtimeGovernanceIsAdvanced: manager.indexOf("activeTaskView === 'advanced'") < manager.indexOf('class="runtime-governance-card"'),
  archiveWordingMatchesBehavior: listItem.includes('>归档</button>')
    && !listItem.includes('🗑️ 删除')
    && manager.includes('确定归档此任务？')
    && manager.includes("archive: '归档'"),
  technicalBlockersFoldedByDefault: listItem.includes('<details v-if="executionBlockedText || executionFixActions.length"')
    && listItem.includes('<summary>技术详情</summary>')
    && listItem.includes('<details v-if="task.execution_kernel"'),
  responsiveWidthGuard: manager.includes('overflow-x: clip')
    && header.includes('@media (max-width: 768px)')
    && renderRegression.includes('assertNoHorizontalOverflow'),
  realRenderRegressionRegistered: packageJson.includes('test:task-dispatch-render')
    && renderRegression.includes('05-task-overview-mobile.png')
    && renderRegression.includes('06-task-list-mobile.png'),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, checks }, null, 2))
if (!pass) process.exitCode = 1
