import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = path.join(root, 'ccm-package')
const packageInfo = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
const readme = fs.readFileSync(path.join(packageRoot, 'README.md'), 'utf8')
const repositoryReadme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')

const requiredSections = [
  '## 快速开始',
  '## CCM 能做什么',
  '### 1. 三类主 Agent 与统一 Agent Loop',
  '### 2. 自动开发与任务验收',
  '### 3. CC 式上下文与记忆系统',
  '### 4. MCP、Skill 与主 Agent只读工具',
  '### 5. 开发 Agent运行时',
  '### 6. 项目、Git 与运行控制台',
  '### 7. 知识库与附件摄取',
  '### 8. 飞书双向会话与AI工作报告',
  '### 9. 工作台、监控与恢复',
  '### 10. 音乐平台、通知与桌面宠物',
  '## 模型与Provider',
  '## 常用CLI',
  '## 本地数据与安全',
  '## 升级、备份与卸载',
  '## 常见问题',
  '## 外部条件与使用边界',
]

const failures = []
for (const section of requiredSections) {
  if (!readme.includes(section)) failures.push(`missing section: ${section}`)
}

if (!readme.includes('npm install -g @mumulinya167/cc-web@latest')) failures.push('missing global install command')
if (!readme.includes('ccm start --background --open')) failures.push('missing recommended start command')
if (!/src="https:\/\/raw\.githubusercontent\.com\/[^\"]+ccm-app-icon\.png"/.test(readme)) failures.push('npm logo must use an absolute raw GitHub URL')
if (/<img[^>]+src="(?:\.|\/)(?!\/)/i.test(readme)) failures.push('relative image URL is not allowed in the npm README')
if (readme.length < 6_500) failures.push('npm README is too short to describe the production feature set')
if (String(packageInfo.description || '').length < 50) failures.push('package description is incomplete')
if (!packageInfo.homepage || !packageInfo.repository?.url || !packageInfo.bugs?.url) failures.push('homepage, repository and bugs metadata are required')
if (!Array.isArray(packageInfo.keywords) || packageInfo.keywords.length < 15) failures.push('package keyword coverage is incomplete')

const repositorySections = ['## 快速开始', '## 核心工作链', '## 功能概览', '## 项目结构', '## 本地开发', '## 测试与发布', '## 文档']
for (const section of repositorySections) {
  if (!repositoryReadme.includes(section)) failures.push(`repository README missing section: ${section}`)
}
if (!repositoryReadme.includes('npm install -g @mumulinya167/cc-web@latest')) failures.push('repository README is missing the npm install command')
if (!repositoryReadme.includes('scripts/project-coverage-manifest.json')) failures.push('repository README is missing the coverage manifest entry point')
if (!/src="https:\/\/raw\.githubusercontent\.com\/[^\"]+ccm-app-icon\.png"/.test(repositoryReadme)) failures.push('repository README logo must use a stable absolute URL')
if (repositoryReadme.length < 8_000) failures.push('repository README is too short to cover users and contributors')
for (const staleDescription of ['提示词模板库', 'database-free', '规则协调器', 'Gemini CLI']) {
  if (repositoryReadme.includes(staleDescription)) failures.push(`repository README contains retired description: ${staleDescription}`)
}

if (failures.length) {
  console.error(`npm README release self-test failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  package: packageInfo.name,
  version: packageInfo.version,
  readmeCharacters: readme.length,
  repositoryReadmeCharacters: repositoryReadme.length,
  requiredSections: requiredSections.length,
  repositorySections: repositorySections.length,
  keywords: packageInfo.keywords.length,
  absoluteLogo: true,
}, null, 2))
