/**
 * ============================================================================
 * SCROLLSENSE - Popup Script
 * ============================================================================
 * 
 * This file handles the extension popup UI that appears when users click
 * the ScrollSense icon in the Chrome toolbar.
 * 
 * FEATURES:
 * 1. Daily usage summary display
 * 2. Current session status and timer
 * 3. Platform breakdown visualization
 * 4. Adaptive suggestions based on usage patterns
 * 5. Quick actions (end session, view dashboard, set goals)
 * 
 * UI COMPONENTS:
 * - Usage stats section: Shows total time and per-platform breakdown
 * - Session section: Shows current active session with timer
 * - Actions section: Quick access buttons
 * - Suggestions section: AI-powered recommendations (when available)
 * 
 * DATA FLOW:
 * - Reads from chrome.storage.local
 * - Sends messages to content.js to end sessions
 * - Opens options page for detailed settings
 * 
 * @author ScrollSense Team
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize popup when DOM is ready
 * Loads all data and sets up event listeners
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadDailyUsage();
  await loadCurrentSession();
  await loadSuggestions();
  setupEventListeners();
  
  // Auto-refresh session status every 5 seconds
  // This keeps the timer updated without manual refresh
  setInterval(async () => {
    await loadCurrentSession();
  }, 5000);
});

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

/**
 * Load and display today's usage statistics
 * Shows total time and per-platform breakdown
 */
async function loadDailyUsage() {
  const data = await chrome.storage.local.get(['dailyUsage']);
  const dailyUsage = data.dailyUsage || {
    instagram: 0,
    linkedin: 0,
    reddit: 0,
    total: 0
  };
  
  // Update total usage display
  const totalElement = document.getElementById('total-usage');
  if (totalElement) {
    totalElement.textContent = `${dailyUsage.total || 0} min`;
  }
  
  // Update platform breakdown display
  const breakdownElement = document.getElementById('platform-breakdown');
  if (breakdownElement) {
    breakdownElement.innerHTML = '';
    
    // Filter to only platforms with usage today
    const platforms = [
      { name: 'instagram', time: dailyUsage.instagram || 0 },
      { name: 'linkedin', time: dailyUsage.linkedin || 0 },
      { name: 'reddit', time: dailyUsage.reddit || 0 }
    ].filter(p => p.time > 0);
    
    // Show message if no usage, otherwise show platform breakdown
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

/**
 * Load and display current session status
 * Shows platform, elapsed time, and intended time
 * Hides section if no active session
 */
async function loadCurrentSession() {
  const data = await chrome.storage.local.get(['currentSession', 'sessionStartTime']);
  const session = data.currentSession;
  const sessionSection = document.getElementById('session-section');
  
  if (session && sessionSection) {
    // Show session section
    sessionSection.style.display = 'block';
    
    // Calculate elapsed time
    const startTime = data.sessionStartTime || session.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    
    // Update UI elements
    const platformElement = document.getElementById('session-platform');
    const timeElement = document.getElementById('session-time');
    const intentElement = document.getElementById('session-intent');
    
    if (platformElement) {
      platformElement.textContent = session.platform.toUpperCase();
    }
    
    if (timeElement) {
      // Format as MM:SS
      timeElement.textContent = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
    }
    
    if (intentElement) {
      intentElement.textContent = `Intended: ${session.intent} min`;
    }
  } else if (sessionSection) {
    // Hide session section when no active session
    sessionSection.style.display = 'none';
  }
}

/**
 * Load and display adaptive suggestions
 * Only shows suggestions if user has 5+ sessions
 * Suggests adjusted limits based on actual usage patterns
 */
async function loadSuggestions() {
  const data = await chrome.storage.local.get(['sessions']);
  const sessions = data.sessions || [];
  
  const suggestionsSection = document.getElementById('suggestions-section');
  const suggestionsContent = document.getElementById('suggestions-content');
  
  // Only show suggestions if we have enough data
  if (sessions.length >= 5 && suggestionsSection && suggestionsContent) {
    // Calculate average actual time per platform from last 20 sessions
    const platformStats = {};
    sessions.slice(-20).forEach(session => {
      if (!platformStats[session.platform]) {
        platformStats[session.platform] = [];
      }
      platformStats[session.platform].push(session.actualTime);
    });
    
    // Generate suggestions for platforms where user exceeds limits by 20%+
    const suggestions = [];
    Object.keys(platformStats).forEach(platform => {
      const times = platformStats[platform];
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const currentLimit = data.platformLimits?.[platform] || 10;
      
      // Only suggest if user consistently exceeds by 20%
      if (avgTime > currentLimit * 1.2) {
        suggestions.push({
          platform,
          suggestedLimit: Math.round(avgTime / 5) * 5 // Round to nearest 5
        });
      }
    });
    
    // Display suggestions if any
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

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Set up all event listeners for popup buttons
 */
function setupEventListeners() {
  // Settings button - Opens full options page
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // End session button - Ends current session via content script
  const endSessionBtn = document.getElementById('end-session-btn');
  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        try {
          // Try to end session via content script
          await chrome.tabs.sendMessage(tab.id, { action: 'endSession' });
          
          // Also notify background to update storage
          const data = await chrome.storage.local.get(['currentSession']);
          if (data.currentSession) {
            const elapsed = Date.now() - (data.currentSession.startTime || Date.now());
            await chrome.runtime.sendMessage({
              action: 'endSession',
              platform: data.currentSession.platform,
              actualTime: elapsed
            });
          }
          
          // Refresh popup display
          await loadDailyUsage();
          await loadCurrentSession();
        } catch (error) {
          console.error('Error ending session:', error);
          
          // Fallback: End session via background if content script unavailable
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
  
  // View dashboard button - Opens options page to dashboard tab
  const viewDashboardBtn = document.getElementById('view-dashboard-btn');
  if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Set goals button - Opens options page (for goal setting)
  const setGoalsBtn = document.getElementById('set-goals-btn');
  if (setGoalsBtn) {
    setGoalsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
}
