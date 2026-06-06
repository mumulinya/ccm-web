const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  onInitPet: (cb) => ipcRenderer.on('init-pet', (_, data) => cb(data)),
  onStateUpdate: (cb) => ipcRenderer.on('state-update', (_, data) => cb(data)),
  onSpeech: (cb) => ipcRenderer.on('speech', (_, data) => cb(data)),
  getAssetPath: (filename) => ipcRenderer.invoke('get-asset-path', filename),
  getConfig: () => ipcRenderer.invoke('get-config'),
  savePosition: (agent, x, y) => ipcRenderer.invoke('save-position', agent, x, y),
  getMousePosition: () => ipcRenderer.invoke('get-mouse-position'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  moveWindow: (x, y) => ipcRenderer.send('move-window', x, y),
  resizeWindow: (w, h, size) => ipcRenderer.send('resize-window', w, h, size),
  saveSize: (agent, size) => ipcRenderer.invoke('save-size', agent, size),
  notifyMouseEnter: () => ipcRenderer.send('mouse-enter'),
  notifyMouseLeave: () => ipcRenderer.send('mouse-leave'),
  startDrag: () => ipcRenderer.send('start-drag'),
  endDrag: (agent, x, y) => ipcRenderer.send('end-drag', agent, x, y),
  openConsole: () => ipcRenderer.send('open-console'),
  openWorkspace: (agent) => ipcRenderer.invoke('open-workspace', agent),
  changeType: (agent, type) => ipcRenderer.send('change-type', agent, type),
  hidePet: (agent) => ipcRenderer.send('hide-pet', agent),
});
