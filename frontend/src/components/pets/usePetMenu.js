import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { toast } from '../../utils/toast.js'
import PetAgentList from './PetAgentList.vue'
import PetSkinGrid from './PetSkinGrid.vue'
import PetAssetGrid from './PetAssetGrid.vue'
import PetGenerationModal from './PetGenerationModal.vue'
import PetSprite from './PetSprite.vue'

export function usePetMenu(props, emit) {
  const rightTab = ref('config')
  const selectedAgent = ref(null)
  const agentLabelDraft = ref('')
  const desktopPetRunning = ref(false)
  const petConfigs = ref({})
  const petPositions = ref({})
  const actionPetType = ref('yuexinmiao')
  const assetVersion = ref(Date.now())
  const uploadInputs = ref({})
  const uploadingAsset = ref('')
  const projectPetStrategy = ref({ idle: [], active: [], idleCycleSeconds: 0 })
  const GLOBAL_PET_AGENT_NAME = 'global-agent'
  const MUSIC_PET_AGENT_NAME = 'music-agent'
  const renamingSkinId = ref('')
  const skinNameDrafts = ref({})

  const customPetTypes = ref([])
  const imageErrors = ref({})
  const handleImageError = (row) => {
    imageErrors.value[row.assetPath] = true
  }
  const isPixelated = () => false

  // 加载宠物配置
  const loadConfigs = async () => {
    try {
      const res = await fetch('/api/pets/config')
      const data = await res.json()
      customPetTypes.value = data.customTypes || []
      petConfigs.value = normalizePetConfigs(data.configs || {})
      petPositions.value = data.positions || {}
    } catch {
      petConfigs.value = {}
      petPositions.value = {}
      customPetTypes.value = []
    }
  }

  // 保存宠物配置。默认先合并远端 customTypes，避免陈旧内存覆盖刚装入的皮肤。
  const saveConfigs = async (options = {}) => {
    const replaceCustomTypes = options.replaceCustomTypes === true
    try {
      let customTypesToSave = customPetTypes.value
      if (!replaceCustomTypes) {
        try {
          const res = await fetch('/api/pets/config')
          const data = await res.json()
          const remote = Array.isArray(data.customTypes) ? data.customTypes : []
          const localById = new Map(customPetTypes.value.map((item) => [item.id, item]))
          const merged = [...customPetTypes.value]
          for (const skin of remote) {
            if (!skin?.id || localById.has(skin.id)) continue
            merged.push(skin)
          }
          customTypesToSave = merged
          customPetTypes.value = merged
        } catch {}
      }
      await fetch('/api/pets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: petConfigs.value,
          positions: petPositions.value,
          customTypes: customTypesToSave
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

  const BUILTIN_FALLBACK_PET_TYPE = 'yuexinmiao'
  const fallbackPetTypes = [
    { id: 'clawd', name: 'Clawd', emoji: '🦀', color: '#f97316' },
    { id: 'yuexinmiao', name: '月薪喵', emoji: '🐱', color: '#22c55e' },
    { id: 'cloudling', name: '小云朵', emoji: '☁️', color: '#38bdf8' },
    { id: 'calico', name: '三花猫', emoji: '🐱', color: '#d97706' },
    { id: 'ghost', name: '小幽灵', emoji: '👻', color: '#B39DDB' },
    { id: 'robot', name: '机器人', emoji: '🤖', color: '#607D8B' },
  ]

  const petTypes = computed(() => {
    return [...fallbackPetTypes, ...customPetTypes.value]
  })
  // 动作资源需包含生成宠（v2）；上传能力另由 canUploadAsset / 只读说明控制
  const editablePetTypes = computed(() => petTypes.value)
  const getPetTypeInfo = (type) => petTypes.value.find(pet => pet.id === type) || null
  const isV2PetType = (type) => Number(getPetTypeInfo(type)?.spriteVersionNumber) === 2
  const assetsReadonlyNotice = computed(() => (
    isV2PetType(actionPetType.value)
      ? '生成宠从整表 spritesheet 按状态预览动作（与工作台策略对应）；不可按单动作上传 SVG/PNG'
      : ''
  ))
  const actionPetSkin = computed(() => getPetTypeInfo(actionPetType.value))

  const normalizePetType = (type) => {
    const id = String(type || '').trim()
    if (!id) return BUILTIN_FALLBACK_PET_TYPE
    return petTypes.value.some(p => p.id === id) ? id : BUILTIN_FALLBACK_PET_TYPE
  }

  const normalizePetConfigs = (configs = {}) => {
    const next = {}
    for (const [agent, cfg] of Object.entries(configs || {})) {
      next[agent] = { ...(cfg || {}), type: normalizePetType(cfg?.type) }
    }
    return next
  }

  const getPetIconPath = (type) => {
    const custom = customPetTypes.value.find(c => c.id === type)
    if (custom) {
      return `/pets/${type}.${custom.format || 'png'}`
    }
    const safeType = normalizePetType(type)
    return `/pets/${safeType}.svg`
  }

  const stateActions = [
    { state: 'idle', label: '待机' },
    { state: 'thinking', label: '思考' },
    { state: 'planning', label: '规划/拆任务' },
    { state: 'working', label: '工作' },
    { state: 'building', label: '执行/开发' },
    { state: 'debugging', label: '调试/返工' },
    { state: 'reviewing', label: '验收/复盘' },
    { state: 'waiting', label: '等待确认' },
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
    idleCycleSeconds: 60,
    idle: [
      { order: 1, state: 'idle', seconds: 20, detail: '空闲，等待指令' },
      { order: 2, state: 'idle', seconds: 20, detail: '待机小动作随机播放' },
      { order: 3, state: 'yawning', seconds: 8, detail: '长时间无任务时轻微放松' },
      { order: 4, state: 'idle', seconds: 12, detail: '回到安静待机' },
    ],
    active: [
      { order: 1, state: 'working', seconds: 90, detail: 'Agent 调用中', trigger: '用户向项目 Agent 提问、群聊协作、定时任务执行' },
      { order: 2, state: 'planning', seconds: 15, detail: '主 Agent 正在规划下一步', trigger: '全局 Agent 形成决策或拆解任务' },
      { order: 3, state: 'building', seconds: 90, detail: '正在执行/开发', trigger: '全局 Agent 或子 Agent 开始执行开发任务' },
      { order: 4, state: 'debugging', seconds: 60, detail: '正在排查失败', trigger: '工具失败、测试失败、执行器恢复或返工' },
      { order: 5, state: 'reviewing', seconds: 45, detail: '正在验收/复盘', trigger: '工具完成、代码审查、最终验收' },
      { order: 6, state: 'waiting', seconds: 300, detail: '等待用户确认', trigger: '需要用户确认、澄清或继续授权' },
      { order: 7, state: 'happy', seconds: 12, detail: '任务完成', trigger: '项目 Agent 成功完成回复或协作任务' },
      { order: 8, state: 'error', seconds: 45, detail: '错误', trigger: '项目 Agent 调用失败或任务执行报错' },
      { order: 9, state: 'attention', seconds: 12, detail: '正在展示回复', trigger: '项目 Agent 输出消息气泡时' },
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
    planning: `${type}-thinking.svg`,
    working: `${type}-working.svg`,
    building: `${type}-working.svg`,
    debugging: `${type}-sweeping.svg`,
    reviewing: `${type}-attention.svg`,
    waiting: `${type}-notification.svg`,
    drag: `${type}-react-drag.svg`,
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
    yuexinmiao: {
      dir: '',
      files: {
        idle: 'yuexinmiao-idle.svg',
        yawning: 'yuexinmiao-yawning.svg',
        dozing: 'yuexinmiao-dozing.svg',
        collapsing: 'yuexinmiao-collapsing.svg',
        thinking: 'yuexinmiao-thinking.svg',
        planning: 'yuexinmiao-thinking.svg',
        working: 'yuexinmiao-working.svg',
        building: 'yuexinmiao-working.svg',
        debugging: 'yuexinmiao-working.svg',
        reviewing: 'yuexinmiao-thinking.svg',
        waiting: 'yuexinmiao-notification.svg',
        juggling: 'yuexinmiao-juggling.svg',
        sweeping: 'yuexinmiao-sweeping.svg',
        error: 'yuexinmiao-error.svg',
        attention: 'yuexinmiao-attention.svg',
        happy: 'yuexinmiao-happy.svg',
        notification: 'yuexinmiao-notification.svg',
        carrying: 'yuexinmiao-carrying.svg',
        drag: 'yuexinmiao-react-drag.svg',
        sleeping: 'yuexinmiao-sleeping.svg',
        waking: 'yuexinmiao-waking.svg',
      },
      idleAnimations: ['yuexinmiao-idle-action1.svg'],
      reactions: {
        drag: 'yuexinmiao-react-drag.svg',
        clickLeft: 'yuexinmiao-react-left.svg',
        clickRight: 'yuexinmiao-react-right.svg',
        double: 'yuexinmiao-react-double.svg',
      }
    },
    clawd: {
      dir: 'clawd',
      files: {
        idle: 'clawd-idle-follow.svg',
        yawning: 'clawd-idle-yawn.svg',
        dozing: 'clawd-idle-doze.svg',
        collapsing: 'clawd-collapse-sleep.svg',
        thinking: 'clawd-working-thinking.svg',
        planning: 'clawd-working-ultrathink.svg',
        working: 'clawd-working-typing.svg',
        building: 'clawd-working-building.svg',
        debugging: 'clawd-working-debugger.svg',
        reviewing: 'clawd-working-wizard.svg',
        waiting: 'clawd-notification.svg',
        juggling: 'clawd-headphones-groove.svg',
        sweeping: 'clawd-working-sweeping.svg',
        error: 'clawd-error.svg',
        attention: 'clawd-happy.svg',
        happy: 'clawd-happy.svg',
        notification: 'clawd-notification.svg',
        carrying: 'clawd-working-carrying.svg',
        drag: 'clawd-react-drag.svg',
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
        planning: 'cloudling-thinking.svg',
        working: 'cloudling-typing.svg',
        building: 'cloudling-building.svg',
        debugging: 'cloudling-sweeping.svg',
        reviewing: 'cloudling-conducting.svg',
        waiting: 'cloudling-notification.svg',
        juggling: 'cloudling-juggling.svg',
        sweeping: 'cloudling-sweeping.svg',
        error: 'cloudling-error.svg',
        attention: 'cloudling-attention.svg',
        happy: 'cloudling-attention.svg',
        notification: 'cloudling-notification.svg',
        carrying: 'cloudling-carrying.svg',
        drag: 'cloudling-react-drag.svg',
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
        planning: 'calico-thinking.apng',
        working: 'calico-working-typing.apng',
        building: 'calico-working-building.apng',
        debugging: 'calico-working-sweeping.apng',
        reviewing: 'calico-working-conducting.apng',
        waiting: 'calico-notification.apng',
        juggling: 'calico-working-juggling.apng',
        sweeping: 'calico-working-sweeping.apng',
        error: 'calico-error.apng',
        attention: 'calico-happy.apng',
        happy: 'calico-happy.apng',
        notification: 'calico-notification.apng',
        carrying: 'calico-working-carrying.apng',
        drag: 'calico-react-drag.apng',
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
        planning: 'miao-thinking.png',
        working: 'miao-working.png',
        building: 'miao-working.png',
        debugging: 'miao-sweeping.png',
        reviewing: 'miao-attention.png',
        waiting: 'miao-notification.png',
        drag: 'miao-react-drag.png',
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
    type = normalizePetType(type)
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
    const type = normalizePetType(actionPetType.value)
    const custom = customPetTypes.value.find(c => c.id === type)
    if (Number(custom?.spriteVersionNumber) === 2 || isV2PetType(type)) {
      const sheet = custom?.spritesheetPath || `generated/${type}/spritesheet.webp`
      const rows = [{
        key: `${type}:spritesheet`,
        group: '整表',
        label: 'Spritesheet 总览',
        assetPath: sheet,
        readonly: true,
      }]
      for (const action of stateActions) {
        rows.push({
          key: `${type}:state:${action.state}`,
          group: '状态预览',
          label: action.label,
          state: action.state,
          previewState: action.state,
          assetPath: `${sheet} · ${action.state}`,
          readonly: true,
          useV2Preview: true,
        })
      }
      for (const action of reactionActions) {
        const previewState = action.key === 'drag'
          ? 'drag'
          : (action.key === 'double' ? 'happy' : 'attention')
        rows.push({
          key: `${type}:reaction:${action.key}`,
          group: '交互预览',
          label: action.label,
          previewState,
          assetPath: `${sheet} · ${previewState}`,
          readonly: true,
          useV2Preview: true,
        })
      }
      return rows
    }

    const spec = getPetAssetSpec(type)
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
  const canUploadAsset = (row) => {
    if (row?.readonly || isV2PetType(actionPetType.value)) return false
    const lower = String(row?.assetPath || '').toLowerCase()
    return lower.endsWith('.svg') || lower.endsWith('.png')
  }

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

  const agentStateLabels = {
    idle: '待命',
    thinking: '思考中',
    planning: '规划中',
    working: '执行中',
    building: '开发中',
    debugging: '排查中',
    reviewing: '验收中',
    waiting: '待确认',
    attention: '更新',
    notification: '待确认',
    happy: '已回复',
    error: '异常',
    sleeping: '休息中',
  }

  const getAgentStateLabel = (agent) => {
    const state = agent?.state || 'idle'
    return agentStateLabels[state] || state
  }

  const getAgentStateDetail = (agent) => {
    const detail = String(agent?.stateDetail || agent?.detail || '').trim()
    if (detail) return detail.length > 64 ? `${detail.slice(0, 64)}...` : detail
    return agent?.name === GLOBAL_PET_AGENT_NAME ? '等待全局指令' : '等待指令'
  }

  const getDefaultType = (agent) => {
    if (agent === GLOBAL_PET_AGENT_NAME) return 'robot'
    return agent === MUSIC_PET_AGENT_NAME ? 'cloudling' : BUILTIN_FALLBACK_PET_TYPE
  }

  const getConfig = (agent) => {
    const config = petConfigs.value[agent] || { type: getDefaultType(agent), enabled: true }
    return { ...config, type: normalizePetType(config.type || getDefaultType(agent)) }
  }

  const selectedAgentInfo = computed(() => allPetAgents.value.find(agent => agent.name === selectedAgent.value))
  const isMusicAgentSelected = computed(() => selectedAgent.value === MUSIC_PET_AGENT_NAME)
  const isSystemAgentSelected = computed(() => [GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME].includes(selectedAgent.value))

  const workspaceMood = computed(() => {
    if (desktopPetRunning.value) return { key: 'working', label: '桌宠在线', detail: '桌面宠物引擎正在运行，全局 Agent 和音乐 Agent 会显示到桌面。', progress: 72 }
    return { key: 'idle', label: '安静待命', detail: '启动桌面宠物引擎后，独立宠物会出现在 Windows 桌面上。', progress: 24 }
  })

  const companionSignals = computed(() => [
    { label: '引擎', value: desktopPetRunning.value ? '运行' : '停止' },
    { label: '全局', value: props.agents.some(agent => agent.name === GLOBAL_PET_AGENT_NAME) ? '可选' : '未连接' },
    { label: '音乐', value: props.agents.some(agent => agent.name === MUSIC_PET_AGENT_NAME) ? '可选' : '未连接' },
    { label: '皮肤', value: petTypes.value.length },
  ])

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
    if (allPetAgents.value.length === 0) return false
    return allPetAgents.value.every(a => getConfig(a.name).enabled !== false)
  })

  const toggleAll = () => {
    const nextVal = !allEnabled.value
    const newConfigs = { ...petConfigs.value }
    for (const p of allPetAgents.value) {
      newConfigs[p.name] = { ...(newConfigs[p.name] || { type: getDefaultType(p.name) }), enabled: nextVal }
    }
    petConfigs.value = newConfigs
    saveConfigs()
  }

  const showGenerationModal = ref(false)

  const allPetAgents = computed(() => {
    const systemPetNames = new Set([GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME])
    return props.agents.filter(agent => systemPetNames.has(agent.name))
  })

  const handleGenerationCompleted = async () => {
    await loadConfigs()
    emit('agents-updated')
  }

  const isCustomSkin = (type) => {
    return customPetTypes.value.some(c => c.id === type)
  }

  const deleteCustomSkin = async (type) => {
    if (!confirm(`确定要彻底删除“${petTypes.value.find(p => p.id === type)?.name}”的外观分类吗？这会清除其在图鉴和皮肤列表中的所有入口。`)) return
    customPetTypes.value = customPetTypes.value.filter(c => c.id !== type)
    for (const agent of Object.keys(petConfigs.value)) {
      if (petConfigs.value[agent].type === type) {
        petConfigs.value[agent].type = BUILTIN_FALLBACK_PET_TYPE
      }
    }
    if (renamingSkinId.value === type) renamingSkinId.value = ''
    await saveConfigs({ replaceCustomTypes: true })
    toast.success('外观分类已彻底删除')
  }

  const beginRenameSkin = (pt) => {
    if (!pt?.id) return
    renamingSkinId.value = pt.id
    skinNameDrafts.value = { ...skinNameDrafts.value, [pt.id]: String(pt.name || '') }
  }

  const setSkinNameDraft = (typeId, value) => {
    const id = String(typeId || '').trim()
    if (!id) return
    skinNameDrafts.value = { ...skinNameDrafts.value, [id]: value }
  }

  const cancelRenameSkin = () => {
    renamingSkinId.value = ''
  }

  const saveCustomSkinName = async (typeId) => {
    const id = String(typeId || '').trim()
    if (!id || !isCustomSkin(id)) return
    const name = String(skinNameDrafts.value[id] || '').trim().slice(0, 24)
    if (!name) {
      toast.warning('皮肤名称不能为空')
      return
    }
    customPetTypes.value = customPetTypes.value.map((item) => (
      item.id === id ? { ...item, name } : item
    ))
    await saveConfigs()
    renamingSkinId.value = ''
    toast.success('皮肤名称已保存')
  }

  const onPetsConfigChanged = () => { loadConfigs() }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && props.active !== false) loadConfigs()
  }

  watch(() => props.active, (active) => {
    if (active) loadConfigs()
  })

  onMounted(async () => {
    await loadConfigs()
    checkDesktopPet()
    loadPetActionStrategy()
    window.addEventListener('ccm-pets-config-changed', onPetsConfigChanged)
    document.addEventListener('visibilitychange', onVisibilityChange)
    // 宠物空间只保留两个系统工作伴侣。
    if (allPetAgents.value.length > 0) {
      selectedAgent.value = allPetAgents.value[0].name
      syncAgentLabelDraft()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('ccm-pets-config-changed', onPetsConfigChanged)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    PetAgentList, PetSkinGrid, PetAssetGrid, PetGenerationModal, PetSprite, rightTab,
    selectedAgent, agentLabelDraft, desktopPetRunning, petConfigs, petPositions, actionPetType,
    assetVersion, uploadInputs, uploadingAsset, projectPetStrategy, GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME,
    customPetTypes, imageErrors, handleImageError, isPixelated, loadConfigs, saveConfigs,
    checkDesktopPet, launchDesktopPet, closeDesktopPet, BUILTIN_FALLBACK_PET_TYPE, fallbackPetTypes, petTypes,
    editablePetTypes, getPetTypeInfo, isV2PetType, assetsReadonlyNotice, actionPetSkin, normalizePetType, normalizePetConfigs, getPetIconPath,
    stateActions, reactionActions, fallbackProjectPetStrategy, getStateLabel, formatStrategyDuration, loadPetActionStrategy,
    stateFileMap, defaultReactions, specialPetAssets, getPetAssetSpec, makeAssetPath, actionAssetRows,
    assetUrl, assetFileName, canUploadAsset, setUploadInput, chooseAssetFile, uploadAssetFile,
    getAgentLabel, agentStateLabels, getAgentStateLabel, getAgentStateDetail, getDefaultType, getConfig,
    selectedAgentInfo, isMusicAgentSelected, isSystemAgentSelected, workspaceMood, companionSignals, syncAgentLabelDraft,
    saveAgentLabel, updatePetType, togglePet, selectAgent, allEnabled, toggleAll,
    showGenerationModal, allPetAgents, handleGenerationCompleted, isCustomSkin, deleteCustomSkin,
    skinNameDrafts, beginRenameSkin, setSkinNameDraft, saveCustomSkinName, cancelRenameSkin, renamingSkinId,
  }
}
