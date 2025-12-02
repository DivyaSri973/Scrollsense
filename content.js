// Content Script for ScrollSense
// Handles UI overlays, progressive blur, and session tracking

let sessionTimer = null;
let blurOverlay = null;
let intentPrompt = null;
let nudgeModal = null;
let currentSession = null;
let platform = null;

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
})();

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('reddit.com')) return 'reddit';
  return null;
}

async function setupExtension() {
  // Check if session already started
  const data = await chrome.storage.local.get(['currentSession', 'currentPlatform']);
  
  if (data.currentSession && data.currentPlatform === platform) {
    // Resume existing session
    currentSession = data.currentSession;
    startSessionTimer();
  } else {
    // Show intent prompt
    showIntentPrompt();
  }
  
  // Listen for messages from background and popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sessionStarted') {
      currentSession = request.session;
      startSessionTimer();
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
  // Remove any existing prompt
  if (intentPrompt) {
    intentPrompt.remove();
  }
  
  intentPrompt = document.createElement('div');
  intentPrompt.id = 'scrollsense-intent-prompt';
  intentPrompt.innerHTML = `
    <div class="scrollsense-modal-content">
      <h2>What's your intention for this session?</h2>
      <p class="scrollsense-subtitle">Setting an intention helps you stay mindful</p>
      <div class="scrollsense-intent-options">
        <button class="scrollsense-intent-btn" data-minutes="5">
          <span class="scrollsense-intent-time">5 min</span>
          <span class="scrollsense-intent-label">Quick check</span>
        </button>
        <button class="scrollsense-intent-btn" data-minutes="15">
          <span class="scrollsense-intent-time">15 min</span>
          <span class="scrollsense-intent-label">Specific task</span>
        </button>
        <button class="scrollsense-intent-btn" data-minutes="30">
          <span class="scrollsense-intent-time">30 min</span>
          <span class="scrollsense-intent-label">Browsing time</span>
        </button>
      </div>
      <button class="scrollsense-skip-btn" id="scrollsense-skip">Skip for now</button>
    </div>
  `;
  
  document.body.appendChild(intentPrompt);
  
  // Add event listeners
  intentPrompt.querySelectorAll('.scrollsense-intent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      startSessionWithIntent(minutes);
    });
  });
  
  intentPrompt.querySelector('#scrollsense-skip').addEventListener('click', () => {
    intentPrompt.remove();
    intentPrompt = null;
  });
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
    currentSession = {
      platform: platform,
      intent: minutes,
      startTime: Date.now(),
      intendedTime: minutes * 60000
    };
    
    startSessionTimer();
  }
}

function startSessionTimer() {
  if (!currentSession) return;
  
  // Clear existing timer
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }
  
  const intendedTime = currentSession.intendedTime;
  const startTime = currentSession.startTime || Date.now();
  
  // Update timer every second
  sessionTimer = setInterval(async () => {
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = elapsed / 60000;
    const intendedMinutes = intendedTime / 60000;
    
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
  
  const elapsed = Date.now() - (currentSession.startTime || Date.now());
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
  
  currentSession = null;
  
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
  }, 2000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }
});

