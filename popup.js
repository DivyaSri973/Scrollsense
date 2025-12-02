// Popup Script for ScrollSense
// Handles popup UI interactions and data display

document.addEventListener('DOMContentLoaded', async () => {
  await loadDailyUsage();
  await loadCurrentSession();
  await loadSuggestions();
  setupEventListeners();
  
  // Update every 5 seconds if session is active
  setInterval(async () => {
    await loadCurrentSession();
  }, 5000);
});

async function loadDailyUsage() {
  const data = await chrome.storage.local.get(['dailyUsage']);
  const dailyUsage = data.dailyUsage || {
    instagram: 0,
    linkedin: 0,
    reddit: 0,
    total: 0
  };
  
  // Update total
  const totalElement = document.getElementById('total-usage');
  if (totalElement) {
    totalElement.textContent = `${dailyUsage.total || 0} min`;
  }
  
  // Update platform breakdown
  const breakdownElement = document.getElementById('platform-breakdown');
  if (breakdownElement) {
    breakdownElement.innerHTML = '';
    
    const platforms = [
      { name: 'instagram', time: dailyUsage.instagram || 0 },
      { name: 'linkedin', time: dailyUsage.linkedin || 0 },
      { name: 'reddit', time: dailyUsage.reddit || 0 }
    ].filter(p => p.time > 0);
    
    if (platforms.length === 0) {
      breakdownElement.innerHTML = '<p style="color: #9ca3af; font-size: 12px; text-align: center; padding: 12px;">No usage today</p>';
    } else {
      platforms.forEach(platform => {
        const item = document.createElement('div');
        item.className = `platform-item ${platform.name}`;
        item.innerHTML = `
          <span class="platform-name">${platform.name}</span>
          <span class="platform-time">${platform.time} min</span>
        `;
        breakdownElement.appendChild(item);
      });
    }
  }
}

async function loadCurrentSession() {
  const data = await chrome.storage.local.get(['currentSession', 'sessionStartTime']);
  const session = data.currentSession;
  const sessionSection = document.getElementById('session-section');
  
  if (session && sessionSection) {
    sessionSection.style.display = 'block';
    
    const startTime = data.sessionStartTime || session.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    
    const platformElement = document.getElementById('session-platform');
    const timeElement = document.getElementById('session-time');
    const intentElement = document.getElementById('session-intent');
    
    if (platformElement) {
      platformElement.textContent = session.platform.toUpperCase();
    }
    
    if (timeElement) {
      timeElement.textContent = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
    }
    
    if (intentElement) {
      intentElement.textContent = `Intended: ${session.intent} min`;
    }
  } else if (sessionSection) {
    sessionSection.style.display = 'none';
  }
}

async function loadSuggestions() {
  // Get adaptive suggestions (would need to be calculated in background)
  const data = await chrome.storage.local.get(['sessions']);
  const sessions = data.sessions || [];
  
  const suggestionsSection = document.getElementById('suggestions-section');
  const suggestionsContent = document.getElementById('suggestions-content');
  
  if (sessions.length >= 5 && suggestionsSection && suggestionsContent) {
    // Calculate average actual time per platform
    const platformStats = {};
    sessions.slice(-20).forEach(session => { // Last 20 sessions
      if (!platformStats[session.platform]) {
        platformStats[session.platform] = [];
      }
      platformStats[session.platform].push(session.actualTime);
    });
    
    const suggestions = [];
    Object.keys(platformStats).forEach(platform => {
      const times = platformStats[platform];
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const currentLimit = data.platformLimits?.[platform] || 10;
      
      if (avgTime > currentLimit * 1.2) {
        suggestions.push({
          platform,
          suggestedLimit: Math.round(avgTime / 5) * 5
        });
      }
    });
    
    if (suggestions.length > 0) {
      suggestionsSection.style.display = 'block';
      suggestionsContent.innerHTML = suggestions.map(s => `
        <div class="suggestion-item">
          <p class="suggestion-text">
            Based on your usage, consider setting ${s.platform} limit to ${s.suggestedLimit} min
          </p>
        </div>
      `).join('');
    } else {
      suggestionsSection.style.display = 'none';
    }
  } else if (suggestionsSection) {
    suggestionsSection.style.display = 'none';
  }
}

function setupEventListeners() {
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // End session button
  const endSessionBtn = document.getElementById('end-session-btn');
  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'endSession' });
          // Also notify background
          const data = await chrome.storage.local.get(['currentSession']);
          if (data.currentSession) {
            const elapsed = Date.now() - (data.currentSession.startTime || Date.now());
            await chrome.runtime.sendMessage({
              action: 'endSession',
              platform: data.currentSession.platform,
              actualTime: elapsed
            });
          }
          await loadDailyUsage();
          await loadCurrentSession();
        } catch (error) {
          console.error('Error ending session:', error);
          // If content script isn't available, just end via background
          const data = await chrome.storage.local.get(['currentSession']);
          if (data.currentSession) {
            const elapsed = Date.now() - (data.currentSession.startTime || Date.now());
            await chrome.runtime.sendMessage({
              action: 'endSession',
              platform: data.currentSession.platform,
              actualTime: elapsed
            });
            await loadDailyUsage();
            await loadCurrentSession();
          }
        }
      }
    });
  }
  
  // View dashboard button
  const viewDashboardBtn = document.getElementById('view-dashboard-btn');
  if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Set goals button
  const setGoalsBtn = document.getElementById('set-goals-btn');
  if (setGoalsBtn) {
    setGoalsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

