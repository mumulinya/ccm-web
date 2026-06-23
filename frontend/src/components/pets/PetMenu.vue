<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  agents: { type: Array, default: () => [] }
})
const emit = defineEmits(['agents-updated'])

const rightTab = ref('config')
const selectedAgent = ref(null)
const agentLabelDraft = ref('')
const desktopPetRunning = ref(false)
const petConfigs = ref({})
const petPositions = ref({})
const actionPetType = ref('cat')
const assetVersion = ref(Date.now())
const uploadInputs = ref({})
const uploadingAsset = ref('')
const projectPetStrategy = ref({ idle: [], active: [], idleCycleSeconds: 0 })
const MUSIC_PET_AGENT_NAME = 'music-agent'

const customPetTypes = ref([])
const imageErrors = ref({})
const handleImageError = (row) => {
  imageErrors.value[row.assetPath] = true
}
const isPixelated = (type) => {
  return type === 'clawd'
}

// 加载宠物配置
const loadConfigs = async () => {
  try {
    const res = await fetch('/api/pets/config')
    const data = await res.json()
    petConfigs.value = data.configs || {}
    petPositions.value = data.positions || {}
    customPetTypes.value = data.customTypes || []
  } catch {
    petConfigs.value = {}
    petPositions.value = {}
    customPetTypes.value = []
  }
}

// 保存宠物配置
const saveConfigs = async () => {
  try {
    await fetch('/api/pets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configs: petConfigs.value,
        positions: petPositions.value,
        customTypes: customPetTypes.value
      })
    })
  } catch {}
}

// 检查桌面宠物状态
const checkDesktopPet = async () => {
  try {
    const res = await fetch('/api/pets/status')
    const data = await res.json()
    desktopPetRunning.value = data.running || false
  } catch {}
}

const launchDesktopPet = async () => {
  try {
    const res = await fetch('/api/pets/launch', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      desktopPetRunning.value = true
    } else {
      alert(data.error || '启动失败')
    }
  } catch (e) {
    alert('启动失败: ' + e.message)
  }
}

const closeDesktopPet = async () => {
  try {
    const res = await fetch('/api/pets/close', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      desktopPetRunning.value = false
    } else {
      alert(data.error || '关闭失败')
    }
  } catch (e) {
    alert('关闭失败: ' + e.message)
  }
}

const fallbackPetTypes = [
  { id: 'cat', name: '小猫咪', emoji: '🐱', color: '#FF9800' },
  { id: 'crab', name: '小螃蟹', emoji: '🦀', color: '#FF5722' },
  { id: 'clawd', name: 'Clawd', emoji: '🦀', color: '#E4572E' },
  { id: 'robot', name: '机器人', emoji: '🤖', color: '#607D8B' },
  { id: 'ghost', name: '小幽灵', emoji: '👻', color: '#B39DDB' },
  { id: 'panda', name: '大熊猫', emoji: '🐼', color: '#3f3f46' },
  { id: 'fox', name: '小狐狸', emoji: '🦊', color: '#f97316' },
  { id: 'rabbit', name: '小兔子', emoji: '🐰', color: '#cbd5e1' },
  { id: 'yuexinmiao', name: '月薪喵', emoji: '🐱', color: '#22c55e' },
  { id: 'cloudling', name: '小云朵', emoji: '☁️', color: '#38bdf8' },
  { id: 'calico', name: '三花猫', emoji: '🐱', color: '#d97706' }
]

const petTypes = computed(() => {
  return [...fallbackPetTypes, ...customPetTypes.value]
})

const getPetIconPath = (type) => {
  const custom = customPetTypes.value.find(c => c.id === type)
  if (custom) {
    return `/pets/${type}.${custom.format || 'png'}`
  }
  if (type === 'miao') return `/pets/miao.png`
  return `/pets/${type || 'cat'}.svg`
}

const stateActions = [
  { state: 'idle', label: '待机' },
  { state: 'thinking', label: '思考' },
  { state: 'working', label: '工作' },
  { state: 'juggling', label: '音乐/律动' },
  { state: 'sweeping', label: '整理上下文' },
  { state: 'carrying', label: '搬运资料' },
  { state: 'notification', label: '提醒' },
  { state: 'attention', label: '完成/开心' },
  { state: 'happy', label: '成功' },
  { state: 'error', label: '错误' },
  { state: 'yawning', label: '打哈欠' },
  { state: 'dozing', label: '犯困' },
  { state: 'collapsing', label: '入睡过渡' },
  { state: 'sleeping', label: '睡觉' },
  { state: 'waking', label: '醒来' },
]

const reactionActions = [
  { key: 'drag', label: '拖拽' },
  { key: 'clickLeft', label: '左键点击' },
  { key: 'clickRight', label: '右键点击' },
  { key: 'double', label: '双击' },
]

const fallbackProjectPetStrategy = {
  idleCycleSeconds: 80,
  idle: [
    { order: 1, state: 'idle', seconds: 10, detail: '空闲，等待指令' },
    { order: 2, state: 'thinking', seconds: 10, detail: '例行观察项目状态' },
    { order: 3, state: 'carrying', seconds: 10, detail: '整理任务资料' },
    { order: 4, state: 'sweeping', seconds: 10, detail: '清扫工作区上下文' },
    { order: 5, state: 'notification', seconds: 10, detail: '有空可以看看待处理任务' },
    { order: 6, state: 'juggling', seconds: 10, detail: '休息一下，保持节奏' },
    { order: 7, state: 'happy', seconds: 10, detail: '保持在线' },
    { order: 8, state: 'idle', seconds: 10, detail: '空闲，等待指令' },
  ],
  active: [
    { order: 1, state: 'working', seconds: 90, detail: 'Agent 调用中', trigger: '用户向项目 Agent 提问、群聊协作、定时任务执行' },
    { order: 2, state: 'happy', seconds: 12, detail: '任务完成', trigger: '项目 Agent 成功完成回复或协作任务' },
    { order: 3, state: 'error', seconds: 45, detail: '错误', trigger: '项目 Agent 调用失败或任务执行报错' },
    { order: 4, state: 'attention', seconds: 12, detail: '正在展示回复', trigger: '项目 Agent 输出消息气泡时' },
  ],
}

const getStateLabel = (state) => stateActions.find(action => action.state === state)?.label || state

const formatStrategyDuration = (seconds) => {
  const value = Number(seconds) || 0
  if (value < 60) return `${value}s`
  const minutes = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

const loadPetActionStrategy = async () => {
  try {
    const res = await fetch('/api/pets/action-strategy')
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '加载失败')
    projectPetStrategy.value = data.project || fallbackProjectPetStrategy
  } catch {
    projectPetStrategy.value = fallbackProjectPetStrategy
  }
}

const stateFileMap = (type) => ({
  idle: `${type}-idle.svg`,
  thinking: `${type}-thinking.svg`,
  working: `${type}-working.svg`,
  error: `${type}-error.svg`,
  attention: `${type}-attention.svg`,
  happy: `${type}-happy.svg`,
  notification: `${type}-notification.svg`,
  carrying: `${type}-carrying.svg`,
  sweeping: `${type}-sweeping.svg`,
  juggling: `${type}-juggling.svg`,
  yawning: `${type}-yawning.svg`,
  dozing: `${type}-dozing.svg`,
  collapsing: `${type}-collapsing.svg`,
  sleeping: `${type}-sleeping.svg`,
  waking: `${type}-waking.svg`,
})

const defaultReactions = (type) => ({
  drag: `${type}-react-drag.svg`,
  clickLeft: `${type}-react-left.svg`,
  clickRight: `${type}-react-right.svg`,
  double: `${type}-react-double.svg`,
})

const specialPetAssets = {
  clawd: {
    dir: 'clawd',
    files: {
      idle: 'clawd-idle-follow.svg',
      yawning: 'clawd-idle-yawn.svg',
      dozing: 'clawd-idle-doze.svg',
      collapsing: 'clawd-collapse-sleep.svg',
      thinking: 'clawd-working-thinking.svg',
      working: 'clawd-working-typing.svg',
      juggling: 'clawd-headphones-groove.svg',
      sweeping: 'clawd-working-sweeping.svg',
      error: 'clawd-error.svg',
      attention: 'clawd-happy.svg',
      happy: 'clawd-happy.svg',
      notification: 'clawd-notification.svg',
      carrying: 'clawd-working-carrying.svg',
      sleeping: 'clawd-sleeping.svg',
      waking: 'clawd-wake.svg',
    },
    idleAnimations: ['clawd-idle-look.svg', 'clawd-idle-bubble.svg', 'clawd-idle-reading.svg'],
    reactions: {
      drag: 'clawd-react-drag.svg',
      clickLeft: 'clawd-react-left.svg',
      clickRight: 'clawd-react-right.svg',
      double: 'clawd-react-double.svg',
    }
  },
  cloudling: {
    dir: 'cloudling',
    files: {
      idle: 'cloudling-idle.svg',
      yawning: 'cloudling-idle-to-dozing.svg',
      dozing: 'cloudling-dozing.svg',
      collapsing: 'cloudling-dozing-to-sleeping.svg',
      thinking: 'cloudling-thinking.svg',
      working: 'cloudling-typing.svg',
      juggling: 'cloudling-juggling.svg',
      sweeping: 'cloudling-sweeping.svg',
      error: 'cloudling-error.svg',
      attention: 'cloudling-attention.svg',
      happy: 'cloudling-attention.svg',
      notification: 'cloudling-notification.svg',
      carrying: 'cloudling-carrying.svg',
      sleeping: 'cloudling-sleeping.svg',
      waking: 'cloudling-sleeping-to-idle.svg',
    },
    idleAnimations: ['cloudling-idle-reading.svg'],
    reactions: { drag: 'cloudling-react-drag.svg' }
  },
  calico: {
    dir: 'calico',
    files: {
      idle: 'calico-idle-follow.svg',
      yawning: 'calico-yawning.apng',
      dozing: 'calico-dozing.apng',
      collapsing: 'calico-collapsing.apng',
      thinking: 'calico-thinking.apng',
      working: 'calico-working-typing.apng',
      juggling: 'calico-working-juggling.apng',
      sweeping: 'calico-working-sweeping.apng',
      error: 'calico-error.apng',
      attention: 'calico-happy.apng',
      happy: 'calico-happy.apng',
      notification: 'calico-notification.apng',
      carrying: 'calico-working-carrying.apng',
      sleeping: 'calico-sleeping.apng',
      waking: 'calico-waking.apng',
    },
    idleAnimations: ['calico-idle.apng'],
    reactions: {
      drag: 'calico-react-drag.apng',
      clickLeft: 'calico-react-poke.apng',
      clickRight: 'calico-react-poke.apng',
      double: 'calico-react-poke.apng',
    }
  },
  miao: {
    dir: '',
    files: {
      idle: 'miao-idle.png',
      thinking: 'miao-thinking.png',
      working: 'miao-working.png',
      error: 'miao-error.png',
      attention: 'miao-attention.png',
      happy: 'miao-happy.png',
      notification: 'miao-notification.png',
      carrying: 'miao-carrying.png',
      sweeping: 'miao-sweeping.png',
      juggling: 'miao-juggling.png',
      yawning: 'miao-yawning.png',
      dozing: 'miao-dozing.png',
      collapsing: 'miao-collapsing.png',
      sleeping: 'miao-sleeping.png',
      waking: 'miao-waking.png',
    },
    idleAnimations: [],
    reactions: {
      drag: 'miao-react-drag.png',
      clickLeft: 'miao-react-left.png',
      clickRight: 'miao-react-right.png',
      double: 'miao-react-double.png',
    }
  }
}

const getPetAssetSpec = (type) => {
  if (specialPetAssets[type]) return specialPetAssets[type]
  
  const custom = customPetTypes.value.find(c => c.id === type)
  if (custom) {
    const format = custom.format || 'png'
    const statesMap = {}
    for (const action of stateActions) {
      statesMap[action.state] = `${type}-${action.state}.${format}`
    }
    const reactionsMap = {
      drag: `${type}-react-drag.${format}`,
      clickLeft: `${type}-react-left.${format}`,
      clickRight: `${type}-react-right.${format}`,
      double: `${type}-react-double.${format}`,
    }
    return {
      dir: '',
      files: statesMap,
      idleAnimations: [],
      reactions: reactionsMap
    }
  }

  const idleExtras = ['panda', 'fox', 'rabbit', 'yuexinmiao'].includes(type)
    ? [`${type}-idle-action1.svg`, `${type}-idle-action2.svg`, `${type}-idle-action3.svg`]
    : []
  return {
    dir: '',
    files: stateFileMap(type),
    idleAnimations: idleExtras,
    reactions: defaultReactions(type),
  }
}

const makeAssetPath = (spec, file) => spec.dir ? `${spec.dir}/${file}` : file

const actionAssetRows = computed(() => {
  const type = actionPetType.value || 'cat'
  const spec = getPetAssetSpec(type)
  const custom = customPetTypes.value.find(c => c.id === type)
  const baseExt = (custom && custom.format) ? custom.format : 'svg'
  const rows = [{
    key: `${type}:base`,
    group: '基础',
    label: '默认头像',
    assetPath: `${type}.${baseExt}`,
  }]

  for (const action of stateActions) {
    const file = spec.files[action.state]
    if (!file) continue
    rows.push({
      key: `${type}:state:${action.state}`,
      group: '状态',
      label: action.label,
      state: action.state,
      assetPath: makeAssetPath(spec, file),
    })
  }

  ;(spec.idleAnimations || []).forEach((file, index) => {
    rows.push({
      key: `${type}:idle-extra:${index}`,
      group: '待机动作',
      label: `待机变化 ${index + 1}`,
      assetPath: makeAssetPath(spec, file),
    })
  })

  for (const action of reactionActions) {
    const file = spec.reactions?.[action.key]
    if (!file) continue
    rows.push({
      key: `${type}:reaction:${action.key}`,
      group: '交互',
      label: action.label,
      assetPath: makeAssetPath(spec, file),
    })
  }

  return rows
})

const assetUrl = (assetPath) => `/pets/${assetPath}?v=${assetVersion.value}`
const assetFileName = (assetPath) => assetPath.split('/').pop()
const canUploadAsset = (row) => row.assetPath.toLowerCase().endsWith('.svg') || row.assetPath.toLowerCase().endsWith('.png')

const setUploadInput = (assetPath, el) => {
  if (el) uploadInputs.value[assetPath] = el
}

const chooseAssetFile = (row) => {
  uploadInputs.value[row.assetPath]?.click()
}

const uploadAssetFile = async (row, event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext !== 'svg' && ext !== 'png') {
    toast.warning('请选择 SVG 或 PNG 文件')
    return
  }
  const form = new FormData()
  form.append('assetPath', row.assetPath)
  form.append('file', file)
  uploadingAsset.value = row.assetPath
  try {
    const res = await fetch('/api/pets/assets/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || '上传失败')
    assetVersion.value = Date.now()
    imageErrors.value[row.assetPath] = false
    toast.success('动作资源已更新')
  } catch (e) {
    toast.error(e.message || '上传失败')
  } finally {
    uploadingAsset.value = ''
  }
}

const getAgentLabel = (agent) => {
  if (!agent) return ''
  const customLabel = String(getConfig(agent.name).label || '').trim()
  if (customLabel) return customLabel
  return agent.petLabel || agent.displayName || agent.label || agent.name
}

const getDefaultType = (agent) => {
  return agent === MUSIC_PET_AGENT_NAME ? 'cloudling' : 'cat'
}

const getConfig = (agent) => {
  return petConfigs.value[agent] || { type: getDefaultType(agent), enabled: true }
}

const selectedAgentInfo = computed(() => props.agents.find(agent => agent.name === selectedAgent.value))
const isMusicAgentSelected = computed(() => selectedAgent.value === MUSIC_PET_AGENT_NAME)

const syncAgentLabelDraft = () => {
  agentLabelDraft.value = getAgentLabel(selectedAgentInfo.value) || ''
}

const saveAgentLabel = async () => {
  if (!selectedAgent.value) return
  const label = agentLabelDraft.value.trim().slice(0, 24)
  if (!label) {
    toast.warning('名称不能为空')
    syncAgentLabelDraft()
    return
  }
  const config = getConfig(selectedAgent.value)
  petConfigs.value = { ...petConfigs.value, [selectedAgent.value]: { ...config, label } }
  await saveConfigs()
  emit('agents-updated')
  toast.success('名称已保存')
}

const updatePetType = (agent, type) => {
  const config = getConfig(agent)
  petConfigs.value = { ...petConfigs.value, [agent]: { ...config, type } }
  saveConfigs()
}

const togglePet = (agent) => {
  const config = getConfig(agent)
  petConfigs.value = { ...petConfigs.value, [agent]: { ...config, enabled: !config.enabled } }
  saveConfigs()
}

const selectAgent = (agent) => {
  selectedAgent.value = agent
  syncAgentLabelDraft()
  rightTab.value = 'config'
}

const allEnabled = computed(() => {
  if (props.agents.length === 0) return false
  return props.agents.every(a => getConfig(a.name).enabled !== false)
})

const toggleAll = () => {
  const nextVal = !allEnabled.value
  const newConfigs = { ...petConfigs.value }
  for (const p of props.agents) {
    newConfigs[p.name] = { ...(newConfigs[p.name] || { type: getDefaultType(p.name) }), enabled: nextVal }
  }
  petConfigs.value = newConfigs
  saveConfigs()
}

const showCreateModal = ref(false)
const newPetLabel = ref('')
const newPetType = ref('miao')

const allPetAgents = computed(() => {
  const list = [...props.agents]
  const projectNames = new Set(props.agents.map(a => a.name))
  
  for (const name of Object.keys(petConfigs.value)) {
    if (name !== MUSIC_PET_AGENT_NAME && !projectNames.has(name)) {
      const cfg = petConfigs.value[name]
      list.push({
        name: name,
        displayName: cfg.label || name,
        petLabel: cfg.label || name,
        virtual: true,
        type: 'custom'
      })
    }
  }
  return list
})

const createCustomPet = async () => {
  const label = newPetLabel.value.trim()
  if (!label) {
    toast.warning('请输入宠物昵称')
    return
  }
  const id = `custom-pet-${Date.now()}`
  petConfigs.value = {
    ...petConfigs.value,
    [id]: {
      type: newPetType.value,
      enabled: true,
      label: label,
      size: 150
    }
  }
  await saveConfigs()
  showCreateModal.value = false
  newPetLabel.value = ''
  selectedAgent.value = id
  syncAgentLabelDraft()
  toast.success('自定义宠物创建成功！已添加至桌面。')
  emit('agents-updated')
}

const isCustomPet = (agentName) => {
  if (!agentName || agentName === MUSIC_PET_AGENT_NAME) return false
  const projectNames = new Set(props.agents.map(a => a.name))
  return !projectNames.has(agentName)
}

const deleteCustomPet = async (agentName) => {
  if (!confirm('确定要删除这只自定义宠物吗？它将从桌面消失。')) return
  const newConfigs = { ...petConfigs.value }
  delete newConfigs[agentName]
  petConfigs.value = newConfigs
  await saveConfigs()
  selectedAgent.value = props.agents.length > 0 ? props.agents[0].name : null
  syncAgentLabelDraft()
  toast.success('已成功删除自定义宠物')
  emit('agents-updated')
}

const showCreateSkinModal = ref(false)
const newSkinId = ref('')
const newSkinLabel = ref('')
const newSkinEmoji = ref('🐱')
const newSkinColor = ref('#3f3f46')
const newSkinFormat = ref('png')

const createCustomSkin = async () => {
  const id = newSkinId.value.trim().toLowerCase()
  const label = newSkinLabel.value.trim()
  if (!id || !label) {
    toast.warning('请输入皮肤 ID 和名称')
    return
  }
  if (!/^[a-z0-9_-]+$/.test(id)) {
    toast.warning('皮肤 ID 必须由小写字母、数字、下划线或连字符组成')
    return
  }
  if (petTypes.value.some(p => p.id === id)) {
    toast.warning('此皮肤 ID 已存在')
    return
  }
  customPetTypes.value.push({
    id: id,
    name: label,
    emoji: newSkinEmoji.value.trim() || '🐱',
    color: newSkinColor.value || '#3f3f46',
    format: newSkinFormat.value || 'png'
  })
  await saveConfigs()
  showCreateSkinModal.value = false
  newSkinId.value = ''
  newSkinLabel.value = ''
  newSkinEmoji.value = '🐱'
  newSkinColor.value = '#3f3f46'
  newSkinFormat.value = 'png'
  
  if (selectedAgent.value) {
    updatePetType(selectedAgent.value, id)
  }
  toast.success(`宠物外观“${label}”创建成功！请在右侧选择它并上传动作图片。`)
}

const isCustomSkin = (type) => {
  return customPetTypes.value.some(c => c.id === type)
}

const deleteCustomSkin = async (type) => {
  if (!confirm(`确定要彻底删除“${petTypes.value.find(p => p.id === type)?.name}”的外观分类吗？这会清除其在图鉴和皮肤列表中的所有入口。`)) return
  customPetTypes.value = customPetTypes.value.filter(c => c.id !== type)
  for (const agent of Object.keys(petConfigs.value)) {
    if (petConfigs.value[agent].type === type) {
      petConfigs.value[agent].type = 'cat'
    }
  }
  await saveConfigs()
  toast.success('外观分类已彻底删除')
}

onMounted(async () => {
  await loadConfigs()
  checkDesktopPet()
  loadPetActionStrategy()
  // 如果有项目，默认选择第一个
  if (props.agents.length > 0) {
    selectedAgent.value = props.agents[0].name
    syncAgentLabelDraft()
  }
})
</script>

<template>
  <div class="pet-space-container">
    <!-- 左半边：桌面宠物控制 与 宠物列表 -->
    <div class="pet-space-left">
      <div class="glass-panel pet-card-section">
        <div class="section-title">🖥️ 桌面宠物引擎</div>
        <div class="desktop-engine-card">
          <div class="engine-info">
            <div class="status-indicator" :class="{ active: desktopPetRunning }"></div>
            <div>
              <div class="engine-name">系统桌面宠物</div>
              <div class="engine-status">{{ desktopPetRunning ? '运行中 - 在您 Windows 桌面上跳动' : '已停止运行' }}</div>
            </div>
          </div>
          <button v-if="!desktopPetRunning" class="btn btn-primary" @click="launchDesktopPet">启动引擎</button>
          <button v-else class="btn btn-danger" @click="closeDesktopPet">关闭引擎</button>
        </div>
      </div>

      <div class="glass-panel pet-card-section flex-1">
        <div class="section-title-row">
          <div class="section-title">📋 桌面宠物管理</div>
          <div class="section-actions" style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" @click="toggleAll" v-if="agents.length > 0">
              {{ allEnabled ? '全部隐藏' : '全部显示' }}
            </button>
            <button class="btn btn-primary btn-sm" @click="showCreateModal = true">
              ➕ 创建宠物
            </button>
          </div>
        </div>
        
        <div class="pet-list-scroll">
          <div v-for="agent in allPetAgents" :key="agent.name" 
            class="pet-list-item" 
            :class="{ active: selectedAgent === agent.name }"
            @click="selectAgent(agent.name)">
            <div class="pet-preview-wrap">
              <img :src="getPetIconPath(getConfig(agent.name).type)" width="42" height="42" />
            </div>
            <div class="pet-text-info">
              <div class="agent-label-name">{{ getAgentLabel(agent) }}</div>
              <div class="pet-type-label">{{ petTypes.find(p => p.id === getConfig(agent.name).type)?.name || '小猫咪' }}</div>
            </div>
            <button
              class="state-toggle-btn"
              :class="{ enabled: getConfig(agent.name).enabled !== false }"
              @click.stop="togglePet(agent.name)"
            >
              {{ getConfig(agent.name).enabled !== false ? '显示中' : '已隐藏' }}
            </button>
          </div>
          <div v-if="agents.length === 0" class="empty-state-text">
            <span>🐾</span>
            <p>暂无代码项目目录</p>
            <p class="sub">请先前往“项目管理”添加代码项目</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右半边：选中的配置 或 宠物图鉴 -->
    <div class="pet-space-right">
      <div class="glass-panel pet-detail-panel">
        <div class="tab-selectors">
          <button :class="{ active: rightTab === 'config' }" @click="rightTab = 'config'">
            ⚙️ 宠物装扮与配置
          </button>
          <button :class="{ active: rightTab === 'gallery' }" @click="rightTab = 'gallery'">
            🎨 宠物全能图鉴
          </button>
          <button :class="{ active: rightTab === 'strategy' }" @click="rightTab = 'strategy'">
            🎬 项目动作策略
          </button>
          <button :class="{ active: rightTab === 'assets' }" @click="rightTab = 'assets'">
            🧩 动作资源
          </button>
        </div>

        <div class="right-tab-content">
          <!-- 装扮与配置 -->
          <div v-if="rightTab === 'config'" class="config-tab-pane">
            <div v-if="!selectedAgent" class="empty-detail">
              <span class="icon">🐾</span>
              <p>请在左侧列表中点击选择一个项目宠物</p>
              <p class="sub">选择后即可为该 Agent 配置专属皮肤外观</p>
            </div>
            <div v-else class="config-wrapper">
              <div class="current-pet-hero">
                <div class="hero-avatar">
                  <img :src="getPetIconPath(getConfig(selectedAgent).type)" width="80" height="80" :class="{ pixelated: isPixelated(getConfig(selectedAgent).type) }" />
                </div>
                <div class="hero-meta">
                  <div class="hero-agent">{{ getAgentLabel(selectedAgentInfo) || selectedAgent }}</div>
                  <div class="hero-pet-name">当前外观：{{ petTypes.find(p => p.id === getConfig(selectedAgent).type)?.name }}</div>
                </div>
              </div>

              <div v-if="isMusicAgentSelected" class="agent-name-editor">
                <label>Agent 显示名称</label>
                <div class="name-editor-row">
                  <input
                    v-model="agentLabelDraft"
                    maxlength="24"
                    placeholder="给音乐 Agent 起个名字"
                    @keydown.enter="saveAgentLabel" />
                  <button class="btn btn-primary btn-sm" @click="saveAgentLabel">保存名称</button>
                </div>
                <div class="name-editor-hint">会同步到宠物空间、音乐播放页和桌面宠物气泡。</div>
              </div>

              <div class="skins-selection">
                <div class="sub-section-title">✨ 更换精美皮肤</div>
                <div class="skins-grid">
                  <div v-for="pt in petTypes" :key="pt.id" 
                    class="skin-card"
                    :class="{ active: getConfig(selectedAgent).type === pt.id }"
                    @click="updatePetType(selectedAgent, pt.id)">
                    <div class="skin-avatar-wrap" :style="getConfig(selectedAgent).type === pt.id ? `border-color: ${pt.color || '#3b82f6'};` : ''">
                      <img :src="getPetIconPath(pt.id)" width="44" height="44" :class="{ pixelated: isPixelated(pt.id) }" />
                    </div>
                    <span class="skin-name">{{ pt.name }}</span>
                    <span class="skin-indicator" v-if="getConfig(selectedAgent).type === pt.id">✓ 已装扮</span>
                  </div>
                  <!-- 新建皮肤虚线网格卡片 -->
                  <div class="skin-card skin-card-add" @click="showCreateSkinModal = true">
                    <div class="skin-avatar-wrap add-icon">
                      <span>➕</span>
                    </div>
                    <span class="skin-name">新建宠物皮肤</span>
                    <span class="skin-indicator" style="color: var(--text-muted);">自定义外观</span>
                  </div>
                </div>
                <!-- 仅当前装扮为自定义皮肤时，才显示彻底删除皮肤分类的按钮 -->
                <div v-if="isCustomSkin(getConfig(selectedAgent).type)" class="delete-skin-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed rgba(0,0,0,0.08);">
                  <button class="btn btn-outline btn-danger btn-sm" @click="deleteCustomSkin(getConfig(selectedAgent).type)">
                    🗑️ 彻底删除“{{ petTypes.find(p => p.id === getConfig(selectedAgent).type)?.name }}”皮肤分类
                  </button>
                </div>
                <div v-if="isCustomPet(selectedAgent)" class="delete-pet-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(0,0,0,0.08);">
                  <button class="btn btn-danger btn-sm" @click="deleteCustomPet(selectedAgent)">
                    🗑️ 删除此自定义宠物
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 宠物图鉴 -->
          <div v-if="rightTab === 'gallery'" class="gallery-tab-pane">
            <div class="gallery-grid">
              <div v-for="pt in petTypes" :key="pt.id" class="gallery-item-card">
                <div class="item-avatar">
                  <img :src="getPetIconPath(pt.id)" width="56" height="56" :class="{ pixelated: isPixelated(pt.id) }" />
                </div>
                <div class="item-info">
                  <div class="item-title">{{ pt.emoji }} {{ pt.name }}</div>
                  <div class="item-desc">
                    <span v-if="pt.id === 'cat'">活泼可爱的小猫咪，会在屏幕上走动、睡觉、摇尾巴，表达各种心情。</span>
                    <span v-else-if="pt.id === 'crab'">勤劳勇敢的小红色螃蟹，会用大钳子努力帮你搬运任务。</span>
                    <span v-else-if="pt.id === 'clawd'">Clawd 专属风格桌宠，会随编译、思考和提醒切换动态动作。</span>
                    <span v-else-if="pt.id === 'robot'">充满未来感的极简小机器人，指示灯会跟随 Agent 的运转而发光。</span>
                    <span v-else-if="pt.id === 'ghost'">神秘的幽灵飘飘，漂浮在屏幕角落默默守护主人的代码库。</span>
                    <span v-else-if="pt.id === 'panda'">憨态可掬的黑白大熊猫，会在您编码时啃竹子或打瞌睡。</span>
                    <span v-else-if="pt.id === 'fox'">聪明俏皮的橙色小狐狸，工作时戴上大耳机、思考时折耳，非常有灵气。</span>
                    <span v-else-if="pt.id === 'rabbit'">乖巧温顺的小兔子，红宝石般的眼睛闪闪发亮，手里随时抱着心爱的胡萝卜。</span>
                    <span v-else-if="pt.id === 'yuexinmiao'">带着金币小挂饰的月薪喵，会用呼吸、眨眼、搬运和提醒动作陪你处理任务。</span>
                    <span v-else-if="pt.id === 'cloudling'">软绵绵的可爱小云朵，会随着任务的变化展现出下雨、打雷或杂耍的有趣姿态。</span>
                    <span v-else-if="pt.id === 'calico'">三花色的小花猫，精美的 APNG 帧动画，拥有打哈欠、抓小鱼、玩杂耍等超流畅的动作细节。</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 项目动作策略 -->
          <div v-if="rightTab === 'strategy'" class="strategy-tab-pane">
            <div class="strategy-summary">
              <div>
                <div class="strategy-summary-title">项目宠物空闲轮转</div>
                <div class="strategy-summary-meta">
                  完整周期 {{ formatStrategyDuration(projectPetStrategy.idleCycleSeconds) }}，任务开始时自动切换到工作态
                </div>
              </div>
              <span class="strategy-count">{{ projectPetStrategy.idle.length + projectPetStrategy.active.length }} 个策略</span>
            </div>

            <div class="strategy-section">
              <div class="sub-section-title">空闲轮转动作</div>
              <div class="strategy-flow">
                <div v-for="row in projectPetStrategy.idle" :key="`idle-${row.order}-${row.state}`" class="strategy-step">
                  <div class="strategy-order">{{ row.order }}</div>
                  <div class="strategy-main">
                    <div class="strategy-title-row">
                      <span class="strategy-state">{{ getStateLabel(row.state) }}</span>
                      <span class="strategy-state-code">{{ row.state }}</span>
                    </div>
                    <div class="strategy-detail">{{ row.detail }}</div>
                  </div>
                  <div class="strategy-duration">{{ formatStrategyDuration(row.seconds) }}</div>
                </div>
              </div>
            </div>

            <div class="strategy-section">
              <div class="sub-section-title">任务打断动作</div>
              <div class="strategy-flow">
                <div v-for="row in projectPetStrategy.active" :key="`active-${row.order}-${row.state}`" class="strategy-step active-mode">
                  <div class="strategy-order">{{ row.order }}</div>
                  <div class="strategy-main">
                    <div class="strategy-title-row">
                      <span class="strategy-state">{{ getStateLabel(row.state) }}</span>
                      <span class="strategy-state-code">{{ row.state }}</span>
                    </div>
                    <div class="strategy-detail">{{ row.trigger || row.detail }}</div>
                  </div>
                  <div class="strategy-duration">{{ formatStrategyDuration(row.seconds) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 动作资源 -->
          <div v-if="rightTab === 'assets'" class="assets-tab-pane">
            <div class="asset-toolbar">
              <div class="asset-select-wrap">
                <label>宠物外观</label>
                <select v-model="actionPetType" @change="imageErrors = {}">
                  <option v-for="pt in petTypes" :key="pt.id" :value="pt.id">{{ pt.name }}</option>
                </select>
              </div>
              <div class="asset-count">{{ actionAssetRows.length }} 个动作资源</div>
            </div>

            <div class="asset-grid">
              <div v-for="row in actionAssetRows" :key="row.key" class="asset-card">
                <div class="asset-preview">
                  <img 
                    :src="assetUrl(row.assetPath)" 
                    :alt="row.label" 
                    :class="{ missing: imageErrors[row.assetPath] }"
                    @error="handleImageError(row)" 
                  />
                </div>
                <div class="asset-info">
                  <div class="asset-title-row">
                    <span class="asset-title">{{ row.label }}</span>
                    <span class="asset-group">{{ row.group }}</span>
                  </div>
                  <div class="asset-path" :title="row.assetPath">{{ row.assetPath }}</div>
                  <div class="asset-file">{{ assetFileName(row.assetPath) }}</div>
                </div>
                <div class="asset-actions">
                  <button
                    v-if="canUploadAsset(row)"
                    class="btn btn-outline btn-sm"
                    :disabled="uploadingAsset === row.assetPath"
                    @click="chooseAssetFile(row)"
                  >
                    {{ uploadingAsset === row.assetPath ? '上传中' : (row.assetPath.toLowerCase().endsWith('.png') ? '上传图片' : '上传 SVG') }}
                  </button>
                  <span v-else class="asset-readonly">只读</span>
                  <input
                    v-if="canUploadAsset(row)"
                    class="hidden-file-input"
                    type="file"
                    accept=".svg,.png,image/svg+xml,image/png"
                    :ref="el => setUploadInput(row.assetPath, el)"
                    @change="uploadAssetFile(row, $event)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 创建宠物 Modal -->
      <div v-if="showCreateModal" class="modal-overlay">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <span class="modal-title-text">🐾 创建自定义桌面宠物</span>
            <button class="close-btn" @click="showCreateModal = false">×</button>
          </div>
          <div class="modal-body-content">
            <div class="form-item">
              <label class="form-label">宠物昵称</label>
              <input class="form-input" v-model="newPetLabel" placeholder="例如：我的月薪喵" maxlength="20" />
            </div>
            <div class="form-item">
              <label class="form-label">初始外观类型</label>
              <select class="form-select" v-model="newPetType">
                <option v-for="pt in petTypes" :key="pt.id" :value="pt.id">
                  {{ pt.emoji }} {{ pt.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer-btns">
            <button class="btn btn-outline btn-sm" @click="showCreateModal = false">取消</button>
            <button class="btn btn-primary btn-sm" @click="createCustomPet">确认创建</button>
          </div>
        </div>
      </div>

      <!-- 创建皮肤 Modal -->
      <div v-if="showCreateSkinModal" class="modal-overlay">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <span class="modal-title-text">🎨 创建自定义宠物皮肤外观</span>
            <button class="close-btn" @click="showCreateSkinModal = false">×</button>
          </div>
          <div class="modal-body-content">
            <div class="form-item">
              <label class="form-label">皮肤 ID (拼音/英文，如 yuexinmiao)</label>
              <input class="form-input" v-model="newSkinId" placeholder="例如：yuexinmiao" maxlength="20" />
            </div>
            <div class="form-item">
              <label class="form-label">皮肤中文名称</label>
              <input class="form-input" v-model="newSkinLabel" placeholder="例如：月薪喵" maxlength="20" />
            </div>
            <div class="form-item">
              <label class="form-label">代表 Emoji</label>
              <input class="form-input" v-model="newSkinEmoji" placeholder="🐱" maxlength="5" />
            </div>
            <div class="form-item">
              <label class="form-label">动作图片默认格式</label>
              <select class="form-select" v-model="newSkinFormat">
                <option value="png">PNG (推荐，适用于去背手绘动作图)</option>
                <option value="svg">SVG (适用于矢量动作图)</option>
              </select>
            </div>
            <div class="form-item">
              <label class="form-label">主题配色 (用于高亮显示)</label>
              <input type="color" class="form-input color-picker-input" v-model="newSkinColor" />
            </div>
          </div>
          <div class="modal-footer-btns">
            <button class="btn btn-outline btn-sm" @click="showCreateSkinModal = false">取消</button>
            <button class="btn btn-primary btn-sm" @click="createCustomSkin">确认创建</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet-space-container {
  display: flex;
  gap: 20px;
  padding: 24px;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.pet-space-left {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.pet-space-right {
  flex: 1;
  height: 100%;
}

.flex-1 {
  flex: 1;
}

.pet-card-section {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 16px;
  overflow: hidden;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

/* 桌面宠物引擎卡片 */
.desktop-engine-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 14px 16px;
}

.engine-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  box-shadow: 0 0 4px var(--text-muted);
  transition: all 0.3s;
}

.status-indicator.active {
  background: var(--accent-green);
  box-shadow: 0 0 10px var(--accent-green);
}

.engine-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.engine-status {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 宠物列表滚动 */
.pet-list-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.pet-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.pet-list-item:hover {
  background: rgba(59, 130, 246, 0.03);
  border-color: rgba(59, 130, 246, 0.1);
  transform: translateX(2px);
}

.pet-list-item.active {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.15);
  box-shadow: inset 3px 0 0 var(--accent-blue);
}

.pet-preview-wrap {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
}

.pixelated {
  image-rendering: pixelated;
}

.pet-text-info {
  flex: 1;
  min-width: 0;
}

.agent-label-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-type-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.state-toggle-btn {
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.state-toggle-btn.enabled {
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.2);
}

.state-toggle-btn:hover {
  filter: brightness(0.96);
}

.empty-state-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state-text span {
  font-size: 32px;
  opacity: 0.3;
  margin-bottom: 12px;
}

.empty-state-text p {
  font-size: 13.5px;
  color: var(--text-secondary);
}

.empty-state-text .sub {
  font-size: 11.5px;
  margin-top: 4px;
}

/* 右半边控制面板 */
.pet-detail-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}

.tab-selectors {
  display: flex;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tab-selectors button {
  flex: 1;
  padding: 14px;
  border: none;
  background: transparent;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-selectors button.active {
  color: var(--accent-blue);
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 -2px 0 var(--accent-blue);
}

.right-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
}

.empty-detail .icon {
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-detail p {
  font-size: 14.5px;
  color: var(--text-secondary);
}

.empty-detail .sub {
  font-size: 12.5px;
  margin-top: 6px;
}

/* 宠物装扮与配置详情 */
.config-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.current-pet-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 16px;
  padding: 20px;
}

.hero-avatar {
  width: 96px;
  height: 96px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.03);
}

.hero-meta {
  flex: 1;
}

.hero-agent {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-pet-name {
  font-size: 14.5px;
  color: var(--text-muted);
  margin-top: 6px;
}

.agent-name-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
}

.agent-name-editor label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.name-editor-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-editor-row input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--text-primary);
  outline: none;
}

.name-editor-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.sub-section-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.skins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.skin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
}

.skin-card:hover {
  border-color: rgba(59, 130, 246, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.02);
}

.skin-card.active {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.05);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.08);
}

.skin-avatar-wrap {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.skin-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.skin-indicator {
  font-size: 9px;
  color: var(--accent-blue);
  font-weight: 700;
  margin-top: 4px;
}

/* 宠物图鉴 */
.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.gallery-item-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  transition: all 0.2s;
}

.gallery-item-card:hover {
  border-color: rgba(59, 130, 246, 0.1);
  background: rgba(255, 255, 255, 0.6);
}

.item-avatar {
  width: 68px;
  height: 68px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.item-info {
  flex: 1;
}

.item-title {
  font-size: 15.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.item-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 6px;
}

/* 项目动作策略 */
.strategy-tab-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.strategy-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
}

.strategy-summary-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

.strategy-summary-meta {
  margin-top: 5px;
  font-size: 12.5px;
  color: var(--text-muted);
}

.strategy-count {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.1);
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.strategy-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-flow {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.strategy-step {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  min-width: 0;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.045);
  border-radius: 12px;
}

.strategy-step.active-mode {
  border-color: rgba(59, 130, 246, 0.12);
  background: rgba(59, 130, 246, 0.045);
}

.strategy-order {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.06);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.strategy-main {
  min-width: 0;
}

.strategy-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.strategy-state {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-primary);
  white-space: nowrap;
}

.strategy-state-code {
  min-width: 0;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-detail {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-duration {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

/* 动作资源 */
.assets-tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.asset-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 14px;
}

.asset-select-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

.asset-select-wrap label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.asset-select-wrap select {
  width: 240px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  outline: none;
}

.asset-count {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 700;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.asset-card {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(0, 0, 0, 0.045);
  border-radius: 14px;
  min-width: 0;
}

.asset-preview {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(0, 0, 0, 0.035);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.asset-preview img {
  max-width: 58px;
  max-height: 58px;
  object-fit: contain;
}

.asset-preview img.missing {
  opacity: 0.18;
}

.asset-info {
  min-width: 0;
}

.asset-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.asset-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-group {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.08);
  color: var(--accent-green);
  font-size: 10.5px;
  font-weight: 700;
}

.asset-path {
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-file {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-actions {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 28px;
}

.asset-readonly {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.08);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.hidden-file-input {
  display: none;
}

/* 移动端支持 */
@media (max-width: 900px) {
  .pet-space-container {
    flex-direction: column;
    overflow-y: auto;
  }
  .pet-space-left {
    width: 100%;
    height: auto;
  }
  .pet-space-right {
    height: auto;
  }
  .asset-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .asset-select-wrap,
  .asset-select-wrap select {
    width: 100%;
    min-width: 0;
  }
}

/* === 暗色与霓虹主题适配 (Dark/Neon Themes Overrides) === */
[data-theme="dark"] .pet-space-left,
[data-theme="dark"] .pet-space-right,
[data-theme="dark"] .current-pet-hero,
[data-theme="dark"] .agent-name-editor,
[data-theme="dark"] .skin-card,
[data-theme="dark"] .strategy-step,
[data-theme="dark"] .asset-toolbar,
[data-theme="dark"] .asset-card {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
}

[data-theme="dark"] .pet-space-left {
  border-right-color: var(--border-color) !important;
}

[data-theme="dark"] .pet-item:hover {
  background: var(--control-hover) !important;
}

[data-theme="dark"] .pet-item.active {
  background: rgba(59, 130, 246, 0.08) !important;
  border-color: var(--accent-blue) !important;
}

[data-theme="dark"] .name-editor-row input,
[data-theme="dark"] .asset-select-wrap select {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .skin-avatar-wrap,
[data-theme="dark"] .asset-preview,
[data-theme="dark"] .strategy-order {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-muted) !important;
}

[data-theme="dark"] .strategy-step.active-mode {
  border-color: rgba(59, 130, 246, 0.25) !important;
  background: rgba(59, 130, 246, 0.06) !important;
}

[data-theme="dark"] .strategy-duration {
  background: var(--bg-primary) !important;
  color: var(--accent-blue) !important;
}

/* 创建宠物 Modal 样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}
.modal-card {
  width: 380px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-title-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}
.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  line-height: 1;
}
.modal-body-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #475569);
  text-align: left;
}
.form-input {
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13.5px;
  outline: none;
  transition: all 0.2s;
  color: var(--text-primary, #0f172a);
}
.form-input:focus {
  border-color: var(--accent-blue, #3b82f6);
  background: #fff;
}
.form-select {
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13.5px;
  outline: none;
  color: var(--text-primary, #0f172a);
}
.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

[data-theme="dark"] .modal-card {
  background: var(--bg-primary, #1e293b) !important;
  border-color: var(--border-color, rgba(255, 255, 255, 0.08)) !important;
}
[data-theme="dark"] .form-input,
[data-theme="dark"] .form-select {
  background: var(--bg-secondary, #0f172a) !important;
  border-color: var(--border-color, rgba(255, 255, 255, 0.08)) !important;
  color: var(--text-primary, #f8fafc) !important;
}
[data-theme="dark"] .close-btn {
  color: var(--text-muted, #94a3b8) !important;
}

/* 新建皮肤卡片特有样式 */
.skin-card-add {
  border-style: dashed !important;
  border-width: 2px !important;
  background: rgba(0, 0, 0, 0.015) !important;
  border-color: rgba(0, 0, 0, 0.12) !important;
}
.skin-card-add:hover {
  background: rgba(59, 130, 246, 0.03) !important;
  border-color: var(--accent-blue, #3b82f6) !important;
}
.skin-card-add .add-icon {
  font-size: 20px;
  color: var(--text-muted, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
}
.color-picker-input {
  height: 38px;
  padding: 4px !important;
  cursor: pointer;
}
[data-theme="dark"] .skin-card-add {
  background: rgba(255, 255, 255, 0.01) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
[data-theme="dark"] .skin-card-add:hover {
  background: rgba(59, 130, 246, 0.06) !important;
  border-color: var(--accent-blue, #3b82f6) !important;
}
</style>
