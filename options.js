// Options Page Script for ScrollSense
// Handles settings, preferences, and dashboard

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadDashboard();
  await loadGoals();
  await loadLimits();
  await loadPreferences();
  await loadAPISettings();
  setupEventListeners();
});

// Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show target content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Dashboard
async function loadDashboard() {
  const data = await chrome.storage.local.get(['dailyUsage', 'sessions']);
  const dailyUsage = data.dailyUsage || {
    instagram: 0,
    linkedin: 0,
    reddit: 0,
    total: 0
  };
  const sessions = data.sessions || [];
  
  // Update stats
  const totalElement = document.getElementById('dashboard-total');
  const sessionsElement = document.getElementById('dashboard-sessions');
  const platformsElement = document.getElementById('dashboard-platforms');
  
  if (totalElement) {
    totalElement.textContent = `${dailyUsage.total || 0} min`;
  }
  
  if (sessionsElement) {
    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.date).toDateString();
      return sessionDate === new Date().toDateString();
    });
    sessionsElement.textContent = todaySessions.length;
  }
  
  if (platformsElement) {
    const platformsUsed = [
      dailyUsage.instagram > 0 ? 'instagram' : null,
      dailyUsage.linkedin > 0 ? 'linkedin' : null,
      dailyUsage.reddit > 0 ? 'reddit' : null
    ].filter(Boolean).length;
    platformsElement.textContent = platformsUsed;
  }
  
  // Update platform chart
  const chartElement = document.getElementById('platform-chart');
  if (chartElement) {
    const platforms = [
      { name: 'instagram', time: dailyUsage.instagram || 0 },
      { name: 'linkedin', time: dailyUsage.linkedin || 0 },
      { name: 'reddit', time: dailyUsage.reddit || 0 }
    ].filter(p => p.time > 0);
    
    const maxTime = Math.max(...platforms.map(p => p.time), 1);
    
    chartElement.innerHTML = platforms.length > 0
      ? platforms.map(p => `
          <div class="chart-item">
            <span class="chart-label">${p.name}</span>
            <div class="chart-bar-container">
              <div class="chart-bar" style="width: ${(p.time / maxTime) * 100}%"></div>
            </div>
            <span class="chart-value">${p.time} min</span>
          </div>
        `).join('')
      : '<p style="color: #9ca3af; text-align: center; padding: 24px;">No usage data today</p>';
  }
  
  // Update sessions list
  const sessionsListElement = document.getElementById('sessions-list');
  if (sessionsListElement) {
    const recentSessions = sessions.slice(-10).reverse();
    
    if (recentSessions.length === 0) {
      sessionsListElement.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 24px;">No sessions yet</p>';
    } else {
      sessionsListElement.innerHTML = recentSessions.map(session => {
        const date = new Date(session.date);
        return `
          <div class="session-item">
            <div class="session-info">
              <span class="session-platform">${session.platform}</span>
              <span class="session-time">Intended: ${session.intendedTime} min | Actual: ${session.actualTime} min</span>
              <span class="session-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Goals
async function loadGoals() {
  const data = await chrome.storage.local.get(['userGoals']);
  const goals = data.userGoals || [];
  
  const goalsListElement = document.getElementById('goals-list');
  if (goalsListElement) {
    if (goals.length === 0) {
      goalsListElement.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 24px;">No goals set yet</p>';
    } else {
      goalsListElement.innerHTML = goals.map((goal, index) => `
        <div class="goal-item">
          <span class="goal-text">${goal}</span>
          <div class="goal-actions">
            <button class="btn-icon delete-goal" data-index="${index}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
      
      // Add delete listeners
      goalsListElement.querySelectorAll('.delete-goal').forEach(btn => {
        btn.addEventListener('click', async () => {
          const index = parseInt(btn.dataset.index);
          await deleteGoal(index);
        });
      });
    }
  }
}

async function deleteGoal(index) {
  const data = await chrome.storage.local.get(['userGoals']);
  const goals = data.userGoals || [];
  goals.splice(index, 1);
  await chrome.storage.local.set({ userGoals: goals });
  await loadGoals();
}

// Limits
async function loadLimits() {
  const data = await chrome.storage.local.get(['platformLimits', 'preferences']);
  const limits = data.platformLimits || {
    instagram: 10,
    linkedin: 30,
    reddit: 15
  };
  const dailyLimit = data.preferences?.dailyLimit || 120;
  
  const instagramInput = document.getElementById('limit-instagram');
  const linkedinInput = document.getElementById('limit-linkedin');
  const redditInput = document.getElementById('limit-reddit');
  const dailyLimitInput = document.getElementById('daily-limit');
  
  if (instagramInput) instagramInput.value = limits.instagram;
  if (linkedinInput) linkedinInput.value = limits.linkedin;
  if (redditInput) redditInput.value = limits.reddit;
  if (dailyLimitInput) dailyLimitInput.value = dailyLimit;
}

// Preferences
async function loadPreferences() {
  const data = await chrome.storage.local.get(['preferences']);
  const preferences = data.preferences || {
    blurIntensity: 50,
    messageTone: 'encouraging',
    dailyLimit: 120
  };
  
  const blurSlider = document.getElementById('blur-intensity');
  const blurValue = document.getElementById('blur-value');
  const toneRadios = document.querySelectorAll('input[name="message-tone"]');
  
  if (blurSlider) {
    blurSlider.value = preferences.blurIntensity;
    if (blurValue) {
      blurValue.textContent = `${preferences.blurIntensity}%`;
    }
    
    blurSlider.addEventListener('input', (e) => {
      if (blurValue) {
        blurValue.textContent = `${e.target.value}%`;
      }
    });
  }
  
  toneRadios.forEach(radio => {
    if (radio.value === preferences.messageTone) {
      radio.checked = true;
    }
  });
}

// API Settings
async function loadAPISettings() {
  const data = await chrome.storage.local.get(['apiKey']);
  const apiKeyInput = document.getElementById('api-key');
  
  if (apiKeyInput && data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
}

// Event Listeners
function setupEventListeners() {
  // Add goal
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalInputContainer = document.getElementById('goal-input-container');
  const goalInput = document.getElementById('goal-input');
  const saveGoalBtn = document.getElementById('save-goal-btn');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  
  if (addGoalBtn && goalInputContainer) {
    addGoalBtn.addEventListener('click', () => {
      goalInputContainer.style.display = 'block';
      goalInput.focus();
    });
  }
  
  if (saveGoalBtn && goalInput) {
    saveGoalBtn.addEventListener('click', async () => {
      const goalText = goalInput.value.trim();
      if (goalText && goalText.length > 0) {
        const data = await chrome.storage.local.get(['userGoals']);
        const goals = data.userGoals || [];
        if (goals.length < 3) {
          goals.push(goalText);
          await chrome.storage.local.set({ userGoals: goals });
          goalInput.value = '';
          goalInputContainer.style.display = 'none';
          await loadGoals();
        } else {
          alert('You can only set up to 3 goals.');
        }
      }
    });
  }
  
  if (cancelGoalBtn && goalInputContainer) {
    cancelGoalBtn.addEventListener('click', () => {
      goalInput.value = '';
      goalInputContainer.style.display = 'none';
    });
  }
  
  // Save limits
  const saveLimitsBtn = document.getElementById('save-limits-btn');
  if (saveLimitsBtn) {
    saveLimitsBtn.addEventListener('click', async () => {
      const instagramLimit = parseInt(document.getElementById('limit-instagram').value);
      const linkedinLimit = parseInt(document.getElementById('limit-linkedin').value);
      const redditLimit = parseInt(document.getElementById('limit-reddit').value);
      const dailyLimit = parseInt(document.getElementById('daily-limit').value);
      
      await chrome.storage.local.set({
        platformLimits: {
          instagram: instagramLimit,
          linkedin: linkedinLimit,
          reddit: redditLimit
        },
        preferences: {
          ...(await chrome.storage.local.get(['preferences'])).preferences,
          dailyLimit: dailyLimit
        }
      });
      
      showNotification('Limits saved successfully!');
    });
  }
  
  // Save preferences
  const savePreferencesBtn = document.getElementById('save-preferences-btn');
  if (savePreferencesBtn) {
    savePreferencesBtn.addEventListener('click', async () => {
      const blurIntensity = parseInt(document.getElementById('blur-intensity').value);
      const messageTone = document.querySelector('input[name="message-tone"]:checked').value;
      
      const data = await chrome.storage.local.get(['preferences']);
      await chrome.storage.local.set({
        preferences: {
          ...data.preferences,
          blurIntensity: blurIntensity,
          messageTone: messageTone
        }
      });
      
      showNotification('Preferences saved successfully!');
    });
  }
  
  // Save API key
  const saveAPIBtn = document.getElementById('save-api-btn');
  if (saveAPIBtn) {
    saveAPIBtn.addEventListener('click', async () => {
      const apiKey = document.getElementById('api-key').value.trim();
      const apiStatus = document.getElementById('api-status');
      const statusMessage = apiStatus.querySelector('.status-message');
      
      if (apiKey) {
        await chrome.storage.local.set({ apiKey: apiKey });
        apiStatus.style.display = 'block';
        apiStatus.className = 'api-status success';
        statusMessage.textContent = 'API key saved successfully!';
      } else {
        await chrome.storage.local.remove('apiKey');
        apiStatus.style.display = 'block';
        apiStatus.className = 'api-status success';
        statusMessage.textContent = 'API key removed. Using fallback messages.';
      }
    });
  }
}

function showNotification(message) {
  // Simple notification (could be enhanced with a toast library)
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

