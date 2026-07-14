let agentName = 'loading';
let agentLabel = 'loading';
let petType = 'yuexinmiao';
let currentState = 'idle';
let petSize = 120;
let petSkin = null;
let v2FrameTimer = null;
let v2Frame = 0;

const petGroup = document.getElementById('pet-group');
const sprite = document.getElementById('pet-sprite');
const svgContainer = document.getElementById('pet-svg');
const stateBadge = document.getElementById('state-badge');
const nameEl = document.getElementById('pet-name');
const bubble = document.getElementById('pet-bubble');
const bubbleText = document.getElementById('bubble-text');
const speech = document.getElementById('pet-speech');
const speechLabel = document.getElementById('speech-label');
const speechText = document.getElementById('speech-text');
const menu = document.getElementById('context-menu');
const menuAgentName = document.getElementById('menu-agent-name');
const menuState = document.getElementById('menu-state');
const resizeHandle = document.getElementById('resize-handle');

const clawdStateFiles = {
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
};

const clawdIdleAnimations = [
  { file: 'clawd-idle-look.svg', duration: 10000 },
  { file: 'clawd-idle-bubble.svg', duration: 10000 },
  { file: 'clawd-idle-reading.svg', duration: 10000 },
];

const clawdAutoReturnMs = {
  attention: 4000,
  happy: 4000,
  error: 5000,
  sweeping: 10000,
  notification: 5000,
  carrying: 3000,
};

const cloudlingStateFiles = {
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
};

const cloudlingIdleAnimations = [
  { file: 'cloudling-idle-reading.svg', duration: 10000 },
];

const cloudlingAutoReturnMs = {
  attention: 3660,
  happy: 3660,
  error: 5000,
  sweeping: 10000,
  notification: 2600,
  carrying: 4500,
};

const yuexinmiaoStateFiles = {
  idle: 'yuexinmiao-idle.svg',
  thinking: 'yuexinmiao-thinking.svg',
  planning: 'yuexinmiao-thinking.svg',
  working: 'yuexinmiao-working.svg',
  building: 'yuexinmiao-working.svg',
  debugging: 'yuexinmiao-working.svg',
  reviewing: 'yuexinmiao-thinking.svg',
  waiting: 'yuexinmiao-notification.svg',
  drag: 'yuexinmiao-react-drag.svg',
  error: 'yuexinmiao-error.svg',
  attention: 'yuexinmiao-attention.svg',
  happy: 'yuexinmiao-happy.svg',
  notification: 'yuexinmiao-notification.svg',
  carrying: 'yuexinmiao-carrying.svg',
  sweeping: 'yuexinmiao-sweeping.svg',
  juggling: 'yuexinmiao-juggling.svg',
  yawning: 'yuexinmiao-yawning.svg',
  dozing: 'yuexinmiao-dozing.svg',
  collapsing: 'yuexinmiao-collapsing.svg',
  sleeping: 'yuexinmiao-sleeping.svg',
  waking: 'yuexinmiao-waking.svg',
};

const yuexinmiaoAmbientStatePools = {
  idle: [
    { state: 'idle', weight: 7, duration: 12000 },
    { state: 'yawning', weight: 0.45, duration: 6500 },
  ],
};

const yuexinmiaoAutoReturnMs = {
  attention: 3200,
  happy: 3200,
  error: 4600,
  reviewing: 4200,
  sweeping: 5200,
  notification: 3600,
  carrying: 3200,
};

const calicoStateFiles = {
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
};

const calicoIdleAnimations = [
  { file: 'calico-idle.apng', duration: 10000 },
];

const calicoAutoReturnMs = {
  attention: 5000,
  happy: 5000,
  error: 5000,
  sweeping: 300000,
  notification: 5200,
  carrying: 3000,
};

let clawdIdleTimer = null;
let clawdReturnTimer = null;
let clawdReactionTimer = null;
let scheduledState = null;
let lastAmbientActionKey = '';
let reactionActiveUntil = 0;

const AMBIENT_MIN_DELAY_MS = 7000;
const AMBIENT_MAX_DELAY_MS = 15000;
const ambientStatePools = {
  idle: [
    { state: 'idle', weight: 3.5, duration: 9000 },
    { state: 'yawning', weight: 0.45, duration: 6800 },
  ],
};

function stateFileMap(type) {
  return {
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
  };
}

function stateFileMapPng(type) {
  return {
    idle: `${type}-idle.png`,
    thinking: `${type}-thinking.png`,
    planning: `${type}-thinking.png`,
    working: `${type}-working.png`,
    building: `${type}-working.png`,
    debugging: `${type}-sweeping.png`,
    reviewing: `${type}-attention.png`,
    waiting: `${type}-notification.png`,
    drag: `${type}-react-drag.png`,
    error: `${type}-error.png`,
    attention: `${type}-attention.png`,
    happy: `${type}-happy.png`,
    notification: `${type}-notification.png`,
    carrying: `${type}-carrying.png`,
    sweeping: `${type}-sweeping.png`,
    juggling: `${type}-juggling.png`,
    yawning: `${type}-yawning.png`,
    dozing: `${type}-dozing.png`,
    collapsing: `${type}-collapsing.png`,
    sleeping: `${type}-sleeping.png`,
    waking: `${type}-waking.png`,
  };
}

const petThemes = {
  cat: {
    files: stateFileMap('cat'),
    bodyHitBox: { x: 0.13, y: 0.1, w: 0.74, h: 0.82 },
    reactions: {
      drag: { file: 'cat-react-drag.svg' },
      clickLeft: { file: 'cat-react-left.svg', duration: 2500 },
      clickRight: { file: 'cat-react-right.svg', duration: 2500 },
      double: { file: 'cat-react-double.svg', duration: 2500 },
    },
  },
  crab: {
    files: stateFileMap('crab'),
    bodyHitBox: { x: 0.08, y: 0.25, w: 0.84, h: 0.7 },
    reactions: {
      drag: { file: 'crab-react-drag.svg' },
      clickLeft: { file: 'crab-react-left.svg', duration: 2500 },
      clickRight: { file: 'crab-react-right.svg', duration: 2500 },
      double: { file: 'crab-react-double.svg', duration: 2500 },
    },
  },
  robot: {
    files: stateFileMap('robot'),
    bodyHitBox: { x: 0.14, y: 0.08, w: 0.72, h: 0.9 },
    reactions: {
      drag: { file: 'robot-react-drag.svg' },
      clickLeft: { file: 'robot-react-left.svg', duration: 2500 },
      clickRight: { file: 'robot-react-right.svg', duration: 2500 },
      double: { file: 'robot-react-double.svg', duration: 2500 },
    },
  },
  ghost: {
    files: stateFileMap('ghost'),
    hideBadge: true,
    bodyHitBox: { x: 0.16, y: 0.12, w: 0.68, h: 0.8 },
    reactions: {
      drag: { file: 'ghost-react-drag.svg' },
      clickLeft: { file: 'ghost-react-left.svg', duration: 2500 },
      clickRight: { file: 'ghost-react-right.svg', duration: 2500 },
      double: { file: 'ghost-react-double.svg', duration: 2500 },
    },
  },
  clawd: {
    dir: 'clawd',
    files: clawdStateFiles,
    pixelated: true,
    hideBadge: true,
    bodyHitBox: { x: 0.12, y: 0.35, w: 0.76, h: 0.55 },
    resizeHandleAnchor: { x: 0.69, y: 0.9 },
    idleAnimations: clawdIdleAnimations,
    autoReturn: clawdAutoReturnMs,
    reactions: {
      drag: { file: 'clawd-react-drag.svg' },
      clickLeft: { file: 'clawd-react-left.svg', duration: 2500 },
      clickRight: { file: 'clawd-react-right.svg', duration: 2500 },
      double: { file: 'clawd-react-double.svg', duration: 3500 },
    },
  },
  panda: {
    files: stateFileMap('panda'),
    bodyHitBox: { x: 0.15, y: 0.1, w: 0.7, h: 0.8 },
    idleAnimations: [
      { file: 'panda-idle-action1.svg', duration: 10000 },
      { file: 'panda-idle-action2.svg', duration: 10000 },
      { file: 'panda-idle-action3.svg', duration: 10000 }
    ],
    autoReturn: { attention: 4000, happy: 4000, error: 5000, notification: 5000, carrying: 3000 },
    reactions: {
      drag: { file: 'panda-react-drag.svg' },
      clickLeft: { file: 'panda-react-left.svg', duration: 2500 },
      clickRight: { file: 'panda-react-right.svg', duration: 2500 },
      double: { file: 'panda-react-double.svg', duration: 2500 },
    },
  },
  fox: {
    files: stateFileMap('fox'),
    bodyHitBox: { x: 0.15, y: 0.1, w: 0.7, h: 0.8 },
    idleAnimations: [
      { file: 'fox-idle-action1.svg', duration: 10000 },
      { file: 'fox-idle-action2.svg', duration: 10000 },
      { file: 'fox-idle-action3.svg', duration: 10000 }
    ],
    autoReturn: { attention: 4000, happy: 4000, error: 5000, notification: 5000, carrying: 3000 },
    reactions: {
      drag: { file: 'fox-react-drag.svg' },
      clickLeft: { file: 'fox-react-left.svg', duration: 2500 },
      clickRight: { file: 'fox-react-right.svg', duration: 2500 },
      double: { file: 'fox-react-double.svg', duration: 2500 },
    },
  },
  rabbit: {
    files: stateFileMap('rabbit'),
    bodyHitBox: { x: 0.15, y: 0.1, w: 0.7, h: 0.8 },
    idleAnimations: [
      { file: 'rabbit-idle-action1.svg', duration: 10000 },
      { file: 'rabbit-idle-action2.svg', duration: 10000 },
      { file: 'rabbit-idle-action3.svg', duration: 10000 }
    ],
    autoReturn: { attention: 4000, happy: 4000, error: 5000, notification: 5000, carrying: 3000 },
    reactions: {
      drag: { file: 'rabbit-react-drag.svg' },
      clickLeft: { file: 'rabbit-react-left.svg', duration: 2500 },
      clickRight: { file: 'rabbit-react-right.svg', duration: 2500 },
      double: { file: 'rabbit-react-double.svg', duration: 2500 },
    },
  },
  yuexinmiao: {
    files: yuexinmiaoStateFiles,
    bodyHitBox: { x: 0.13, y: 0.1, w: 0.74, h: 0.82 },
    idleAnimations: [
      { file: 'yuexinmiao-idle-action1.svg', weight: 0.8, duration: 7600 },
    ],
    ambientStatePools: yuexinmiaoAmbientStatePools,
    autoReturn: yuexinmiaoAutoReturnMs,
    reactions: {
      drag: { file: 'yuexinmiao-react-drag.svg' },
      clickLeft: { file: 'yuexinmiao-react-left.svg', duration: 2500 },
      clickRight: { file: 'yuexinmiao-react-right.svg', duration: 2500 },
      double: { file: 'yuexinmiao-react-double.svg', duration: 2500 },
    },
  },
  cloudling: {
    dir: 'cloudling',
    files: cloudlingStateFiles,
    pixelated: false,
    hideBadge: true,
    bodyHitBox: { x: 0.25, y: 0.25, w: 0.5, h: 0.53 },
    idleAnimations: cloudlingIdleAnimations,
    autoReturn: cloudlingAutoReturnMs,
    reactions: {
      drag: { file: 'cloudling-react-drag.svg' },
    },
  },
  calico: {
    dir: 'calico',
    files: calicoStateFiles,
    pixelated: false,
    hideBadge: true,
    bodyHitBox: { x: 0.3, y: 0.15, w: 0.4, h: 0.7 },
    idleAnimations: calicoIdleAnimations,
    autoReturn: calicoAutoReturnMs,
    reactions: {
      drag: { file: 'calico-react-drag.apng' },
      clickLeft: { file: 'calico-react-poke.apng', duration: 2500 },
      clickRight: { file: 'calico-react-poke.apng', duration: 2500 },
      double: { file: 'calico-react-poke.apng', duration: 2500 },
    },
  },
  miao: {
    files: stateFileMapPng('miao'),
    bodyHitBox: { x: 0.13, y: 0.1, w: 0.74, h: 0.82 },
    reactions: {
      drag: { file: 'miao-react-drag.png' },
      clickLeft: { file: 'miao-react-left.png', duration: 2500 },
      clickRight: { file: 'miao-react-right.png', duration: 2500 },
      double: { file: 'miao-react-double.png', duration: 2500 },
    },
  },
};

function getTheme(type = petType) {
  if (!petThemes[type]) {
    // 动态初始化未注册的自定义宠物主题，使其采用默认配置
    petThemes[type] = {
      files: stateFileMapPng(type), // 默认以 png 形式加载动作
      bodyHitBox: { x: 0.13, y: 0.1, w: 0.74, h: 0.82 },
      reactions: {
        drag: { file: `${type}-react-drag.png` },
        clickLeft: { file: `${type}-react-left.png`, duration: 2500 },
        clickRight: { file: `${type}-react-right.png`, duration: 2500 },
        double: { file: `${type}-react-double.png`, duration: 2500 },
      }
    };
  }
  return petThemes[type];
}

function normalizeState(state) {
  return state || 'idle';
}

function normalizeDisplayLabel(label, agent = agentName) {
  const raw = String(label || '').trim();
  const fallback = String(agent || '').trim();
  const value = raw || fallback;
  const lower = value.toLowerCase();
  if (lower === 'music' || lower === 'music-agent' || lower === 'global' || lower === 'global-agent') return '';
  return value;
}

function setPetName(label) {
  const normalized = normalizeDisplayLabel(label, agentName);
  agentLabel = normalized || agentLabel || '';
  nameEl.textContent = normalized;
  nameEl.classList.toggle('hidden', !normalized);
}

function shouldHideStateBadge() {
  return getTheme().hideBadge === true;
}

function resolveThemeFile(type, state) {
  const theme = getTheme(type);
  const normalizedState = normalizeState(state);
  const file = theme.files[normalizedState] || theme.files.idle || `${type}.svg`;
  return theme.dir ? `${theme.dir}/${file}` : file;
}

function setPetSpriteSizeVar(spriteSize) {
  document.documentElement.style.setProperty('--pet-sprite-size', `${Math.max(40, Math.round(spriteSize || 64))}px`);
}

const v2Rows = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  'running-right': { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  'running-left': { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, durations: [140, 140, 140, 280] },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

const v2StateRows = {
  idle: 'idle', sleeping: 'idle', dozing: 'idle', collapsing: 'idle', yawning: 'idle',
  drag: 'running-right', attention: 'waving', waking: 'waving', notification: 'waving', happy: 'jumping',
  error: 'failed', debugging: 'failed', waiting: 'waiting',
  working: 'running', building: 'running', carrying: 'running', sweeping: 'running', juggling: 'running',
  thinking: 'review', planning: 'review', reviewing: 'review',
};

function isV2Pet() {
  return Number(petSkin?.spriteVersionNumber) === 2 && Boolean(petSkin?.spritesheetPath);
}

function clearV2FrameTimer() {
  if (v2FrameTimer) clearTimeout(v2FrameTimer);
  v2FrameTimer = null;
}

async function loadV2Sprite(state) {
  clearV2FrameTimer();
  const key = v2StateRows[normalizeState(state)] || 'idle';
  const spec = v2Rows[key];
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  setPetSpriteSizeVar(spriteSize);
  const atlasPath = await window.petBridge.getAssetPath(petSkin.spritesheetPath);
  if (!atlasPath) return false;
  const source = `file:///${atlasPath.replace(/\\/g, '/')}`;
  const spriteWidth = Math.round(spriteSize * 192 / 208);
  svgContainer.innerHTML = `<div data-pet-visual="true" aria-hidden="true" style="width:${spriteWidth}px;height:${spriteSize}px;margin:0 auto;background-image:url('${source}');background-repeat:no-repeat;background-size:800% 1100%;"></div>`;
  v2Frame = 0;
  const renderFrame = () => {
    if (!isV2Pet()) return;
    const visual = svgContainer.querySelector('[data-pet-visual]');
    if (!visual) return;
    visual.style.backgroundPosition = `${(v2Frame / 7) * 100}% ${(spec.row / 10) * 100}%`;
    const delay = spec.durations[v2Frame];
    v2Frame = (v2Frame + 1) % spec.durations.length;
    v2FrameTimer = setTimeout(renderFrame, delay);
  };
  renderFrame();
  requestAnimationFrame(positionResizeHandle);
  return true;
}

// 通过 IPC 接收初始化参数
window.petBridge.onInitPet((data) => {
  agentName = data.agent || 'unknown';
  agentLabel = '';
  petType = data.type || 'yuexinmiao';
  petSkin = data.skin || null;
  currentState = normalizeState(data.state || 'idle');
  petSize = data.size || 120;
  document.documentElement.dataset.petType = petType;
  setPetName(data.label || data.displayName);
  loadSVG(petType, currentState);
  applyState(currentState);
  // 应用保存的大小
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  setPetSpriteSizeVar(spriteSize);
  const img = svgContainer.querySelector('img');
  if (img) {
    img.style.width = spriteSize + 'px';
    img.style.height = spriteSize + 'px';
  }
  requestAnimationFrame(positionResizeHandle);
});

// 状态配置
const stateConfig = {
  idle:     { badge: '',       anim: 'anim-idle' },
  working:  { badge: '⚡',     anim: 'anim-working' },
  thinking: { badge: '💭',     anim: 'anim-thinking' },
  planning: { badge: '🧠',     anim: 'anim-planning' },
  building: { badge: '🛠️',     anim: 'anim-building' },
  debugging:{ badge: '🧪',     anim: 'anim-debugging' },
  reviewing:{ badge: '🔎',     anim: 'anim-reviewing' },
  waiting:  { badge: '⌛',     anim: 'anim-waiting' },
  drag:     { badge: '✋',     anim: 'anim-drag' },
  error:    { badge: '❌',     anim: 'anim-error' },
  happy:    { badge: '✨',     anim: 'anim-happy' },
  attention:{ badge: '✨',     anim: 'anim-happy' },
  notification: { badge: '!',  anim: 'anim-thinking' },
  carrying: { badge: '📦',     anim: 'anim-working' },
  sweeping: { badge: '🧹',     anim: 'anim-working' },
  juggling: { badge: '♪',      anim: 'anim-juggling' },
  yawning:  { badge: '',       anim: 'anim-idle' },
  dozing:   { badge: '💤',     anim: 'anim-sleeping' },
  collapsing: { badge: '💤',   anim: 'anim-sleeping' },
  waking:   { badge: '',       anim: 'anim-idle' },
  sleeping: { badge: '💤',     anim: 'anim-sleeping' },
};

const stateMessages = {
  idle:     ['需要帮忙吗？', '我在呢～', '有什么任务？', '随时待命！'],
  working:  ['正在努力工作中...', '马上就好！', '处理中...', '专心工作中~'],
  thinking: ['让我想想...', '思考中...', '分析一下...'],
  planning: ['正在规划路线...', '我先拆一下步骤...', '正在判断下一步...'],
  building: ['开始动手执行...', '正在推进任务...', '开发/协调中...'],
  debugging:['正在排查问题...', '我检查一下失败点...', '返工修复中...'],
  reviewing:['正在验收结果...', '复盘一下交付...', '检查证据中...'],
  waiting:  ['需要你确认一下', '等你一句话继续', '这里需要选择'],
  drag:     ['被你抓住啦', '换个舒服的位置～', '移动中...'],
  error:    ['出了点问题...', '需要检查一下', '出错了！'],
  happy:    ['完成啦！✨', '搞定！', '任务完成！'],
  attention:['完成啦！✨', '搞定！', '任务完成！'],
  notification: ['需要你看一下', '有新的提醒', '请确认一下'],
  carrying: ['正在搬运上下文...', '准备工作区...', '带上资料走起'],
  sweeping: ['正在整理上下文...', '清理一下思路...', '压缩上下文中'],
  juggling: ['节奏在线♪', '忙碌又带感...', '正在律动中...'],
  yawning: ['打个哈欠...', '稍微有点困...', '伸个懒腰'],
  dozing: ['眯一会儿...', '短暂待机...', '轻轻休息中'],
  collapsing: ['准备睡一会儿...', '电量下沉中...', '先趴一下'],
  waking: ['醒来了...', '重新待命！', '精神恢复中'],
  sleeping: ['💤 zzz...', '好困...', '休息一下...'],
};

const petEmojis = { cat: '🐱', crab: '🦀', robot: '🤖', ghost: '👻', clawd: '🦀', panda: '🐼', fox: '🦊', rabbit: '🐰', yuexinmiao: '🐱', cloudling: '☁️', calico: '🐱', miao: '🐱' };
const SPEECH_MIN_WIDTH = 330;
const PET_SPRITE_SCALE = 0.5;
const PET_EXTRA_HEIGHT = 165;
const MIN_PET_SIZE = 80;
const MAX_PET_SIZE = 700;
const PET_SIZE_STEP = 32;

function getWindowWidth(size) {
  return Math.max(size, SPEECH_MIN_WIDTH);
}

function getWindowHeight(size) {
  return Math.round(size * PET_SPRITE_SCALE) + PET_EXTRA_HEIGHT;
}

function getPetBodyRect() {
  const visual = svgContainer.querySelector('img, [data-pet-visual]');
  const rect = (visual || sprite).getBoundingClientRect();
  const hitBox = getTheme().bodyHitBox || { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  return {
    left: rect.left + rect.width * hitBox.x,
    top: rect.top + rect.height * hitBox.y,
    right: rect.left + rect.width * (hitBox.x + hitBox.w),
    bottom: rect.top + rect.height * (hitBox.y + hitBox.h),
  };
}

function positionResizeHandle() {
  const visual = svgContainer.querySelector('img, [data-pet-visual]');
  if (!visual) return;
  const imgRect = visual.getBoundingClientRect();
  const spriteRect = sprite.getBoundingClientRect();
  const theme = getTheme();
  const hitBox = theme.bodyHitBox || { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  const anchor = theme.resizeHandleAnchor || {
    x: hitBox.x + hitBox.w,
    y: hitBox.y + hitBox.h,
  };
  const handleSize = resizeHandle.offsetWidth || 16;
  const anchorX = imgRect.left - spriteRect.left + imgRect.width * anchor.x;
  const anchorY = imgRect.top - spriteRect.top + imgRect.height * anchor.y;
  resizeHandle.style.left = `${Math.round(anchorX - handleSize * 0.78)}px`;
  resizeHandle.style.top = `${Math.round(anchorY - handleSize * 0.78)}px`;
}

function isPetBodyPoint(clientX, clientY) {
  const rect = getPetBodyRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function isInteractiveTarget(target, clientX, clientY) {
  if (menu.contains(target) || resizeHandle.contains(target)) return true;
  return sprite.contains(target) && isPetBodyPoint(clientX, clientY);
}

// 加载 SVG（通过 IPC 从主进程获取绝对路径）
async function loadSVG(type, state) {
  if (isV2Pet()) {
    try { if (await loadV2Sprite(state)) return; } catch {}
  }
  clearV2FrameTimer();
  const theme = getTheme(type);
  const svgFile = resolveThemeFile(type, state);
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  setPetSpriteSizeVar(spriteSize);
  try {
    const svgPath = await window.petBridge.getAssetPath(svgFile);
    if (svgPath) {
      const imageRendering = theme.pixelated ? 'pixelated' : 'auto';
      svgContainer.innerHTML = `<img src="file:///${svgPath.replace(/\\/g, '/')}" alt="" aria-hidden="true" draggable="false" style="width:${spriteSize}px;height:${spriteSize}px;image-rendering:${imageRendering};object-fit:contain;">`;
      requestAnimationFrame(positionResizeHandle);
      return;
    }
  } catch {}
  svgContainer.innerHTML = `<div style="font-size:48px">${petEmojis[type] || '🐱'}</div>`;
  requestAnimationFrame(positionResizeHandle);
}

function randomMs(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight || 1;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function themeHasState(theme, state) {
  return Boolean(theme.files && theme.files[state]);
}

function getAmbientActions(theme, logicalState) {
  if (logicalState !== 'idle') return [];
  const pool = theme.ambientStatePools?.[logicalState] || ambientStatePools[logicalState];
  if (!pool) return [];

  const actions = pool
    .filter((item) => themeHasState(theme, item.state))
    .map((item) => ({
      ...item,
      key: `state:${item.state}`,
    }));

  if (logicalState === 'idle' && Array.isArray(theme.idleAnimations)) {
    for (const idle of theme.idleAnimations) {
      if (!idle?.file) continue;
      actions.push({
        key: `file:${idle.file}`,
        file: idle.file,
        weight: idle.weight ?? 1.4,
        duration: Math.min(idle.duration || 8000, 9000),
      });
    }
  }

  const nonRepeating = actions.filter((item) => item.key !== lastAmbientActionKey);
  return nonRepeating.length ? nonRepeating : actions;
}

function clearAmbientTimer() {
  if (clawdIdleTimer) clearTimeout(clawdIdleTimer);
  clawdIdleTimer = null;
}

function clearReturnTimer() {
  if (clawdReturnTimer) clearTimeout(clawdReturnTimer);
  clawdReturnTimer = null;
}

function playAmbientAction(theme, logicalState) {
  clawdIdleTimer = null;
  if (getTheme() !== theme || currentState !== logicalState) return;
  if (Date.now() < reactionActiveUntil) {
    scheduleThemeStateTimers(logicalState, { force: true });
    return;
  }

  const action = weightedPick(getAmbientActions(theme, logicalState));
  if (!action) return;
  lastAmbientActionKey = action.key;

  if (action.file) {
    loadThemeFile(action.file);
  } else {
    loadSVG(petType, action.state || logicalState);
  }

  clawdIdleTimer = setTimeout(() => {
    if (getTheme() !== theme || currentState !== logicalState) return;
    if (Date.now() >= reactionActiveUntil) loadSVG(petType, logicalState);
    clawdIdleTimer = null;
    scheduleThemeStateTimers(logicalState, { force: true });
  }, action.duration || 7000);
}

// 应用状态
function applyState(state) {
  state = normalizeState(state);
  const prevState = currentState;
  currentState = state;
  const cfg = stateConfig[state] || stateConfig.idle;

  // 状态徽章
  stateBadge.textContent = shouldHideStateBadge() ? '' : cfg.badge;

  // 更新菜单状态
  menuState.textContent = `状态: ${state}`;

  // 动态切换动画 class 以便 CSS 动画生效
  Object.values(stateConfig).forEach(c => {
    if (c.anim) sprite.classList.remove(c.anim);
  });
  if (cfg.anim) {
    sprite.classList.add(cfg.anim);
  }

  // 状态变化时重新加载对应的动画 SVG
  if (prevState !== state) {
    loadSVG(petType, state);
  }

  scheduleThemeStateTimers(state, { force: prevState !== state });
}

function scheduleThemeStateTimers(state, options = {}) {
  const theme = getTheme();
  if (!options.force && scheduledState === state && (clawdIdleTimer || clawdReturnTimer)) return;

  clearAmbientTimer();
  clearReturnTimer();
  scheduledState = state;

  if (getAmbientActions(theme, state).length) {
    clawdIdleTimer = setTimeout(() => {
      playAmbientAction(theme, state);
    }, randomMs(AMBIENT_MIN_DELAY_MS, AMBIENT_MAX_DELAY_MS));
  }

  const returnMs = theme.autoReturn?.[state];
  if (returnMs) {
    clawdReturnTimer = setTimeout(() => {
      if (getTheme() === theme && currentState === state) applyState('idle');
    }, returnMs);
  }
}

async function loadThemeFile(file) {
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  setPetSpriteSizeVar(spriteSize);
  const theme = getTheme();
  const assetFile = theme.dir ? `${theme.dir}/${file}` : file;
  try {
    const svgPath = await window.petBridge.getAssetPath(assetFile);
    if (svgPath) {
      const imageRendering = theme.pixelated ? 'pixelated' : 'auto';
      svgContainer.innerHTML = `<img src="file:///${svgPath.replace(/\\/g, '/')}" draggable="false" style="width:${spriteSize}px;height:${spriteSize}px;image-rendering:${imageRendering};object-fit:contain;">`;
      requestAnimationFrame(positionResizeHandle);
    }
  } catch {}
}

function showPetReaction(action) {
  const theme = getTheme();
  if (isV2Pet()) {
    if (clawdReactionTimer) clearTimeout(clawdReactionTimer);
    clearAmbientTimer();
    const reactionState = action === 'drag' ? 'drag' : action === 'double' ? 'happy' : 'attention';
    const duration = action === 'drag' ? 900 : 1600;
    reactionActiveUntil = Date.now() + duration;
    loadV2Sprite(reactionState);
    clawdReactionTimer = setTimeout(() => {
      reactionActiveUntil = 0;
      loadV2Sprite(currentState);
      scheduleThemeStateTimers(currentState, { force: true });
    }, duration);
    return;
  }
  const reaction = theme.reactions?.[action];
  if (!reaction) return;
  if (clawdReactionTimer) clearTimeout(clawdReactionTimer);
  clearAmbientTimer();
  scheduledState = null;
  const duration = reaction.duration || 2500;
  reactionActiveUntil = Date.now() + duration;
  if (reaction.file) {
    loadThemeFile(reaction.file);
  } else if (reaction.state) {
    loadSVG(petType, reaction.state);
  }
  clawdReactionTimer = setTimeout(() => {
    reactionActiveUntil = 0;
    if (getTheme() === theme) {
      loadSVG(petType, currentState);
      scheduleThemeStateTimers(currentState, { force: true });
    }
  }, duration);
}

// 气泡消息
let bubbleTimer = null;
function showBubble(text) {
  bubbleText.textContent = text || stateMessages[currentState]?.[Math.floor(Math.random() * stateMessages[currentState].length)] || '...';
  bubble.classList.remove('hidden');
  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.add('hidden'), 3000);
}

let speechTimer = null;
let speechBuffer = '';
let speechRole = '';

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isInternalSpeechText(text) {
  const value = String(text || '').trim();
  return /CCM_AGENT_PROBE_OK|执行通道健康探针|AGENT_RUNNER_PROBE_OK|HEALTH[_\s-]*PROBE/i.test(value);
}

function getSpeechLabel(role) {
  const isMusicAgent = String(agentName || '').toLowerCase() === 'music-agent';
  if (isMusicAgent) {
    const musicLabels = {
      user: '你的点歌',
      status: '正在播放',
      error: '播放遇到问题',
      ask: '需要你确认',
      assistant: '',
    };
    return musicLabels[role] ?? '';
  }
  const labels = {
    user: '你的消息',
    status: '正在处理',
    error: '遇到问题',
    ask: '需要你确认',
    assistant: 'Agent 回复',
  };
  return labels[role] || 'Agent 回复';
}

function looksLikeQuestion(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  return /[?？]\s*$/.test(value)
    || /(请问|是否|要不要|需不需要|可以吗|确认一下|你希望|你想|需要你|告诉我|选择|哪个|哪种|能否|方便吗)/.test(value);
}

function setSpeechTone(role, streaming) {
  speech.classList.remove('speech-user', 'speech-status', 'speech-error', 'speech-assistant', 'speech-ask', 'streaming');
  speech.classList.add(`speech-${role}`);
  if (streaming) speech.classList.add('streaming');
}

function getSpeechHold(role, isFinal) {
  if (role === 'ask') return 30000;
  if (role === 'error') return 18000;
  if (isFinal) return 12000;
  return 8000;
}

function hideSpeech() {
  speech.classList.add('hidden');
  nameEl.classList.remove('suppressed-by-speech');
}

function showSpeech(data = {}) {
  const role = data.role || 'assistant';
  const mode = data.mode || 'replace';
  if (isInternalSpeechText(data.text)) return;
  const text = cleanSpeechText(data.text);

  if (speechRole !== role || mode === 'replace') {
    speechBuffer = '';
  }
  speechRole = role;

  if (text) {
    speechBuffer = mode === 'append' ? speechBuffer + text : text;
  }

  if (!speechBuffer) return;
  if (speechBuffer.length > 1000) {
    speechBuffer = '...' + speechBuffer.slice(-900);
  }

  const displayRole = role === 'assistant' && data.final && looksLikeQuestion(speechBuffer) ? 'ask' : role;
  const streaming = mode === 'append' && !data.final;

  setSpeechTone(displayRole, streaming);
  const label = getSpeechLabel(displayRole);
  speechLabel.textContent = label;
  speechLabel.hidden = !label;
  speechText.textContent = speechBuffer;
  speech.classList.remove('hidden');
  nameEl.classList.add('suppressed-by-speech');
  applySpeechState(displayRole, streaming, !!data.final);

  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(hideSpeech, getSpeechHold(displayRole, !!data.final));
}

function applySpeechState(role, streaming, isFinal) {
  const durableStates = new Set(['planning', 'building', 'debugging', 'reviewing', 'waiting']);
  if (durableStates.has(currentState)) {
    if (role === 'error' && currentState !== 'debugging') return applyState('debugging');
    if (role === 'ask' && currentState !== 'waiting') return applyState('waiting');
    if (role === 'assistant' && isFinal) return applyState('attention');
    return;
  }
  if (role === 'error') return applyState('debugging');
  if (role === 'ask') return applyState('waiting');
  if (role === 'user' || role === 'status') return applyState('thinking');
  if (role === 'assistant' && streaming) return applyState('working');
  if (role === 'assistant' && isFinal) return applyState('attention');
}

// 右键菜单
function showMenu() {
  menuAgentName.textContent = `${petEmojis[petType] || ''} ${agentLabel}`;
  menuState.textContent = `状态: ${currentState}`;
  menu.classList.remove('hidden');
}
function hideMenu() {
  menu.classList.add('hidden');
}

let isMouseInteractive = false;
function setMouseInteractive(active) {
  if (isMouseInteractive === active) return;
  isMouseInteractive = active;
  if (active) {
    window.petBridge.notifyMouseEnter();
  } else {
    window.petBridge.notifyMouseLeave();
  }
}

// 菜单事件
document.getElementById('menu-console').addEventListener('click', () => {
  hideMenu();
  window.petBridge.openConsole();
});
document.getElementById('menu-hide').addEventListener('click', () => {
  hideMenu();
  window.petBridge.hidePet(agentName);
});
document.querySelectorAll('.menu-types button').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    hideMenu();
    petType = type;
    petSkin = null;
    document.documentElement.dataset.petType = petType;
    loadSVG(type, currentState);
    scheduledState = null;
    scheduleThemeStateTimers(currentState, { force: true });
    window.petBridge.changeType(agentName, type);
  });
});

// 应用大小
function applySize(size) {
  petSize = Math.max(MIN_PET_SIZE, Math.min(MAX_PET_SIZE, size));
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  setPetSpriteSizeVar(spriteSize);
  const visual = svgContainer.querySelector('img, [data-pet-visual]');
  if (visual) {
    visual.style.width = (visual.matches('[data-pet-visual]') ? Math.round(spriteSize * 192 / 208) : spriteSize) + 'px';
    visual.style.height = spriteSize + 'px';
  }
  positionResizeHandle();
  window.petBridge.resizeWindow(getWindowWidth(petSize), getWindowHeight(petSize), petSize);
}

// 拖拽缩放手柄
let isResizing = false;
let resizeStartX = 0, resizeStartY = 0;
let resizeStartSize = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing = true;
  resizeStartX = e.screenX;
  resizeStartY = e.screenY;
  resizeStartSize = petSize;
  resizeHandle.classList.add('active');
  window.petBridge.notifyMouseEnter();
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  // 用右下角拖拽的距离计算新大小
  const dx = e.screenX - resizeStartX;
  const dy = e.screenY - resizeStartY;
  const delta = Math.max(Math.abs(dx), Math.abs(dy)) * (dx + dy > 0 ? 1 : -1);
  const newSize = resizeStartSize + delta;
  applySize(newSize);
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizeHandle.classList.remove('active');
    window.petBridge.saveSize(agentName, petSize);
  }
});

// 滚轮缩放
sprite.addEventListener('wheel', (e) => {
  if (!isPetBodyPoint(e.clientX, e.clientY)) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -PET_SIZE_STEP / 2 : PET_SIZE_STEP / 2;
  applySize(petSize + delta);
  window.petBridge.saveSize(agentName, petSize);
}, { passive: false });

// 拖拽
const DRAG_THRESHOLD = 12;
let dragPending = false;
let isDragging = false;
let hasMoved = false;
let dragReady = false;
let dragStartX = 0, dragStartY = 0;
let lastDragX = 0, lastDragY = 0;
let dragTravel = 0;
let winStartX = 0, winStartY = 0;

// 获取窗口初始位置（通过 IPC）
async function getWindowPosition() {
  return window.petBridge.getWindowPosition();
}

function finishDrag(event, savePosition = true) {
  if (!dragPending && !isDragging) return;
  if (event && typeof event.screenX === 'number') {
    lastDragX = event.screenX;
    lastDragY = event.screenY;
  }

  const shouldSavePosition = savePosition && isDragging && hasMoved && dragReady;
  dragPending = false;
  isDragging = false;
  dragReady = false;
  dragTravel = 0;

  if (shouldSavePosition) {
    const dx = lastDragX - dragStartX;
    const dy = lastDragY - dragStartY;
    window.petBridge.endDrag(agentName, winStartX + dx, winStartY + dy);
    loadSVG(petType, currentState);
  } else {
    hasMoved = false;
  }
}

sprite.addEventListener('mousedown', async (e) => {
  if (e.button === 2) return;
  if (!isPetBodyPoint(e.clientX, e.clientY)) return;
  if (menu.contains(e.target) || bubble.contains(e.target) || resizeHandle.contains(e.target)) return;

  dragPending = true;
  isDragging = false;
  hasMoved = false;
  dragReady = false;
  dragTravel = 0;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  lastDragX = e.screenX;
  lastDragY = e.screenY;
  const pos = await getWindowPosition();
  if (!dragPending) return;
  winStartX = pos.x;
  winStartY = pos.y;
  dragReady = true;
  window.petBridge.notifyMouseEnter();
});

document.addEventListener('mousemove', (e) => {
  if (!dragPending && !isDragging) return;
  if ((e.buttons & 1) !== 1) {
    finishDrag(e, true);
    return;
  }
  if (!dragReady) return;
  const dx = e.screenX - dragStartX;
  const dy = e.screenY - dragStartY;
  const movementX = Number.isFinite(e.movementX) ? e.movementX : e.screenX - lastDragX;
  const movementY = Number.isFinite(e.movementY) ? e.movementY : e.screenY - lastDragY;
  dragTravel += Math.hypot(movementX, movementY);
  lastDragX = e.screenX;
  lastDragY = e.screenY;

  if (!isDragging) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD || dragTravel < DRAG_THRESHOLD) return;
    dragPending = false;
    isDragging = true;
    showPetReaction('drag');
    hasMoved = true;
    window.petBridge.startDrag();
  }

  // 通过 IPC 移动窗口
  window.petBridge.moveWindow(winStartX + dx, winStartY + dy);
});

document.addEventListener('mouseup', (e) => {
  finishDrag(e, true);
});

window.addEventListener('blur', () => finishDrag(null, true));
document.addEventListener('mouseleave', () => finishDrag(null, true));

document.addEventListener('mousemove', (e) => {
  setMouseInteractive(isInteractiveTarget(e.target, e.clientX, e.clientY));
});

// 点击 - 显示气泡（仅在没有拖拽时）
sprite.addEventListener('click', (e) => {
  if (hasMoved || isDragging) return;
  if (!isPetBodyPoint(e.clientX, e.clientY)) return;
  if (menu.contains(e.target)) return;
  hideMenu();
  showPetReaction('clickLeft');
  showBubble('正在打开工作台...');
  if (window.petBridge.openWorkspace) {
    window.petBridge.openWorkspace(agentName)
      .then((result) => {
        if (!result || result.success === false) {
          showBubble('工作台未响应');
        } else if (!result.workspaceOpen) {
          showBubble('请先打开工作台');
        }
      })
      .catch(() => showBubble('工作台打开失败'));
  }
});

sprite.addEventListener('dblclick', (e) => {
  if (hasMoved || isDragging) return;
  if (!isPetBodyPoint(e.clientX, e.clientY)) return;
  if (menu.contains(e.target)) return;
  showPetReaction('double');
});

// 右键 - 显示菜单
sprite.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!isPetBodyPoint(e.clientX, e.clientY)) return;
  showPetReaction('clickRight');
  showMenu();
});

// 眼球追踪（每秒更新几次）
function updateEyeTracking() {
  if (!['cat', 'ghost'].includes(petType)) return;

  window.petBridge.getMousePosition().then(mouse => {
    const rect = svgContainer.getBoundingClientRect();
    // 将屏幕坐标转换为窗口内坐标：需要获取窗口位置
    window.petBridge.getWindowPosition().then(winPos => {
      // 鼠标相对于窗口内 SVG 中心的偏移
      const svgScreenX = winPos.x + rect.left + rect.width / 2;
      const svgScreenY = winPos.y + rect.top + rect.height / 2;
      const dx = mouse.x - svgScreenX;
      const dy = mouse.y - svgScreenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = 2;
      const offset = Math.min(maxOffset, dist / 100);

      const img = svgContainer.querySelector('img');
      if (!img) return;

      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * offset;
      const ty = Math.sin(angle) * offset;
      img.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  }).catch(() => {});
}

setInterval(updateEyeTracking, 200);

// 接收状态更新
window.petBridge.onLabelUpdate((data) => {
  if (data.agent === agentName) {
    setPetName(data.label || data.displayName);
    if (!speech.classList.contains('hidden')) {
      const label = getSpeechLabel('assistant');
      speechLabel.textContent = label;
      speechLabel.hidden = !label;
    }
  }
});

window.petBridge.onStateUpdate((data) => {
  if (data.agent === agentName) {
    applyState(data.state);
  }
});

window.petBridge.onSpeech((data) => {
  if (data.agent === agentName) {
    showSpeech(data);
  }
});

// 初始状态（等待 IPC init-pet 事件）
nameEl.textContent = '...';
applyState('idle');
