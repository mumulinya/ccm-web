import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const project = `ccm-runtime-selftest-${process.pid}`
const ccmDir = path.join(os.homedir(), '.cc-connect')
const workDir = path.join(os.tmpdir(), project)
const configFile = path.join(ccmDir, 'configs', `config-${project}.toml`)
const metadataFile = path.join(ccmDir, 'project-configs.json')
const runtimeStateFile = path.join(ccmDir, 'project-runtime', 'state.json')
const runtimeLogDir = path.join(ccmDir, 'logs', 'project-runtime', project)
const originalMetadata = fs.existsSync(metadataFile) ? fs.readFileSync(metadataFile, 'utf8') : ''

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const tomlPath = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function cleanupState() {
  if (!fs.existsSync(runtimeStateFile)) return
  try {
    const state = JSON.parse(fs.readFileSync(runtimeStateFile, 'utf8'))
    for (const section of ['processes', 'builds']) {
      for (const key of Object.keys(state[section] || {})) if (key.startsWith(`${project}::`)) delete state[section][key]
    }
    fs.writeFileSync(runtimeStateFile, JSON.stringify(state, null, 2))
  } catch {}
}

try {
  fs.rmSync(workDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(workDir, 'frontend'), { recursive: true })
  fs.writeFileSync(path.join(workDir, 'package.json'), JSON.stringify({ name: project, scripts: { 'dev:test': 'node server-a.js', 'build:test': 'node build.js' } }, null, 2))
  fs.writeFileSync(path.join(workDir, 'frontend', 'package.json'), JSON.stringify({ name: 'frontend', scripts: { dev: 'node server-b.js', build: 'node build.js' } }, null, 2))
  fs.writeFileSync(path.join(workDir, 'server-a.js'), "console.log('runtime-stream-ready');setInterval(() => {}, 1000)\n")
  fs.writeFileSync(path.join(workDir, 'server-b.js'), 'setInterval(() => {}, 1000)\n')
  fs.writeFileSync(path.join(workDir, 'build.js'), "const fs=require('fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/artifact.txt','ok')\n")
  fs.writeFileSync(path.join(workDir, 'recover-run.js'), "const fs=require('fs');if(!fs.existsSync('reactor-ready')){console.error('Non-resolvable import POM: Could not find artifact demo:internal:pom:1-SNAPSHOT');process.exit(1)}console.log('spring-service-ready');setInterval(()=>{},1000)\n")
  fs.writeFileSync(path.join(workDir, 'recover-prepare.js'), "require('fs').writeFileSync('reactor-ready','ok');console.log('reactor-installed')\n")
  fs.mkdirSync(path.join(workDir, 'spring-services', 'orders', 'src', 'main', 'java', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(workDir, 'spring-services', 'pom.xml'), '<project><modelVersion>4.0.0</modelVersion><groupId>demo</groupId><artifactId>services</artifactId><version>1</version><packaging>pom</packaging><modules><module>orders</module></modules><build><pluginManagement><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></pluginManagement></build></project>')
  fs.writeFileSync(path.join(workDir, 'spring-services', 'orders', 'pom.xml'), '<project><modelVersion>4.0.0</modelVersion><parent><groupId>demo</groupId><artifactId>services</artifactId><version>1</version></parent><artifactId>orders</artifactId><packaging>jar</packaging></project>')
  fs.writeFileSync(path.join(workDir, 'spring-services', 'orders', 'src', 'main', 'java', 'demo', 'OrdersApplication.java'), 'package demo; import org.springframework.boot.autoconfigure.SpringBootApplication; @SpringBootApplication public class OrdersApplication {}\n')
  fs.mkdirSync(path.dirname(configFile), { recursive: true })
  fs.writeFileSync(configFile, `language = "zh"\n[[projects]]\nname = "${project}"\nwork_dir = "${tomlPath(workDir)}"\n[projects.agent]\ntype = "claudecode"\n`)

  const runtime = await import('../ccm-package/dist/modules/projects/project-runtime.js')
  const detected = runtime.detectProjectRuntimeProfilesAt(project, workDir)
  const envProfile = detected.find(item => item.environment === 'test')
  assert.ok(envProfile)
  assert.equal(envProfile.runCommand, 'npm run dev:test')
  assert.equal(envProfile.buildCommand, 'npm run build:test')
  assert.ok(detected.some(item => item.modulePath === 'frontend'))
  const springProfile = detected.find(item => item.environment === 'spring-services/orders')
  assert.ok(springProfile, 'inherited Spring Boot module should be detected from its application source')
  assert.match(springProfile.label, /Spring Boot/)
  assert.equal(springProfile.runCommand, 'mvn -f spring-services/orders/pom.xml spring-boot:run')
  assert.doesNotMatch(springProfile.runCommand, /-am\s+spring-boot:run/)
  assert.doesNotMatch(springProfile.runCommand, /java(?:\.exe)?\s+-jar/i)
  const springParent = detected.find(item => item.environment === 'spring-services')
  assert.ok(springParent && !springParent.runCommand, 'aggregator pom must remain build-only')

  const profiles = [
    { id: 'runtime_build_only', label: '父聚合构建', projectId: project, modulePath: '.', projectType: 'maven', environment: 'default', runCommand: '', buildCommand: 'mvn package', artifactPatterns: [], source: 'manual', enabled: true, detectedChecksum: '' },
    { id: 'runtime_one', label: '服务一', projectId: project, modulePath: '.', projectType: 'custom', environment: 'test', runCommand: 'node server-a.js', buildCommand: 'node build.js', artifactPatterns: ['dist'], source: 'manual', enabled: true, detectedChecksum: '' },
    { id: 'runtime_two', label: '服务二', projectId: project, modulePath: '.', projectType: 'custom', environment: 'test', runCommand: 'node server-b.js', buildCommand: '', artifactPatterns: [], source: 'manual', enabled: true, detectedChecksum: '' },
    { id: 'runtime_recovery', label: 'Spring 恢复夹具', projectId: project, modulePath: '.', projectType: 'maven', environment: 'test', runCommand: 'node recover-run.js', prepareCommand: 'node recover-prepare.js', buildCommand: '', artifactPatterns: [], source: 'manual', enabled: true, detectedChecksum: '' },
  ]
  runtime.saveProjectDisplayName(project, '运行工作台自测')
  const configured = runtime.saveProjectRuntimeConfig(project, { profiles })
  assert.equal(configured.selected_profile_id, 'runtime_one')
  assert.equal(runtime.projectDisplayName(project), '运行工作台自测')
  assert.throws(() => runtime.saveProjectRuntimeConfig(project, { profiles: [{ ...profiles[0], runCommand: 'java -jar target/app.jar' }] }), /必须运行源码/)

  const streamedLogEvents = []
  const unsubscribeLogs = runtime.subscribeProjectRuntimeLogs(project, 'runtime_one', 'run', event => streamedLogEvents.push(event))
  const first = runtime.startProjectRuntime(project, 'runtime_one')
  const second = runtime.startProjectRuntime(project, 'runtime_two')
  assert.ok(first.state.pid > 0 && second.state.pid > 0 && first.state.pid !== second.state.pid)
  assert.equal(first.state.managerPid, process.pid)
  assert.throws(() => runtime.startProjectRuntime(project, 'runtime_one'), /已经启动/)
  let snapshot = runtime.getProjectRuntimeSnapshot(project)
  assert.equal(snapshot.processes.filter(item => item.status === 'running').length, 2)
  for (let attempt = 0; attempt < 20 && !streamedLogEvents.some(event => event.content.includes('runtime-stream-ready')); attempt += 1) await sleep(50)
  assert.ok(streamedLogEvents.some(event => event.type === 'reset'))
  assert.ok(streamedLogEvents.some(event => event.type === 'chunk' && event.content.includes('runtime-stream-ready')))
  unsubscribeLogs()

  await runtime.stopProjectRuntime(project, 'runtime_one')
  await sleep(150)
  snapshot = runtime.getProjectRuntimeSnapshot(project)
  assert.equal(snapshot.processes.find(item => item.profileId === 'runtime_one').exitCode, null)
  assert.equal(snapshot.processes.find(item => item.profileId === 'runtime_two').status, 'running')
  const restarted = await runtime.restartProjectRuntime(project, 'runtime_one')
  assert.ok(restarted.state.pid > 0 && restarted.state.pid !== first.state.pid)

  runtime.buildProjectRuntime(project, 'runtime_one')
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(100)
    snapshot = runtime.getProjectRuntimeSnapshot(project)
    if (snapshot.builds.find(item => item.profileId === 'runtime_one')?.status !== 'building') break
  }
  const build = snapshot.builds.find(item => item.profileId === 'runtime_one')
  assert.equal(build.status, 'succeeded')
  assert.ok(build.artifacts.includes('dist'))

  await runtime.stopProjectRuntime(project, 'runtime_one')
  await sleep(150)
  const disconnectResult = await runtime.stopAllProjectRuntimes(project)
  assert.equal(disconnectResult.success, true)
  assert.equal(disconnectResult.stoppedProcesses, 1)
  snapshot = runtime.getProjectRuntimeSnapshot(project)
  assert.equal(snapshot.processes.find(item => item.profileId === 'runtime_two').status, 'stopped')
  assert.equal(snapshot.processes.find(item => item.profileId === 'runtime_two').stopReason, 'user')
  const recovery = runtime.startProjectRuntime(project, 'runtime_recovery')
  assert.ok(recovery.state.pid > 0)
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await sleep(50)
    snapshot = runtime.getProjectRuntimeSnapshot(project)
    const recoveryState = snapshot.processes.find(item => item.profileId === 'runtime_recovery')
    const recoveryLogs = runtime.getProjectRuntimeLogs(project, 'runtime_recovery', 'run', 100).logs
    if (recoveryState?.status === 'running' && recoveryLogs.includes('spring-service-ready')) break
  }
  const recoveryLogs = runtime.getProjectRuntimeLogs(project, 'runtime_recovery', 'run', 100).logs
  assert.match(recoveryLogs, /正在准备 Maven reactor 依赖/)
  assert.match(recoveryLogs, /Maven reactor 依赖准备完成/)
  assert.match(recoveryLogs, /spring-service-ready/)
  await runtime.stopProjectRuntime(project, 'runtime_recovery')
  runtime.saveProjectRuntimeConfig(project, { profiles: profiles.filter(item => item.id !== 'runtime_one') })
  assert.match(runtime.getProjectRuntimeLogs(project, 'runtime_one', 'run', 100).logs, /runtime-stream-ready/)
  const unsubscribeHistoricalLogs = runtime.subscribeProjectRuntimeLogs(project, 'runtime_one', 'run', () => {})
  unsubscribeHistoricalLogs()
  const apiSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/api/index.js'), 'utf8')
  const templateSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/projects/ProjectManager.template.html'), 'utf8')
  const headerSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/projects/ProjectWorkspaceHeader.vue'), 'utf8')
  const globalActionSource = fs.readFileSync(path.join(process.cwd(), 'backend/modules/global/global-agent-feishu-actions.ts'), 'utf8')
  const projectRoutesSource = fs.readFileSync(path.join(process.cwd(), 'backend/modules/projects/projects.ts'), 'utf8')
  const cliSource = fs.readFileSync(path.join(process.cwd(), 'ccm-package/bin/ccm.js'), 'utf8')
  const consoleSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/projects/ProjectRunConsole.vue'), 'utf8')
  const projectManagerSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
  const slashSource = fs.readFileSync(path.join(process.cwd(), 'backend/modules/tools/slash-commands.ts'), 'utf8')
  assert.match(apiSource, /runtimeAction:[\s\S]*\/api\/projects\/runtime\/action/)
  assert.match(templateSource, /<ProjectRuntimeBar/)
  assert.match(headerSource, /连接 Agent/)
  assert.match(globalActionSource, /\/api\/projects\/runtime\/action/)
  assert.match(projectRoutesSource, /\/api\/projects\/runtime\/log-stream/)
  assert.match(projectRoutesSource, /\/api\/projects\/runtime\/shutdown/)
  assert.match(cliSource, /return delegateLegacy\(\["stop", \.\.\.rest\]\)/)
  assert.match(projectRoutesSource, /const runtimeStop = explicit \? await stopAllProjectRuntimes\(projectName\) : null/)
  assert.match(consoleSource, /new Terminal\(/)
  assert.match(consoleSource, /new EventSource\(/)
  assert.match(consoleSource, /\/api\/projects\/runtime\/logs/)
  assert.match(consoleSource, /startFallbackPolling/)
  assert.match(consoleSource, /setInterval\([\s\S]*loadSnapshot/)
  assert.match(projectManagerSource, /const targetProfileId = selectedRuntimeProfileId\.value/)
  assert.match(projectManagerSource, /runtimeAction\(targetProject, targetProfileId, action\)/)
  assert.match(consoleSource, /position:fixed/)
  assert.match(consoleSource, /safe-area-inset-bottom/)
  assert.match(slashSource, /project-restart/)
  const utils = await import('../ccm-package/dist/test-agent/utils.js')
  const previousJavaHome = process.env.JAVA_HOME
  process.env.JAVA_HOME = path.join(workDir, 'fake-jdk')
  assert.equal(utils.buildTestAgentSubprocessEnv().JAVA_HOME, process.env.JAVA_HOME)
  assert.equal(utils.verificationCommandInvocation('mvn spring-boot:run').requiresShell, process.platform === 'win32')
  if (previousJavaHome === undefined) delete process.env.JAVA_HOME
  else process.env.JAVA_HOME = previousJavaHome
  console.log(JSON.stringify({ success: true, checks: { environmentPairing: true, childModuleDetection: true, inheritedSpringBootDetection: true, springBootRunsSourceNotJar: true, aggregatorRemainsBuildOnly: true, runnableProfileSelectedByDefault: true, javaToolchainEnvironmentInherited: true, windowsMavenShellCompatibility: true, mavenReactorAutoRecovery: true, liveLogResetAndChunk: true, staleProfileLogsRemainReadable: true, disconnectedStreamUsesSnapshotFallback: true, runtimeActionKeepsExactProfileBinding: true, userStopIsNotFailure: true, projectDisconnectStopsAllRuntimes: true, ideaStyleRunConsole: true, stableDisplayName: true, parallelProcesses: true, duplicateStartBlocked: true, exactStop: true, restartUsesNewPid: true, realBuildArtifact: true, runtimeApiWired: true, runtimeUiWired: true, agentConnectionSeparated: true, globalAndFeishuStructuredActions: true, slashCommandsUpdated: true } }, null, 2))
} finally {
  try {
    const runtime = await import('../ccm-package/dist/modules/projects/project-runtime.js')
    for (const id of ['runtime_one', 'runtime_two', 'runtime_recovery']) try { await runtime.stopProjectRuntime(project, id) } catch {}
  } catch {}
  try { fs.rmSync(configFile, { force: true }) } catch {}
  try { fs.rmSync(workDir, { recursive: true, force: true }) } catch {}
  try { fs.rmSync(runtimeLogDir, { recursive: true, force: true }) } catch {}
  cleanupState()
  if (originalMetadata) fs.writeFileSync(metadataFile, originalMetadata)
  else try { fs.rmSync(metadataFile, { force: true }) } catch {}
}
