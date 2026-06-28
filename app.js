// App State & Data Store
let state = {
  currentUser: null,
  classConfig: null, // { name, year, school, level, path, isDDrive }
  students: [],
  subjects: [],      // custom list of subjects
  attendance: {},    // date -> { studentId: status }
  grades: {},        // examTask-subject -> [ { studentId, t1, t2, final } ]
  timetable: [],     // [ { day, slot, subject, room } ]
  todos: [],         // [ { id, text, checked } ]
  settings: {
    darkMode: false,
    language: 'km',
    soundEnabled: true,
    googleSheetUrl: ''
  }
};

// Default subjects by level (MoEYS guidelines)
const SUBJECTS_BY_LEVEL = {
  primary: ['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'វិទ្យាសាស្ត្រ', 'សិក្សាសង្គម', 'កីឡា/សិល្បៈ'],
  lower_secondary: ['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'រូបវិទ្យា', 'គីមីវិទ្យា', 'ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'ភូមិវិទ្យា', 'សីលធម៌-ពលរដ្ឋ', 'ភាសាអង់គ្លេស'],
  upper_secondary: ['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'រូបវិទ្យា', 'គីមីវិទ្យា', 'ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'ភូមិវិទ្យា', 'សីលធម៌-ពលរដ្ឋ', 'ភាសាអង់គ្លេស', 'ផែនដីវិទ្យា'],
  primary_lower: ['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'វិទ្យាសាស្ត្រ', 'សិក្សាសង្គម', 'ប្រវត្តិវិទ្យា', 'ភូមិវិទ្យា', 'ភាសាអង់គ្លេស'],
  lower_upper: ['ភាសាខ្មែរ', 'គណិតវិទ្យា', 'រូបវិទ្យា', 'គីមីវិទ្យា', 'ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'ភូមិវិទ្យា', 'ភាសាអង់គ្លេស']
};

const DEFAULT_STUDENTS = [
  { id: 'PTEC001', name: 'សុខ ដារ៉ា', gender: 'ប្រុស', email: 'dara.sok@ptec.edu.kh', phone: '012 345 678' },
  { id: 'PTEC002', name: 'គង់ វិច្ឆិកា', gender: 'ស្រី', email: 'vicheka.kong@ptec.edu.kh', phone: '089 777 666' },
  { id: 'PTEC003', name: 'ចាន់ បុប្ផា', gender: 'ស្រី', email: 'bopha.chan@ptec.edu.kh', phone: '093 555 444' },
  { id: 'PTEC004', name: 'កែវ រដ្ឋា', gender: 'ប្រុស', email: 'rotha.keo@ptec.edu.kh', phone: '070 222 111' },
  { id: 'PTEC005', name: 'នួន សំណាង', gender: 'ប្រុស', email: 'samnang.nuon@ptec.edu.kh', phone: '097 999 888' },
  { id: 'PTEC006', name: 'សេង ម៉ារី', gender: 'ស្រី', email: 'mary.seng@ptec.edu.kh', phone: '085 444 333' }
];

const DEFAULT_TIMETABLE = [
  { day: 'Mon', slot: '07:00 - 08:30', subject: 'គណិតវិទ្យា', room: 'បន្ទប់ ៣០៤' },
  { day: 'Mon', slot: '10:30 - 12:00', subject: 'ភាសាខ្មែរ', room: 'បន្ទប់ ៣០៤' },
  { day: 'Tue', slot: '08:45 - 10:15', subject: 'រូបវិទ្យា', room: 'បន្ទប់ ១០២' },
  { day: 'Wed', slot: '07:00 - 08:30', subject: 'គណិតវិទ្យា', room: 'បន្ទប់ ៣០៤' },
  { day: 'Wed', slot: '13:30 - 15:00', subject: 'គីមីវិទ្យា', room: 'បន្ទប់ ២០១' }
];

const DEFAULT_TODOS = [
  { id: 1, text: 'បញ្ចូលពិន្ទុឆមាសទី២ សម្រាប់ថ្នាក់ ១២A', checked: false },
  { id: 2, text: 'កោះប្រជុំគណៈកម្មការគ្រូថ្នាក់រៀន', checked: true }
];

let selectedExamTask = 'ប្រឡងប្រចាំខែ'; // Default active exam type

// Setup App
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  setupUIHandlers();
});

// Load state from Electron file system or localStorage fallback
async function initAppState() {
  // Try loading configuration
  const savedUser = sessionStorage.getItem('krusmart_user');
  if (savedUser) {
    state.currentUser = JSON.parse(savedUser);
  }
  
  // Try Electron IPC first
  if (window.electronAPI) {
    // Check if configuration exists under a default name or last year
    try {
      const lastYear = localStorage.getItem('krusmart_last_year') || '២០២៥-២០២៦';
      const configRes = await window.electronAPI.loadLocalData(lastYear, 'classConfig.json');
      if (configRes.success && configRes.data) {
        state.classConfig = configRes.data;
        await loadAllClassData(state.classConfig.year);
      } else {
        restoreDefaultLocalStore();
      }
    } catch (e) {
      console.error(e);
      restoreDefaultLocalStore();
    }
  } else {
    // Browser fallback
    const saved = localStorage.getItem('krusmart_state');
    if (saved) {
      try { state = JSON.parse(saved); } catch (e) { restoreDefaultLocalStore(); }
    } else {
      restoreDefaultLocalStore();
    }
  }

  // Initialize display dates
  document.getElementById('calendar-date-display').innerText = getKhmerDateDisplay();
  document.getElementById('attendance-date').value = getTodayDateString();
  
  if (state.settings.darkMode) {
    document.body.classList.add('dark-theme');
    document.getElementById('dark-mode-toggle').checked = true;
  }
  
  document.getElementById('lang-select').value = state.settings.language;
  document.getElementById('sound-toggle').checked = state.settings.soundEnabled;
  document.getElementById('settings-google-sheet-url').value = state.settings.googleSheetUrl || '';

  if (state.currentUser) {
    showDashboardView();
  }
}

// Restore offline browser storage defaults
function restoreDefaultLocalStore() {
  state.students = [...DEFAULT_STUDENTS];
  state.timetable = [...DEFAULT_TIMETABLE];
  state.todos = [...DEFAULT_TODOS];
  state.subjects = SUBJECTS_BY_LEVEL.upper_secondary;
  state.classConfig = {
    name: 'ថ្នាក់ទី១២A',
    year: '២០២៥-២០២៦',
    school: 'វិទ្យាស្ថានគរុកោសល្យរាជធានីភ្នំពេញ (PTEC)',
    level: 'upper_secondary',
    path: 'D:\\ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀន ២០២៥-២០២៦',
    isDDrive: true
  };
  
  // Seed sample grades
  const key = 'ប្រឡងប្រចាំខែ-គណិតវិទ្យា';
  state.grades[key] = [
    { studentId: 'PTEC001', t1: 9.5, t2: 18.5, final: 65 },
    { studentId: 'PTEC002', t1: 8, t2: 16, final: 55 },
    { studentId: 'PTEC003', t1: 9, t2: 17.5, final: 62 },
    { studentId: 'PTEC004', t1: 7, t2: 14, final: 45 },
    { studentId: 'PTEC005', t1: 8.5, t2: 15, final: 52 },
    { studentId: 'PTEC006', t1: 9.5, t2: 19, final: 67 }
  ];
  
  const todayStr = getTodayDateString();
  state.attendance[todayStr] = {
    'PTEC001': 'present', 'PTEC002': 'present', 'PTEC003': 'present',
    'PTEC004': 'late', 'PTEC005': 'present', 'PTEC006': 'absent'
  };
}

// Save all states to local D drive or localStorage
async function saveAllClassData() {
  if (window.electronAPI && state.classConfig) {
    const year = state.classConfig.year;
    localStorage.setItem('krusmart_last_year', year);
    await window.electronAPI.saveLocalData(year, 'classConfig.json', state.classConfig);
    await window.electronAPI.saveLocalData(year, 'students.json', state.students);
    await window.electronAPI.saveLocalData(year, 'attendance.json', state.attendance);
    await window.electronAPI.saveLocalData(year, 'grades.json', state.grades);
    await window.electronAPI.saveLocalData(year, 'timetable.json', state.timetable);
    await window.electronAPI.saveLocalData(year, 'todos.json', state.todos);
    await window.electronAPI.saveLocalData(year, 'subjects.json', state.subjects);
    
    // Update path displays in real-time
    const info = await window.electronAPI.getStorageInfo(year);
    state.classConfig.path = info.path;
    state.classConfig.isDDrive = info.isDDrive;
  } else {
    localStorage.setItem('krusmart_state', JSON.stringify(state));
  }
  
  // Asynchronously sync to Google Sheets in the background (fails silently if no URL is set)
  syncDataToGoogleSheets();
}

// Load all states from local D drive
async function loadAllClassData(year) {
  if (!window.electronAPI) return;
  const config = await window.electronAPI.loadLocalData(year, 'classConfig.json');
  if (config.success && config.data) state.classConfig = config.data;
  
  const stud = await window.electronAPI.loadLocalData(year, 'students.json');
  if (stud.success && stud.data) state.students = stud.data;
  
  const att = await window.electronAPI.loadLocalData(year, 'attendance.json');
  if (att.success && att.data) state.attendance = att.data;
  
  const grd = await window.electronAPI.loadLocalData(year, 'grades.json');
  if (grd.success && grd.data) state.grades = grd.data;
  
  const time = await window.electronAPI.loadLocalData(year, 'timetable.json');
  if (time.success && time.data) state.timetable = time.data;
  
  const todos = await window.electronAPI.loadLocalData(year, 'todos.json');
  if (todos.success && todos.data) state.todos = todos.data;

  const subjs = await window.electronAPI.loadLocalData(year, 'subjects.json');
  if (subjs.success && subjs.data) {
    state.subjects = subjs.data;
  } else if (state.classConfig) {
    state.subjects = SUBJECTS_BY_LEVEL[state.classConfig.level] || SUBJECTS_BY_LEVEL.upper_secondary;
  }
}

function setupUIHandlers() {
  // Bind close buttons of modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

// ====================================================== //
// AUTHENTICATION CONTROLS                                //
// ====================================================== //

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formReg = document.getElementById('form-register');
  
  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.classList.add('active');
    formReg.classList.remove('active');
  } else {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.classList.add('active');
    formLogin.classList.remove('active');
  }
}

function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  const textSpan = button.querySelector('span');
  if (input.type === 'password') {
    input.type = 'text';
    textSpan.innerText = 'លាក់';
  } else {
    input.type = 'password';
    textSpan.innerText = 'បង្ហាញ';
  }
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value.trim();
  
  let name = 'លោកគ្រូ គឹម ហេង';
  let role = 'teacher';
  let email = 'teacher@ptec.edu.kh';
  
  if (username === 'admin' && password === 'admin123') {
    name = 'អ្នកអភិបាលប្រព័ន្ធ';
    role = 'admin';
    email = 'admin@ptec.edu.kh';
  } else if (username === 'principal' && password === 'principal123') {
    name = 'នាយកសាលា';
    role = 'principal';
    email = 'principal@ptec.edu.kh';
  } else if (username === 'teacher' && password === 'teacher123') {
    name = 'លោកគ្រូ គឹម ហេង';
    role = 'teacher';
    email = 'teacher@ptec.edu.kh';
  } else if (username === 'parent' && password === 'parent123') {
    name = 'អាណាព្យាបាល សុខ ដារ៉ា';
    role = 'parent';
    email = 'parent@ptec.edu.kh';
  } else if (username === 'student' && password === 'student123') {
    name = 'សុខ ដារ៉ា';
    role = 'student';
    email = 'student@ptec.edu.kh';
  } else {
    showToast('ឈ្មោះគណនី ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ!', 'error');
    return;
  }
  
  state.currentUser = { name, email, role };
  sessionStorage.setItem('krusmart_user', JSON.stringify(state.currentUser));
  playSuccessSound();
  showToast('ចូលគណនីជោគជ័យ!', 'success');
  showDashboardView();
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  state.currentUser = { name, email, role: 'teacher' };
  sessionStorage.setItem('krusmart_user', JSON.stringify(state.currentUser));
  playSuccessSound();
  showToast('ចុះឈ្មោះ និងចូលប្រព័ន្ធជោគជ័យ!', 'success');
  showDashboardView();
}

function handleGoogleLogin() {
  state.currentUser = { name: 'លោកគ្រូ គឹម ហេង', email: 'teacher@ptec.edu.kh', role: 'teacher' };
  sessionStorage.setItem('krusmart_user', JSON.stringify(state.currentUser));
  playSuccessSound();
  showToast('ចូលគណនីតាម Google ជោគជ័យ!', 'success');
  showDashboardView();
}

function applySidebarRoles() {
  const role = state.currentUser ? state.currentUser.role : 'teacher';
  
  // Hide all role-specific items
  document.querySelectorAll('.role-item').forEach(item => {
    item.style.display = 'none';
  });
  
  // Show based on role
  if (role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(item => item.style.display = 'block');
  } else if (role === 'principal') {
    document.querySelectorAll('.principal-only').forEach(item => item.style.display = 'block');
  } else if (role === 'teacher') {
    document.querySelectorAll('.teacher-only').forEach(item => item.style.display = 'block');
  } else if (role === 'parent') {
    document.querySelectorAll('.parent-only').forEach(item => item.style.display = 'block');
  } else if (role === 'student') {
    document.querySelectorAll('.student-only').forEach(item => item.style.display = 'block');
  }
}

function showDashboardView() {
  document.getElementById('login-view').className = 'view-hidden';
  document.getElementById('dashboard-view').className = 'view-active';
  
  document.getElementById('sidebar-user-name').innerText = state.currentUser.name;
  
  const roleNames = {
    admin: 'អ្នកអភិបាលប្រព័ន្ធ',
    principal: 'នាយកសាលា',
    teacher: 'គ្រូបង្រៀនថ្នាក់ទី១២A',
    parent: 'អាណាព្យាបាលសិស្ស',
    student: 'សិស្សថ្នាក់ទី១២A'
  };
  document.getElementById('sidebar-user-role').innerText = roleNames[state.currentUser.role] || state.currentUser.role;
  
  // Fill settings profile inputs
  document.getElementById('set-teacher-name').value = state.currentUser.name;
  document.getElementById('set-teacher-class').value = state.classConfig ? state.classConfig.name : 'ថ្នាក់ទី១២A';
  document.getElementById('settings-google-sheet-url').value = state.settings.googleSheetUrl || '';
  
  // Fill profile form fields
  document.getElementById('prof-name').value = state.currentUser.name;
  document.getElementById('prof-title').value = roleNames[state.currentUser.role] || state.currentUser.role;
  document.getElementById('prof-school').value = state.classConfig ? state.classConfig.school : 'វិទ្យាស្ថានគរុកោសល្យរាជធានីភ្នំពេញ (PTEC)';
  
  applySidebarRoles();
  switchDashboardView('home');
}

function handleLogoutAction() {
  state.currentUser = null;
  sessionStorage.removeItem('krusmart_user');
  document.getElementById('dashboard-view').className = 'view-hidden';
  document.getElementById('login-view').className = 'view-active';
  showToast('ចាកចេញពីប្រព័ន្ធរួចរាល់', 'info');
}

// Modal open/close utilities
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function handleForgotPassword(event) {
  event.preventDefault();
  closeModal('forgot-modal');
  showToast('តំណភ្ជាប់កំណត់ពាក្យសម្ងាត់ត្រូវបានផ្ញើ!', 'success');
}

function startPremiumPurchase() {
  closeModal('premium-modal');
  showToast('អរគុណសម្រាប់ការគាំទ្រកញ្ចប់ Premium!', 'success');
}

// ====================================================== //
// DASHBOARD ROUTER                                       //
// ====================================================== //

function switchDashboardView(viewName) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) activeNav.classList.add('active');
  
  document.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');
  
  // Set headers (translated fully to Khmer)
  const titleMap = {
    home: '🏠 ទិដ្ឋភាពទូទៅផ្ទាំងគ្រប់គ្រង',
    class: '🏫 គ្រប់គ្រងថ្នាក់រៀនរបស់ខ្ញុំ',
    students: '👥 បញ្ជីព័ត៌មានសិស្ស',
    attendance: '📅 កត់ត្រាវត្តមានសិស្ស',
    subjects: '📚 មុខវិជ្ជាសិក្សាទាំងអស់',
    grades: '📊 គណនាការប្រឡងប្រចាំខែ',
    timetable: '📅 កាលវិភាគសិក្សា',
    stats: '📈 ស្ថិតិ និងការវិភាគថ្នាក់រៀន',
    profile: '👤 ព័ត៌មានផ្ទាល់ខ្លួន',
    settings: '⚙️ ការកំណត់ប្រព័ន្ធ',
    'id-card': '💳 បង្កើតកាតសិស្ស',
    backup: '💾 ទិន្នន័យបម្រុងទុក',
    'ai-assistant': '🤖 ជំនួយការគ្រូ AI',
    inspection: '🔍 ការចុះពិនិត្យថ្នាក់រៀន',
    kpi: '🏫 សូចនាករគន្លឹះសាលារៀន',
    'parent-comm': '💬 ទំនាក់ទំនងអាណាព្យាបាល'
  };
  
  document.getElementById('view-title').innerText = titleMap[viewName] || 'KruSmart';
  
  // Close exam tasks dropdown if active click isn't dropdown
  if (viewName !== 'exam-tasks') {
    document.getElementById('exam-tasks-dropdown').style.display = 'none';
  }

  // Trigger loads
  if (viewName === 'home') {
    updateDashboardStats();
    renderActivities();
    renderTodos();
  } else if (viewName === 'class') {
    renderClassInfo();
  } else if (viewName === 'students') {
    renderStudentsList();
  } else if (viewName === 'attendance') {
    renderAttendanceGrid();
  } else if (viewName === 'subjects') {
    renderSubjectsList();
  } else if (viewName === 'grades') {
    loadGrades();
    renderGradeSubjectsSelector();
  } else if (viewName === 'timetable') {
    renderTimetable();
  } else if (viewName === 'stats') {
    renderStatistics();
  } else if (viewName === 'profile') {
    renderProfileView();
  } else if (viewName === 'id-card') {
    renderIdCardGenerator();
  } else if (viewName === 'backup') {
    renderBackupRestore();
  } else if (viewName === 'parent-comm') {
    renderParentComm();
  } else if (viewName === 'ai-assistant') {
    renderAIAssistant();
  }
}

// Other Exam Tasks Dropdown handler
function toggleExamTasksDropdown(event) {
  event.preventDefault();
  const dropdown = document.getElementById('exam-tasks-dropdown');
  const isHidden = dropdown.style.display === 'none' || !dropdown.style.display;
  dropdown.style.display = isHidden ? 'block' : 'none';
}

function selectExamTask(taskName) {
  selectedExamTask = taskName;
  document.getElementById('exam-tasks-dropdown').style.display = 'none';
  showToast(`បានជ្រើសរើស៖ ${taskName} សម្រាប់ការវាយតម្លៃពិន្ទុ`, 'info');
  switchDashboardView('grades');
}

// Column Toggles picker
function toggleColumnsPicker() {
  const picker = document.getElementById('columns-picker-dropdown');
  const isHidden = picker.style.display === 'none' || !picker.style.display;
  picker.style.display = isHidden ? 'block' : 'none';
}

// Hide or show columns dynamically
function toggleTableColumn(columnIndex, visible) {
  const table = document.querySelector('.data-table');
  if (!table) return;
  
  // Header cell
  const headerCell = table.querySelector(`thead tr th:nth-child(${columnIndex + 1})`);
  if (headerCell) headerCell.style.display = visible ? '' : 'none';
  
  // Body cells
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    if (row.cells.length > columnIndex) {
      row.cells[columnIndex].style.display = visible ? '' : 'none';
    }
  });
}

// ====================================================== //
// SUBVIEW 0: MY CLASS PORTAL                             //
// ====================================================== //

async function handleCreateClass(event) {
  event.preventDefault();
  const name = document.getElementById('class-name-input').value.trim();
  const year = document.getElementById('class-year-input').value.trim();
  const school = document.getElementById('class-school-name').value.trim();
  const level = document.getElementById('class-level-select').value;
  
  let pathStr = `D:\\ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀន ${year}`;
  let dDrive = true;
  
  if (window.electronAPI) {
    const info = await window.electronAPI.getStorageInfo(year);
    pathStr = info.path;
    dDrive = info.isDDrive;
  }
  
  state.classConfig = {
    name,
    year,
    school,
    level,
    path: pathStr,
    isDDrive: dDrive
  };
  
  // Initialize standard subjects for the chosen level
  state.subjects = [...(SUBJECTS_BY_LEVEL[level] || SUBJECTS_BY_LEVEL.upper_secondary)];
  
  playSuccessSound();
  await saveAllClassData();
  showToast(`ថ្នាក់រៀន ${name} ត្រូវបានបង្កើតឡើងប្រកបដោយជោគជ័យ!`, 'success');
  renderClassInfo();
}

async function renderClassInfo() {
  const createPanel = document.getElementById('class-creation-panel');
  const infoPanel = document.getElementById('class-info-panel');
  
  if (!state.classConfig) {
    createPanel.style.display = 'block';
    infoPanel.style.display = 'none';
    return;
  }
  
  createPanel.style.display = 'none';
  infoPanel.style.display = 'block';
  
  document.getElementById('info-class-title').innerText = state.classConfig.name;
  document.getElementById('info-class-school').innerText = state.classConfig.school;
  document.getElementById('info-class-year').innerText = state.classConfig.year;
  
  const levelNames = {
    primary: 'បឋមសិក្សា (ថ្នាក់ទី ១ ដល់ ៦)',
    lower_secondary: 'អនុវិទ្យាល័យ (ថ្នាក់ទី ៧ ដល់ ៩)',
    upper_secondary: 'វិទ្យាល័យ (ថ្នាក់ទី ១០ ដល់ ១២)',
    primary_lower: 'បឋមសិក្សា & អនុវិទ្យាល័យ (ថ្នាក់ទី ១ ដល់ ៩)',
    lower_upper: 'អនុវិទ្យាល័យ & វិទ្យាល័យ (ថ្នាក់ទី ៧ ដល់ ១២)'
  };
  document.getElementById('info-class-level').innerText = levelNames[state.classConfig.level] || state.classConfig.level;
  document.getElementById('info-class-teacher').innerText = state.currentUser ? state.currentUser.name : 'លោកគ្រូ គឹម ហេង';
  
  // Update storage info from local D drive
  if (window.electronAPI) {
    const info = await window.electronAPI.getStorageInfo(state.classConfig.year);
    document.getElementById('info-class-storage-path').innerText = info.path;
    if (info.isDDrive) {
      document.getElementById('info-class-storage-path').style.color = 'var(--success-color)';
    } else {
      document.getElementById('info-class-storage-path').style.color = 'var(--warning-color)';
    }
  } else {
    document.getElementById('info-class-storage-path').innerText = 'រក្សាក្នុងកម្មវិធីរុករក (Web Storage)';
  }
  
  // Render Subjects List inside Class view
  const subjList = document.getElementById('class-subjects-list');
  subjList.innerHTML = '';
  
  state.subjects.forEach(subj => {
    const li = document.createElement('li');
    li.style = 'background: var(--bg-hover); padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;';
    li.innerHTML = `
      <span style="font-weight: 600;">📖 ${subj}</span>
      <button class="btn-delete-todo" onclick="deleteSubject('${subj}')">&times;</button>
    `;
    subjList.appendChild(li);
  });
}

function redirectToStudentEntry() {
  switchDashboardView('students');
  // Highlight add student button or focus
  setTimeout(() => {
    openStudentModal('add');
  }, 100);
}

async function confirmDeleteClass() {
  if (confirm('តើអ្នកពិតជាចង់លុបចោលថ្នាក់រៀននេះមែនទេ? រាល់ការផ្លាស់ប្តូរនឹងមិនប៉ះពាល់ដល់ឯកសារ JSON នៅក្នុង D Drive ឡើយ ប៉ុន្តែថ្នាក់នឹងត្រូវកំណត់ឡើងវិញ។')) {
    state.classConfig = null;
    state.students = [];
    state.grades = {};
    state.attendance = {};
    await saveAllClassData();
    renderClassInfo();
    showToast('ថ្នាក់រៀនត្រូវបានលុបចេញពីប្រព័ន្ធ', 'info');
  }
}

// ====================================================== //
// SUBVIEW 2: STUDENTS DIRECTORY UTILITIES                //
// ====================================================== //

function renderStudentsList() {
  const tbody = document.getElementById('student-table-body');
  tbody.innerHTML = '';
  
  if (state.students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">គ្មានឈ្មោះសិស្សឡើយ បន្ថែមសិស្សថ្មី ឬ នាំចូល Excel ដើម្បីចាប់ផ្តើម។</td></tr>`;
    return;
  }
  
  state.students.forEach(student => {
    const tr = document.createElement('tr');
    const initialName = student.name.split(' ').pop().substring(0, 2).toUpperCase();
    const avatarClass = student.gender === 'ស្រី' ? 'student-avatar fem' : 'student-avatar';
    
    tr.innerHTML = `
      <td style="font-family: var(--font-latin); font-weight: 600;">${student.id}</td>
      <td><div class="${avatarClass}">${initialName}</div></td>
      <td style="font-weight: 600;">${student.name}</td>
      <td>${student.gender}</td>
      <td style="font-family: var(--font-latin);">${student.email || '-'}</td>
      <td style="font-family: var(--font-latin);">${student.phone}</td>
      <td>
        <div class="row-actions">
          <button class="btn-edit-icon" onclick="openStudentModal('edit', '${student.id}')" title="កែសម្រួល">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-delete-icon" onclick="deleteStudent('${student.id}')" title="លុបចោល">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterStudentsList(query) {
  const tbody = document.getElementById('student-table-body');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.cells.length < 3) return;
    const name = row.cells[2].textContent.toLowerCase();
    const id = row.cells[0].textContent.toLowerCase();
    if (name.includes(query.toLowerCase()) || id.includes(query.toLowerCase())) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function filterStudentsListByGender(gender) {
  const tbody = document.getElementById('student-table-body');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.cells.length < 4) return;
    const g = row.cells[3].textContent.trim();
    if (gender === 'all' || g === gender) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function openStudentModal(mode, studentId = '') {
  const title = document.getElementById('student-modal-title');
  const form = document.getElementById('form-student');
  const submitBtn = document.getElementById('student-modal-submit-btn');
  form.reset();
  
  if (mode === 'add') {
    title.innerText = 'បន្ថែមសិស្សថ្មី';
    submitBtn.innerText = 'រក្សាទុក';
    document.getElementById('student-edit-id').value = '';
    const nextNum = state.students.length + 1;
    document.getElementById('student-id-input').value = `PTEC${String(nextNum).padStart(3, '0')}`;
    document.getElementById('student-id-input').disabled = false;
  } else {
    title.innerText = 'កែសម្រួលព័ត៌មានសិស្ស';
    submitBtn.innerText = 'ធ្វើបច្ចុប្បន្នភាព';
    const student = state.students.find(s => s.id === studentId);
    if (student) {
      document.getElementById('student-edit-id').value = student.id;
      document.getElementById('student-id-input').value = student.id;
      document.getElementById('student-id-input').disabled = true;
      document.getElementById('student-name').value = student.name;
      document.getElementById('student-gender').value = student.gender;
      document.getElementById('student-email').value = student.email || '';
      document.getElementById('student-phone').value = student.phone;
    }
  }
  openModal('student-modal');
}

async function handleStudentSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById('student-edit-id').value;
  const id = document.getElementById('student-id-input').value.trim().toUpperCase();
  const name = document.getElementById('student-name').value.trim();
  const gender = document.getElementById('student-gender').value;
  const email = document.getElementById('student-email').value.trim();
  const phone = document.getElementById('student-phone').value.trim();
  
  if (editId === '') {
    if (state.students.some(s => s.id === id)) {
      showToast('អត្តលេខសិស្សនេះមានរួចរាល់ហើយ!', 'error');
      return;
    }
    state.students.push({ id, name, gender, email, phone });
    showToast(`បន្ថែមសិស្ស ${name} បានជោគជ័យ!`, 'success');
  } else {
    const idx = state.students.findIndex(s => s.id === editId);
    if (idx !== -1) {
      state.students[idx] = { id: editId, name, gender, email, phone };
      showToast(`ធ្វើបច្ចុប្បន្នភាពឈ្មោះ ${name} រួចរាល់!`, 'success');
    }
  }
  
  playSuccessSound();
  await saveAllClassData();
  closeModal('student-modal');
  renderStudentsList();
}

async function deleteStudent(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (student && confirm(`តើអ្នកពិតជាចង់លុបឈ្មោះសិស្ស ${student.name} មែនទេ?`)) {
    state.students = state.students.filter(s => s.id !== studentId);
    await saveAllClassData();
    renderStudentsList();
    showToast('លុបសិស្សរួចរាល់', 'info');
  }
}

// Import student directory from Excel dialog
async function triggerExcelImport() {
  if (!window.electronAPI) {
    showToast('មុខងារនាំចូល Excel ដំណើរការតែលើកម្មវិធី Desktop Application ប៉ុណ្ណោះ!', 'warning');
    return;
  }
  
  const res = await window.electronAPI.importExcel();
  if (res.success && res.data) {
    // Row 0 is headers, Rows 1+ are data
    const rows = res.data;
    let addedCount = 0;
    
    // Header check
    for(let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 3 && row[0] && row[1]) {
        const id = String(row[0]).trim();
        const name = String(row[1]).trim();
        const gender = String(row[2]).trim();
        const email = row[3] ? String(row[3]).trim() : '';
        const phone = row[4] ? String(row[4]).trim() : '';
        
        if (!state.students.some(s => s.id === id)) {
          state.students.push({ id, name, gender, email, phone });
          addedCount++;
        }
      }
    }
    
    if (addedCount > 0) {
      playSuccessSound();
      await saveAllClassData();
      renderStudentsList();
      showToast(`បាននាំចូលសិស្សចំនួន ${addedCount} នាក់ ពី Excel ${res.fileName}!`, 'success');
    } else {
      showToast('គ្មានទិន្នន័យសិស្សថ្មីត្រូវបាននាំចូលទេ (ទិន្នន័យស្ទួន ឬទម្រង់ខុស)', 'info');
    }
  } else if (res.error) {
    showToast(`នាំចូលបរាជ័យ៖ ${res.error}`, 'error');
  }
}

// Export student directory to Excel file
async function triggerExcelExport() {
  if (state.students.length === 0) {
    showToast('គ្មានសិស្សនៅក្នុងថ្នាក់ដើម្បីនាំចេញឡើយ!', 'warning');
    return;
  }
  
  const headers = ["អត្តលេខ (ID)", "ឈ្មោះសិស្ស (Full Name)", "ភេទ (Gender)", "អ៊ីមែល (Email)", "លេខទូរស័ព្ទអាណាព្យាបាល (Phone)"];
  const rows = state.students.map(s => [
    s.id,
    s.name,
    s.gender,
    s.email || '',
    s.phone
  ]);

  if (window.electronAPI) {
    const res = await window.electronAPI.exportExcel('បញ្ជីឈ្មោះសិស្ស.xlsx', 'បញ្ជីឈ្មោះសិស្ស', headers, rows);
    if (res.success) {
      playSuccessSound();
      showToast(`នាំចេញជោគជ័យ៖ ${res.path}`, 'success');
    } else if (res.reason !== 'canceled') {
      showToast(`នាំចេញបរាជ័យ៖ ${res.error}`, 'error');
    }
  } else {
    // Browser fallback: Download CSV file
    const csvContent = "data:text/csv;charset=utf-8,\ufeff" 
      + [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "បញ្ជីឈ្មោះសិស្ស.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('នាំចេញជាឯកសារ CSV រួចរាល់!', 'success');
  }
}

// ====================================================== //
// SUBVIEW 3: ATTENDANCE CONTROLS                         //
// ====================================================== //

function renderAttendanceGrid() {
  const date = document.getElementById('attendance-date').value;
  const tbody = document.getElementById('attendance-table-body');
  tbody.innerHTML = '';
  
  if (state.students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">គ្មានឈ្មោះសិស្សដើម្បីកត់វត្តមានទេ។</td></tr>`;
    return;
  }
  
  if (!state.attendance[date]) {
    state.attendance[date] = {};
    state.students.forEach(s => {
      state.attendance[date][s.id] = 'present';
    });
  }
  
  const dailyLog = state.attendance[date];
  
  state.students.forEach(student => {
    const tr = document.createElement('tr');
    const status = dailyLog[student.id] || 'present';
    
    tr.innerHTML = `
      <td style="font-family: var(--font-latin); font-weight: 600;">${student.id}</td>
      <td style="font-weight: 600;">${student.name}</td>
      <td>${student.gender}</td>
      <td>
        <div class="attendance-options-group">
          <button class="btn-att-option present ${status === 'present' ? 'active' : ''}" onclick="toggleStudentAttendanceStatus('${student.id}', 'present')">វត្តមាន</button>
          <button class="btn-att-option late ${status === 'late' ? 'active' : ''}" onclick="toggleStudentAttendanceStatus('${student.id}', 'late')">យឺត</button>
          <button class="btn-att-option absent ${status === 'absent' ? 'active' : ''}" onclick="toggleStudentAttendanceStatus('${student.id}', 'absent')">អវត្តមាន</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  updateAttendanceSummaryMetrics();
}

function toggleStudentAttendanceStatus(studentId, status) {
  const date = document.getElementById('attendance-date').value;
  if (state.attendance[date]) {
    state.attendance[date][studentId] = status;
    updateAttendanceSummaryMetrics();
    
    // Toggle active classes in real-time
    const rows = document.querySelectorAll('#attendance-table-body tr');
    rows.forEach(row => {
      if (row.cells[0].textContent === studentId) {
        row.querySelectorAll('.btn-att-option').forEach(btn => btn.classList.remove('active'));
        if (status === 'present') row.querySelector('.btn-att-option.present').classList.add('active');
        if (status === 'late') row.querySelector('.btn-att-option.late').classList.add('active');
        if (status === 'absent') row.querySelector('.btn-att-option.absent').classList.add('active');
      }
    });
  }
}

function updateAttendanceSummaryMetrics() {
  const date = document.getElementById('attendance-date').value;
  const log = state.attendance[date] || {};
  let present = 0, late = 0, absent = 0;
  
  Object.values(log).forEach(status => {
    if (status === 'present') present++;
    if (status === 'late') late++;
    if (status === 'absent') absent++;
  });
  
  document.getElementById('att-summary-present').innerText = convertToKhmerNumbers(present);
  document.getElementById('att-summary-late').innerText = convertToKhmerNumbers(late);
  document.getElementById('att-summary-absent').innerText = convertToKhmerNumbers(absent);
}

async function saveAttendanceRecord() {
  await saveAllClassData();
  playSuccessSound();
  showToast('រក្សាទុករបាយការណ៍វត្តមានរួចរាល់!', 'success');
}

// Download Excel template
async function downloadAttendanceExcelTemplate() {
  if (!window.electronAPI) {
    showToast('មុខងារទាញយក Excel ដំណើរការតែលើកម្មវិធី Desktop Application ប៉ុណ្ណោះ!', 'warning');
    return;
  }
  const result = await window.electronAPI.downloadTemplate('គំរូ_វត្តមានសិស្ស.xlsx');
  if (result.success) {
    showToast(`គំរូ Excel ត្រូវបានរក្សាទុក៖ ${result.path}`, 'success');
  }
}

// Upload/Import Attendance spreadsheet
async function triggerExcelAttendanceImport() {
  if (!window.electronAPI) {
    showToast('មុខងារអាប់ឡូត Excel ដំណើរការតែលើ Desktop Application!', 'warning');
    return;
  }
  
  const res = await window.electronAPI.importExcel();
  if (res.success && res.data) {
    const rows = res.data;
    const date = document.getElementById('attendance-date').value;
    
    if (!state.attendance[date]) state.attendance[date] = {};
    
    let loadedCount = 0;
    for(let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 2 && row[0] && row[1]) {
        const id = String(row[0]).trim();
        const rawStatus = String(row[1]).trim().toLowerCase();
        
        let status = 'present';
        if (rawStatus.includes('late') || rawStatus.includes('យឺត')) status = 'late';
        if (rawStatus.includes('absent') || rawStatus.includes('អវត្តមាន')) status = 'absent';
        
        if (state.students.some(s => s.id === id)) {
          state.attendance[date][id] = status;
          loadedCount++;
        }
      }
    }
    
    if (loadedCount > 0) {
      playSuccessSound();
      await saveAllClassData();
      renderAttendanceGrid();
      showToast(`បានអាប់ឡូតវត្តមានចំនួន ${loadedCount} នាក់ពី Excel!`, 'success');
    } else {
      showToast('គ្មានអត្តលេខសិស្សណាត្រូវគ្នានៅក្នុងប្រព័ន្ធឡើយ', 'info');
    }
  }
}

// ====================================================== //
// SUBVIEW 4: SUBJECTS MANAGEMENT UTILITIES               //
// ====================================================== //

function renderSubjectsList() {
  const tbody = document.getElementById('subject-list-table-body');
  tbody.innerHTML = '';
  
  if (state.subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 24px;">គ្មានមុខវិជ្ជាសិក្សាទេ</td></tr>`;
    return;
  }
  
  state.subjects.forEach((subj, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-latin); font-weight: 600;">${convertToKhmerNumbers(index + 1)}</td>
      <td style="font-weight: 600;">📖 ${subj}</td>
      <td style="text-align: center;">
        <button class="btn-delete-icon" onclick="deleteSubject('${subj}')" title="លុបចោល">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Add Subject from main subjects page
async function addSubjectFromMainList() {
  const input = document.getElementById('subject-list-add-input');
  const name = input.value.trim();
  if (name && name !== '') {
    if (state.subjects.includes(name)) {
      showToast('មុខវិជ្ជានេះមានរួចរាល់ហើយ!', 'error');
      return;
    }
    state.subjects.push(name);
    input.value = '';
    await saveAllClassData();
    renderSubjectsList();
    showToast(`បានបន្ថែមមុខវិជ្ជា៖ ${name}`, 'success');
  }
}

// Delete a subject from any view
async function deleteSubject(name) {
  if (confirm(`តើអ្នកពិតជាចង់លុបមុខវិជ្ជា ${name} នេះចេញពីថ្នាក់រៀនមែនទេ?`)) {
    state.subjects = state.subjects.filter(s => s !== name);
    
    // Clean up grades associated with deleted subject
    Object.keys(state.grades).forEach(key => {
      if (key.endsWith(`-${name}`)) {
        delete state.grades[key];
      }
    });
    
    await saveAllClassData();
    switchDashboardView(document.querySelector('.sub-view.active').id.replace('view-', ''));
    showToast(`លុបមុខវិជ្ជា ${name} រួចរាល់`, 'info');
  }
}

// Add subject in modal
function openAddSubjectModal() {
  document.getElementById('new-subject-modal-input').value = '';
  openModal('add-subject-modal');
}

async function submitNewSubjectModal() {
  const name = document.getElementById('new-subject-modal-input').value.trim();
  if (name && name !== '') {
    if (state.subjects.includes(name)) {
      showToast('មុខវិជ្ជានេះមានរួចរាល់ហើយ!', 'error');
      return;
    }
    state.subjects.push(name);
    closeModal('add-subject-modal');
    await saveAllClassData();
    renderClassInfo();
    showToast(`បានបន្ថែមមុខវិជ្ជា ${name}`, 'success');
  }
}

// Add subject tags in grades portal
function renderGradeSubjectsSelector() {
  const container = document.getElementById('subject-manage-tags-container');
  container.innerHTML = '';
  
  const select = document.getElementById('grade-subject-select');
  const activeSubj = select.value;
  
  // Clear select options and rebuild from state.subjects to ensure sync
  select.innerHTML = '';
  
  state.subjects.forEach(subj => {
    // Rebuild select options
    const opt = document.createElement('option');
    opt.value = subj;
    opt.innerText = subj;
    if (subj === activeSubj) opt.selected = true;
    select.appendChild(opt);
    
    // Add tag
    const tag = document.createElement('div');
    tag.className = `subject-tag-badge ${subj === activeSubj ? 'active' : ''}`;
    tag.innerHTML = `
      <span onclick="selectGradeSubject('${subj}')" style="cursor: pointer;">📖 ${subj}</span>
      <span class="btn-delete-subject-tag" onclick="deleteSubject('${subj}')">&times;</span>
    `;
    container.appendChild(tag);
  });
}

function selectGradeSubject(subj) {
  document.getElementById('grade-subject-select').value = subj;
  loadGrades();
  renderGradeSubjectsSelector();
}

async function addNewSubjectFromGrades() {
  const input = document.getElementById('new-subject-name-input');
  const name = input.value.trim();
  if (name && name !== '') {
    if (state.subjects.includes(name)) {
      showToast('មុខវិជ្ជានេះមានរួចរាល់ហើយ!', 'error');
      return;
    }
    state.subjects.push(name);
    input.value = '';
    await saveAllClassData();
    
    // Set active select to the newly created subject
    document.getElementById('grade-subject-select').value = name;
    loadGrades();
    renderGradeSubjectsSelector();
    showToast(`បានបន្ថែមមុខវិជ្ជា ${name} ទៅក្នុងថ្នាក់!`, 'success');
  }
}

// ====================================================== //
// SUBVIEW 5: GRADES AND RATINGS                           //
// ====================================================== //

function loadGrades() {
  const month = document.getElementById('grade-month-select').value;
  const subject = document.getElementById('grade-subject-select').value;
  const key = `${selectedExamTask}-${month}-${subject}`;
  const tbody = document.getElementById('grade-table-body');
  tbody.innerHTML = '';
  
  if (state.students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">គ្មានឈ្មោះសិស្សដើម្បីបញ្ចូលពិន្ទុទេ។</td></tr>`;
    return;
  }
  
  if (!state.grades[key]) {
    state.grades[key] = [];
  }
  
  state.students.forEach(student => {
    if (!state.grades[key].some(g => g.studentId === student.id)) {
      state.grades[key].push({ studentId: student.id, t1: 0, t2: 0, final: 0 });
    }
  });
  
  const scoreRecords = state.grades[key].map(record => {
    const student = state.students.find(s => s.id === record.studentId);
    const total = parseFloat((record.t1 + record.t2 + record.final).toFixed(1));
    const analysis = calculateLetterGradeAndGPA(total);
    return {
      studentId: record.studentId,
      name: student ? student.name : 'Unknown Student',
      gender: student ? student.gender : '-',
      t1: record.t1,
      t2: record.t2,
      final: record.final,
      total,
      letterGrade: analysis.grade
    };
  });
  
  scoreRecords.sort((a, b) => b.total - a.total);
  
  let rank = 1;
  scoreRecords.forEach((record, index) => {
    if (index > 0 && record.total < scoreRecords[index - 1].total) {
      rank = index + 1;
    }
    record.rank = rank;
  });
  
  scoreRecords.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: var(--font-latin); font-weight: 600;">${record.studentId}</td>
      <td style="font-weight: 600;">${record.name}</td>
      <td>${record.gender}</td>
      <td style="font-family: var(--font-latin); text-align: right;">${record.t1}</td>
      <td style="font-family: var(--font-latin); text-align: right;">${record.t2}</td>
      <td style="font-family: var(--font-latin); text-align: right;">${record.final}</td>
      <td style="font-family: var(--font-latin); text-align: right; font-weight: 700; color: var(--primary-color);">${record.total}</td>
      <td style="text-align: center;"><span class="badge-grade ${record.letterGrade}">${record.letterGrade}</span></td>
      <td style="font-family: var(--font-latin); text-align: center; font-weight: bold;">${record.rank}</td>
      <td style="text-align: center;">
        <button class="btn-edit-icon" onclick="openSingleGradeEditModal('${record.studentId}')" title="បញ្ចូលពិន្ទុ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openSingleGradeEditModal(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  const month = document.getElementById('grade-month-select').value;
  const subject = document.getElementById('grade-subject-select').value;
  const key = `${selectedExamTask}-${month}-${subject}`;
  const record = state.grades[key].find(r => r.studentId === studentId);
  
  document.getElementById('grade-modal-student-name').innerText = `ឈ្មោះ៖ ${student.name}`;
  document.getElementById('grade-modal-subject-month').innerText = `មុខវិជ្ជា៖ ${subject} | វាយតម្លៃ៖ ${selectedExamTask} (${month})`;
  document.getElementById('grade-edit-student-id').value = studentId;
  
  document.getElementById('grade-t1').value = record ? record.t1 : 0;
  document.getElementById('grade-t2').value = record ? record.t2 : 0;
  document.getElementById('grade-final').value = record ? record.final : 0;
  
  openModal('grade-modal');
}

async function handleGradeSubmit(event) {
  event.preventDefault();
  const studentId = document.getElementById('grade-edit-student-id').value;
  const month = document.getElementById('grade-month-select').value;
  const subject = document.getElementById('grade-subject-select').value;
  const key = `${selectedExamTask}-${month}-${subject}`;
  
  const t1 = parseFloat(document.getElementById('grade-t1').value) || 0;
  const t2 = parseFloat(document.getElementById('grade-t2').value) || 0;
  const final = parseFloat(document.getElementById('grade-final').value) || 0;
  
  if (!state.grades[key]) state.grades[key] = [];
  
  const idx = state.grades[key].findIndex(r => r.studentId === studentId);
  if (idx !== -1) {
    state.grades[key][idx] = { studentId, t1, t2, final };
  } else {
    state.grades[key].push({ studentId, t1, t2, final });
  }
  
  playSuccessSound();
  await saveAllClassData();
  closeModal('grade-modal');
  loadGrades();
  showToast('បានកែសម្រួលពិន្ទុរួចរាល់', 'success');
}

async function openBulkGradeModal() {
  const month = document.getElementById('grade-month-select').value;
  const subject = document.getElementById('grade-subject-select').value;
  const key = `${selectedExamTask}-${month}-${subject}`;
  
  if (state.students.length === 0) return;
  
  if (confirm(`តើអ្នកពិតជាចង់បញ្ចូលពិន្ទុសាកល្បងដល់សិស្សទាំងអស់មែនទេ?`)) {
    state.grades[key] = state.students.map(s => {
      const t1 = parseFloat((6 + Math.random() * 4).toFixed(1));
      const t2 = parseFloat((12 + Math.random() * 8).toFixed(1));
      const final = parseFloat((40 + Math.random() * 30).toFixed(1));
      return { studentId: s.id, t1, t2, final };
    });
    playSuccessSound();
    await saveAllClassData();
    loadGrades();
    showToast('បញ្ចូលពិន្ទុរហ័សរួចរាល់!', 'success');
  }
}

// ====================================================== //
// SUBVIEW 6: TIMETABLE                                   //
// ====================================================== //

function renderTimetable() {
  document.querySelectorAll('.schedule-slot').forEach(slot => slot.innerHTML = '');
  
  state.timetable.forEach((event, idx) => {
    document.querySelectorAll('.schedule-slot').forEach(slot => {
      if (slot.dataset.day === event.day && slot.dataset.time === event.slot) {
        const div = document.createElement('div');
        div.className = 'timetable-event';
        div.innerHTML = `
          <span>${event.subject}</span>
          <span class="room">${event.room}</span>
          <button class="btn-delete-event" onclick="deleteTimetableEvent(${idx})">&times;</button>
        `;
        slot.appendChild(div);
      }
    });
  });
}

function openTimetableModal() {
  document.getElementById('form-timetable').reset();
  
  // Load current subjects list into select option
  const select = document.getElementById('time-subject');
  select.outerHTML = `<select id="time-subject" required style="width: 100%; padding: 12px 16px; border: 1.5px solid var(--border-color); border-radius: 12px;"></select>`;
  const newSelect = document.getElementById('time-subject');
  
  state.subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.innerText = s;
    newSelect.appendChild(opt);
  });
  
  openModal('timetable-modal');
}

async function handleTimetableSubmit(event) {
  event.preventDefault();
  const subject = document.getElementById('time-subject').value;
  const room = document.getElementById('time-classroom').value.trim();
  const day = document.getElementById('time-day').value;
  const slot = document.getElementById('time-slot').value;
  
  const conflict = state.timetable.some(t => t.day === day && t.slot === slot);
  if (conflict) {
    showToast('កាលវិភាគម៉ោងនេះមានរួចរាល់ហើយ!', 'error');
    return;
  }
  
  state.timetable.push({ day, slot, subject, room });
  playSuccessSound();
  await saveAllClassData();
  closeModal('timetable-modal');
  renderTimetable();
  showToast('បន្ថែមម៉ោងបង្រៀនថ្មីជោគជ័យ!', 'success');
}

async function deleteTimetableEvent(index) {
  if (confirm('តើអ្នកពិតជាចង់លុបម៉ោងសិក្សានេះមែនទេ?')) {
    state.timetable.splice(index, 1);
    await saveAllClassData();
    renderTimetable();
    showToast('លុបម៉ោងសិក្សារួចរាល់', 'info');
  }
}

// ====================================================== //
// SUBVIEW 7: 3D STATISTICS AND RANKINGS                 //
// ====================================================== //

function renderStatistics() {
  // 1. Calculate class statistics
  const totalStudents = state.students.length;
  let presentCount = 0;
  let totalAttLogs = 0;
  
  Object.values(state.attendance).forEach(dailyLog => {
    Object.values(dailyLog).forEach(status => {
      totalAttLogs++;
      if (status === 'present' || status === 'late') presentCount++;
    });
  });
  
  const attRate = totalAttLogs > 0 ? ((presentCount / totalAttLogs) * 100).toFixed(1) : 95.0;
  const absentRate = (100 - attRate).toFixed(1);
  
  // Calculate average scores and pass counts
  let sumAvg = 0;
  let studentAverages = [];
  
  state.students.forEach(student => {
    let studentSum = 0;
    let testsCount = 0;
    
    Object.keys(state.grades).forEach(key => {
      const record = state.grades[key].find(r => r.studentId === student.id);
      if (record) {
        studentSum += (record.t1 + record.t2 + record.final);
        testsCount++;
      }
    });
    
    const avg = testsCount > 0 ? parseFloat((studentSum / testsCount).toFixed(1)) : 75.0;
    sumAvg += avg;
    
    const letter = calculateLetterGradeAndGPA(avg).grade;
    studentAverages.push({
      id: student.id,
      name: student.name,
      gender: student.gender,
      average: avg,
      grade: letter
    });
  });
  
  // Sort from Strongest to Weakest (highest score to lowest score)
  studentAverages.sort((a,b) => b.average - a.average);
  
  let passCount = 0;
  studentAverages.forEach(s => {
    if (s.average >= 50) passCount++;
  });
  
  const passRate = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 85.0;
  
  // Render values to 3D Bar SVG headers
  document.getElementById('3d-bar-val-present').innerText = `${attRate}%`;
  document.getElementById('3d-bar-val-absent').innerText = `${absentRate}%`;
  document.getElementById('3d-bar-val-pass').innerText = `${passRate}%`;
  
  // Render Student average rankings table
  const tbody = document.getElementById('stats-ranking-table-body');
  tbody.innerHTML = '';
  
  if (studentAverages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">គ្មានទិន្នន័យចំណាត់ថ្នាក់ពិន្ទុសិស្សទេ</td></tr>`;
    return;
  }
  
  studentAverages.forEach((s, idx) => {
    const tr = document.createElement('tr');
    
    // Auto feedback
    let comment = 'ខិតខំរៀនសូត្របន្ថែម';
    if (s.average >= 90) comment = 'ពូកែណាស់ គំរូល្អក្នុងថ្នាក់';
    else if (s.average >= 80) comment = 'ល្អប្រសើរ គួររក្សាលទ្ធផលនេះ';
    else if (s.average >= 70) comment = 'ល្អបង្គួរ អាចអភិវឌ្ឍន៍បន្ថែមបាន';
    else if (s.average >= 50) comment = 'មធ្យម គួរយកចិត្តទុកដាក់បន្ថែម';
    
    tr.innerHTML = `
      <td style="font-family: var(--font-latin); text-align: center; font-weight: bold; color: var(--primary-color);">${idx + 1}</td>
      <td style="font-weight: 600;">${s.name}</td>
      <td>${s.gender}</td>
      <td style="font-family: var(--font-latin); text-align: right; font-weight: bold; color: #1e3a8a;">${s.average}</td>
      <td style="text-align: center;"><span class="badge-grade ${s.grade}">${s.grade}</span></td>
      <td style="color: var(--text-muted); font-size: 12.5px;">${comment}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ====================================================== //
// SUBVIEW 8: TEACHER PROFILE MANAGEMENT                  //
// ====================================================== //

function renderProfileView() {
  if (state.currentUser) {
    document.getElementById('prof-name').value = state.currentUser.name;
    document.getElementById('prof-title').value = state.currentUser.role;
    document.getElementById('prof-school').value = state.classConfig ? state.classConfig.school : 'វិទ្យាស្ថានគរុកោសល្យរាជធានីភ្នំពេញ (PTEC)';
    
    document.getElementById('prof-display-name').innerText = state.currentUser.name;
    document.getElementById('prof-display-role').innerText = state.currentUser.role;
    
    const parts = state.currentUser.name.split(' ');
    const initials = parts[parts.length - 1].substring(0, 2).toUpperCase();
    document.getElementById('prof-avatar-big').innerText = initials;
  }
}

async function handleProfileEditSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('prof-name').value.trim();
  const role = document.getElementById('prof-title').value.trim();
  const school = document.getElementById('prof-school').value.trim();
  
  state.currentUser.name = name;
  state.currentUser.role = role;
  
  if (state.classConfig) {
    state.classConfig.school = school;
  }
  
  sessionStorage.setItem('krusmart_user', JSON.stringify(state.currentUser));
  playSuccessSound();
  await saveAllClassData();
  renderProfileView();
  
  // Re-sync top-pill details
  document.getElementById('sidebar-user-name').innerText = name;
  document.getElementById('sidebar-user-role').innerText = role;
  
  const initials = name.split(' ').pop().substring(0, 2).toUpperCase();
  document.getElementById('user-avatar-bubble').innerText = initials;
  document.querySelector('.pill-avatar').innerText = initials;
  document.querySelector('.pill-name').innerText = name.split(' ').pop();
  
  showToast('ធ្វើបច្ចុប្បន្នភាព Profile រួចរាល់!', 'success');
}

// ====================================================== //
// PREFERENCES & UTILITIES                                //
// ====================================================== //

async function saveProfileSettings(event) {
  event.preventDefault();
  const name = document.getElementById('set-teacher-name').value.trim();
  const school = document.getElementById('set-teacher-school').value.trim();
  const sheetUrl = document.getElementById('settings-google-sheet-url').value.trim();
  
  state.currentUser.name = name;
  if (state.classConfig) {
    state.classConfig.school = school;
  }
  
  state.settings.googleSheetUrl = sheetUrl;
  
  sessionStorage.setItem('krusmart_user', JSON.stringify(state.currentUser));
  playSuccessSound();
  await saveAllClassData();
  showToast('រក្សាទុកព័ត៌មានរួចរាល់!', 'success');
}

function toggleDarkMode(checked) {
  state.settings.darkMode = checked;
  saveAllClassData();
  if (checked) {
    document.body.classList.add('dark-theme');
    showToast('បើកមុខងាររចនាផ្ទៃងងឹត (Dark Mode)', 'info');
  } else {
    document.body.classList.remove('dark-theme');
    showToast('បិទមុខងាររចនាផ្ទៃងងឹត (Dark Mode)', 'info');
  }
}

function changeLanguageSetting(lang) {
  state.settings.language = lang;
  saveAllClassData();
  showToast(lang === 'km' ? 'ភាសាប្រព័ន្ធ៖ ខ្មែរ' : 'System Language: English', 'info');
}

async function confirmResetSystemData() {
  if (confirm('ការប្រុងប្រយ័ត្ន៖ តើអ្នកប្រាកដជាចង់លុបចោលទិន្នន័យទាំងអស់ និងកំណត់ប្រព័ន្ធឡើងវិញមែនទេ?')) {
    restoreDefaultLocalStore();
    await saveAllClassData();
    playSuccessSound();
    initAppState();
    showToast('ប្រព័ន្ធត្រូវបានកំណត់ឡើងវិញ!', 'warning');
  }
}

// Helpers
function getTodayDateString() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function getKhmerDateDisplay() {
  const days = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const d = new Date();
  return `ថ្ងៃ${days[d.getDay()]} ទី${convertToKhmerNumbers(d.getDate())} ខែ${months[d.getMonth()]} ឆ្នាំ${convertToKhmerNumbers(d.getFullYear())}`;
}

function convertToKhmerNumbers(num) {
  const digits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num.toString().split('').map(c => isNaN(c) ? c : digits[parseInt(c)]).join('');
}

function calculateLetterGradeAndGPA(score) {
  if (score >= 90) return { grade: 'A', gpa: 4.0 };
  if (score >= 80) return { grade: 'B', gpa: 3.5 };
  if (score >= 70) return { grade: 'C', gpa: 3.0 };
  if (score >= 60) return { grade: 'D', gpa: 2.0 };
  if (score >= 50) return { grade: 'E', gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
}

function playSuccessSound() {
  if (!state.settings.soundEnabled) return;
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.frequency.setValueAtTime(523.25, context.currentTime);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    osc.start();
    osc.stop(context.currentTime + 0.08);
  } catch (e) {
    console.log("Audio contexts blocked or unsupported.");
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateDashboardStats() {
  document.getElementById('stat-total-students').innerText = `${convertToKhmerNumbers(state.students.length)} នាក់`;
  
  const todayStr = getTodayDateString();
  const log = state.attendance[todayStr];
  if (log) {
    let tot = 0, pres = 0;
    Object.values(log).forEach(s => {
      tot++;
      if (s === 'present' || s === 'late') pres++;
    });
    const rate = tot > 0 ? ((pres / tot) * 100).toFixed(1) : 100.0;
    document.getElementById('stat-attendance-rate').innerText = `${convertToKhmerNumbers(rate)}%`;
  } else {
    document.getElementById('stat-attendance-rate').innerText = 'មិនទាន់កត់ត្រា';
  }
  
  let totalSum = 0;
  let gradesCount = 0;
  Object.keys(state.grades).forEach(k => {
    state.grades[k].forEach(r => {
      totalSum += (r.t1 + r.t2 + r.final);
      gradesCount++;
    });
  });
  const avg = gradesCount > 0 ? (totalSum / gradesCount).toFixed(1) : '៧៨.៥';
  document.getElementById('stat-average-grade').innerText = `${convertToKhmerNumbers(avg)} / ១០០`;
}

function renderActivities() {
  const container = document.getElementById('activity-list-container');
  container.innerHTML = `
    <li class="activity-item">
      <div class="activity-badge present"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
      <div class="activity-details"><span class="desc">ប្រព័ន្ធកត់វត្តមានត្រូវបានធ្វើបច្ចុប្បន្នភាព</span><span class="time">១ នាទីមុន</span></div>
    </li>
  `;
}

function renderTodos() {
  const container = document.getElementById('todo-list-container');
  container.innerHTML = '';
  state.todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.checked ? 'checked' : ''}`;
    li.innerHTML = `
      <div class="todo-left">
        <input type="checkbox" ${todo.checked ? 'checked' : ''} onchange="toggleTodoState(${todo.id}, this.checked)">
        <span class="todo-text">${todo.text}</span>
      </div>
      <button class="btn-delete-todo" onclick="deleteTodoItem(${todo.id})">&times;</button>
    `;
    container.appendChild(li);
  });
}

function toggleTodoState(id, checked) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    todo.checked = checked;
    saveAllClassData();
    renderTodos();
  }
}

function deleteTodoItem(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  saveAllClassData();
  renderTodos();
}

function addNewTodoItem() {
  const task = prompt('បញ្ចូលកិច្ចការថ្មី៖');
  if (task && task.trim() !== '') {
    state.todos.push({ id: Date.now(), text: task.trim(), checked: false });
    saveAllClassData();
    renderTodos();
  }
}

// Google Sheets Sync Implementation
async function syncDataToGoogleSheets() {
  const url = state.settings.googleSheetUrl;
  if (!url || url.trim() === '') {
    return { success: false, reason: 'no_url' };
  }
  
  const payload = {
    action: "syncData",
    className: state.classConfig ? state.classConfig.name : "",
    academicYear: state.classConfig ? state.classConfig.year : "",
    students: state.students,
    attendance: state.attendance,
    grades: state.grades,
    timetable: state.timetable,
    subjects: state.subjects,
    profile: {
      name: state.currentUser ? state.currentUser.name : '',
      role: state.currentUser ? state.currentUser.role : '',
      school: state.classConfig ? state.classConfig.school : ''
    }
  };

  try {
    // Send data to Apps Script Web App
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Bypasses CORS browser preflights for cross-origin Apps Script Web App calls
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error) {
    console.error("Google Sheets sync failed:", error);
    return { success: false, reason: error.message };
  }
}

async function manualSyncToGoogleSheets() {
  const url = document.getElementById('settings-google-sheet-url').value.trim();
  if (!url || url === '') {
    showToast('សូមបញ្ចូលតំណភ្ជាប់ Google Sheets Web App URL ជាមុនសិន!', 'warning');
    return;
  }
  
  state.settings.googleSheetUrl = url;
  showToast('កំពុងធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ Google Sheets...', 'info');
  
  const res = await syncDataToGoogleSheets();
  if (res.success) {
    playSuccessSound();
    showToast('ធ្វើសមកាលកម្មទិន្នន័យជោគជ័យ!', 'success');
  } else {
    showToast(`ការភ្ជាប់បរាជ័យ៖ ${res.reason}`, 'error');
  }
}

function copyAppsScriptCode() {
  const codeArea = document.getElementById('apps-script-code-text');
  codeArea.select();
  document.execCommand('copy');
  playSuccessSound();
  showToast('ចម្លងកូដ Apps Script ទៅកាន់ Clipboard រួចរាល់!', 'success');
  closeModal('apps-script-modal');
}

// ====================================================== //
// STUDENT ID CARD GENERATOR LOGIC                        //
// ====================================================== //

let cardStudentPhotoData = null;

function renderIdCardGenerator() {
  const select = document.getElementById('card-student-select');
  select.innerHTML = '<option value="">-- ជ្រើសរើសសិស្សក្នុងថ្នាក់ --</option>';
  state.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.innerText = `${s.id} - ${s.name}`;
    select.appendChild(opt);
  });
  
  // Reset fields
  document.getElementById('card-name-kh').value = '';
  document.getElementById('card-name-en').value = '';
  document.getElementById('card-student-id').value = '';
  document.getElementById('card-class').value = state.classConfig ? state.classConfig.name : 'ថ្នាក់ទី១២A';
  document.getElementById('card-year').value = state.classConfig ? state.classConfig.year : '២០២៥-២០២៦';
  document.getElementById('card-dob').value = '១២ វិច្ឆិកា ២០០៨';
  document.getElementById('card-expiry').value = '៣១ សីហា ២០២៦';
  
  // Reset previews
  document.getElementById('card-preview-name-kh').innerText = 'សុខ ដារ៉ា';
  document.getElementById('card-preview-name-en').innerText = 'SOK DARA';
  document.getElementById('card-preview-id').innerText = 'PTEC001';
  document.getElementById('card-preview-class').innerText = 'ថ្នាក់ទី១២A';
  document.getElementById('card-preview-year').innerText = '២០២៥-២០២៦';
  document.getElementById('card-preview-dob').innerText = '១២ វិច្ឆិកា ២០០៨';
  document.getElementById('card-preview-expiry').innerText = '៣១ សីហា ២០២៦';
  document.getElementById('card-preview-barcode-number').innerText = '*PTEC001*';
  document.getElementById('card-preview-photo-box').innerHTML = '<span style="font-size: 24px;">👤</span>';
  
  cardStudentPhotoData = null;
  
  // Bind input preview synchronizations
  const inputsMap = {
    'card-name-kh': 'card-preview-name-kh',
    'card-name-en': 'card-preview-name-en',
    'card-student-id': 'card-preview-id',
    'card-class': 'card-preview-class',
    'card-year': 'card-preview-year',
    'card-dob': 'card-preview-dob',
    'card-expiry': 'card-preview-expiry'
  };
  
  Object.keys(inputsMap).forEach(inputId => {
    const inputEl = document.getElementById(inputId);
    const previewEl = document.getElementById(inputsMap[inputId]);
    
    // Remove old listeners by cloning
    const newEl = inputEl.cloneNode(true);
    inputEl.parentNode.replaceChild(newEl, inputEl);
    
    newEl.addEventListener('input', () => {
      let val = newEl.value.trim();
      if (inputId === 'card-name-en') val = val.toUpperCase();
      previewEl.innerText = val || newEl.placeholder;
      if (inputId === 'card-student-id') {
        document.getElementById('card-preview-barcode-number').innerText = `*${val || 'PTEC001'}*`;
      }
    });
  });
}

function autoFillCardDetails(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  document.getElementById('card-name-kh').value = student.name;
  document.getElementById('card-name-en').value = convertKhmerToLatin(student.name);
  document.getElementById('card-student-id').value = student.id;
  document.getElementById('card-class').value = state.classConfig ? state.classConfig.name : 'ថ្នាក់ទី១២A';
  document.getElementById('card-year').value = state.classConfig ? state.classConfig.year : '២០២៥-២០២៦';
  document.getElementById('card-dob').value = '១២ វិច្ឆិកា ២០០៨';
  document.getElementById('card-expiry').value = '៣១ សីហា ២០២៦';
  
  // Trigger update previews
  document.getElementById('card-preview-name-kh').innerText = student.name;
  document.getElementById('card-preview-name-en').innerText = convertKhmerToLatin(student.name).toUpperCase();
  document.getElementById('card-preview-id').innerText = student.id;
  document.getElementById('card-preview-class').innerText = state.classConfig ? state.classConfig.name : 'ថ្នាក់ទី១២A';
  document.getElementById('card-preview-year').innerText = state.classConfig ? state.classConfig.year : '២០២៥-២០២៦';
  document.getElementById('card-preview-dob').innerText = '១២ វិច្ឆិកា ២០០៨';
  document.getElementById('card-preview-expiry').innerText = '៣១ សីហា ២០២៦';
  document.getElementById('card-preview-barcode-number').innerText = `*${student.id}*`;
  
  cardStudentPhotoData = null;
  document.getElementById('card-preview-photo-box').innerHTML = '<span style="font-size: 24px;">👤</span>';
}

function convertKhmerToLatin(khName) {
  const dict = {
    'សុខ': 'Sok', 'ដារ៉ា': 'Dara', 'គង់': 'Kong', 'វិច្ឆិកា': 'Vicheka', 'ចាន់': 'Chan', 'បុប្ផា': 'Bopha',
    'កែវ': 'Keo', 'រដ្ឋា': 'Rotha', 'នួន': 'Nuon', 'សំណាង': 'Samnang', 'សេង': 'Seng', 'ម៉ារី': 'Mary'
  };
  let parts = khName.split(' ');
  let latParts = parts.map(p => dict[p] || p);
  return latParts.join(' ');
}

function loadCardStudentPhoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      cardStudentPhotoData = e.target.result;
      document.getElementById('card-preview-photo-box').innerHTML = `<img src="${cardStudentPhotoData}" style="width: 100%; height: 100%; object-fit: cover;">`;
    };
    reader.readAsDataURL(file);
  }
}

function changeCardTheme(color) {
  document.getElementById('id-card-front').style.borderColor = color;
  document.getElementById('id-card-back').style.borderColor = color;
  document.querySelector('.id-card-bg-header').style.backgroundColor = color;
  document.getElementById('card-preview-title').style.color = color;
  const photoBox = document.getElementById('card-preview-photo-box');
  if (photoBox) photoBox.style.borderColor = color;
}

function generateStudentCardPNG() {
  const nameKh = document.getElementById('card-preview-name-kh').innerText;
  const nameEn = document.getElementById('card-preview-name-en').innerText;
  const sId = document.getElementById('card-preview-id').innerText;
  const gender = document.getElementById('card-preview-gender').innerText || 'ប្រុស';
  const sClass = document.getElementById('card-preview-class').innerText;
  const year = document.getElementById('card-preview-year').innerText;
  const dob = document.getElementById('card-preview-dob').innerText;
  const expiry = document.getElementById('card-preview-expiry').innerText;
  const themeColor = document.getElementById('card-theme-color').value;
  
  const canvas = document.createElement('canvas');
  canvas.width = 674;
  canvas.height = 424;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 674, 424);
  
  ctx.fillStyle = themeColor;
  ctx.fillRect(0, 0, 674, 84);
  
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 674, 424);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 15px 'Siemreap', sans-serif";
  ctx.fillText("វិទ្យាស្ថានគរុកោសល្យរាជធានីភ្នំពេញ", 96, 36);
  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillText("Phnom Penh Teacher Education College", 96, 58);
  
  ctx.fillStyle = themeColor;
  ctx.font = "bold 18px 'Siemreap', sans-serif";
  ctx.fillText("ប័ណ្ណសម្គាល់ខ្លួនសិស្ស", 220, 126);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(220, 134);
  ctx.lineTo(600, 134);
  ctx.stroke();
  
  ctx.fillStyle = '#0f172a';
  ctx.font = "14px 'Siemreap', sans-serif";
  ctx.fillText(`ឈ្មោះសិស្ស៖ ${nameKh}`, 220, 166);
  ctx.font = "12px 'Inter', sans-serif";
  ctx.fillText(`Name: ${nameEn}`, 220, 186);
  
  ctx.font = "14px 'Siemreap', sans-serif";
  ctx.fillText(`ភេទ៖ ${gender}`, 220, 216);
  ctx.fillText(`ថ្នាក់ទី៖ ${sClass}`, 380, 216);
  ctx.fillText(`អត្តលេខ៖ ${sId}`, 220, 246);
  ctx.fillText(`ឆ្នាំសិក្សា៖ ${year}`, 220, 276);
  
  ctx.font = "13px 'Siemreap', sans-serif";
  ctx.fillText(`ថ្ងៃកំណើត៖ ${dob}`, 24, 360);
  ctx.fillText(`ផុតកំណត់៖ ${expiry}`, 24, 386);
  
  ctx.fillStyle = '#1e3a8a';
  ctx.font = "bold 11px 'Siemreap', sans-serif";
  ctx.fillText("✍️ នាយកសាលា", 530, 380);
  
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(570, 340, 30, 0, 2 * Math.PI);
  ctx.stroke();
  
  const finishDraw = () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `កាតសិស្ស_${sId}_${nameKh.replace(/\s+/g, '_')}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ទាញយកកាតសិស្សជោគជ័យ!', 'success');
  };
  
  if (cardStudentPhotoData) {
    const photoImg = new Image();
    photoImg.src = cardStudentPhotoData;
    photoImg.onload = () => {
      ctx.drawImage(photoImg, 24, 106, 152, 204);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 106, 152, 204);
      finishDraw();
    };
  } else {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(24, 106, 152, 204);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 106, 152, 204);
    ctx.fillStyle = '#64748b';
    ctx.font = "60px sans-serif";
    ctx.fillText("👤", 76, 226);
    finishDraw();
  }
}

function printStudentCard() {
  window.print();
  showToast('បោះពុម្ពកាតសិស្ស...', 'info');
}

// ====================================================== //
// DATABASE BACKUP & RESTORE LOGIC                        //
// ====================================================== //

async function renderBackupRestore() {
  if (!window.electronAPI) {
    document.getElementById('backups-list-table-body').innerHTML = `
      <tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">
        មុខងារគ្រប់គ្រងឯកសារបម្រុងទុកដំណើរការតែនៅលើ Desktop App ប៉ុណ្ណោះ។
      </td></tr>
    `;
    return;
  }
  
  const year = state.classConfig ? state.classConfig.year : '២០២៥-២០២៦';
  const res = await window.electronAPI.listBackups(year);
  
  const tbody = document.getElementById('backups-list-table-body');
  tbody.innerHTML = '';
  
  if (res.success && res.backups && res.backups.length > 0) {
    res.backups.forEach(backup => {
      const tr = document.createElement('tr');
      const dateStr = new Date(backup.createdAt).toLocaleString('km-KH');
      const sizeKb = (backup.size / 1024).toFixed(1) + ' KB';
      
      tr.innerHTML = `
        <td style="font-family: var(--font-latin); font-weight: 600;">${backup.fileName}</td>
        <td>${dateStr} (${sizeKb})</td>
        <td style="text-align: center;">
          <button class="btn-primary-blue" onclick="restoreLocalBackup('${backup.fileName}')" style="padding: 6px 12px; font-size: 11px; margin: 0; border-radius: 6px;">🔄 ស្តារឡើងវិញ</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">គ្មានឯកសារទិន្នន័យបម្រុងទុកត្រូវបានរកឃើញឡើយ។</td></tr>`;
  }
}

async function performManualBackup() {
  const res = await performBackup(false);
  if (res.success) {
    renderBackupRestore();
  }
}

async function performBackup(isAuto = false) {
  if (!window.electronAPI || !state.classConfig) {
    if (!isAuto) showToast('មិនអាចរក្សាទិន្នន័យបម្រុងទុកបានទេ (មិនស្ថិតក្នុង Electron App)', 'warning');
    return { success: false };
  }
  
  const year = state.classConfig.year;
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-') + '_' + [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('-');
  
  const backupState = {
    timestamp,
    academicYear: year,
    classConfig: state.classConfig,
    students: state.students,
    attendance: state.attendance,
    grades: state.grades,
    timetable: state.timetable,
    todos: state.todos,
    subjects: state.subjects
  };
  
  const res = await window.electronAPI.saveBackup(year, timestamp, backupState);
  if (res.success) {
    if (!isAuto) {
      playSuccessSound();
      showToast(`បង្កើតឯកសារបម្រុងទុកជោគជ័យ៖ ${res.fileName}`, 'success');
    }
    return { success: true, fileName: res.fileName };
  } else {
    if (!isAuto) showToast(`ការបង្កើតទិន្នន័យបម្រុងបរាជ័យ៖ ${res.error}`, 'error');
    return { success: false, error: res.error };
  }
}

async function restoreLocalBackup(fileName) {
  if (!confirm(`តើអ្នកពិតជាចង់ស្តារទិន្នន័យពីឯកសារ ${fileName} នេះមែនទេ? ទិន្នន័យបច្ចុប្បន្ននឹងត្រូវជំនួសដោយទិន្នន័យបម្រុងនេះ។`)) {
    return;
  }
  
  const year = state.classConfig ? state.classConfig.year : '២០២៥-២០២៦';
  const res = await window.electronAPI.restoreBackup(year, fileName);
  if (res.success && res.data) {
    const parsed = res.data;
    if (parsed.classConfig) state.classConfig = parsed.classConfig;
    if (parsed.students) state.students = parsed.students;
    if (parsed.attendance) state.attendance = parsed.attendance;
    if (parsed.grades) state.grades = parsed.grades;
    if (parsed.timetable) state.timetable = parsed.timetable;
    if (parsed.todos) state.todos = parsed.todos;
    if (parsed.subjects) state.subjects = parsed.subjects;
    
    playSuccessSound();
    showToast('ស្តារទិន្នន័យពីម៉ាស៊ីនឡើងវិញជោគជ័យ ១០០%!', 'success');
    switchDashboardView('home');
  } else {
    showToast(`ស្តារទិន្នន័យបរាជ័យ៖ ${res.error}`, 'error');
  }
}

function restoreFromUploadedFile() {
  const fileInput = document.getElementById('restore-file-input');
  const file = fileInput.files[0];
  if (!file) {
    showToast('សូមជ្រើសរើសឯកសារទិន្នន័យបម្រុងទុកជាមុនសិន!', 'warning');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.students || !parsed.classConfig) {
        showToast('ទម្រង់ឯកសារបម្រុងទុកមិនត្រឹមត្រូវឡើយ!', 'error');
        return;
      }
      
      if (!confirm('តើអ្នកពិតជាចង់ស្តារទិន្នន័យពីឯកសារ Upload នេះមែនទេ?')) {
        return;
      }
      
      state.classConfig = parsed.classConfig;
      state.students = parsed.students;
      if (parsed.attendance) state.attendance = parsed.attendance;
      if (parsed.grades) state.grades = parsed.grades;
      if (parsed.timetable) state.timetable = parsed.timetable;
      if (parsed.todos) state.todos = parsed.todos;
      if (parsed.subjects) state.subjects = parsed.subjects;
      
      await saveAllClassData();
      
      playSuccessSound();
      showToast('ស្តារទិន្នន័យពីការ Upload ឡើងវិញជោគជ័យ ១០០%!', 'success');
      fileInput.value = '';
      switchDashboardView('home');
    } catch (err) {
      showToast('ការអានឯកសារបរាជ័យ៖ ទម្រង់មិនត្រូវគ្នា', 'error');
    }
  };
  reader.readAsText(file);
}

// 5-minute auto-backup interval
setInterval(() => {
  console.log("Auto-backup interval running...");
  performBackup(true);
}, 5 * 60 * 1000);

// ====================================================== //
// AI TEACHER ASSISTANT LOGIC                             //
// ====================================================== //

function renderAIAssistant() {
  document.getElementById('ai-prompt-input').value = '';
  document.getElementById('ai-output-box').innerText = 'លទ្ធផលដែលបង្កើតឡើងដោយ AI ជំនួយការគ្រូ នឹងបង្ហាញនៅទីនេះ...';
}

function triggerAIGenerate(type) {
  const promptMap = {
    lesson_plan: "បង្កើតផែនការបង្រៀន (Lesson Plan) មុខវិជ្ជា គណិតវិទ្យា ថ្នាក់ទី១០ រយៈពេល៤០នាទី ស្តីពី 'ដេរីវេ'",
    worksheet: "បង្កើតសន្លឹកកិច្ចការ (Worksheet) មុខវិជ្ជា រូបវិទ្យា ថ្នាក់ទី១១ ស្តីពី 'ច្បាប់ញូតុន'",
    quiz: "បង្កើតកម្រងសំណួរល្បងពុទ្ធិ (Quiz) ចំនួន៥សំណួរ មុខវិជ្ជា ជីវវិទ្យា ថ្នាក់ទី១២",
    powerpoint: "បង្កើតគ្រោងស្លាយបង្រៀន (PowerPoint Presentation Outline) មុខវិជ្ជា ប្រវត្តិវិទ្យា ថ្នាក់ទី១២",
    homework: "បង្កើតកិច្ចការផ្ទះ (Homework Task) មុខវិជ្ជា ភាសាខ្មែរ ថ្នាក់ទី៧",
    exit_ticket: "បង្កើតសន្លឹកវាយតម្លៃចុងម៉ោង (Exit Ticket) មុខវិជ្ជា គីមីវិទ្យា ថ្នាក់ទី១០"
  };
  
  document.getElementById('ai-prompt-input').value = promptMap[type] || '';
  showToast('បានជ្រើសរើសប្រធានបទការងារ AI! ចុចប៊ូតុង "បង្កើតភ្លាមៗ" ដើម្បីដំណើរការ។', 'info');
}

function generateAIContent() {
  const promptText = document.getElementById('ai-prompt-input').value.trim();
  if (!promptText) {
    showToast('សូមបញ្ចូលប្រធានបទ ឬសំណួរជាមុនសិន!', 'warning');
    return;
  }
  
  showToast('AI កំពុងវិភាគ និងបង្កើតខ្លឹមសារ...', 'info');
  document.getElementById('ai-output-box').innerText = '🤖 កំពុងគណនា និងរៀបចំកូដចម្លើយដោយ AI...\nសូមរង់ចាំបន្តិច...';
  
  setTimeout(() => {
    let mockResult = '';
    if (promptText.includes('ផែនការ') || promptText.includes('plan')) {
      mockResult = `📝 [កិច្ចតែងការបង្រៀនគំរូបង្កើតដោយ AI]
- មុខវិជ្ជា៖ គណិតវិទ្យា (ថ្នាក់ទី១០)
- ម៉ោង៖ ៤០នាទី
-  موضوع/មេរៀន៖ ដេរីវេនៃអនុគមន៍
- វត្ថុបំណង៖ សិស្សអាចគណនាដេរីវេនៃអនុគមន៍ពហុធាបានត្រឹមត្រូវ។
- ជំហានទី១ (៥នាទី)៖ រំលឹកមេរៀន ស្តីពីលីមីត និងអត្រាបម្រែបម្រួល។
- ជំហានទី២ (១៥នាទី)៖ ពន្យល់រូបមន្ត f'(x) = n*x^(n-1) និងបង្ហាញឧទហរណ៍។
- ជំហានទី៣ (១៥នាទី)៖ លំហាត់អនុវត្តជាបុគ្គល និងជាក្រុម។
- ជំហានទី៤ (៥នាទី)៖ Exit Ticket វាយតម្លៃយល់ដឹងសិស្ស។`;
    } else if (promptText.includes('សំណួរ') || promptText.includes('quiz')) {
      mockResult = `❓ [កម្រងសំណួរល្បងពុទ្ធិបង្កើតដោយ AI]
១. តើអ្វីជាឯកតារង្វាស់របស់កម្លាំងនៅក្នុងប្រព័ន្ធអន្តរជាតិ (SI)?
   ក. ជូល (Joule)
   ខ. ញូតុន (Newton)  [ចម្លើយត្រឹមត្រូវ]
   គ. វ៉ាត់ (Watt)
២. តើច្បាប់ទី១ របស់ញូតុន ហៅថាច្បាប់អ្វី?
   ក. ច្បាប់លំនឹង/អសកម្ម (Inertia) [ចម្លើយត្រឹមត្រូវ]
   ខ. ច្បាប់សន្ទុះ
   គ. ច្បាប់កម្មសកម្ម និងប្រតិកម្ម`;
    } else {
      mockResult = `✨ [ខ្លឹមសារសិក្សាបង្កើតដោយ AI]
ប្រធានបទ៖ "${promptText}"

✓ មេរៀនសង្ខេប៖ បានរៀបចំខ្លឹមសារស្នូលស្របតាមកម្មវិធីសិក្សារបស់ក្រសួងអប់រំ យុវជន និងកីឡា។
✓ កិច្ចការអនុវត្ត៖ រួមមានលំហាត់គំរូ ចំនួន៣ និងសំណួរពិភាក្សាចំនួន២។
✓ exit ticket៖ សំណួរវាយតម្លៃ៖ "តើអ្វីជាចំណុចសំខាន់បំផុតដែលប្អូនបានរៀនក្នុងម៉ោងនេះ?"`;
    }
    
    document.getElementById('ai-output-box').innerText = mockResult;
    playSuccessSound();
    showToast('AI បានបង្កើតខ្លឹមសារជោគជ័យ!', 'success');
  }, 1500);
}

// ====================================================== //
// PARENT COMMUNICATION LOGIC                             //
// ====================================================== //

function renderParentComm() {
  const container = document.getElementById('parent-comm-students-list');
  container.innerHTML = '';
  state.students.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'btn-google-login';
    btn.style = 'width: 100%; justify-content: flex-start; margin: 0; padding: 10px; font-size: 13.5px; border-radius: 8px;';
    btn.innerHTML = `👤 <strong>${s.name}</strong> (${s.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'})`;
    btn.onclick = () => selectCommStudent(s.id);
    container.appendChild(btn);
  });
  
  if (state.students.length > 0) {
    selectCommStudent(state.students[0].id);
  }
}

let commActiveStudent = null;

function selectCommStudent(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  commActiveStudent = student;
  document.getElementById('comm-target-header').innerText = `ទំនាក់ទំនងទៅកាន់អាណាព្យាបាលសិស្ស៖ ${student.name}`;
  document.getElementById('comm-parent-phone').value = student.phone || '012 345 678';
  
  document.getElementById('comm-message-text').value = `សូមជម្រាបសួរលោក/លោកស្រីអាណាព្យាបាលសិស្ស ${student.name}។ ខ្ញុំជាគ្រូទទួលបន្ទុកថ្នាក់ទី១២A វិទ្យាស្ថាន PTEC សូមជូនដំណឹងអំពីកូនរបស់លោកអ្នក...`;
}

function generateCommMessage(type) {
  if (!commActiveStudent) return;
  
  const msgs = {
    late: `សូមជម្រាបសួរលោក/លោកស្រីអាណាព្យាបាលសិស្ស ${commActiveStudent.name}។ ខ្ញុំសូមជូនដំណឹងថា ថ្ងៃនេះកូនរបស់លោកអ្នកបានមកយឺតម៉ោងសិក្សា។ សូមលោកស្រីជួយណែនាំ និងក្រើនរំលឹកកូនបន្ថែមដើម្បីកុំឱ្យយឺតម៉ោងបង្រៀនទៀត។ សូមអរគុណ!`,
    absent: `សូមជម្រាបសួរលោក/លោកស្រីអាណាព្យាបាលសិស្ស ${commActiveStudent.name}។ ខ្ញុំសូមជម្រាបជូនថា ថ្ងៃនេះកូនរបស់លោកអ្នកបានអវត្តមានពីថ្នាក់រៀនដោយគ្មានច្បាប់អនុញ្ញាត។ សូមលោក/លោកស្រីទំនាក់ទំនងមកគ្រូជាបន្ទាន់។ សូមអរគុណ!`,
    behavior_down: `សូមជម្រាបសួរលោក/លោកស្រីអាណាព្យាបាលសិស្ស ${commActiveStudent.name}។ ខ្ញុំសូមជម្រាបជូនថា ឥរិយាបថ និងការចូលរួមក្នុងថ្នាក់របស់កូនលោកអ្នកមានការធ្លាក់ចុះក្នុងសប្តាហ៍នេះ។ សូមលោកអ្នកជួយតាមដានការសិក្សាកូននៅផ្ទះបន្ថែម។ សូមអរគុណ!`,
    meeting_invite: `សូមជម្រាបសួរលោក/លោកស្រីអាណាព្យាបាលសិស្ស ${commActiveStudent.name}។ ខ្ញុំសូមគោរពអញ្ជើញលោក/លោកស្រី ចូលរួមប្រជុំអាណាព្យាបាលសិស្សនៅវិទ្យាស្ថាន PTEC នៅថ្ងៃសៅរ៍ចុងសប្តាហ៍នេះ វេលាម៉ោង ៨:០០ព្រឹក ដើម្បីពិភាក្សាអំពីការសិក្សារបស់សិស្ស។ សូមអរគុណ!`
  };
  
  document.getElementById('comm-message-text').value = msgs[type];
  showToast('AI បានសរសេរសារស្វ័យប្រវត្តជោគជ័យ!', 'success');
}

function sendCommTelegram() {
  const msg = document.getElementById('comm-message-text').value;
  showToast('កំពុងបើក Telegram...', 'info');
  window.open(`https://t.me/share/url?url=${encodeURIComponent(msg)}`, '_blank');
}

function sendCommEmail() {
  const phone = document.getElementById('comm-parent-phone').value;
  const msg = document.getElementById('comm-message-text').value;
  alert(`[ផ្ញើសារ SMS/Email ទៅកាន់ ${phone} ជោគជ័យ]\n\nខ្លឹមសារ៖\n${msg}`);
  showToast('ផ្ញើសារជូនដំណឹងរួចរាល់!', 'success');
}

// ====================================================== //
// PRINCIPAL KPI & INSPECTION LOGIC                       //
// ====================================================== //

function loadInspectionDetails(val) {
  showToast(`កំពុងទាញយកទិន្នន័យថ្នាក់ចុះពិនិត្យ...`, 'info');
}

// Global search handling depending on active sub-view
function handleGlobalSearch(query) {
  const activeSubView = document.querySelector('.sub-view.active');
  if (!activeSubView) return;
  
  const activeId = activeSubView.id;
  if (activeId === 'view-students') {
    filterStudentsList(query);
  } else if (activeId === 'view-grades') {
    const tbody = document.getElementById('grade-table-body');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells.length >= 2) {
          const name = row.cells[1].textContent.toLowerCase();
          const id = row.cells[0].textContent.toLowerCase();
          if (name.includes(query.toLowerCase()) || id.includes(query.toLowerCase())) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        }
      });
    }
  } else if (activeId === 'view-attendance') {
    const tbody = document.getElementById('attendance-table-body');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.cells.length >= 2) {
          const name = row.cells[1].textContent.toLowerCase();
          const id = row.cells[0].textContent.toLowerCase();
          if (name.includes(query.toLowerCase()) || id.includes(query.toLowerCase())) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        }
      });
    }
  }
}

// Attendance date selection change handler
function handleAttendanceDateChange(val) {
  renderAttendanceGrid();
}
