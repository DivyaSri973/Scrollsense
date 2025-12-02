// Content Script for ScrollSense
// Handles UI overlays, progressive blur, and session tracking

let sessionTimer = null;
let blurOverlay = null;
let intentPrompt = null;
let nudgeModal = null;
let currentSession = null;
let platform = null;
let hiddenTime = 0; // Total time the tab has been hidden
let hiddenStartTime = null; // When the tab was hidden
let floatingTimer = null; // Floating timer display element
let timerPopup = null; // Popup showing usage details
let currentElapsed = 0; // Track current elapsed time for popup
let miniPrompt = null; // Less intrusive prompt for returning users

// Initialize on page load
(async function init() {
  platform = detectPlatform();
  if (!platform) return;
  
  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExtension);
  } else {
    setupExtension();
  }
  
  // Listen for tab visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);
})();

// Handle tab visibility changes - pause/resume timer
function handleVisibilityChange() {
  if (document.hidden) {
    // Tab is now hidden - pause the timer
    // Clear the interval timer if running
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    // Track hidden time if there's an active session
    if (currentSession && !hiddenStartTime) {
      hiddenStartTime = Date.now();
    }
    // Hide floating timer when tab is hidden
    if (floatingTimer) {
      floatingTimer.style.display = 'none';
    }
  } else {
    // Tab is now visible - resume the timer
    // Calculate how long the tab was hidden
    if (hiddenStartTime && currentSession) {
      hiddenTime += Date.now() - hiddenStartTime;
      hiddenStartTime = null;
    }
    // Show floating timer again
    if (floatingTimer) {
      floatingTimer.style.display = 'block';
    }
    // Resume timer if we have an active session
    if (currentSession && !sessionTimer) {
      startSessionTimer();
    }
  }
}

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('reddit.com')) return 'reddit';
  return null;
}

async function setupExtension() {
  // Check if session already started
  const data = await chrome.storage.local.get(['currentSession', 'currentPlatform', 'skipUntil']);
  
  if (data.currentSession && data.currentPlatform === platform) {
    // Resume existing session
    currentSession = data.currentSession;
    
    // If tab is already hidden, start tracking hidden time
    if (document.hidden) {
      hiddenStartTime = Date.now();
    } else {
      startSessionTimer();
    }
  } else {
    // Check if user has skipped
    const skipUntil = data.skipUntil?.[platform];
    const now = Date.now();
    
    if (skipUntil && now < skipUntil) {
      // User has skipped, don't show anything for now
      // But show mini prompt after a short delay
      setTimeout(() => {
        showMiniPrompt();
      }, 3000);
    } else {
      // Show full intent prompt
      showIntentPrompt();
    }
  }
  
  // Listen for messages from background and popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sessionStarted') {
      currentSession = request.session;
      // Reset hidden time tracking
      hiddenTime = 0;
      hiddenStartTime = null;
      
      // Only start timer if tab is visible
      if (document.hidden) {
        hiddenStartTime = Date.now();
      } else {
        startSessionTimer();
      }
      sendResponse({ success: true });
    }
    
    if (request.action === 'endSession') {
      endSession().then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep channel open for async
    }
    
    return true;
  });
}

function showIntentPrompt() {
  // Remove any existing prompt or mini prompt
  if (intentPrompt) {
    intentPrompt.remove();
  }
  if (miniPrompt) {
    miniPrompt.remove();
    miniPrompt = null;
  }
  
  intentPrompt = document.createElement('div');
  intentPrompt.id = 'scrollsense-intent-prompt';
  intentPrompt.innerHTML = `
    <div class="scrollsense-modal-content">
      <h2>What's your intention for this session?</h2>
      <p class="scrollsense-subtitle">Setting an intention helps you stay mindful</p>
      <div class="scrollsense-intent-options">
        <button class="scrollsense-intent-btn" data-minutes="1">
          <span class="scrollsense-intent-time">1 min</span>
          <span class="scrollsense-intent-label">Quick check</span>
        </button>
        <button class="scrollsense-intent-btn" data-minutes="2">
          <span class="scrollsense-intent-time">2 min</span>
          <span class="scrollsense-intent-label">Specific task</span>
        </button>
        <button class="scrollsense-intent-btn" data-minutes="5">
          <span class="scrollsense-intent-time">5 min</span>
          <span class="scrollsense-intent-label">Browsing time</span>
        </button>
      </div>
      <div class="scrollsense-skip-options">
        <button class="scrollsense-skip-btn" data-skip="now">Skip for now</button>
        <button class="scrollsense-skip-btn" data-skip="hour">Skip for 1 hour</button>
        <button class="scrollsense-skip-btn" data-skip="today">Skip for today</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(intentPrompt);
  
  // Add event listeners for intent buttons
  intentPrompt.querySelectorAll('.scrollsense-intent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      startSessionWithIntent(minutes);
    });
  });
  
  // Add event listeners for skip buttons
  intentPrompt.querySelectorAll('.scrollsense-skip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const skipType = btn.dataset.skip;
      await handleSkip(skipType);
      intentPrompt.remove();
      intentPrompt = null;
    });
  });
}

// Handle skip with different durations
async function handleSkip(skipType) {
  const now = Date.now();
  let skipUntil;
  
  switch (skipType) {
    case 'hour':
      skipUntil = now + (60 * 60 * 1000); // 1 hour
      break;
    case 'today':
      // Skip until end of today (midnight)
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      skipUntil = tomorrow.getTime();
      break;
    case 'now':
    default:
      skipUntil = now + (5 * 60 * 1000); // 5 minutes for "skip for now"
      break;
  }
  
  // Save skip preference
  const data = await chrome.storage.local.get(['skipUntil']);
  const skipData = data.skipUntil || {};
  skipData[platform] = skipUntil;
  await chrome.storage.local.set({ skipUntil: skipData });
}

// Show a less intrusive mini prompt for returning users
function showMiniPrompt() {
  // Don't show if there's already a session or other prompts
  if (currentSession || intentPrompt || miniPrompt) return;
  
  miniPrompt = document.createElement('div');
  miniPrompt.id = 'scrollsense-mini-prompt';
  miniPrompt.innerHTML = `
    <div class="scrollsense-mini-content">
      <span class="scrollsense-mini-icon">⏱️</span>
      <span class="scrollsense-mini-text">Want to set a time limit?</span>
      <button class="scrollsense-mini-btn scrollsense-mini-yes">Yes</button>
      <button class="scrollsense-mini-btn scrollsense-mini-no">Not now</button>
      <button class="scrollsense-mini-close">×</button>
    </div>
  `;
  
  document.body.appendChild(miniPrompt);
  
  // Add event listeners
  miniPrompt.querySelector('.scrollsense-mini-yes').addEventListener('click', async () => {
    // Clear skip preference and show full prompt
    const data = await chrome.storage.local.get(['skipUntil']);
    const skipData = data.skipUntil || {};
    delete skipData[platform];
    await chrome.storage.local.set({ skipUntil: skipData });
    
    miniPrompt.remove();
    miniPrompt = null;
    showIntentPrompt();
  });
  
  miniPrompt.querySelector('.scrollsense-mini-no').addEventListener('click', async () => {
    // Extend skip by 30 minutes
    const skipUntil = Date.now() + (30 * 60 * 1000);
    const data = await chrome.storage.local.get(['skipUntil']);
    const skipData = data.skipUntil || {};
    skipData[platform] = skipUntil;
    await chrome.storage.local.set({ skipUntil: skipData });
    
    miniPrompt.remove();
    miniPrompt = null;
  });
  
  miniPrompt.querySelector('.scrollsense-mini-close').addEventListener('click', () => {
    miniPrompt.remove();
    miniPrompt = null;
  });
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (miniPrompt) {
      miniPrompt.classList.add('scrollsense-mini-fadeout');
      setTimeout(() => {
        if (miniPrompt) {
          miniPrompt.remove();
          miniPrompt = null;
        }
      }, 300);
    }
  }, 10000);
}

async function startSessionWithIntent(minutes) {
  if (intentPrompt) {
    intentPrompt.remove();
    intentPrompt = null;
  }
  
  // Send message to background to start session
  const response = await chrome.runtime.sendMessage({
    action: 'startSession',
    intent: minutes,
    platform: platform
  });
  
  if (response && response.success) {
    // Reset hidden time tracking for new session
    hiddenTime = 0;
    hiddenStartTime = null;
    
    currentSession = {
      platform: platform,
      intent: minutes,
      startTime: Date.now(),
      intendedTime: minutes * 60000
    };
    
    // Only start timer if tab is visible, otherwise track hidden time
    if (document.hidden) {
      hiddenStartTime = Date.now();
    } else {
      startSessionTimer();
    }
  }
}

function startSessionTimer() {
  if (!currentSession) return;
  
  // Don't start timer if tab is hidden
  if (document.hidden) return;
  
  // Clear existing timer
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }
  
  const startTime = currentSession.startTime || Date.now();
  
  // Show floating timer
  showFloatingTimer();
  
  // Update timer every second
  sessionTimer = setInterval(async () => {
    // Read intendedTime from currentSession each tick (so it updates when extended)
    const intendedTime = currentSession ? currentSession.intendedTime : 0;
    
    // Calculate elapsed time excluding hidden time
    const elapsed = Date.now() - startTime - hiddenTime;
    const elapsedMinutes = elapsed / 60000;
    const intendedMinutes = intendedTime / 60000;
    
    // Update floating timer display
    updateFloatingTimer(elapsed, intendedTime);
    
    // Show nudge if over intended time
    if (elapsed > intendedTime && !nudgeModal) {
      await showNudge(elapsedMinutes, intendedMinutes);
    }
    
    // Progressive blur after intended time
    if (elapsed > intendedTime) {
      const overTime = elapsed - intendedTime;
      const blurPercent = Math.min(50, (overTime / (intendedTime * 0.5)) * 50); // Max 50% blur over 50% of intended time
      applyProgressiveBlur(blurPercent);
    }
  }, 1000);
}

// Format time in mm:ss or hh:mm:ss format
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Show floating timer on the right side of the screen
function showFloatingTimer() {
  if (floatingTimer) return; // Already showing
  
  floatingTimer = document.createElement('div');
  floatingTimer.id = 'scrollsense-floating-timer';
  floatingTimer.innerHTML = `
    <span class="scrollsense-timer-time">0:00</span>
  `;
  
  // Add click handler to show usage popup
  floatingTimer.addEventListener('click', toggleTimerPopup);
  
  document.body.appendChild(floatingTimer);
}

// Format time as "X min" for daily usage display
function formatMinutes(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) {
    const seconds = Math.floor(ms / 1000);
    return `${seconds} sec`;
  }
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${totalMinutes} min`;
}

// Toggle the timer usage popup
async function toggleTimerPopup() {
  if (timerPopup) {
    hideTimerPopup();
    return;
  }
  
  // Get today's usage from storage
  const data = await chrome.storage.local.get(['dailyUsage']);
  let dailyUsage = data.dailyUsage || { instagram: 0, linkedin: 0, reddit: 0, total: 0 };
  
  // Calculate current session time (currentElapsed is in milliseconds)
  const sessionTime = formatTime(currentElapsed);
  const intendedTime = currentSession ? formatTime(currentSession.intendedTime) : '0:00';
  
  // Get stored usage in minutes - check for corrupted data (> 24 hours = 1440 minutes is likely corrupted)
  let storedPlatformMinutes = Number(dailyUsage[platform]) || 0;
  let storedTotalMinutes = Number(dailyUsage.total) || 0;
  
  // If data seems corrupted (more than 24 hours), reset it
  if (storedPlatformMinutes > 1440 || storedTotalMinutes > 1440) {
    // Reset corrupted daily usage
    dailyUsage = {
      lastReset: new Date().toDateString(),
      instagram: 0,
      linkedin: 0,
      reddit: 0,
      total: 0
    };
    await chrome.storage.local.set({ dailyUsage });
    storedPlatformMinutes = 0;
    storedTotalMinutes = 0;
  }
  
  // Platform usage today = stored minutes (as ms) + current session elapsed
  const platformTodayMs = (storedPlatformMinutes * 60000) + currentElapsed;
  const platformToday = formatMinutes(platformTodayMs);
  
  // Total usage today = stored total (as ms) + current session elapsed  
  const todayTotalMs = (storedTotalMinutes * 60000) + currentElapsed;
  const todayTotal = formatMinutes(todayTotalMs);
  
  // Get platform-specific usage
  const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown';
  
  timerPopup = document.createElement('div');
  timerPopup.id = 'scrollsense-timer-popup';
  timerPopup.innerHTML = `
    <div class="scrollsense-popup-header">
      <span class="scrollsense-popup-title">📊 Usage Stats</span>
      <button class="scrollsense-popup-close" id="scrollsense-popup-close">×</button>
    </div>
    <div class="scrollsense-popup-content">
      <div class="scrollsense-popup-section">
        <div class="scrollsense-popup-label">Current Session</div>
        <div class="scrollsense-popup-row">
          <span>Time spent</span>
          <span class="scrollsense-popup-value">${sessionTime}</span>
        </div>
        <div class="scrollsense-popup-row">
          <span>Intended</span>
          <span class="scrollsense-popup-value scrollsense-popup-intended">${intendedTime}</span>
        </div>
      </div>
      <div class="scrollsense-popup-divider"></div>
      <div class="scrollsense-popup-section">
        <div class="scrollsense-popup-label">Today's Usage</div>
        <div class="scrollsense-popup-row">
          <span>${platformName}</span>
          <span class="scrollsense-popup-value">${platformToday}</span>
        </div>
        <div class="scrollsense-popup-row">
          <span>All platforms</span>
          <span class="scrollsense-popup-value scrollsense-popup-total">${todayTotal}</span>
        </div>
      </div>
    </div>
    <button class="scrollsense-popup-end-btn" id="scrollsense-popup-end">End Session</button>
  `;
  
  document.body.appendChild(timerPopup);
  
  // Add event listeners
  timerPopup.querySelector('#scrollsense-popup-close').addEventListener('click', (e) => {
    e.stopPropagation();
    hideTimerPopup();
  });
  
  timerPopup.querySelector('#scrollsense-popup-end').addEventListener('click', async (e) => {
    e.stopPropagation();
    hideTimerPopup();
    await endSession();
  });
  
  // Close popup when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closePopupOnOutsideClick);
  }, 100);
}

// Close popup when clicking outside
function closePopupOnOutsideClick(e) {
  if (timerPopup && !timerPopup.contains(e.target) && !floatingTimer.contains(e.target)) {
    hideTimerPopup();
  }
}

// Hide the timer popup
function hideTimerPopup() {
  if (timerPopup) {
    timerPopup.remove();
    timerPopup = null;
    document.removeEventListener('click', closePopupOnOutsideClick);
  }
}

// Update the floating timer display
function updateFloatingTimer(elapsed, intendedTime) {
  if (!floatingTimer) return;
  
  // Track current elapsed time for popup
  currentElapsed = elapsed;
  
  const timeDisplay = floatingTimer.querySelector('.scrollsense-timer-time');
  if (timeDisplay) {
    timeDisplay.textContent = formatTime(elapsed);
  }
  
  // Change color if over intended time
  if (elapsed > intendedTime) {
    floatingTimer.classList.add('scrollsense-timer-overtime');
  } else {
    floatingTimer.classList.remove('scrollsense-timer-overtime');
  }
  
  // Update popup if it's open
  updateTimerPopup(elapsed, intendedTime);
}

// Update the popup with current values if it's open
async function updateTimerPopup(elapsed, intendedTime) {
  if (!timerPopup) return;
  
  const sessionTimeEl = timerPopup.querySelector('.scrollsense-popup-row:first-child .scrollsense-popup-value');
  if (sessionTimeEl) {
    sessionTimeEl.textContent = formatTime(elapsed);
  }
}

// Hide floating timer
function hideFloatingTimer() {
  // Also hide popup if open
  hideTimerPopup();
  
  if (floatingTimer) {
    floatingTimer.remove();
    floatingTimer = null;
  }
  
  // Reset elapsed time
  currentElapsed = 0;
}

function applyProgressiveBlur(percent) {
  if (!blurOverlay) {
    blurOverlay = document.createElement('div');
    blurOverlay.id = 'scrollsense-blur-overlay';
    document.body.appendChild(blurOverlay);
  }
  
  blurOverlay.style.opacity = percent / 100;
}

async function showNudge(actualTime, intendedTime) {
  // Get user goals and preferences
  const data = await chrome.storage.local.get(['userGoals', 'preferences']);
  const userGoal = data.userGoals && data.userGoals.length > 0 
    ? data.userGoals[0] 
    : 'managing your time';
  const tone = data.preferences?.messageTone || 'encouraging';
  
  // Get AI nudge
  const nudgeText = await chrome.runtime.sendMessage({
    action: 'getAINudge',
    intendedTime: Math.round(intendedTime),
    actualTime: Math.round(actualTime),
    userGoal: userGoal,
    tone: tone
  });
  
  // Create nudge modal
  nudgeModal = document.createElement('div');
  nudgeModal.id = 'scrollsense-nudge-modal';
  nudgeModal.innerHTML = `
    <div class="scrollsense-modal-content scrollsense-nudge-content">
      <p class="scrollsense-nudge-text">${nudgeText}</p>
      <div class="scrollsense-nudge-actions">
        <button class="scrollsense-btn scrollsense-btn-primary" id="scrollsense-done-btn">Done for now</button>
        <button class="scrollsense-btn scrollsense-btn-secondary" id="scrollsense-continue-btn">Continue 10 more min</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(nudgeModal);
  
  // Add event listeners
  nudgeModal.querySelector('#scrollsense-done-btn').addEventListener('click', async () => {
    await endSession();
  });
  
  nudgeModal.querySelector('#scrollsense-continue-btn').addEventListener('click', () => {
    // Extend session by 10 minutes
    if (currentSession) {
      currentSession.intendedTime += 10 * 60000;
      nudgeModal.remove();
      nudgeModal = null;
      // Remove blur temporarily
      if (blurOverlay) {
        blurOverlay.style.opacity = '0';
      }
    }
  });
}

async function endSession() {
  if (!currentSession) return;
  
  // Calculate elapsed time excluding hidden time
  const elapsed = Date.now() - (currentSession.startTime || Date.now()) - hiddenTime;
  const actualTime = elapsed;
  
  // Send message to background
  await chrome.runtime.sendMessage({
    action: 'endSession',
    platform: platform,
    actualTime: actualTime
  });
  
  // Clean up
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
  
  if (blurOverlay) {
    blurOverlay.remove();
    blurOverlay = null;
  }
  
  if (nudgeModal) {
    nudgeModal.remove();
    nudgeModal = null;
  }
  
  // Hide floating timer
  hideFloatingTimer();
  
  currentSession = null;
  
  // Reset hidden time tracking
  hiddenTime = 0;
  hiddenStartTime = null;
  
  // Show completion message
  showCompletionMessage();
}

function showCompletionMessage() {
  const completionMsg = document.createElement('div');
  completionMsg.id = 'scrollsense-completion';
  completionMsg.innerHTML = `
    <div class="scrollsense-modal-content scrollsense-completion-content">
      <p>Great job staying mindful! 🎉</p>
    </div>
  `;
  
  document.body.appendChild(completionMsg);
  
  setTimeout(() => {
    completionMsg.remove();
    // Show intent prompt again for new session
    showIntentPrompt();
  }, 2000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }
});

