const { app, BrowserWindow, ipcMain, screen, shell, protocol } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const { buildInternalApiHeaders } = require('../dist/modules/system/internal-api-auth.js');

// Transparent Electron windows need GPU compositing on normal desktops. Software
// rendering is reserved for explicit compatibility mode and headless Linux.
const shouldDisableHardwareAcceleration = process.env.CCM_PET_DISABLE_HARDWARE_ACCELERATION === '1'
  || (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY);
if (shouldDisableHardwareAcceleration) app.disableHardwareAcceleration();

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
const RUNTIME_FILE = path.join(CCM_DIR, 'pids', 'pet-runtime.json');
const PET_CLIENT_ID = `desktop-pet:${os.hostname()}:${process.pid}:${crypto.randomBytes(6).toString('hex')}`;

const petWindows = new Map(); // agentName -> BrowserWindow
const petWindowTypes = new Map(); // agentName -> pet type currently loaded in the window
const petLabels = new Map(); // agentName -> display label
let config = { schema: 'ccm-pet-config-v2', revision: 0, configs: {}, positions: {}, customTypes: [], settings: { autoStart: false, webFallback: true } };
let agentStates = {};
const SPEECH_MIN_WIDTH = 330;
const PET_SPRITE_SCALE = 0.5;
const PET_EXTRA_HEIGHT = 165;
const PET_TOP_OVERSHOOT_RATIO = 0.75;
const PET_TOP_OVERSHOOT_MIN = 32;
const MUSIC_PET_AGENT_NAME = 'music-agent';
const BUILTIN_FALLBACK_PET_TYPE = 'yuexinmiao';
const ALLOWED_BUILTIN_PET_TYPES = new Set(['clawd', 'yuexinmiao', 'cloudling', 'calico', 'ghost', 'robot']);
function normalizePetType(type) {
  const value = String(type || '').trim();
  const customTypes = Array.isArray(config.customTypes) ? config.customTypes : [];
  if (customTypes.some(item => item && item.id === value)) return value;
  return ALLOWED_BUILTIN_PET_TYPES.has(value) ? value : BUILTIN_FALLBACK_PET_TYPE;
}

function getPetTypeMetadata(type) {
  const customTypes = Array.isArray(config.customTypes) ? config.customTypes : [];
  const skin = customTypes.find(item => item && item.id === type);
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
function signedHeaders(method, urlPath, extra = {}) {
  return { ...extra, ...buildInternalApiHeaders('desktop-pet', method, urlPath) };
}

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${API_BASE}${urlPath}`, {
      timeout: 5000,
      headers: signedHeaders('GET', urlPath),
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
          return reject(new Error(`CCM API ${urlPath} 返回 ${res.statusCode}`));
        }
        try { resolve(JSON.parse(data)); } catch { reject(new Error(`CCM API ${urlPath} 返回无效JSON`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`CCM API ${urlPath} 请求超时`)));
  });
}

function httpMutation(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${API_BASE}${path}`, {
      method,
      timeout: 5000,
      headers: signedHeaders(method, path, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) })
    }, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => {
        let parsed = {};
        let parsedOk = !d;
        try { parsed = d ? JSON.parse(d) : {}; parsedOk = true; } catch {}
        if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
          const error = new Error(parsed.error || `CCM API ${path} 返回 ${res.statusCode}`);
          error.statusCode = res.statusCode;
          error.code = parsed.code;
          error.current = parsed.current;
          return reject(error);
        }
        if (parsedOk) resolve(parsed);
        else reject(new Error(`CCM API ${path} 返回无效JSON`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`CCM API ${path} 请求超时`)));
    req.write(data);
    req.end();
  });
}
function httpPost(path, body) { return httpMutation('POST', path, body); }
function httpPatch(path, body) { return httpMutation('PATCH', path, body); }

// === 配置管理 ===
async function loadConfig() {
  const data = await httpGet('/api/pets/config');
  if (data) {
    config = {
      schema: data.schema || 'ccm-pet-config-v2',
      revision: Number(data.revision || 0),
      configs: data.configs || {},
      positions: data.positions || {},
      customTypes: data.customTypes || [],
      settings: { autoStart: data.settings?.autoStart === true, webFallback: data.settings?.webFallback !== false },
    };
  }
}

async function saveConfigPatch(patch, retry = true) {
  try {
    const result = await httpPatch('/api/pets/config', { revision: config.revision, patch });
    if (result?.config) config = result.config;
    return result;
  } catch (error) {
    if (retry && error?.code === 'state_drift') {
      if (error.current) config = error.current;
      else await loadConfig();
      return saveConfigPatch(patch, false);
    }
    throw error;
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
let sseReconnectTimer = null;
let sseReconnectAttempt = 0;
let shuttingDown = false;

function scheduleSseReconnect(reason) {
  if (shuttingDown || sseReconnectTimer) return;
  const delay = Math.min(30_000, 1_000 * 2 ** Math.min(5, sseReconnectAttempt++));
  console.error(`[pet] SSE 已断开 (${reason})，${delay}ms 后重连`);
  sseReconnectTimer = setTimeout(() => {
    sseReconnectTimer = null;
    connectSSE();
  }, delay);
}

async function acknowledgeNotification(notification) {
  if (!notification?.delivery_id) return;
  try {
    await httpPost(`/api/pets/runtime/deliveries/${encodeURIComponent(notification.delivery_id)}/ack`, {
      client_id: PET_CLIENT_ID,
      notification_id: notification.notification_id,
    });
  } catch (error) {
    console.error('[pet] 通知确认失败:', error.message);
  }
}

function notifyPersistentNotification(notification) {
  const preferred = String(notification?.action?.scope_id || '');
  const agent = petWindows.has(preferred)
    ? preferred
    : petWindows.has('global-agent') ? 'global-agent' : petWindows.keys().next().value;
  if (!agent) return false;
  const text = [notification.title, notification.summary].filter(Boolean).join('\n');
  notifySpeech(agent, {
    role: notification.role || 'status',
    text,
    final: true,
    mode: 'replace',
    notification_id: notification.notification_id,
    delivery_id: notification.delivery_id,
    action: notification.action || {},
  });
  return true;
}

function connectSSE() {
  if (shuttingDown || sseReq) return;
  const streamPath = `/api/pets/runtime/stream?client_id=${encodeURIComponent(PET_CLIENT_ID)}`;
  console.log(`[pet] 连接 SSE: ${API_BASE}${streamPath}`);
  const request = http.get(`${API_BASE}${streamPath}`, {
    headers: signedHeaders('GET', streamPath),
  }, (res) => {
    if (res.statusCode !== 200) {
      res.resume();
      sseReq = null;
      scheduleSseReconnect(`HTTP ${res.statusCode}`);
      return;
    }
    console.log('[pet] SSE 连接成功');
    sseReconnectAttempt = 0;
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
          } else if (data.type === 'notification') {
            notifyPersistentNotification(data.notification);
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
          } else if (data.type === 'notification') {
            notifyPersistentNotification(data.notification);
          } else if (data.type === 'config') {
            schedulePetSync('config changed');
          }
        } catch {}
      }
      sseReq = null;
      scheduleSseReconnect('server ended');
    });
  });
  sseReq = request;
  request.on('error', error => {
    sseReq = null;
    scheduleSseReconnect(error.message);
  });
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
    win.webContents.send('speech', { ...payload, agent });
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
    icon: path.resolve(__dirname, '..', 'public', 'ccm-app-icon.png'),
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
ipcMain.handle('ack-notification', async (_, notification) => {
  const deliveryId = String(notification?.delivery_id || '').trim();
  if (!/^und_[a-f0-9]{32}$/i.test(deliveryId)) return { success: false, error: '通知投递标识无效' };
  try {
    await acknowledgeNotification({
      delivery_id: deliveryId,
      notification_id: String(notification?.notification_id || '').trim(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle('get-asset-path', (_, filename) => {
  const safeName = String(filename || '').replace(/\\/g, '/');
  if (safeName.includes('..') || path.isAbsolute(safeName)) return null;
  const resolveSafeAsset = candidate => {
    try {
      const full = path.resolve(PET_ASSETS_DIR, candidate);
      const relative = path.relative(path.resolve(PET_ASSETS_DIR), full);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
      if (!['.svg', '.png', '.apng', '.webp', '.json'].includes(path.extname(full).toLowerCase())) return null;
      const stat = fs.lstatSync(full);
      if (!stat.isFile() || stat.isSymbolicLink()) return null;
      const real = fs.realpathSync(full);
      const realRelative = path.relative(fs.realpathSync(PET_ASSETS_DIR), real);
      return realRelative.startsWith('..') || path.isAbsolute(realRelative) ? null : real;
    } catch {
      return null;
    }
  };
  const filePath = resolveSafeAsset(safeName);
  if (filePath) return filePath;

  // 加上智能自适应：如果找不到，尝试将后缀替换后查找
  const ext = path.extname(safeName);
  if (ext) {
    const baseWithoutExt = safeName.slice(0, -ext.length);
    const altExt = ext.toLowerCase() === '.png' ? '.svg' : '.png';
    const altFilePath = resolveSafeAsset(baseWithoutExt + altExt);
    if (altFilePath) return altFilePath;
  }

  // 回退到基础 SVG
  const baseName = path.basename(safeName);
  const baseFile = baseName.split('-')[0] + '.svg';
  const basePath = resolveSafeAsset(baseFile);
  if (basePath) return basePath;
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
  await saveConfigPatch({ configs: { [agent]: { size } } });
});
ipcMain.handle('save-position', async (_, agent, x, y) => {
  await saveConfigPatch({ positions: { [agent]: { x, y } } });
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
  await saveConfigPatch({ positions: { [agent]: pos } });
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

function notificationActionUrl(action) {
  const safe = action && typeof action === 'object' ? action : {};
  const query = new URLSearchParams();
  const taskId = String(safe.task_id || '').trim();
  const permissionId = String(safe.permission_id || '').trim();
  const sessionId = String(safe.session_id || '').trim();
  const scopeId = String(safe.scope_id || '').trim();
  const projectId = String(safe.project_id || '').trim();
  const groupId = String(safe.group_id || '').trim();
  let tab = 'dashboard';
  if (permissionId) {
    tab = 'tasks';
    query.set('permission_id', permissionId);
  } else if (taskId) {
    tab = 'trace-replay';
  } else if (projectId || safe.scope_type === 'project') {
    tab = 'projects';
  } else if (groupId || safe.scope_type === 'group') {
    tab = 'groups';
  } else if (safe.scope_type === 'global') {
    tab = 'global-agent';
  }
  query.set('tab', tab);
  if (taskId) query.set('task_id', taskId);
  if (sessionId) query.set('session_id', sessionId);
  if (projectId) query.set('project', projectId);
  if (groupId) query.set('group', groupId);
  if (scopeId) query.set('scope_id', scopeId);
  return `${API_BASE}/?${query.toString()}`;
}

ipcMain.handle('open-notification', async (_, action) => {
  const target = notificationActionUrl(action);
  await shell.openExternal(target);
  return { success: true, url: target };
});

ipcMain.on('change-type', async (_, agent, type) => {
  await saveConfigPatch({ configs: { [agent]: { type, enabled: true } } });
  destroyPetWindow(agent);
  createPetWindow(agent, type);
});

ipcMain.on('hide-pet', async (_, agent) => {
  await saveConfigPatch({ configs: { [agent]: { enabled: false } } });
  destroyPetWindow(agent);
});

// === 应用生命周期 ===
app.whenReady().then(async () => {
  console.log('[pet] Electron 已启动，正在连接 ccm 服务...');
  // 写入 PID 文件
  if (!fs.existsSync(path.dirname(PID_FILE))) fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));
  const runtimeTemp = `${RUNTIME_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(runtimeTemp, JSON.stringify({
    schema: 'ccm-pet-runtime-v2',
    pid: process.pid,
    port: CCM_PORT,
    clientId: PET_CLIENT_ID,
    status: 'ready',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, null, 2));
  try { fs.renameSync(runtimeTemp, RUNTIME_FILE); }
  catch {
    try { fs.unlinkSync(RUNTIME_FILE); } catch {}
    fs.renameSync(runtimeTemp, RUNTIME_FILE);
  }

  try {
    await loadConfig();
    await syncPets();
  } catch (error) {
    console.error('[pet] 初始化配置失败:', error.message);
  }
  connectSSE();
  console.log('[pet] 初始化完成');

  // 定期同步宠物列表（3秒轮询，快速响应隐藏/显示）
  setInterval(() => schedulePetSync('periodic'), 3000);
});

app.on('window-all-closed', () => {
  // 不退出，保持后台运行
});

app.on('before-quit', () => {
  shuttingDown = true;
  try { fs.unlinkSync(PID_FILE); } catch {}
  try { fs.unlinkSync(RUNTIME_FILE); } catch {}
  if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
  if (sseReq) sseReq.destroy();
});
