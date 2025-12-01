// Content script for ScrollSense - runs on Instagram, LinkedIn, Reddit
console.log('ScrollSense content script loaded');

let currentSession = null;
let settings = {};
let blurLevel = 0;
let nudgeShown = false;
let lastActivityTime = Date.now();

// Initialize
init();

function init() {
  console.log('Initializing ScrollSense on:', window.location.hostname);
  
  // Request current session from background
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
    if (response && response.session) {
      currentSession = response.session;
      settings = response.settings;
      if (currentSession.active) {
        startMonitoring();
      }
    }
  });
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Track user activity
  trackActivity();
}

function handleMessage(message, sender, sendResponse) {
  console.log('Content script received:', message.type);
  
  switch (message.type) {
    case 'SESSION_ACTIVE':
      currentSession = message.session;
      settings = message.settings;
      nudgeShown = false;
      blurLevel = 0;
      startMonitoring();
      break;
    case 'SESSION_ENDED':
      currentSession = null;
      stopMonitoring();
      break;
    case 'TIME_EXCEEDED':
      handleTimeExceeded();
      break;
  }
}

function startMonitoring() {
  console.log('Starting session monitoring');
  
  // Update blur and check for nudges every 30 seconds
  const monitorInterval = setInterval(() => {
    if (!currentSession || !currentSession.active) {
      clearInterval(monitorInterval);
      return;
    }
    
    updateBlurOverlay();
    checkForNudge();
  }, 30000); // 30 seconds
  
  // Initial check after 1 second
  setTimeout(() => {
    updateBlurOverlay();
  }, 1000);
}

function stopMonitoring() {
  console.log('Stopping session monitoring');
  removeBlurOverlay();
  removeNudge();
  blurLevel = 0;
  nudgeShown = false;
}

function updateBlurOverlay() {
  if (!settings.enableBlur || !currentSession) return;
  
  const elapsed = (Date.now() - currentSession.startTime) / 1000 / 60; // minutes
  const timeLimit = currentSession.timeLimit;
  
  // Progressive blur starts at 80% of time limit
  const blurThreshold = timeLimit * 0.8;
  
  if (elapsed < blurThreshold) {
    removeBlurOverlay();
    return;
  }
  
  // Calculate blur level (0-10)
  // Blur starts at 80% (blurThreshold) and reaches max at 130% (0.8 + 0.5 = 1.3x)
  const overTime = elapsed - blurThreshold;
  const maxBlurTime = timeLimit * 0.5; // 0.5x gives us the range from 80% to 130%
  blurLevel = Math.min(10, (overTime / maxBlurTime) * 10);
  
  applyBlurOverlay();
}

function applyBlurOverlay() {
  let overlay = document.getElementById('scrollsense-blur-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scrollsense-blur-overlay';
    overlay.className = 'scrollsense-overlay';
    document.body.appendChild(overlay);
  }
  
  // Apply progressive blur using backdrop-filter
  const blurAmount = blurLevel * 0.5; // 0 to 5px
  const opacity = blurLevel * 0.05; // 0 to 0.5
  
  overlay.style.backdropFilter = `blur(${blurAmount}px)`;
  overlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  overlay.style.pointerEvents = 'none'; // Don't block interactions
}

function removeBlurOverlay() {
  const overlay = document.getElementById('scrollsense-blur-overlay');
  if (overlay) {
    overlay.remove();
  }
}

async function checkForNudge() {
  if (!settings.enableNudges || !currentSession || nudgeShown) return;
  
  const elapsed = (Date.now() - currentSession.startTime) / 1000 / 60; // minutes
  const timeLimit = currentSession.timeLimit;
  
  // Show nudge when time limit is exceeded
  if (elapsed > timeLimit) {
    nudgeShown = true;
    await showNudge();
  }
}

async function showNudge() {
  // Get session history to personalize
  const data = await chrome.storage.local.get(['sessionHistory']);
  const sessionCount = data.sessionHistory ? data.sessionHistory.length : 0;
  
  const elapsed = Math.round((Date.now() - currentSession.startTime) / 1000 / 60);
  const platform = detectCurrentPlatform();
  
  // Request AI-generated nudge from background
  chrome.runtime.sendMessage({
    type: 'REQUEST_NUDGE',
    data: {
      intent: currentSession.intent,
      timeLimit: currentSession.timeLimit,
      timeSpent: elapsed,
      platform: platform,
      sessionCount: sessionCount
    }
  }, (response) => {
    if (response) {
      displayNudge(response.message);
    }
  });
}

function displayNudge(message) {
  // Remove existing nudge if any
  removeNudge();
  
  const nudge = document.createElement('div');
  nudge.id = 'scrollsense-nudge';
  nudge.className = 'scrollsense-nudge';
  
  nudge.innerHTML = `
    <div class="scrollsense-nudge-content">
      <div class="scrollsense-nudge-icon">🧘</div>
      <div class="scrollsense-nudge-message">${escapeHtml(message)}</div>
      <div class="scrollsense-nudge-actions">
        <button class="scrollsense-nudge-btn" id="scrollsense-nudge-reflect">Reflect</button>
        <button class="scrollsense-nudge-btn-secondary" id="scrollsense-nudge-dismiss">Dismiss</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(nudge);
  
  // Add event listeners
  document.getElementById('scrollsense-nudge-reflect').addEventListener('click', () => {
    showReflectionPrompt();
  });
  
  document.getElementById('scrollsense-nudge-dismiss').addEventListener('click', () => {
    removeNudge();
  });
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    removeNudge();
  }, 30000);
}

function showReflectionPrompt() {
  removeNudge();
  
  const reflection = document.createElement('div');
  reflection.id = 'scrollsense-reflection';
  reflection.className = 'scrollsense-nudge';
  
  reflection.innerHTML = `
    <div class="scrollsense-nudge-content">
      <div class="scrollsense-nudge-icon">💭</div>
      <div class="scrollsense-nudge-message">
        <p><strong>Your intention was:</strong><br>${escapeHtml(currentSession.intent)}</p>
        <p style="margin-top: 8px;">Did you accomplish what you set out to do?</p>
      </div>
      <div class="scrollsense-nudge-actions">
        <button class="scrollsense-nudge-btn" id="scrollsense-reflection-done">Yes, I'm done</button>
        <button class="scrollsense-nudge-btn-secondary" id="scrollsense-reflection-continue">Continue</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(reflection);
  
  document.getElementById('scrollsense-reflection-done').addEventListener('click', () => {
    reflection.remove();
    // User can manually end session from popup
  });
  
  document.getElementById('scrollsense-reflection-continue').addEventListener('click', () => {
    reflection.remove();
  });
}

function removeNudge() {
  const nudge = document.getElementById('scrollsense-nudge');
  if (nudge) nudge.remove();
  
  const reflection = document.getElementById('scrollsense-reflection');
  if (reflection) reflection.remove();
}

function handleTimeExceeded() {
  // Update blur more aggressively
  updateBlurOverlay();
  
  // Show nudge if not shown
  if (!nudgeShown) {
    showNudge();
  }
}

function trackActivity() {
  // Track scrolling and clicks to update activity time
  let activityTimeout;
  
  const updateActivity = () => {
    lastActivityTime = Date.now();
    
    // Notify background of activity
    chrome.runtime.sendMessage({ type: 'UPDATE_TIME' });
    
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      // User inactive for 5 minutes, might have left
    }, 300000); // 5 minutes
  };
  
  document.addEventListener('scroll', updateActivity, { passive: true });
  document.addEventListener('click', updateActivity, { passive: true });
  document.addEventListener('keydown', updateActivity, { passive: true });
}

function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('instagram.com')) return 'Instagram';
  if (hostname.includes('linkedin.com')) return 'LinkedIn';
  if (hostname.includes('reddit.com')) return 'Reddit';
  return 'social media';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Adaptive learning placeholder - could be expanded
async function getAdaptiveSuggestions() {
  const data = await chrome.storage.local.get(['sessionHistory']);
  const history = data.sessionHistory || [];
  
  if (history.length >= 5) {
    // Analyze patterns
    const avgDuration = history.reduce((sum, s) => sum + s.duration, 0) / history.length;
    const avgExcess = history.reduce((sum, s) => sum + Math.max(0, s.duration - s.timeLimit), 0) / history.length;
    
    return {
      avgDuration: Math.round(avgDuration),
      avgExcess: Math.round(avgExcess),
      hasPattern: avgExcess > 5 // Consistently exceeding by 5+ min
    };
  }
  
  return null;
}
