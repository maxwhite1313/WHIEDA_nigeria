const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claude', {
  getUsage: () => ipcRenderer.invoke('get-usage'),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', { dx, dy }),
});
