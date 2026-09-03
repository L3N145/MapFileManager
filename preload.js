const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPins: () => ipcRenderer.invoke('get-pins'),
  savePins: (pins) => ipcRenderer.invoke('save-pins', pins),
  createPin: (coords) => ipcRenderer.invoke('create-pin', coords),
  updatePinLocation: (data) => ipcRenderer.invoke('update-pin-location', data),
  renamePin: (data) => ipcRenderer.invoke('rename-pin', data),
  updatePinColor: (data) => ipcRenderer.invoke('update-pin-color', data),
  deletePin: (id) => ipcRenderer.invoke('delete-pin', id),

  readFolder: (pinId, subPath) => ipcRenderer.invoke('read-folder', pinId, subPath),
  addFile: (pinId, subPath) => ipcRenderer.invoke('add-file', pinId, subPath),
  addDroppedFiles: (pinId, subPath, filePaths) => ipcRenderer.invoke('add-dropped-files', pinId, subPath, filePaths),
  createNewFile: (pinId, subPath, fileName) => ipcRenderer.invoke('create-new-file', pinId, subPath, fileName),
  createSubFolder: (pinId, subPath, folderName) => ipcRenderer.invoke('create-sub-folder', pinId, subPath, folderName),
  openItem: (pinId, subPath, itemName) => ipcRenderer.invoke('open-item', pinId, subPath, itemName),
  renameItem: (pinId, subPath, oldName, newName) => ipcRenderer.invoke('rename-item', pinId, subPath, oldName, newName),
  deleteItem: (pinId, subPath, itemName) => ipcRenderer.invoke('delete-item', pinId, subPath, itemName),
  openFolderInExplorer: (pinId, subPath) => ipcRenderer.invoke('open-folder-in-explorer', pinId, subPath),

  searchLocation: (query) => ipcRenderer.invoke('search-location', query),
  listPinRelPaths: (pinId) => ipcRenderer.invoke('list-pin-relpaths', pinId),

  // インポート / エクスポート API
  selectExportZipPath: () => ipcRenderer.invoke('select-export-zip-path'),
  getPinFilesBinary: (pinId) => ipcRenderer.invoke('get-pin-files-binary', pinId),
  writeZipFile: (filePath, zipBuffer) => ipcRenderer.invoke('write-zip-file', filePath, zipBuffer),
  readImportZipFile: () => ipcRenderer.invoke('read-import-zip-file'),
  importPinsData: (importPins, pinFilesMap) => ipcRenderer.invoke('import-pins-data', importPins, pinFilesMap),

    // Fileオブジェクトそのものではなく、パスの配列を取り出して渡す関数に変更
getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (err) {
      console.error('getPathForFile error:', err);
      return null;
    }
  },

  addDroppedFiles: (pinId, subPath, filePaths) => {
    return ipcRenderer.invoke('add-dropped-files', pinId, subPath, filePaths);
  }
});