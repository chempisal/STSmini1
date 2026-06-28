const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveLocalData: (academicYear, fileName, data) => 
    ipcRenderer.invoke('save-local-data', { academicYear, fileName, data }),
    
  loadLocalData: (academicYear, fileName) => 
    ipcRenderer.invoke('load-local-data', { academicYear, fileName }),
    
  getStorageInfo: (academicYear) => 
    ipcRenderer.invoke('get-storage-info', academicYear),
    
  importExcel: () => 
    ipcRenderer.invoke('import-excel-dialog'),
    
  downloadTemplate: (targetFileName) => 
    ipcRenderer.invoke('download-template-file', targetFileName),
    
  exportExcel: (defaultFileName, sheetName, headers, rows) => 
    ipcRenderer.invoke('export-excel', { defaultFileName, sheetName, headers, rows }),

  saveBackup: (academicYear, timestamp, stateData) => 
    ipcRenderer.invoke('save-backup', { academicYear, timestamp, stateData }),

  listBackups: (academicYear) => 
    ipcRenderer.invoke('list-backups', academicYear),

  restoreBackup: (academicYear, fileName) => 
    ipcRenderer.invoke('restore-backup', { academicYear, fileName })
});
