const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'logo_ptec.svg')
  });

  mainWindow.loadFile('index.html');
  
  // Open devtools in development if needed
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler - Determine Base Folder Path (D: or User Home)
function getBaseDirectory(academicYear) {
  // Clean up academicYear string for safe directory name
  const safeYear = (academicYear || 'ទូទៅ').replace(/[\/\\?%*:|"<>]/g, '-').trim();
  const dirName = `ប្រព័ន្ធគ្រប់គ្រងសាលារៀន ${safeYear}`;
  
  const dDrivePath = 'D:\\' + dirName;
  try {
    if (fs.existsSync('D:\\')) {
      if (!fs.existsSync(dDrivePath)) {
        fs.mkdirSync(dDrivePath, { recursive: true });
      }
      // Test active write access to prevent administrative lock errors
      const testFile = path.join(dDrivePath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return dDrivePath;
    }
  } catch (e) {
    console.log("D: drive not accessible, falling back to C: user home.", e);
  }

  // Fallback to User's home directory (C:\Users\<user>\...)
  const userHome = app.getPath('home');
  const fallbackPath = path.join(userHome, dirName);
  if (!fs.existsSync(fallbackPath)) {
    fs.mkdirSync(fallbackPath, { recursive: true });
  }
  return fallbackPath;
}

// IPC Listener - Save data to local JSON file
ipcMain.handle('save-local-data', async (event, { academicYear, fileName, data }) => {
  try {
    const baseDir = getBaseDirectory(academicYear);
    const filePath = path.join(baseDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Failed to save data:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Load data from local JSON file
ipcMain.handle('load-local-data', async (event, { academicYear, fileName }) => {
  try {
    const baseDir = getBaseDirectory(academicYear);
    const filePath = path.join(baseDir, fileName);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: JSON.parse(fileData) };
    }
    return { success: true, data: null }; // File doesn't exist yet
  } catch (error) {
    console.error('Failed to load data:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Check folder existence and location
ipcMain.handle('get-storage-info', async (event, academicYear) => {
  const baseDir = getBaseDirectory(academicYear);
  const isDDrive = baseDir.startsWith('D:');
  return { path: baseDir, isDDrive };
});

// IPC Listener - Open Excel file dialog and parse content
ipcMain.handle('import-excel-dialog', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, reason: 'canceled' };
    }

    const filePath = result.filePaths[0];
    const workbook = XLSX.readFile(filePath);
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON array of objects/arrays
    // raw: false ensures formatting remains; header: 1 reads it as 2D array of rows
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return { success: true, data, fileName: path.basename(filePath) };
  } catch (error) {
    console.error('Failed to import Excel:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Save a mock downloadable Excel Template to workspace assets
ipcMain.handle('download-template-file', async (event, targetFileName) => {
  try {
    // Generate a simple Excel file representing student template if it doesn't exist
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    const templatePath = path.join(assetsDir, targetFileName);
    
    if (!fs.existsSync(templatePath)) {
      // Build a demo template
      const ws_data = [
        ["អត្តលេខ (ID)", "ឈ្មោះសិស្ស (Full Name)", "ភេទ (Gender)", "អ៊ីមែល (Email)", "លេខទូរស័ព្ទអាណាព្យាបាល (Phone)"],
        ["PTEC001", "សុខ ដារ៉ា", "ប្រុស", "dara.sok@ptec.edu.kh", "012345678"],
        ["PTEC002", "គង់ វិច្ឆិកា", "ស្រី", "vicheka.kong@ptec.edu.kh", "089777666"],
        ["PTEC003", "ចាន់ បុប្ផា", "ស្រី", "bopha.chan@ptec.edu.kh", "093555444"]
      ];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "បញ្ជីឈ្មោះសិស្ស");
      XLSX.writeFile(wb, templatePath);
    }
    
    // Ask user where to save the template on their system
    const userSaveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'រក្សាទុកគំរូ Excel',
      defaultPath: path.join(app.getPath('downloads'), targetFileName),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (userSaveResult.canceled || !userSaveResult.filePath) {
      return { success: false, reason: 'canceled' };
    }

    fs.copyFileSync(templatePath, userSaveResult.filePath);
    return { success: true, path: userSaveResult.filePath };
  } catch (error) {
    console.error('Failed to export/download template:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Export arbitrary data to Excel
ipcMain.handle('export-excel', async (event, { defaultFileName, sheetName, headers, rows }) => {
  try {
    const ws_data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Ask user where to save the file
    const userSaveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'នាំចេញទិន្នន័យជា Excel',
      defaultPath: path.join(app.getPath('downloads'), defaultFileName),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (userSaveResult.canceled || !userSaveResult.filePath) {
      return { success: false, reason: 'canceled' };
    }

    XLSX.writeFile(wb, userSaveResult.filePath);
    return { success: true, path: userSaveResult.filePath };
  } catch (error) {
    console.error('Failed to export Excel:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Save full backup JSON
ipcMain.handle('save-backup', async (event, { academicYear, timestamp, stateData }) => {
  try {
    const baseDir = getBaseDirectory(academicYear);
    const backupDir = path.join(baseDir, 'ទិន្នន័យបម្រុង');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const safeTime = timestamp.replace(/[\/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    const backupFileName = `backup_${safeTime}.json`;
    const filePath = path.join(backupDir, backupFileName);
    fs.writeFileSync(filePath, JSON.stringify(stateData, null, 2), 'utf-8');
    return { success: true, path: filePath, fileName: backupFileName };
  } catch (error) {
    console.error('Failed to save backup:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - List all backups
ipcMain.handle('list-backups', async (event, academicYear) => {
  try {
    const baseDir = getBaseDirectory(academicYear);
    const backupDir = path.join(baseDir, 'ទិន្នន័យបម្រុង');
    if (!fs.existsSync(backupDir)) {
      return { success: true, backups: [] };
    }
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          fileName: f,
          createdAt: stats.birthtime || stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { success: true, backups };
  } catch (error) {
    console.error('Failed to list backups:', error);
    return { success: false, error: error.message };
  }
});

// IPC Listener - Restore from backup JSON
ipcMain.handle('restore-backup', async (event, { academicYear, fileName }) => {
  try {
    const baseDir = getBaseDirectory(academicYear);
    const backupDir = path.join(baseDir, 'ទិន្នន័យបម្រុង');
    const filePath = path.join(backupDir, fileName);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileData);
      
      // Restore files
      if (parsed.classConfig) fs.writeFileSync(path.join(baseDir, 'classConfig.json'), JSON.stringify(parsed.classConfig, null, 2), 'utf-8');
      if (parsed.students) fs.writeFileSync(path.join(baseDir, 'students.json'), JSON.stringify(parsed.students, null, 2), 'utf-8');
      if (parsed.attendance) fs.writeFileSync(path.join(baseDir, 'attendance.json'), JSON.stringify(parsed.attendance, null, 2), 'utf-8');
      if (parsed.grades) fs.writeFileSync(path.join(baseDir, 'grades.json'), JSON.stringify(parsed.grades, null, 2), 'utf-8');
      if (parsed.timetable) fs.writeFileSync(path.join(baseDir, 'timetable.json'), JSON.stringify(parsed.timetable, null, 2), 'utf-8');
      if (parsed.todos) fs.writeFileSync(path.join(baseDir, 'todos.json'), JSON.stringify(parsed.todos, null, 2), 'utf-8');
      if (parsed.subjects) fs.writeFileSync(path.join(baseDir, 'subjects.json'), JSON.stringify(parsed.subjects, null, 2), 'utf-8');
      
      return { success: true, data: parsed };
    }
    return { success: false, error: 'លិខិតបម្រុងទុកមិនត្រូវបានស្វែងរកឃើញទេ' };
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return { success: false, error: error.message };
  }
});
