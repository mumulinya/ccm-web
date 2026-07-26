<script setup>
import { computed, ref, watch } from 'vue'
import { CheckCircle2, CircleAlert, Cpu, FlaskConical, HardDrive, Plus, RefreshCw, Save, Trash2, X } from '@lucide/vue'

const props = defineProps({
  snapshot: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  testResult: { type: Object, default: null },
})
const emit = defineEmits(['close', 'save', 'rescan', 'test-toolchain'])
const profiles = ref([])
const selectedProfileId = ref('')
const defaultToolchain = () => ({
  schema: 'ccm-project-java-toolchain-v1',
  jdkMode: 'inherit',
  jdkHome: '',
  mavenMode: 'auto',
  mavenHome: '',
  settingsPath: '',
  localRepository: '',
  offline: false,
})
const toolchain = ref(defaultToolchain())

watch(() => props.snapshot, value => {
  profiles.value = JSON.parse(JSON.stringify(value?.profiles || []))
  selectedProfileId.value = value?.selected_profile_id || profiles.value.find(item => item.enabled !== false)?.id || ''
  toolchain.value = { ...defaultToolchain(), ...(JSON.parse(JSON.stringify(value?.toolchain || {}))) }
}, { immediate: true, deep: true })

const jdkCandidates = computed(() => props.snapshot?.toolchain_candidates?.jdk || [])
const mavenCandidates = computed(() => props.snapshot?.toolchain_candidates?.maven || [])
const wrapperAvailable = computed(() => props.snapshot?.toolchain_candidates?.wrapper?.available === true)

const addProfile = () => {
  const id = `manual_${Date.now().toString(36)}`
  profiles.value.push({ id, label: '自定义运行配置', projectId: props.snapshot?.project || '', modulePath: '.', projectType: 'custom', environment: 'default', runCommand: '', buildCommand: '', artifactPatterns: [], source: 'manual', enabled: true, detectedChecksum: '' })
  selectedProfileId.value ||= id
}
const removeProfile = profile => {
  profiles.value = profiles.value.filter(item => item.id !== profile.id)
  if (selectedProfileId.value === profile.id) selectedProfileId.value = profiles.value.find(item => item.enabled !== false)?.id || ''
}
const save = () => emit('save', { profiles: profiles.value, selectedProfileId: selectedProfileId.value, toolchain: toolchain.value })
const testToolchain = () => emit('test-toolchain', toolchain.value)
const resultText = result => String(result?.output || result?.error || '未返回版本信息').trim().split(/\r?\n/).filter(Boolean).slice(0, 3).join(' · ')
</script>

<template>
  <div class="runtime-config-overlay" @click.self="emit('close')">
    <section class="runtime-config-modal" role="dialog" aria-modal="true" aria-labelledby="runtime-config-title">
      <header>
        <div><h3 id="runtime-config-title">项目运行配置</h3><p>自动识别配置可以继续编辑；重新扫描不会覆盖已有修改。</p></div>
        <button class="icon" title="关闭" @click="emit('close')"><X :size="18" /></button>
      </header>

      <div class="config-toolbar">
        <label>默认配置
          <select v-model="selectedProfileId">
            <option value="">未选择</option>
            <option v-for="profile in profiles.filter(item => item.enabled !== false)" :key="profile.id" :value="profile.id">{{ profile.label }}</option>
          </select>
        </label>
        <button :disabled="busy" @click="emit('rescan')"><RefreshCw :size="15" />重新扫描</button>
        <button @click="addProfile"><Plus :size="15" />添加配置</button>
      </div>

      <section class="toolchain-panel">
        <div class="toolchain-heading">
          <div class="toolchain-icon"><Cpu :size="18" /></div>
          <div>
            <strong>Java 工具链</strong>
            <p>为当前项目固定 JDK 与 Maven。自定义 Maven会跳过 Wrapper发行包下载，依赖继续复用本地仓库。</p>
          </div>
          <button :disabled="busy" @click="testToolchain"><FlaskConical :size="15" />测试工具链</button>
        </div>

        <div class="toolchain-grid">
          <label>JDK来源
            <select v-model="toolchain.jdkMode">
              <option value="inherit">继承 CCM 环境</option>
              <option value="custom">指定 JDK目录</option>
            </select>
          </label>
          <label class="wide">JDK目录
            <input
              v-model="toolchain.jdkHome"
              list="project-jdk-candidates"
              :disabled="toolchain.jdkMode !== 'custom'"
              placeholder="例如 C:\Program Files\Java\jdk-21"
              spellcheck="false"
            >
            <datalist id="project-jdk-candidates">
              <option v-for="candidate in jdkCandidates" :key="candidate.home" :value="candidate.home">{{ candidate.source }}</option>
            </datalist>
          </label>

          <label>Maven来源
            <select v-model="toolchain.mavenMode">
              <option value="auto">自动（Wrapper优先）</option>
              <option value="wrapper" :disabled="!wrapperAvailable">项目 Maven Wrapper</option>
              <option value="system">系统 PATH 中的 Maven</option>
              <option value="custom">指定 Maven目录</option>
            </select>
          </label>
          <label class="wide">Maven目录
            <input
              v-model="toolchain.mavenHome"
              list="project-maven-candidates"
              :disabled="toolchain.mavenMode !== 'custom'"
              placeholder="例如 D:\apache-maven-3.9.9"
              spellcheck="false"
            >
            <datalist id="project-maven-candidates">
              <option v-for="candidate in mavenCandidates" :key="candidate.home" :value="candidate.home">{{ candidate.source }}</option>
            </datalist>
          </label>

          <label class="wide">settings.xml
            <input v-model="toolchain.settingsPath" placeholder="可选，例如 C:\Users\you\.m2\settings.xml" spellcheck="false">
          </label>
          <label class="wide">Maven本地仓库
            <span class="input-with-icon"><HardDrive :size="14" /><input v-model="toolchain.localRepository" placeholder="留空使用 ~/.m2/repository" spellcheck="false"></span>
          </label>
        </div>

        <div class="toolchain-options">
          <label class="offline-option"><input v-model="toolchain.offline" type="checkbox">离线运行 Maven，仅使用本地仓库缓存</label>
          <span v-if="toolchain.mavenMode === 'wrapper' || (toolchain.mavenMode === 'auto' && wrapperAvailable)">Wrapper 首次使用指定版本时仍可能下载 Maven发行包。</span>
          <span v-else-if="toolchain.mavenMode === 'custom'">将使用指定 Maven，不下载 Wrapper发行包。</span>
        </div>

        <div v-if="testResult" class="toolchain-result" :class="{ success: testResult.success, failed: !testResult.success }">
          <CheckCircle2 v-if="testResult.success" :size="17" />
          <CircleAlert v-else :size="17" />
          <div v-if="testResult.error"><strong>工具链验证失败</strong><p>{{ testResult.error }}</p></div>
          <div v-else>
            <strong>{{ testResult.success ? 'JDK 与 Maven 均可用' : '工具链存在不可用项' }}</strong>
            <p>Java：{{ resultText(testResult.java) }}</p>
            <p>Maven：{{ resultText(testResult.maven) }}</p>
          </div>
        </div>
      </section>

      <div class="profiles">
        <div v-if="!profiles.length" class="empty">暂无运行配置，可以重新扫描项目或手动添加。</div>
        <article v-for="profile in profiles" :key="profile.id" class="profile" :class="{ stale: profile.stale }">
          <div class="profile-top">
            <label class="enabled"><input v-model="profile.enabled" type="checkbox">启用</label>
            <span>{{ profile.source === 'manual' ? '手动配置' : profile.stale ? '配置已失效' : '自动识别' }}</span>
            <button class="icon danger" title="删除配置" @click="removeProfile(profile)"><Trash2 :size="15" /></button>
          </div>
          <div class="field-grid">
            <label>名称<input v-model="profile.label" maxlength="100"></label>
            <label>类型
              <select v-model="profile.projectType">
                <option v-for="type in ['node','maven','gradle','go','rust','dotnet','custom']" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label>模块目录<input v-model="profile.modulePath" placeholder="."></label>
            <label>环境<input v-model="profile.environment" placeholder="default"></label>
          </div>
          <label>启动命令<input v-model="profile.runCommand" spellcheck="false" placeholder="例如 npm run dev"></label>
          <label>构建命令<input v-model="profile.buildCommand" spellcheck="false" placeholder="例如 npm run build 或 mvn package"></label>
          <label>产物路径<input :value="(profile.artifactPatterns || []).join(', ')" spellcheck="false" placeholder="dist, target/*.jar" @input="profile.artifactPatterns = $event.target.value.split(',').map(item => item.trim()).filter(Boolean)"></label>
        </article>
      </div>

      <footer><button @click="emit('close')">取消</button><button class="primary" :disabled="busy" @click="save"><Save :size="16" />保存运行配置</button></footer>
    </section>
  </div>
</template>

<style scoped>
.runtime-config-overlay { position:fixed; inset:0; z-index:10040; display:grid; place-items:center; padding:22px; background:rgba(15,23,42,.42); backdrop-filter:blur(4px); }
.runtime-config-modal { width:min(820px,100%); max-height:calc(100vh - 44px); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color); border-radius:8px; background:var(--surface); color:var(--text-primary); box-shadow:0 24px 70px rgba(15,23,42,.25); }
header,footer,.config-toolbar { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid var(--border-color); }
header > div { flex:1; min-width:0; } h3 { margin:0; font-size:16px; } p { margin:4px 0 0; color:var(--text-muted); font-size:11px; }
.config-toolbar { align-items:flex-end; background:var(--bg-secondary); }
.config-toolbar label { flex:1; }
.toolchain-panel { padding:14px 18px 12px; border-bottom:1px solid var(--border-color); background:color-mix(in srgb,var(--surface) 96%,var(--accent-soft) 4%); }
.toolchain-heading { display:flex; align-items:center; gap:10px; margin-bottom:13px; }
.toolchain-heading > div:nth-child(2) { min-width:0; flex:1; }
.toolchain-heading strong { font-size:13px; }
.toolchain-heading p { margin:3px 0 0; color:var(--text-muted); font-size:10px; line-height:1.45; }
.toolchain-icon { width:34px; height:34px; display:grid; flex:0 0 34px; place-items:center; border:1px solid color-mix(in srgb,var(--accent-blue) 24%,var(--border-color)); border-radius:7px; background:var(--accent-soft); color:var(--accent-blue); }
.toolchain-grid { display:grid; grid-template-columns:minmax(150px,.75fr) minmax(280px,1.6fr); gap:0 10px; }
.toolchain-grid label.wide { min-width:0; }
.toolchain-options { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:26px; color:var(--text-muted); font-size:9.5px; }
.offline-option { flex-direction:row; align-items:center; gap:7px; margin:0; color:var(--text-secondary); }
.offline-option input { width:14px; height:14px; }
.input-with-icon { position:relative; display:flex; align-items:center; }
.input-with-icon > svg { position:absolute; left:9px; z-index:1; color:var(--text-muted); pointer-events:none; }
.input-with-icon input { padding-left:30px; }
.toolchain-result { display:flex; align-items:flex-start; gap:9px; margin-top:10px; padding:9px 10px; border:1px solid var(--border-color); border-radius:7px; background:var(--surface); color:var(--text-secondary); }
.toolchain-result.success { border-color:color-mix(in srgb,#16a34a 34%,var(--border-color)); color:#15803d; }
.toolchain-result.failed { border-color:color-mix(in srgb,#dc2626 34%,var(--border-color)); color:#dc2626; }
.toolchain-result > svg { flex:0 0 auto; margin-top:1px; }
.toolchain-result strong { font-size:11px; }
.toolchain-result p { margin:2px 0 0; color:var(--text-muted); font-size:9.5px; line-height:1.45; overflow-wrap:anywhere; }
.profiles { min-height:0; overflow-y:auto; padding:14px 18px; }
.profile { margin-bottom:10px; padding:13px; border:1px solid var(--border-color); border-radius:7px; background:var(--surface); }
.profile.stale { border-color:#f59e0b; }
.profile-top { display:flex; align-items:center; gap:10px; margin-bottom:10px; color:var(--text-muted); font-size:11px; }
.profile-top .danger { margin-left:auto; color:#dc2626; }
.enabled { display:flex; flex-direction:row; align-items:center; gap:6px; }
.field-grid { display:grid; grid-template-columns:minmax(0,2fr) minmax(110px,1fr) minmax(0,1.5fr) minmax(110px,1fr); gap:9px; }
label { display:flex; flex-direction:column; gap:5px; margin-bottom:9px; color:var(--text-secondary); font-size:11px; font-weight:650; }
input,select { width:100%; height:34px; padding:0 9px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-primary); font:inherit; font-weight:500; }
input:disabled,select:disabled { opacity:.55; cursor:not-allowed; background:var(--bg-secondary); }
button { height:34px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 11px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface); color:var(--text-primary); cursor:pointer; }
button.icon { width:34px; padding:0; } button:disabled { opacity:.45; cursor:not-allowed; } button.primary { border-color:#2563eb; background:#2563eb; color:white; }
footer { justify-content:flex-end; border-top:1px solid var(--border-color); border-bottom:0; }
.empty { padding:42px 10px; text-align:center; color:var(--text-muted); font-size:12px; }
@media(max-width:700px) { .runtime-config-overlay { padding:8px; } .runtime-config-modal { max-height:calc(100vh - 16px); } .config-toolbar { align-items:stretch; flex-wrap:wrap; } .config-toolbar label { width:100%; flex-basis:100%; } .toolchain-panel { max-height:52vh; overflow-y:auto; } .toolchain-heading { align-items:flex-start; flex-wrap:wrap; } .toolchain-heading > button { width:100%; } .toolchain-grid,.field-grid { grid-template-columns:1fr; } .toolchain-options { align-items:flex-start; flex-direction:column; } }
</style>
