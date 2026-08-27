const { contextBridge, ipcRenderer } = require('electron');
// Deliberately narrow. The renderer can ask for data and nothing else -- it makes no network
// requests and never sees a key. Everything that touches the outside world stays in main.
contextBridge.exposeInMainWorld('mcii', {
  getTokens: () => ipcRenderer.invoke('tokens:list'),
  refresh: (ca) => ipcRenderer.invoke('tokens:refresh', ca),
  setPosition: (ca, tokens) => ipcRenderer.invoke('tokens:setPosition', { ca, tokens }),
  search: (q) => ipcRenderer.invoke('tokens:search', q),
  addToken: (ca, sym) => ipcRenderer.invoke('watchlist:add', { ca, sym }),
  removeToken: (ca) => ipcRenderer.invoke('watchlist:remove', ca),
  discover: () => ipcRenderer.invoke('discover:latest'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  allAlerts: () => ipcRenderer.invoke('alerts:all'),
  historySeries: (ca, field, days) => ipcRenderer.invoke('history:series', { ca, field, days }),
  onLive: (cb) => ipcRenderer.on('live', (_e, t) => cb(t)),
  onLiveAlert: (cb) => ipcRenderer.on('live-alert', (_e, a) => cb(a)),
  onRefreshed: (cb) => ipcRenderer.on('refreshed', () => cb()),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, m) => cb(m)),
});
