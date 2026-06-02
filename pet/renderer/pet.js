let agentName = 'loading';
let petType = 'cat';
let currentState = 'idle';
let petSize = 120;

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
};

const clawdIdleAnimations = [
  { file: 'clawd-idle-look.svg', duration: 6500 },
  { file: 'clawd-idle-bubble.svg', duration: 13500 },
  { file: 'clawd-idle-reading.svg', duration: 14000 },
];

const clawdAutoReturnMs = {
  attention: 4000,
  happy: 4000,
  error: 5000,
  sweeping: 300000,
  notification: 5000,
  carrying: 3000,
};

let clawdIdleTimer = null;
let clawdReturnTimer = null;
let clawdReactionTimer = null;

function stateFileMap(type) {
  return {
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
    idleAnimations: clawdIdleAnimations,
    autoReturn: clawdAutoReturnMs,
    reactions: {
      drag: { file: 'clawd-react-drag.svg' },
      clickLeft: { file: 'clawd-react-left.svg', duration: 2500 },
      clickRight: { file: 'clawd-react-right.svg', duration: 2500 },
      double: { file: 'clawd-react-double.svg', duration: 3500 },
    },
  },
};

function getTheme(type = petType) {
  return petThemes[type] || petThemes.cat;
}

function normalizeState(state) {
  if (state === 'happy') return 'attention';
  return state || 'idle';
}

function isClawd() {
  return getTheme().hideBadge === true;
}

function resolveThemeFile(type, state) {
  const theme = getTheme(type);
  const normalizedState = normalizeState(state);
  const file = theme.files[normalizedState] || theme.files.idle || `${type}.svg`;
  return theme.dir ? `${theme.dir}/${file}` : file;
}

// 通过 IPC 接收初始化参数
window.petBridge.onInitPet((data) => {
  agentName = data.agent || 'unknown';
  petType = data.type || 'cat';
  currentState = normalizeState(data.state || 'idle');
  petSize = data.size || 120;
  document.documentElement.dataset.petType = petType;
  nameEl.textContent = agentName;
  loadSVG(petType, currentState);
  applyState(currentState);
  // 应用保存的大小
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
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
  error:    { badge: '❌',     anim: 'anim-error' },
  happy:    { badge: '✨',     anim: 'anim-happy' },
  attention:{ badge: '✨',     anim: 'anim-happy' },
  notification: { badge: '!',  anim: 'anim-thinking' },
  carrying: { badge: '📦',     anim: 'anim-working' },
  sweeping: { badge: '🧹',     anim: 'anim-working' },
  juggling: { badge: '♪',      anim: 'anim-working' },
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
  error:    ['出了点问题...', '需要检查一下', '出错了！'],
  happy:    ['完成啦！✨', '搞定！', '任务完成！'],
  attention:['完成啦！✨', '搞定！', '任务完成！'],
  notification: ['需要你看一下', '有新的提醒', '请确认一下'],
  carrying: ['正在搬运上下文...', '准备工作区...', '带上资料走起'],
  sweeping: ['正在整理上下文...', '清理一下思路...', '压缩上下文中'],
  juggling: ['子任务启动中...', '多线协作中...', '正在调度任务'],
  sleeping: ['💤 zzz...', '好困...', '休息一下...'],
};

const petEmojis = { cat: '🐱', crab: '🦀', robot: '🤖', ghost: '👻', clawd: '🦀' };
const SPEECH_MIN_WIDTH = 280;
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
  const img = svgContainer.querySelector('img');
  const rect = (img || sprite).getBoundingClientRect();
  const hitBox = getTheme().bodyHitBox || { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  return {
    left: rect.left + rect.width * hitBox.x,
    top: rect.top + rect.height * hitBox.y,
    right: rect.left + rect.width * (hitBox.x + hitBox.w),
    bottom: rect.top + rect.height * (hitBox.y + hitBox.h),
  };
}

function positionResizeHandle() {
  const img = svgContainer.querySelector('img');
  if (!img) return;
  const imgRect = img.getBoundingClientRect();
  const spriteRect = sprite.getBoundingClientRect();
  const hitBox = getTheme().bodyHitBox || { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  const handleSize = resizeHandle.offsetWidth || 16;
  const bodyRight = imgRect.left - spriteRect.left + imgRect.width * (hitBox.x + hitBox.w);
  const bodyBottom = imgRect.top - spriteRect.top + imgRect.height * (hitBox.y + hitBox.h);
  resizeHandle.style.left = `${Math.round(bodyRight - handleSize * 0.55)}px`;
  resizeHandle.style.top = `${Math.round(bodyBottom - handleSize * 0.55)}px`;
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
  const theme = getTheme(type);
  const svgFile = resolveThemeFile(type, state);
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  try {
    const svgPath = await window.petBridge.getAssetPath(svgFile);
    if (svgPath) {
      const imageRendering = theme.pixelated ? 'pixelated' : 'auto';
      svgContainer.innerHTML = `<img src="file:///${svgPath.replace(/\\/g, '/')}" draggable="false" style="width:${spriteSize}px;height:${spriteSize}px;image-rendering:${imageRendering}">`;
      requestAnimationFrame(positionResizeHandle);
      return;
    }
  } catch {}
  svgContainer.innerHTML = `<div style="font-size:48px">${petEmojis[type] || '🐱'}</div>`;
  requestAnimationFrame(positionResizeHandle);
}

// 应用状态
function applyState(state) {
  state = normalizeState(state);
  const prevState = currentState;
  currentState = state;
  const cfg = stateConfig[state] || stateConfig.idle;

  // 状态徽章
  stateBadge.textContent = isClawd() ? '' : cfg.badge;

  // 更新菜单状态
  menuState.textContent = `状态: ${state}`;

  // 状态变化时重新加载对应的动画 SVG
  if (prevState !== state) {
    loadSVG(petType, state);
  }

  scheduleThemeStateTimers(state);
}

function scheduleThemeStateTimers(state) {
  if (clawdIdleTimer) clearTimeout(clawdIdleTimer);
  if (clawdReturnTimer) clearTimeout(clawdReturnTimer);
  const theme = getTheme();

  if (state === 'idle' && theme.idleAnimations?.length) {
    const idle = theme.idleAnimations[Math.floor(Math.random() * theme.idleAnimations.length)];
    clawdIdleTimer = setTimeout(() => {
      if (getTheme() !== theme || currentState !== 'idle') return;
      loadThemeFile(idle.file);
      clawdIdleTimer = setTimeout(() => {
        if (getTheme() !== theme || currentState !== 'idle') return;
        loadSVG(petType, 'idle');
        scheduleThemeStateTimers('idle');
      }, idle.duration);
    }, 12000 + Math.random() * 10000);
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
  const theme = getTheme();
  const assetFile = theme.dir ? `${theme.dir}/${file}` : file;
  try {
    const svgPath = await window.petBridge.getAssetPath(assetFile);
    if (svgPath) {
      const imageRendering = theme.pixelated ? 'pixelated' : 'auto';
      svgContainer.innerHTML = `<img src="file:///${svgPath.replace(/\\/g, '/')}" draggable="false" style="width:${spriteSize}px;height:${spriteSize}px;image-rendering:${imageRendering}">`;
      requestAnimationFrame(positionResizeHandle);
    }
  } catch {}
}

function showPetReaction(action) {
  const theme = getTheme();
  const reaction = theme.reactions?.[action];
  if (!reaction) return;
  if (clawdReactionTimer) clearTimeout(clawdReactionTimer);
  const duration = reaction.duration || 2500;
  if (reaction.file) {
    loadThemeFile(reaction.file);
  } else if (reaction.state) {
    loadSVG(petType, reaction.state);
  }
  clawdReactionTimer = setTimeout(() => {
    if (getTheme() === theme) loadSVG(petType, currentState);
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

function getSpeechLabel(role) {
  const labels = {
    user: '你',
    status: '正在处理',
    error: '错误',
    ask: '需要你确认',
    assistant: agentName,
  };
  return labels[role] || agentName;
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

function showSpeech(data = {}) {
  const role = data.role || 'assistant';
  const mode = data.mode || 'replace';
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
  speechLabel.textContent = getSpeechLabel(displayRole);
  speechText.textContent = speechBuffer;
  speech.classList.remove('hidden');
  applySpeechState(displayRole, streaming, !!data.final);

  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speech.classList.add('hidden'), getSpeechHold(displayRole, !!data.final));
}

function applySpeechState(role, streaming, isFinal) {
  if (role === 'error') return applyState('error');
  if (role === 'ask') return applyState('notification');
  if (role === 'user' || role === 'status') return applyState('thinking');
  if (role === 'assistant' && streaming) return applyState('working');
  if (role === 'assistant' && isFinal) return applyState('attention');
}

// 右键菜单
function showMenu() {
  menuAgentName.textContent = `${petEmojis[petType] || ''} ${agentName}`;
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
    document.documentElement.dataset.petType = petType;
    loadSVG(type, currentState);
    window.petBridge.changeType(agentName, type);
  });
});

// 应用大小
function applySize(size) {
  petSize = Math.max(MIN_PET_SIZE, Math.min(MAX_PET_SIZE, size));
  const spriteSize = Math.round(petSize * PET_SPRITE_SCALE);
  const img = svgContainer.querySelector('img');
  if (img) {
    img.style.width = spriteSize + 'px';
    img.style.height = spriteSize + 'px';
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
  showBubble();
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
