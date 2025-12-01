// Popup UI logic for ScrollSense
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadCurrentSession();
  await loadStats();
  await loadSettings();
  setupEventListeners();
  updateUI();
}

function setupEventListeners() {
  document.getElementById('startSession').addEventListener('click', startSession);
  document.getElementById('endSession').addEventListener('click', endSession);
  document.getElementById('toggleSettings').addEventListener('click', toggleSettings);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
}

async function loadCurrentSession() {
  const data = await chrome.storage.local.get(['currentSession']);
  if (data.currentSession && data.currentSession.active) {
    showActiveSession(data.currentSession);
  } else {
    showSessionSetup();
  }
}

async function loadStats() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['dailyStats']);
  const stats = data.dailyStats || {};
  const todayStats = stats[today] || { totalMinutes: 0, sessions: 0 };
  
  document.getElementById('todayTotal').textContent = Math.round(todayStats.totalMinutes);
  document.getElementById('todaySessions').textContent = todayStats.sessions;
}

async function loadSettings() {
  const data = await chrome.storage.local.get(['settings']);
  const settings = data.settings || {
    enableBlur: true,
    enableNudges: true,
    claudeApiKey: ''
  };
  
  document.getElementById('enableBlur').checked = settings.enableBlur;
  document.getElementById('enableNudges').checked = settings.enableNudges;
  document.getElementById('claudeApiKey').value = settings.claudeApiKey || '';
}

async function startSession() {
  const intent = document.getElementById('intentInput').value.trim();
  const timeLimit = parseInt(document.getElementById('timeLimit').value);
  
  if (!intent) {
    alert('Please set an intention for your session');
    return;
  }
  
  const session = {
    active: true,
    intent: intent,
    timeLimit: timeLimit,
    startTime: Date.now(),
    platform: await getCurrentPlatform()
  };
  
  await chrome.storage.local.set({ currentSession: session });
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'SESSION_START', session });
  
  showActiveSession(session);
}

async function endSession() {
  const data = await chrome.storage.local.get(['currentSession']);
  if (data.currentSession) {
    const session = data.currentSession;
    session.active = false;
    session.endTime = Date.now();
    
    // Save to session history
    await saveSessionToHistory(session);
    
    // Clear current session
    await chrome.storage.local.remove('currentSession');
    
    // Notify background script
    chrome.runtime.sendMessage({ type: 'SESSION_END' });
    
    showSessionSetup();
    await loadStats();
  }
}

async function saveSessionToHistory(session) {
  const data = await chrome.storage.local.get(['sessionHistory']);
  const history = data.sessionHistory || [];
  
  const duration = (session.endTime - session.startTime) / 1000 / 60; // minutes
  history.push({
    ...session,
    duration: duration
  });
  
  // Keep last 100 sessions
  if (history.length > 100) {
    history.shift();
  }
  
  await chrome.storage.local.set({ sessionHistory: history });
  
  // Update daily stats
  await updateDailyStats(duration);
}

async function updateDailyStats(duration) {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['dailyStats']);
  const stats = data.dailyStats || {};
  
  if (!stats[today]) {
    stats[today] = { totalMinutes: 0, sessions: 0 };
  }
  
  stats[today].totalMinutes += duration;
  stats[today].sessions += 1;
  
  // Keep only last 30 days
  const dates = Object.keys(stats);
  if (dates.length > 30) {
    const oldestDate = dates.sort()[0];
    delete stats[oldestDate];
  }
  
  await chrome.storage.local.set({ dailyStats: stats });
}

async function getCurrentPlatform() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    const url = tabs[0].url;
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('reddit.com')) return 'reddit';
  }
  return 'unknown';
}

function showSessionSetup() {
  document.getElementById('sessionSetup').style.display = 'block';
  document.getElementById('activeSession').style.display = 'none';
}

function showActiveSession(session) {
  document.getElementById('sessionSetup').style.display = 'none';
  document.getElementById('activeSession').style.display = 'block';
  
  document.getElementById('currentIntent').textContent = session.intent;
  document.getElementById('currentLimit').textContent = session.timeLimit;
  
  updateTimeSpent(session);
}

function updateTimeSpent(session) {
  const elapsed = (Date.now() - session.startTime) / 1000 / 60; // minutes
  const elapsedRounded = Math.round(elapsed);
  const progress = Math.min((elapsed / session.timeLimit) * 100, 100);
  
  document.getElementById('timeSpent').textContent = elapsedRounded;
  document.getElementById('progressFill').style.width = progress + '%';
  
  if (session.active) {
    setTimeout(() => updateTimeSpent(session), 10000); // Update every 10 seconds
  }
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function saveSettings() {
  const settings = {
    enableBlur: document.getElementById('enableBlur').checked,
    enableNudges: document.getElementById('enableNudges').checked,
    claudeApiKey: document.getElementById('claudeApiKey').value
  };
  
  await chrome.storage.local.set({ settings });
  
  // Notify background script of settings change
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATE', settings });
  
  alert('Settings saved!');
}

function updateUI() {
  // Additional UI updates if needed
}
