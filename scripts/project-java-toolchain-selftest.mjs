import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const project = `ccm-java-toolchain-selftest-${process.pid}`
const ccmDir = path.join(os.homedir(), '.cc-connect')
const workDir = path.join(os.tmpdir(), project)
const configFile = path.join(ccmDir, 'configs', `config-${project}.toml`)
const metadataFile = path.join(ccmDir, 'project-configs.json')
const originalMetadata = fs.existsSync(metadataFile) ? fs.readFileSync(metadataFile, 'utf8') : ''
const tomlPath = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

try {
  fs.rmSync(workDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(workDir, 'fake-jdk', 'bin'), { recursive: true })
  fs.mkdirSync(path.join(workDir, 'fake-maven', 'bin'), { recursive: true })
  fs.mkdirSync(path.join(workDir, 'config'), { recursive: true })
  const javaName = process.platform === 'win32' ? 'java.exe' : 'java'
  const javacName = process.platform === 'win32' ? 'javac.exe' : 'javac'
  const mvnName = process.platform === 'win32' ? 'mvn.cmd' : 'mvn'
  fs.writeFileSync(path.join(workDir, 'fake-jdk', 'bin', javaName), '')
  fs.writeFileSync(path.join(workDir, 'fake-jdk', 'bin', javacName), '')
  fs.writeFileSync(path.join(workDir, 'fake-maven', 'bin', mvnName), '')
  fs.writeFileSync(path.join(workDir, 'config', 'settings.xml'), '<settings />\n')
  fs.writeFileSync(path.join(workDir, 'pom.xml'), '<project><modelVersion>4.0.0</modelVersion><groupId>demo</groupId><artifactId>demo</artifactId><version>1</version></project>\n')
  fs.mkdirSync(path.dirname(configFile), { recursive: true })
  fs.writeFileSync(configFile, `language = "zh"\n[[projects]]\nname = "${project}"\nwork_dir = "${tomlPath(workDir)}"\n[projects.agent]\ntype = "claudecode"\n`)

  const runtime = await import(`../ccm-package/dist/modules/projects/project-runtime.js?toolchain=${Date.now()}`)
  const profile = {
    id: 'runtime_maven',
    label: 'Spring Boot',
    projectId: project,
    modulePath: '.',
    projectType: 'maven',
    environment: 'default',
    runCommand: 'mvn spring-boot:run',
    buildCommand: 'mvn package',
    artifactPatterns: ['target/*.jar'],
    source: 'manual',
    enabled: true,
    detectedChecksum: '',
  }
  const toolchain = {
    schema: 'ccm-project-java-toolchain-v1',
    jdkMode: 'custom',
    jdkHome: path.join(workDir, 'fake-jdk'),
    mavenMode: 'custom',
    mavenHome: path.join(workDir, 'fake-maven'),
    settingsPath: path.join(workDir, 'config', 'settings.xml'),
    localRepository: path.join(workDir, '.cache', 'm2'),
    offline: true,
  }
  const saved = runtime.saveProjectRuntimeConfig(project, { profiles: [profile], selectedProfileId: profile.id, toolchain })
  assert.deepEqual(saved.toolchain, toolchain)
  const execution = runtime.resolveProjectJavaToolchainExecution(project)
  assert.equal(execution.env.JAVA_HOME, toolchain.jdkHome)
  assert.equal(execution.env.MAVEN_HOME, toolchain.mavenHome)
  assert.match(execution.mavenExecutable.replace(/\\/g, '/'), /fake-maven\/bin\/mvn/)
  assert.deepEqual(execution.mavenArgs, ['-s', toolchain.settingsPath, `-Dmaven.repo.local=${toolchain.localRepository}`, '-o'])
  assert.equal(fs.existsSync(toolchain.localRepository), true)
  assert.throws(
    () => runtime.saveProjectRuntimeConfig(project, { profiles: [profile], toolchain: { ...toolchain, jdkHome: 'relative/jdk' } }),
    /绝对路径/,
  )
  assert.throws(
    () => runtime.saveProjectRuntimeConfig(project, { profiles: [profile], toolchain: { ...toolchain, mavenMode: 'wrapper' } }),
    /不存在 Maven Wrapper/,
  )
  const wrapperName = process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw'
  fs.writeFileSync(path.join(workDir, wrapperName), '')
  assert.equal(runtime.detectProjectJavaToolchainCandidates(project).wrapper.available, true)

  const routeSource = fs.readFileSync(path.join(process.cwd(), 'backend/modules/projects/projects.ts'), 'utf8')
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'backend/modules/projects/project-runtime.ts'), 'utf8')
  const apiSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/api/index.js'), 'utf8')
  const modalSource = fs.readFileSync(path.join(process.cwd(), 'frontend/src/components/projects/ProjectRuntimeConfigModal.vue'), 'utf8')
  assert.match(routeSource, /\/api\/projects\/runtime\/toolchain-test/)
  assert.match(apiSource, /runtimeToolchainTest/)
  assert.match(runtimeSource, /toolchain\.mavenExecutable|toolchain\.mavenArgs/)
  assert.match(runtimeSource, /buildTestAgentSubprocessEnv\(toolchain\.env\)/)
  for (const label of ['Java 工具链', 'JDK来源', 'Maven来源', 'settings.xml', 'Maven本地仓库', '测试工具链']) {
    assert.match(modalSource, new RegExp(label))
  }
  assert.match(modalSource, /\.toolchain-panel\s*\{\s*flex:0 0 auto;/)
  assert.match(modalSource, /max-height:min\(52vh,calc\(100vh - 412px\)\)/)
  assert.match(modalSource, /\.profiles\s*\{\s*flex:1 1 auto;\s*min-height:120px;/)

  console.log(JSON.stringify({
    success: true,
    checks: {
      projectScopedPersistence: true,
      customJdkEnvironment: true,
      customMavenExecutable: true,
      settingsAndRepositoryArgs: true,
      offlineMode: true,
      unsafeRelativePathRejected: true,
      missingWrapperRejected: true,
      wrapperDetection: true,
      testApiWired: true,
      projectUiWired: true,
      mobileToolchainPaneUsable: true,
      paidProviderCalls: 0,
    },
  }, null, 2))
} finally {
  try { fs.rmSync(configFile, { force: true }) } catch {}
  try { fs.rmSync(workDir, { recursive: true, force: true }) } catch {}
  if (originalMetadata) fs.writeFileSync(metadataFile, originalMetadata)
  else try { fs.rmSync(metadataFile, { force: true }) } catch {}
}
