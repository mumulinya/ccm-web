const { app, BrowserWindow, ipcMain, screen, shell, protocol } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const CCM_PORT = parseInt(process.env.CCM_PORT) || 3080;

// 防止未处理错误导致进程崩溃
process.on('uncaughtException', (err) => { console.error('[pet] uncaughtException:', err.message); });
process.on('unhandledRejection', (err) => { console.error('[pet] unhandledRejection:', err); });

// 注册自定义协议，用于加载本地资源文件
const PET_DIR = path.join(__dirname);
protocol.registerSchemesAsPrivileged([{
  scheme: 'pet',
  privileges: { standard: true, supportFetchAPI: true, corsEnabled: true }
}]);
const API_BASE = `http://localhost:${CCM_PORT}`;
const CCM_DIR = path.join(require('os').homedir(), '.cc-connect');
const PETS_FILE = path.join(CCM_DIR, 'pets.json');
const PID_FILE = path.join(CCM_DIR, 'pids', 'pet.pid');

const petWindows = new Map(); // agentName -> BrowserWindow
let config = { configs: {}, positions: {} };
let agentStates = {};
const SPEECH_MIN_WIDTH = 280;
const PET_SPRITE_SCALE = 0.5;
const PET_EXTRA_HEIGHT = 165;

function getPetWindowSize(size) {
  return {
    width: Math.max(size, SPEECH_MIN_WIDTH),
    height: Math.round(size * PET_SPRITE_SCALE) + PET_EXTRA_HEIGHT,
  };
}

function clampPetPositionForBounds(bounds, x, y, size) {
  const petVisualSize = Math.max(40, Math.round((size || 120) * PET_SPRITE_SCALE));
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
  const minY = area.y - petCenterY + petVisualSize / 2;
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
      positions: data.positions || {}
    };
  }
}

function getConfigForAgent(agent) {
  const cfg = config.configs && config.configs[agent];
  if (!cfg) return { type: 'cat', enabled: true };
  return { type: cfg.type || 'cat', enabled: cfg.enabled !== false };
}

function getPositionForAgent(agent) {
  return (config.positions && config.positions[agent]) || null;
}

// === SSE 状态流 ===
let sseReq = null;
function connectSSE() {
  console.log(`[pet] 连接 SSE: ${API_BASE}/api/status/stream`);
  http.get(`${API_BASE}/api/status/stream`, (res) => {
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
              const oldState = agentStates[a.agent];
              agentStates[a.agent] = a.state;
              if (oldState !== a.state) notifyStateChange(a.agent, a.state);
            }
          } else if (data.type === 'state') {
            const oldState = agentStates[data.agent];
            agentStates[data.agent] = data.state;
            if (oldState !== data.state) notifyStateChange(data.agent, data.state);
          } else if (data.type === 'speech') {
            notifySpeech(data.agent, data);
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
              agentStates[a.agent] = a.state;
              notifyStateChange(a.agent, a.state);
            }
          } else if (data.type === 'state') {
            agentStates[data.agent] = data.state;
            notifyStateChange(data.agent, data.state);
          } else if (data.type === 'speech') {
            notifySpeech(data.agent, data);
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

// === 创建宠物窗口 ===
function createPetWindow(agent, petType) {
  if (petWindows.has(agent)) return petWindows.get(agent);
  console.log(`[pet] 创建宠物窗口: ${agent} (${petType})`);

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
      type: petType,
      state: agentStates[agent] || 'idle',
      size: savedSize
    });
    win.showInactive();
  });

  win.on('closed', () => { petWindows.delete(agent); });

  petWindows.set(agent, win);
  return win;
}

function destroyPetWindow(agent) {
  const win = petWindows.get(agent);
  if (win && !win.isDestroyed()) win.close();
  petWindows.delete(agent);
}

// === 同步宠物列表 ===
async function syncPets() {
  await loadConfig();
  const projects = await httpGet('/api/projects');
  if (!projects || !projects.projects) {
    console.log('[pet] 未获取到项目列表，请确认 ccm 服务已启动');
    return;
  }
  console.log(`[pet] 获取到 ${projects.projects.length} 个项目`);

  for (const p of projects.projects) {
    const agentCfg = getConfigForAgent(p.name);
    agentStates[p.name] = p.state || (p.running ? 'working' : 'idle');
    console.log(`[pet] 项目: ${p.name}, enabled: ${agentCfg.enabled}, type: ${agentCfg.type}`);
    if (agentCfg.enabled !== false) {
      if (!petWindows.has(p.name)) {
        try {
          createPetWindow(p.name, agentCfg.type || 'cat');
        } catch(e) {
          console.error(`[pet] 创建窗口失败: ${p.name}`, e.message);
        }
      } else {
        const win = petWindows.get(p.name);
        if (win && !win.isDestroyed()) {
          win.webContents.send('state-update', { agent: p.name, state: agentStates[p.name] });
        }
      }
    }
  }

  // 移除不再存在或被隐藏的 Agent 的宠物
  const currentNames = new Set(projects.projects.map(p => p.name));
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
  const filePath = path.join(__dirname, 'assets', safeName);
  if (fs.existsSync(filePath)) return filePath;
  // 回退到基础 SVG
  const baseName = path.basename(safeName);
  const baseFile = baseName.split('-')[0] + '.svg';
  const basePath = path.join(__dirname, 'assets', baseFile);
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
    if (win.webContents.id === event.sender.id) return getConfigForAgent(name).type || 'cat';
  }
  return 'cat';
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
  if (!config.configs[agent]) config.configs[agent] = { type: 'cat' };
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
  // 注册 pet:// 协议处理
  protocol.handle('pet', (request) => {
    const url = new URL(request.url);
    const filePath = path.join(PET_DIR, url.pathname);
    return new Response(fs.readFileSync(filePath));
  });

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
