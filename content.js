/**
 * ============================================================================
 * SCROLLSENSE - Content Script
 * ============================================================================
 * 
 * This is the main content script that runs on supported social media platforms.
 * It handles all UI interactions, overlays, and session tracking directly on
 * the webpage.
 * 
 * MAIN RESPONSIBILITIES:
 * 
 * 1. SESSION MANAGEMENT
 *    - Display intent prompt when user visits supported platform
 *    - Track session duration with floating timer
 *    - Handle session start, pause (tab hidden), and end
 * 
 * 2. PROGRESSIVE BLUR EFFECT
 *    - Apply gradual blur when user exceeds intended time
 *    - Post-session blur for users who continue browsing
 *    - User can control/disable blur via blur control popup
 * 
 * 3. AI-POWERED NUDGES
 *    - Display personalized reminder messages from AI
 *    - Show "ScrollSense AI" badge to indicate AI-generated content
 *    - Allow user to continue, end session, or start new session
 * 
 * 4. USER CONTROL FEATURES
 *    - Blur control indicator with options to disable
 *    - Skip options (skip now, 1 hour, today)
 *    - Mini prompt for returning users who skipped
 * 
 * UI COMPONENTS CREATED:
 * - Intent prompt modal (session start)
 * - Floating timer (right side)
 * - Timer popup (usage stats)
 * - Nudge modal (AI messages)
 * - Session complete modal
 * - Blur overlay (progressive blur)
 * - Blur control indicator and popup
 * - Mini prompt (non-intrusive)
 * - Temporary notifications
 * 
 * SUPPORTED PLATFORMS:
 * - Instagram (instagram.com)
 * - LinkedIn (linkedin.com)
 * - Reddit (reddit.com)
 * 
 * COMMUNICATION:
 * - Sends messages to background.js for data persistence
 * - Receives messages from popup.js for session control
 * 
 * @author ScrollSense Team
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// GLOBAL STATE VARIABLES
// ============================================================================

// Timer and session state
let sessionTimer = null;           // Interval ID for session timer
let currentSession = null;         // Current active session data
let currentElapsed = 0;            // Current elapsed time in milliseconds

// Tab visibility tracking (for pausing timer when tab is hidden)
let hiddenTime = 0;                // Total accumulated hidden time
let hiddenStartTime = null;        // Timestamp when tab was hidden

// Platform detection
let platform = null;               // Current platform ('instagram', 'linkedin', 'reddit')

// UI Element References
let blurOverlay = null;            // Full-screen blur overlay element
let intentPrompt = null;           // Initial intent selection modal
let nudgeModal = null;             // AI nudge message modal
let floatingTimer = null;          // Floating timer display (right side)
let timerPopup = null;             // Expanded usage stats popup
let miniPrompt = null;             // Less intrusive prompt for returning users
let sessionCompleteModal = null;   // Session completion modal

// Post-session blur state
let postSessionBlurTimer = null;   // Interval ID for progressive blur
let isPostSessionBlurActive = false; // Whether post-session blur is running
let postSessionBlurStartTime = null; // When post-session blur started
let postSessionNudgeTimer = null;  // Interval ID for periodic nudges

// Blur control UI state
let blurControlIndicator = null;   // Small blur control icon (right side)
let blurControlPopup = null;       // Expanded blur control options popup
let isBlurActive = false;          // Whether any blur effect is currently active

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the content script when page loads
 * Detects platform, sets up extension, and starts listening for visibility changes
 * This is an IIFE (Immediately Invoked Function Expression) that runs on script load
 */
(async function init() {
  platform = detectPlatform();
  if (!platform) return; // Exit if not on a supported platform
  
  // Wait for page to be fully loaded before setting up UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExtension);
  } else {
    setupExtension();
  }
  
  // Listen for tab visibility changes to pause/resume timer
  document.addEventListener('visibilitychange', handleVisibilityChange);
})();

// ============================================================================
// TAB VISIBILITY HANDLING
// ============================================================================

/**
 * Handle tab visibility changes - pause timer when hidden, resume when visible
 * This ensures we only count time the user actually spends looking at the page
 */
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

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect which supported platform the user is on
 * @returns {string|null} Platform name or null if not supported
 */
function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('reddit.com')) return 'reddit';
  return null;
}

// ============================================================================
// EXTENSION SETUP
// ============================================================================

/**
 * Main setup function - checks for existing session and shows appropriate UI
 * Called after page is fully loaded
 */
async function setupExtension() {
  // Check if session already started
  const data = await chrome.storage.local.get(['currentSession', 'currentPlatform', 'skipUntil']);
  
  if (data.currentSession && data.currentPlatform === platform) {
    // Resume existing session
    currentSession = data.currentSession;
    
    // Stop any post-session blur if active
    if (isPostSessionBlurActive && postSessionBlurTimer) {
      clearInterval(postSessionBlurTimer);
      postSessionBlurTimer = null;
      isPostSessionBlurActive = false;
      postSessionBlurStartTime = null;
      if (blurOverlay) {
        blurOverlay.style.backdropFilter = 'blur(0px)';
        blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
      }
      // Stop nudge timer
      if (postSessionNudgeTimer) {
        clearInterval(postSessionNudgeTimer);
        postSessionNudgeTimer = null;
      }
    }
    
    // If tab is already hidden, start tracking hidden time
    if (document.hidden) {
      hiddenStartTime = Date.now();
    } else {
      startSessionTimer();
    }
  } else {
    // If post-session blur is active, don't show prompts
    if (isPostSessionBlurActive) {
      return;
    }
    
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

// ============================================================================
// INTENT PROMPT & SESSION START
// ============================================================================

/**
 * Display the intent prompt modal asking user how long they plan to browse
 * This is the main entry point for starting a mindful session
 */
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
  
  // Stop any post-session blur if active and completely remove blur
  stopPostSessionBlur();
  removeBlurEffect();
  hideBlurControlIndicator();
  
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

// ============================================================================
// SESSION TIMER & TRACKING
// ============================================================================

/**
 * Start the session timer interval
 * Updates floating timer display every second
 * Triggers nudge and blur when user exceeds intended time
 */
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

// ============================================================================
// PROGRESSIVE BLUR EFFECT
// ============================================================================

/**
 * Apply progressive blur effect to the page
 * Blur increases gradually as user exceeds their intended time
 * @param {number} percent - Blur percentage (0-100)
 */
function applyProgressiveBlur(percent) {
  if (!blurOverlay) {
    blurOverlay = document.createElement('div');
    blurOverlay.id = 'scrollsense-blur-overlay';
    blurOverlay.style.pointerEvents = 'none'; // Allow interaction during active session
    document.body.appendChild(blurOverlay);
  }
  
  // Reduced blur for active session: max 6px (subtle, readable)
  // Content should remain visible and readable, just slightly blurred
  const blurPixels = (percent / 100) * 6; // Max 6px during active session
  blurOverlay.style.backdropFilter = `blur(${blurPixels}px)`;
  blurOverlay.style.webkitBackdropFilter = `blur(${blurPixels}px)`;
  
  // Show blur control indicator when blur is active
  if (blurPixels > 0.5 && !isBlurActive) {
    isBlurActive = true;
    showBlurControlIndicator('session');
  }
}

// ============================================================================
// AI NUDGE MODALS
// ============================================================================

/**
 * Show AI-generated nudge message when user exceeds intended time
 * Displays "ScrollSense AI" badge and personalized message
 * @param {number} actualTime - Actual time spent (minutes)
 * @param {number} intendedTime - User's intended time (minutes)
 */
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
      <div class="scrollsense-ai-badge">
        <span class="scrollsense-ai-icon">✨</span>
        <span class="scrollsense-ai-label">ScrollSense AI</span>
      </div>
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
      // Remove blur temporarily and hide control indicator
      if (blurOverlay) {
        blurOverlay.style.backdropFilter = 'blur(0px)';
        blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
      }
      hideBlurControlIndicator();
    }
  });
}

// ============================================================================
// SESSION END & COMPLETION
// ============================================================================

/**
 * End the current session and save data
 * Cleans up timers and UI, shows completion modal
 */
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
  
  // Don't remove blur overlay - we'll use it for post-session blur
  // Just reset its blur
  if (blurOverlay) {
    blurOverlay.style.backdropFilter = 'blur(0px)';
    blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
  }
  
  // Hide blur control indicator
  hideBlurControlIndicator();
  
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
  // Remove any existing completion modal
  if (sessionCompleteModal) {
    sessionCompleteModal.remove();
  }
  
  sessionCompleteModal = document.createElement('div');
  sessionCompleteModal.id = 'scrollsense-session-complete';
  sessionCompleteModal.innerHTML = `
    <div class="scrollsense-modal-content scrollsense-session-complete-content">
      <h2>Session Complete! 🎉</h2>
      <p class="scrollsense-complete-message">Great job staying mindful of your time!</p>
      <div class="scrollsense-complete-actions">
        <button class="scrollsense-btn scrollsense-btn-primary" id="scrollsense-new-session-btn">Start New Session</button>
        <button class="scrollsense-btn scrollsense-btn-secondary" id="scrollsense-skip-complete-btn">Continue Browsing</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(sessionCompleteModal);
  
  // Add event listeners
  sessionCompleteModal.querySelector('#scrollsense-new-session-btn').addEventListener('click', () => {
    if (sessionCompleteModal) {
      sessionCompleteModal.remove();
      sessionCompleteModal = null;
    }
    // Show intent prompt for new session
    showIntentPrompt();
  });
  
  sessionCompleteModal.querySelector('#scrollsense-skip-complete-btn').addEventListener('click', () => {
    if (sessionCompleteModal) {
      sessionCompleteModal.remove();
      sessionCompleteModal = null;
    }
    // Start progressive blur instead of showing intent prompt
    startPostSessionBlur();
  });
  
  // Also allow closing by clicking outside or pressing Escape
  sessionCompleteModal.addEventListener('click', (e) => {
    if (e.target === sessionCompleteModal) {
      if (sessionCompleteModal) {
        sessionCompleteModal.remove();
        sessionCompleteModal = null;
      }
      startPostSessionBlur();
    }
  });
  
  document.addEventListener('keydown', function handleEscape(e) {
    if (e.key === 'Escape' && sessionCompleteModal) {
      if (sessionCompleteModal) {
        sessionCompleteModal.remove();
        sessionCompleteModal = null;
      }
      document.removeEventListener('keydown', handleEscape);
      startPostSessionBlur();
    }
  });
}

// ============================================================================
// POST-SESSION BLUR
// ============================================================================

/**
 * Start progressive blur after session ends (if user continues browsing)
 * Blur gradually increases over 2 minutes to encourage mindful use
 * Periodic nudges also appear during post-session blur
 */
async function startPostSessionBlur() {
  // Get blur intensity setting
  const data = await chrome.storage.local.get(['preferences']);
  const blurIntensity = data.preferences?.blurIntensity || 50;
  
  // Ensure blur intensity is within valid range (0-100)
  const cappedBlurIntensity = Math.max(0, Math.min(100, blurIntensity));
  
  // Convert percentage to pixels: 0% = 0px, 100% = 12px (subtle, readable blur)
  // Reduced from 40px to 12px so content remains visible and readable
  // This ensures the blur is noticeable but not overwhelming
  const maxBlurPixels = (cappedBlurIntensity / 100) * 12;
  
  isPostSessionBlurActive = true;
  isBlurActive = true;
  postSessionBlurStartTime = Date.now();
  
  // Show blur control indicator for post-session blur
  showBlurControlIndicator('post-session');
  
  // Clear any existing timers
  if (postSessionBlurTimer) {
    clearInterval(postSessionBlurTimer);
  }
  if (postSessionNudgeTimer) {
    clearInterval(postSessionNudgeTimer);
  }
  
  // Create blur overlay if it doesn't exist
  if (!blurOverlay) {
    blurOverlay = document.createElement('div');
    blurOverlay.id = 'scrollsense-blur-overlay';
    blurOverlay.style.pointerEvents = 'none'; // Allow interaction through blur
    document.body.appendChild(blurOverlay);
  }
  
  // Reset blur to 0
  blurOverlay.style.backdropFilter = 'blur(0px)';
  blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
  
  // Start at 0px and gradually increase to max blur (capped at user's intensity)
  let currentBlurPixels = 0;
  const blurDuration = 120000; // 120 seconds (2 minutes) to reach max blur
  const blurSteps = 240; // Update 240 times for smoother progression over 2 minutes
  const blurIncrement = maxBlurPixels / blurSteps;
  const stepInterval = blurDuration / blurSteps;
  
  postSessionBlurTimer = setInterval(() => {
    currentBlurPixels += blurIncrement;
    
    // Cap the blur to never exceed the user's configured intensity
    if (currentBlurPixels >= maxBlurPixels) {
      currentBlurPixels = maxBlurPixels; // Ensure it's exactly capped
      clearInterval(postSessionBlurTimer);
      postSessionBlurTimer = null;
    }
    
    // Apply blur amount (in pixels) - capped to user's intensity setting
    const blurValue = `${Math.min(currentBlurPixels, maxBlurPixels)}px`;
    blurOverlay.style.backdropFilter = `blur(${blurValue})`;
    blurOverlay.style.webkitBackdropFilter = `blur(${blurValue})`;
    
    // If user starts a new session, stop the blur
    if (currentSession) {
      clearInterval(postSessionBlurTimer);
      postSessionBlurTimer = null;
      isPostSessionBlurActive = false;
      postSessionBlurStartTime = null;
      if (blurOverlay) {
        blurOverlay.style.backdropFilter = 'blur(0px)';
        blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
      }
      // Stop nudge timer
      if (postSessionNudgeTimer) {
        clearInterval(postSessionNudgeTimer);
        postSessionNudgeTimer = null;
      }
    }
  }, stepInterval);
  
  // Start periodic nudges during post-session blur
  startPostSessionNudges();
}

async function startPostSessionNudges() {
  // Show first nudge after 30 seconds
  setTimeout(async () => {
    if (isPostSessionBlurActive && !currentSession && !nudgeModal) {
      await showPostSessionNudge();
    }
  }, 30000);
  
  // Then show nudges every 45 seconds
  postSessionNudgeTimer = setInterval(async () => {
    if (isPostSessionBlurActive && !currentSession && !nudgeModal) {
      await showPostSessionNudge();
    } else if (!isPostSessionBlurActive || currentSession) {
      // Stop nudges if blur stopped or new session started
      clearInterval(postSessionNudgeTimer);
      postSessionNudgeTimer = null;
    }
  }, 45000);
}

async function showPostSessionNudge() {
  // Get user goals and preferences
  const data = await chrome.storage.local.get(['userGoals', 'preferences']);
  const userGoal = data.userGoals && data.userGoals.length > 0 
    ? data.userGoals[0] 
    : 'managing your time';
  const tone = data.preferences?.messageTone || 'encouraging';
  
  // Calculate how long they've been scrolling since session ended
  const timeSinceBlurStart = postSessionBlurStartTime ? Math.round((Date.now() - postSessionBlurStartTime) / 60000) : 0;
  
  // Get AI nudge for post-session context
  const nudgeText = await chrome.runtime.sendMessage({
    action: 'getAINudge',
    intendedTime: 0, // No intended time for post-session
    actualTime: timeSinceBlurStart,
    userGoal: userGoal,
    tone: tone
  });
  
  // Create nudge modal
  nudgeModal = document.createElement('div');
  nudgeModal.id = 'scrollsense-nudge-modal';
  nudgeModal.innerHTML = `
    <div class="scrollsense-modal-content scrollsense-nudge-content">
      <div class="scrollsense-ai-badge">
        <span class="scrollsense-ai-icon">✨</span>
        <span class="scrollsense-ai-label">ScrollSense AI</span>
      </div>
      <p class="scrollsense-nudge-text">${nudgeText}</p>
      <div class="scrollsense-nudge-actions">
        <button class="scrollsense-btn scrollsense-btn-primary" id="scrollsense-start-session-btn">Start New Session</button>
        <button class="scrollsense-btn scrollsense-btn-secondary" id="scrollsense-continue-blur-btn">Continue</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(nudgeModal);
  
  // Add event listeners
  nudgeModal.querySelector('#scrollsense-start-session-btn').addEventListener('click', () => {
    if (nudgeModal) {
      nudgeModal.remove();
      nudgeModal = null;
    }
    // Stop post-session blur
    stopPostSessionBlur();
    if (blurOverlay) {
      blurOverlay.style.backdropFilter = 'blur(0px)';
      blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
    }
    // Hide blur control indicator
    hideBlurControlIndicator();
    // Show intent prompt for new session
    showIntentPrompt();
  });
  
  nudgeModal.querySelector('#scrollsense-continue-blur-btn').addEventListener('click', () => {
    if (nudgeModal) {
      nudgeModal.remove();
      nudgeModal = null;
    }
    // Continue with blur - nudge will appear again after interval
  });
}

// ==========================================
// BLUR CONTROL INDICATOR (Left Side)
// ==========================================

function showBlurControlIndicator(type) {
  // Don't create if already exists
  if (blurControlIndicator) return;
  
  blurControlIndicator = document.createElement('div');
  blurControlIndicator.id = 'scrollsense-blur-control';
  blurControlIndicator.innerHTML = `
    <span class="blur-control-icon">🔵</span>
  `;
  blurControlIndicator.title = 'Blur active - Click for options';
  
  document.body.appendChild(blurControlIndicator);
  
  // Add click handler to show popup
  blurControlIndicator.addEventListener('click', () => toggleBlurControlPopup(type));
}

function toggleBlurControlPopup(type) {
  if (blurControlPopup) {
    hideBlurControlPopup();
    return;
  }
  
  blurControlPopup = document.createElement('div');
  blurControlPopup.id = 'scrollsense-blur-popup';
  
  const isPostSession = type === 'post-session';
  const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'this site';
  
  blurControlPopup.innerHTML = `
    <div class="blur-popup-header">
      <span class="blur-popup-title">🔵 Blur Active</span>
      <button class="blur-popup-close" id="blur-popup-close">×</button>
    </div>
    <div class="blur-popup-content">
      <p class="blur-popup-message">
        ${isPostSession 
          ? 'Screen is gradually blurring to encourage mindful use.' 
          : 'Screen blur helps signal when you\'ve exceeded your intended time.'}
      </p>
      <div class="blur-popup-actions">
        <button class="blur-popup-btn blur-popup-primary" id="blur-start-session">
          ${isPostSession ? '🎯 Start New Session' : '⏱️ Extend Time'}
        </button>
        <button class="blur-popup-btn blur-popup-secondary" id="blur-remove-temp">
          👁️ Remove for 10 min
        </button>
        <div class="blur-popup-disable-group">
          <span class="disable-label">🚫 Disable ScrollSense:</span>
          <div class="disable-buttons">
            <button class="blur-popup-btn blur-popup-tertiary" id="blur-disable-session">
              This session
            </button>
            <button class="blur-popup-btn blur-popup-tertiary" id="blur-disable-today">
              For today
            </button>
          </div>
        </div>
      </div>
      <p class="blur-popup-note">
        ScrollSense respects your autonomy. You're always in control.
      </p>
    </div>
  `;
  
  document.body.appendChild(blurControlPopup);
  
  // Event listeners
  blurControlPopup.querySelector('#blur-popup-close').addEventListener('click', hideBlurControlPopup);
  
  blurControlPopup.querySelector('#blur-start-session').addEventListener('click', () => {
    hideBlurControlPopup();
    hideBlurControlIndicator();
    removeBlurEffect();
    if (isPostSession) {
      showIntentPrompt();
    } else {
      // Extend current session by 10 minutes
      if (currentSession) {
        currentSession.intendedTime += 10 * 60000;
        if (nudgeModal) {
          nudgeModal.remove();
          nudgeModal = null;
        }
      }
    }
  });
  
  blurControlPopup.querySelector('#blur-remove-temp').addEventListener('click', async () => {
    hideBlurControlPopup();
    hideBlurControlIndicator();
    removeBlurEffect();
    
    // Set a temporary skip for 10 minutes
    const skipUntil = Date.now() + (10 * 60 * 1000);
    const data = await chrome.storage.local.get(['blurSkipUntil']);
    const skipData = data.blurSkipUntil || {};
    skipData[platform] = skipUntil;
    await chrome.storage.local.set({ blurSkipUntil: skipData });
    
    // Stop post-session blur if active
    stopPostSessionBlur();
    
    showTemporaryNotification('Blur removed for 10 minutes');
  });
  
  blurControlPopup.querySelector('#blur-disable-session').addEventListener('click', async () => {
    hideBlurControlPopup();
    hideBlurControlIndicator();
    removeBlurEffect();
    
    // Disable ScrollSense for this browser session (until tab refresh/close)
    const data = await chrome.storage.local.get(['blurSkipUntil']);
    const skipData = data.blurSkipUntil || {};
    // Set to a very long time, will reset on page reload
    skipData[platform] = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    skipData[`${platform}_sessionOnly`] = true; // Mark as session-only
    await chrome.storage.local.set({ blurSkipUntil: skipData });
    
    // Stop everything
    stopPostSessionBlur();
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    currentSession = null;
    
    const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'this site';
    showTemporaryNotification(`ScrollSense paused for this ${platformName} session`);
  });
  
  blurControlPopup.querySelector('#blur-disable-today').addEventListener('click', async () => {
    hideBlurControlPopup();
    hideBlurControlIndicator();
    removeBlurEffect();
    
    // Disable ScrollSense on this platform for today (until midnight)
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const skipUntil = tomorrow.getTime();
    
    const data = await chrome.storage.local.get(['blurSkipUntil']);
    const skipData = data.blurSkipUntil || {};
    skipData[platform] = skipUntil;
    await chrome.storage.local.set({ blurSkipUntil: skipData });
    
    // Stop everything
    stopPostSessionBlur();
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    currentSession = null;
    
    const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'this site';
    showTemporaryNotification(`ScrollSense disabled on ${platformName} for today`);
  });
  
  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeBlurPopupOnOutsideClick);
  }, 100);
}

function closeBlurPopupOnOutsideClick(e) {
  if (blurControlPopup && !blurControlPopup.contains(e.target) && 
      blurControlIndicator && !blurControlIndicator.contains(e.target)) {
    hideBlurControlPopup();
  }
}

function hideBlurControlPopup() {
  if (blurControlPopup) {
    blurControlPopup.remove();
    blurControlPopup = null;
    document.removeEventListener('click', closeBlurPopupOnOutsideClick);
  }
}

function hideBlurControlIndicator() {
  if (blurControlIndicator) {
    blurControlIndicator.remove();
    blurControlIndicator = null;
  }
  isBlurActive = false;
}

function removeBlurEffect() {
  if (blurOverlay) {
    blurOverlay.style.backdropFilter = 'blur(0px)';
    blurOverlay.style.webkitBackdropFilter = 'blur(0px)';
    blurOverlay.style.background = 'transparent';
    // Completely remove the overlay element to ensure blur is gone
    blurOverlay.remove();
    blurOverlay = null;
  }
  isBlurActive = false;
}

function stopPostSessionBlur() {
  if (postSessionBlurTimer) {
    clearInterval(postSessionBlurTimer);
    postSessionBlurTimer = null;
  }
  if (postSessionNudgeTimer) {
    clearInterval(postSessionNudgeTimer);
    postSessionNudgeTimer = null;
  }
  isPostSessionBlurActive = false;
  postSessionBlurStartTime = null;
}

function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'scrollsense-temp-notification';
  notification.innerHTML = `
    <span class="notification-icon">✓</span>
    <span class="notification-message">${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('notification-fadeout');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }
  if (postSessionBlurTimer) {
    clearInterval(postSessionBlurTimer);
  }
  if (postSessionNudgeTimer) {
    clearInterval(postSessionNudgeTimer);
  }
});

