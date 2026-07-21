const { app, BrowserWindow, ipcMain, screen, shell, protocol } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// 禁用 GPU 硬件加速，防止在 Headless/远程/系统 Session 隔离环境下因 GPU 崩溃导致闪退
app.disableHardwareAcceleration();

const os = require('os');
const CCM_DIR = path.join(os.homedir(), '.cc-connect');
const USER_DATA_DIR = path.join(CCM_DIR, 'temp', 'pet-userdata');
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}
app.setPath('userData', USER_DATA_DIR);

const CCM_PORT = parseInt(process.env.CCM_PORT) || 3080;

// 防止未处理错误导致进程崩溃
process.on('uncaughtException', (err) => { console.error('[pet] uncaughtException:', err.message); });
process.on('unhandledRejection', (err) => { console.error('[pet] unhandledRejection:', err); });

const PET_DIR = path.join(__dirname);
const PET_ASSETS_DIR = path.resolve(__dirname, '..', 'public', 'pets');
const API_BASE = `http://localhost:${CCM_PORT}`;
const PETS_FILE = path.join(CCM_DIR, 'pets.json');
const PID_FILE = path.join(CCM_DIR, 'pids', 'pet.pid');

const petWindows = new Map(); // agentName -> BrowserWindow
const petWindowTypes = new Map(); // agentName -> pet type currently loaded in the window
const petLabels = new Map(); // agentName -> display label
let config = { configs: {}, positions: {}, customTypes: [] };
let agentStates = {};
const SPEECH_MIN_WIDTH = 330;
const PET_SPRITE_SCALE = 0.5;
const PET_EXTRA_HEIGHT = 165;
const PET_TOP_OVERSHOOT_RATIO = 0.75;
const PET_TOP_OVERSHOOT_MIN = 32;
const MUSIC_PET_AGENT_NAME = 'music-agent';
const BUILTIN_FALLBACK_PET_TYPE = 'yuexinmiao';
const ALLOWED_BUILTIN_PET_TYPES = new Set(['clawd', 'yuexinmiao', 'cloudling', 'calico', 'ghost', 'robot']);
const BUILTIN_PET_SKINS = {
  yuexinmiao: {
    id: 'yuexinmiao',
    name: '月薪喵',
    spriteVersionNumber: 2,
    spriteRows: 9,
    spritesheetPath: 'yuexinmiao1/spritesheet.webp',
    format: 'hybrid',
    pixelated: true,
    disableLegacyAmbient: true,
    sourceCreator: 'kiffin',
    sourceUrl: 'https://codex-pet.org/zh/pets/yuexinmiao1/',
    supplementalStateFiles: {
      thinking: 'yuexinmiao1/thinking.svg',
      planning: 'yuexinmiao1/planning.svg',
      working: 'yuexinmiao1/working.svg',
      building: 'yuexinmiao1/building.svg',
      debugging: 'yuexinmiao1/debugging.svg',
      reviewing: 'yuexinmiao1/reviewing.svg',
      waiting: 'yuexinmiao1/waiting.svg',
      juggling: 'yuexinmiao1/juggling.svg',
      sweeping: 'yuexinmiao1/sweeping.svg',
      carrying: 'yuexinmiao1/carrying.svg',
      notification: 'yuexinmiao1/notification.svg',
      attention: 'yuexinmiao1/attention.svg',
      happy: 'yuexinmiao1/happy.svg',
      error: 'yuexinmiao1/error.svg',
      yawning: 'yuexinmiao1/yawning.svg',
      dozing: 'yuexinmiao1/dozing.svg',
      collapsing: 'yuexinmiao1/collapsing.svg',
      sleeping: 'yuexinmiao1/sleeping.svg',
      waking: 'yuexinmiao1/waking.svg',
    },
  },
};

function normalizePetType(type) {
  const value = String(type || '').trim();
  const customTypes = Array.isArray(config.customTypes) ? config.customTypes : [];
  if (customTypes.some(item => item && item.id === value)) return value;
  return ALLOWED_BUILTIN_PET_TYPES.has(value) ? value : BUILTIN_FALLBACK_PET_TYPE;
}

function getPetTypeMetadata(type) {
  const customTypes = Array.isArray(config.customTypes) ? config.customTypes : [];
  const skin = customTypes.find(item => item && item.id === type) || BUILTIN_PET_SKINS[type];
  if (!skin) return null;
  return {
    id: skin.id,
    name: skin.name || skin.id,
    spriteVersionNumber: Number(skin.spriteVersionNumber || 1),
    spriteRows: Number(skin.spriteRows || 11),
    spritesheetPath: String(skin.spritesheetPath || ''),
    format: String(skin.format || ''),
    generationEngine: String(skin.generationEngine || ''),
    pixelated: skin.pixelated === true,
    disableLegacyAmbient: skin.disableLegacyAmbient === true,
    supplementalStateFiles: { ...(skin.supplementalStateFiles || {}) },
    sourceCreator: String(skin.sourceCreator || ''),
    sourceUrl: String(skin.sourceUrl || ''),
  };
}

function getPetWindowSize(size) {
  return {
    width: Math.max(size, SPEECH_MIN_WIDTH),
    height: Math.round(size * PET_SPRITE_SCALE) + PET_EXTRA_HEIGHT,
  };
}

function clampPetPositionForBounds(bounds, x, y, size) {
  const petVisualSize = Math.max(40, Math.round((size || 120) * PET_SPRITE_SCALE));
  const topOvershoot = Math.max(PET_TOP_OVERSHOOT_MIN, Math.round(petVisualSize * PET_TOP_OVERSHOOT_RATIO));
  const petCenterX = bounds.width / 2;
  const petCenterY = bounds.height / 2;
  const display = screen.getDisplayMatching({
    x: Math.round(x),
    y: Math.round(y),
    width: bounds.width,
    height: bounds.height,
  });
  const area = display.workArea;
  const minX = area.x - petCenterX + petVisualSize / 2;
  const maxX = area.x + area.width - petCenterX - petVisualSize / 2;
  // The pet window includes speech/name padding and many SVG assets have transparent
  // top padding, so the old center-based clamp made the visible pet feel blocked
  // before it reached the screen top. Allow a controlled overshoot upward while
  // still keeping enough of the window visible to drag it back.
  const minY = area.y - petCenterY + petVisualSize / 2 - topOvershoot;
  const maxY = area.y + area.height - petCenterY - petVisualSize / 2;
  return {
    x: Math.round(Math.max(minX, Math.min(maxX, x))),
    y: Math.round(Math.max(minY, Math.min(maxY, y))),
  };
}

function findAgentByWebContents(webContentsId) {
  for (const [name, win] of petWindows) {
    if (!win.isDestroyed() && win.webContents.id === webContentsId) return name;
  }
  return null;
}

function getSizeForAgent(agent) {
  return (agent && config.configs[agent] && config.configs[agent].size) || 120;
}

function clampWindowPosition(win, x, y, agent) {
  return clampPetPositionForBounds(win.getBounds(), x, y, getSizeForAgent(agent));
}

// === HTTP 工具 ===
function httpGet(urlPath) {
  return new Promise((resolve) => {
    const req = http.get(`${API_BASE}${urlPath}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function httpPost(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

// === 配置管理 ===
async function loadConfig() {
  const data = await httpGet('/api/pets/config');
  if (data) {
    config = {
      configs: data.configs || {},
      positions: data.positions || {},
      customTypes: data.customTypes || []
    };
  }
}

function getConfigForAgent(agent) {
  const cfg = config.configs && config.configs[agent];
  const defaultType = agent === MUSIC_PET_AGENT_NAME ? 'cloudling' : BUILTIN_FALLBACK_PET_TYPE;
  if (!cfg) return { type: defaultType, enabled: true };
  return { type: normalizePetType(cfg.type || defaultType), enabled: cfg.enabled !== false };
}

function getPositionForAgent(agent) {
  return (config.positions && config.positions[agent]) || null;
}

// === SSE 状态流 ===
let sseReq = null;
function connectSSE() {
  console.log(`[pet] 连接 SSE: ${API_BASE}/api/status/stream?client=pet`);
  http.get(`${API_BASE}/api/status/stream?client=pet`, (res) => {
    console.log(`[pet] SSE 连接成功, status: ${res.statusCode}`);
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'snapshot') {
            for (const a of data.agents) {
              const agentKey = a.name || a.agent;
              if (!agentKey) continue;
              const oldState = agentStates[agentKey];
              agentStates[agentKey] = a.state;
              if (oldState !== a.state) notifyStateChange(agentKey, a.state);
            }
          } else if (data.type === 'state') {
            const oldState = agentStates[data.agent];
            agentStates[data.agent] = data.state;
            if (oldState !== data.state) notifyStateChange(data.agent, data.state);
          } else if (data.type === 'speech') {
            notifySpeech(data.agent, data);
          } else if (data.type === 'config') {
            schedulePetSync('config changed');
          }
        } catch {}
      }
    });
    res.on('end', () => {
      // 处理缓冲区剩余数据
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim().replace(/^data: /, ''));
          if (data.type === 'snapshot') {
            for (const a of data.agents) {
              const agentKey = a.name || a.agent;
              if (!agentKey) continue;
              agentStates[agentKey] = a.state;
              notifyStateChange(agentKey, a.state);
            }
          } else if (data.type === 'state') {
            agentStates[data.agent] = data.state;
            notifyStateChange(data.agent, data.state);
          } else if (data.type === 'speech') {
            notifySpeech(data.agent, data);
          } else if (data.type === 'config') {
            schedulePetSync('config changed');
          }
        } catch {}
      }
      setTimeout(connectSSE, 5000);
    });
    sseReq = res;
  }).on('error', () => { setTimeout(connectSSE, 10000); });
}

function notifyStateChange(agent, state) {
  console.log(`[pet] 状态变化: ${agent} -> ${state}`);
  const win = petWindows.get(agent);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-update', { agent, state });
  }
}

function notifySpeech(agent, payload) {
  const win = petWindows.get(agent);
  if (win && !win.isDestroyed()) {
    win.webContents.send('speech', payload);
  }
}

let syncPetsPromise = null;
function schedulePetSync(reason = 'manual') {
  if (syncPetsPromise) return;
  syncPetsPromise = syncPets()
    .catch((e) => console.error(`[pet] 同步宠物失败 (${reason}):`, e.message))
    .finally(() => { syncPetsPromise = null; });
}

// === 创建宠物窗口 ===
function createPetWindow(agent, petType, label = petLabels.get(agent) || agent) {
  if (petWindows.has(agent)) return petWindows.get(agent);
  petLabels.set(agent, label);
  console.log(`[pet] 创建宠物窗口: ${label} (${agent}, ${petType})`);

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const pos = getPositionForAgent(agent);
  const savedSize = (config.configs[agent] && config.configs[agent].size) || 120;
  const { width: winW, height: winH } = getPetWindowSize(savedSize);
  const rawX = pos ? pos.x : screenW - winW - 20 - Math.random() * 100;
  const rawY = pos ? pos.y : screenH - winH - 20 - Math.random() * 100;
  const { x, y } = clampPetPositionForBounds({ width: winW, height: winH }, rawX, rawY, savedSize);

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round(x),
    y: Math.round(y),
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    title: '',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setBackgroundColor('#00000000');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver');

  // 加载渲染页面，通过 IPC 传递参数
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('init-pet', {
      agent,
      label,
      type: petType,
      skin: getPetTypeMetadata(petType),
      state: agentStates[agent] || 'idle',
      size: savedSize
    });
    win.showInactive();
  });

  win.on('closed', () => {
    if (petWindows.get(agent) === win) {
      petWindows.delete(agent);
      petWindowTypes.delete(agent);
    }
  });

  petWindows.set(agent, win);
  petWindowTypes.set(agent, petType);
  return win;
}

function destroyPetWindow(agent) {
  const win = petWindows.get(agent);
  if (win && !win.isDestroyed()) win.close();
  petWindows.delete(agent);
  petWindowTypes.delete(agent);
}

// === 同步宠物列表 ===
async function syncPets() {
  await loadConfig();
  const data = await httpGet('/api/pets/agents');
  let petAgents = data?.agents;
  if (!Array.isArray(petAgents)) {
    const projects = await httpGet('/api/projects');
    petAgents = projects?.projects;
  }
  if (!Array.isArray(petAgents)) {
    console.log('[pet] 未获取到宠物 Agent 列表，请确认 ccm 服务已启动');
    return;
  }
  console.log(`[pet] 获取到 ${petAgents.length} 个宠物 Agent`);

  for (const p of petAgents) {
    const agentCfg = getConfigForAgent(p.name);
    const previousState = agentStates[p.name];
    const nextState = p.state || (p.running ? 'working' : 'idle');
    agentStates[p.name] = nextState;
    const label = p.petLabel || p.displayName || p.label || p.name;
    const previousLabel = petLabels.get(p.name);
    petLabels.set(p.name, label);
    console.log(`[pet] Agent: ${label}, enabled: ${agentCfg.enabled}, type: ${agentCfg.type}`);
    if (agentCfg.enabled !== false) {
      if (!petWindows.has(p.name)) {
        try {
          createPetWindow(p.name, agentCfg.type || BUILTIN_FALLBACK_PET_TYPE, label);
        } catch(e) {
          console.error(`[pet] 创建窗口失败: ${p.name}`, e.message);
        }
      } else {
        const win = petWindows.get(p.name);
        const nextType = agentCfg.type || BUILTIN_FALLBACK_PET_TYPE;
        if (petWindowTypes.get(p.name) !== nextType) {
          console.log(`[pet] 皮肤变更，重建窗口: ${label} (${p.name}) -> ${nextType}`);
          destroyPetWindow(p.name);
          createPetWindow(p.name, nextType, label);
          continue;
        }
        if (win && !win.isDestroyed()) {
          if (previousLabel !== label) {
            win.webContents.send('label-update', { agent: p.name, label });
          }
          if (previousState !== nextState) {
            win.webContents.send('state-update', { agent: p.name, state: nextState });
          }
        }
      }
    }
  }

  // 移除不再存在或被隐藏的 Agent 的宠物
  const currentNames = new Set(petAgents.map(p => p.name));
  for (const [name, win] of petWindows) {
    const cfg = getConfigForAgent(name);
    if (!currentNames.has(name) || cfg.enabled === false) {
      destroyPetWindow(name);
    }
  }
}

// === IPC 处理 ===
ipcMain.handle('get-config', () => config);
ipcMain.handle('get-asset-path', (_, filename) => {
  const safeName = String(filename || '').replace(/\\/g, '/');
  if (safeName.includes('..') || path.isAbsolute(safeName)) return null;
  const filePath = path.join(PET_ASSETS_DIR, safeName);
  if (fs.existsSync(filePath)) return filePath;

  // 加上智能自适应：如果找不到，尝试将后缀替换后查找
  const ext = path.extname(safeName);
  if (ext) {
    const baseWithoutExt = safeName.slice(0, -ext.length);
    const altExt = ext.toLowerCase() === '.png' ? '.svg' : '.png';
    const altFilePath = path.join(PET_ASSETS_DIR, baseWithoutExt + altExt);
    if (fs.existsSync(altFilePath)) return altFilePath;
  }

  // 回退到基础 SVG
  const baseName = path.basename(safeName);
  const baseFile = baseName.split('-')[0] + '.svg';
  const basePath = path.join(PET_ASSETS_DIR, baseFile);
  if (fs.existsSync(basePath)) return basePath;
  return null;
});
ipcMain.handle('get-agent-name', (event) => {
  for (const [name, win] of petWindows) {
    if (win.webContents.id === event.sender.id) return name;
  }
  return 'unknown';
});
ipcMain.handle('get-pet-type', (event) => {
  for (const [name, win] of petWindows) {
    if (win.webContents.id === event.sender.id) return getConfigForAgent(name).type || BUILTIN_FALLBACK_PET_TYPE;
  }
  return BUILTIN_FALLBACK_PET_TYPE;
});
ipcMain.handle('get-mouse-position', () => {
  const p = screen.getCursorScreenPoint();
  return { x: p.x, y: p.y };
});
ipcMain.handle('get-window-position', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const pos = win.getPosition();
    return { x: pos[0], y: pos[1] };
  }
  return { x: 0, y: 0 };
});
ipcMain.on('move-window', (event, x, y) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const agent = findAgentByWebContents(event.sender.id);
    const pos = clampWindowPosition(win, x, y, agent);
    win.setPosition(pos.x, pos.y);
  }
});
ipcMain.on('resize-window', (event, w, h, size) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const agent = findAgentByWebContents(event.sender.id);
    const bounds = win.getBounds();
    const nextW = Math.round(w);
    const nextH = Math.round(h);
    const centerX = bounds.x + bounds.width / 2;
    const nextBounds = { width: nextW, height: nextH };
    const nextPos = clampPetPositionForBounds(nextBounds, Math.round(centerX - nextW / 2), bounds.y, size || getSizeForAgent(agent));
    win.setBounds({ x: nextPos.x, y: nextPos.y, width: nextW, height: nextH });
  }
});
ipcMain.handle('save-size', async (_, agent, size) => {
  if (!config.configs[agent]) config.configs[agent] = { type: BUILTIN_FALLBACK_PET_TYPE };
  config.configs[agent].size = size;
  await httpPost('/api/pets/config', config);
});
ipcMain.handle('save-position', async (_, agent, x, y) => {
  config.positions[agent] = { x, y };
  await httpPost('/api/pets/config', config);
});

ipcMain.on('mouse-enter', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(false);
});
ipcMain.on('mouse-leave', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.on('start-drag', () => {});
ipcMain.on('end-drag', async (_, agent, x, y) => {
  const win = petWindows.get(agent);
  const pos = win && !win.isDestroyed() ? clampWindowPosition(win, x, y, agent) : { x, y };
  config.positions[agent] = pos;
  await httpPost('/api/pets/config', config);
});

ipcMain.on('open-console', () => {
  shell.openExternal(`http://localhost:${CCM_PORT}`);
});

ipcMain.handle('open-workspace', async (_, agent) => {
  const safeAgent = String(agent || '').trim();
  try {
    const data = await httpPost('/api/pets/navigate', { agent: safeAgent });
    return data || { success: false, error: '工作台未响应' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('change-type', async (_, agent, type) => {
  if (!config.configs[agent]) config.configs[agent] = { enabled: true };
  config.configs[agent].type = type;
  await httpPost('/api/pets/config', config);
  destroyPetWindow(agent);
  createPetWindow(agent, type);
});

ipcMain.on('hide-pet', async (_, agent) => {
  if (!config.configs[agent]) config.configs[agent] = {};
  config.configs[agent].enabled = false;
  await httpPost('/api/pets/config', config);
  destroyPetWindow(agent);
});

// === 应用生命周期 ===
app.whenReady().then(async () => {
  console.log('[pet] Electron 已启动，正在连接 ccm 服务...');
  // 写入 PID 文件
  if (!fs.existsSync(path.dirname(PID_FILE))) fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  await loadConfig();
  await syncPets();
  connectSSE();
  console.log('[pet] 初始化完成');

  // 定期同步宠物列表（3秒轮询，快速响应隐藏/显示）
  setInterval(syncPets, 3000);
});

app.on('window-all-closed', () => {
  // 不退出，保持后台运行
});

app.on('before-quit', () => {
  try { fs.unlinkSync(PID_FILE); } catch {}
  if (sseReq) sseReq.destroy();
});
