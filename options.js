/**
 * ============================================================================
 * SCROLLSENSE - Options Page Script
 * ============================================================================
 * 
 * This file handles the full options/settings page for ScrollSense.
 * It provides a comprehensive dashboard and configuration interface.
 * 
 * TABS & FEATURES:
 * 
 * 1. DASHBOARD TAB
 *    - Today's usage summary (total time, sessions, platforms)
 *    - Platform breakdown chart
 *    - Recent sessions list
 * 
 * 2. GOALS TAB
 *    - Add/remove up to 3 personal goals
 *    - Goals are used in AI nudge messages for personalization
 * 
 * 3. TIME LIMITS TAB
 *    - Set default time limits per platform
 *    - Configure total daily limit across all platforms
 * 
 * 4. PREFERENCES TAB
 *    - Blur intensity slider (0-100%)
 *    - Message tone selection (encouraging, neutral, direct)
 * 
 * 5. SMART REMINDERS TAB (formerly API Settings)
 *    - User-friendly setup wizard for Groq API
 *    - Comparison of basic vs smart mode
 *    - Preview AI messages before setup
 *    - FAQ section for common questions
 * 
 * 6. AI INSIGHTS TAB
 *    - Weekly usage statistics and trends
 *    - 7-day usage trend chart
 *    - Platform comparison cards
 *    - Hourly usage heatmap
 *    - AI-powered trend analysis
 *    - Synthetic data demo for showcasing
 * 
 * DATA MANAGEMENT:
 * - All data stored in chrome.storage.local
 * - Communicates with background.js for AI features
 * 
 * @author ScrollSense Team
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize options page when DOM is ready
 * Loads all tabs and sets up event listeners
 */
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadDashboard();
  await loadGoals();
  await loadLimits();
  await loadPreferences();
  await loadAPISettings();
  await loadInsights();
  setupEventListeners();
});

// ============================================================================
// TAB NAVIGATION
// ============================================================================

/**
 * Set up tab navigation functionality
 * Handles clicking between different settings tabs
 */
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
// ==========================================
// SMART REMINDERS (API SETTINGS) - User-Friendly Version
// ==========================================

async function loadAPISettings() {
  const data = await chrome.storage.local.get(['apiKey', 'userGoals', 'preferences']);
  const apiKey = data.apiKey;
  const userGoals = data.userGoals || [];
  const tone = data.preferences?.messageTone || 'encouraging';
  
  // Update status card based on whether API key exists
  updateSmartModeStatus(!!apiKey);
  
  // Update example messages with user's actual goals
  updateExampleMessages(userGoals, tone);
  
  // Show/hide appropriate sections
  const setupSection = document.getElementById('setup-section');
  const configuredSection = document.getElementById('configured-section');
  
  if (apiKey) {
    if (setupSection) setupSection.style.display = 'none';
    if (configuredSection) configuredSection.style.display = 'block';
  } else {
    if (setupSection) setupSection.style.display = 'block';
    if (configuredSection) configuredSection.style.display = 'none';
  }
  
  // Setup Smart Reminders event listeners
  setupSmartRemindersListeners();
}

function updateSmartModeStatus(isEnabled) {
  const statusCard = document.getElementById('smart-status-card');
  const statusIcon = document.getElementById('smart-status-icon');
  const statusTitle = document.getElementById('smart-status-title');
  const statusDesc = document.getElementById('smart-status-desc');
  const statusBadge = document.getElementById('smart-status-badge');
  
  if (isEnabled) {
    statusCard?.classList.add('smart-enabled');
    statusCard?.classList.remove('smart-basic');
    if (statusIcon) statusIcon.textContent = '✨';
    if (statusTitle) statusTitle.textContent = 'Smart Mode Active';
    if (statusDesc) statusDesc.textContent = 'AI-powered personalized reminders enabled';
    if (statusBadge) {
      statusBadge.textContent = 'AI Enabled';
      statusBadge.classList.add('badge-smart');
    }
  } else {
    statusCard?.classList.add('smart-basic');
    statusCard?.classList.remove('smart-enabled');
    if (statusIcon) statusIcon.textContent = '💬';
    if (statusTitle) statusTitle.textContent = 'Basic Mode Active';
    if (statusDesc) statusDesc.textContent = 'Your reminders include your goals and preferences';
    if (statusBadge) {
      statusBadge.textContent = 'Working';
      statusBadge.classList.remove('badge-smart');
    }
  }
}

function updateExampleMessages(userGoals, tone) {
  const basicExample = document.getElementById('basic-example');
  const smartExample = document.getElementById('smart-example');
  
  const goal = userGoals.length > 0 ? userGoals[0] : 'your goals';
  
  // Basic mode examples based on tone
  const basicMessages = {
    encouraging: `"You've been scrolling 12 min. Ready to work on ${goal}? You've got this! 💪"`,
    neutral: `"Time check: 12 minutes. Your goal '${goal}' is waiting."`,
    direct: `"12 minutes up. Back to ${goal}."`
  };
  
  // Smart mode examples (more natural, varied)
  const smartMessages = {
    encouraging: `"Hey! 12 minutes on Instagram already - ${goal} is calling your name. You've totally got this! 🌟"`,
    neutral: `"Quick heads up: you're at 12 minutes. Might be a good time to switch to ${goal}."`,
    direct: `"12 min scrolled. ${goal} won't finish itself - let's go!"`
  };
  
  if (basicExample) basicExample.textContent = basicMessages[tone] || basicMessages.encouraging;
  if (smartExample) smartExample.textContent = smartMessages[tone] || smartMessages.encouraging;
}

function setupSmartRemindersListeners() {
  // Preview AI button
  const previewBtn = document.getElementById('preview-ai-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', showDemoPreview);
  }
  
  // Close demo preview
  const demoClose = document.getElementById('demo-close');
  if (demoClose) {
    demoClose.addEventListener('click', () => {
      const demoPreview = document.getElementById('demo-preview');
      if (demoPreview) demoPreview.style.display = 'none';
    });
  }
  
  // Toggle key visibility
  const toggleKeyBtn = document.getElementById('toggle-key-visibility');
  const apiKeyInput = document.getElementById('api-key');
  if (toggleKeyBtn && apiKeyInput) {
    toggleKeyBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleKeyBtn.textContent = '🙈';
      } else {
        apiKeyInput.type = 'password';
        toggleKeyBtn.textContent = '👁️';
      }
    });
  }
  
  // Save API key with new UI
  const saveApiBtn = document.getElementById('save-api-btn');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', saveAPIKeyWithFeedback);
  }
  
  // Test connection button
  const testBtn = document.getElementById('test-connection-btn');
  if (testBtn) {
    testBtn.addEventListener('click', testAPIConnection);
  }
  
  // Remove key button
  const removeBtn = document.getElementById('remove-key-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', removeAPIKey);
  }
  
  // Visual guide button
  const visualGuideBtn = document.getElementById('show-visual-guide');
  if (visualGuideBtn) {
    visualGuideBtn.addEventListener('click', showVisualGuide);
  }
}

async function showDemoPreview() {
  const demoPreview = document.getElementById('demo-preview');
  const demoMessage = document.getElementById('demo-message');
  
  if (!demoPreview || !demoMessage) return;
  
  demoPreview.style.display = 'block';
  demoMessage.textContent = 'Generating your personalized message...';
  
  // Get user's goals and preferences
  const data = await chrome.storage.local.get(['userGoals', 'preferences', 'apiKey']);
  const userGoals = data.userGoals || [];
  const tone = data.preferences?.messageTone || 'encouraging';
  const goal = userGoals.length > 0 ? userGoals[0] : 'managing your time';
  
  // If API key exists, try to get real AI message
  if (data.apiKey) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAINudge',
        intendedTime: 5,
        actualTime: 12,
        userGoal: goal,
        tone: tone
      });
      demoMessage.textContent = response || generateDemoMessage(goal, tone);
    } catch (error) {
      demoMessage.textContent = generateDemoMessage(goal, tone);
    }
  } else {
    // Show what it could look like
    demoMessage.textContent = generateDemoMessage(goal, tone);
  }
}

function generateDemoMessage(goal, tone) {
  const messages = {
    encouraging: [
      `You've been scrolling for 12 minutes! Your goal "${goal}" is waiting - you've totally got this! ✨`,
      `Hey there! 12 min on the feed. Ready to crush "${goal}"? I believe in you! 💪`,
      `Quick check-in: 12 minutes scrolled. "${goal}" needs your awesome focus! 🌟`
    ],
    neutral: [
      `Time check: 12 minutes on social media. Your goal "${goal}" is waiting.`,
      `You've been browsing for 12 minutes. Consider switching to "${goal}".`,
      `12 minutes elapsed. "${goal}" could use your attention.`
    ],
    direct: [
      `12 minutes scrolled. Time to work on "${goal}".`,
      `That's 12 min. "${goal}" won't finish itself.`,
      `12 min up. Back to "${goal}" - let's go.`
    ]
  };
  
  const toneMessages = messages[tone] || messages.encouraging;
  return toneMessages[Math.floor(Math.random() * toneMessages.length)];
}

async function saveAPIKeyWithFeedback() {
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-api-btn');
  const btnText = saveBtn?.querySelector('.btn-text');
  const btnLoading = saveBtn?.querySelector('.btn-loading');
  const setupStatus = document.getElementById('setup-status');
  
  const apiKey = apiKeyInput?.value.trim();
  
  if (!apiKey) {
    showSetupStatus('error', 'Please enter your key', 'The key field is empty. Paste your key from Groq.');
    return;
  }
  
  if (!apiKey.startsWith('gsk_')) {
    showSetupStatus('error', 'Invalid key format', 'The key should start with "gsk_". Please copy the full key from Groq.');
    return;
  }
  
  // Show loading state
  if (btnText) btnText.style.display = 'none';
  if (btnLoading) btnLoading.style.display = 'inline';
  if (saveBtn) saveBtn.disabled = true;
  
  // Save the key
  await chrome.storage.local.set({ apiKey: apiKey });
  
  // Test the connection
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAINudge',
      intendedTime: 5,
      actualTime: 7,
      userGoal: 'testing connection',
      tone: 'encouraging'
    });
    
    if (response && !response.includes('error')) {
      showSetupStatus('success', '🎉 Smart Mode Enabled!', 'Your reminders are now AI-powered and personalized.');
      
      // Update UI after short delay
      setTimeout(() => {
        loadAPISettings();
      }, 2000);
    } else {
      throw new Error('Connection test failed');
    }
  } catch (error) {
    // Still save the key, but warn about potential issues
    showSetupStatus('warning', 'Key Saved', 'Your key was saved. If reminders don\'t work, double-check your key in Groq.');
    setTimeout(() => {
      loadAPISettings();
    }, 2000);
  }
  
  // Reset button state
  if (btnText) btnText.style.display = 'inline';
  if (btnLoading) btnLoading.style.display = 'none';
  if (saveBtn) saveBtn.disabled = false;
}

function showSetupStatus(type, title, message) {
  const setupStatus = document.getElementById('setup-status');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');
  
  if (!setupStatus) return;
  
  setupStatus.style.display = 'flex';
  setupStatus.className = `setup-status status-${type}`;
  
  const icons = { success: '✓', error: '✗', warning: '⚠' };
  if (statusIcon) statusIcon.textContent = icons[type] || '✓';
  if (statusTitle) statusTitle.textContent = title;
  if (statusMessage) statusMessage.textContent = message;
  
  // Auto-hide after 5 seconds for success
  if (type === 'success') {
    setTimeout(() => {
      setupStatus.style.display = 'none';
    }, 5000);
  }
}

async function testAPIConnection() {
  const testBtn = document.getElementById('test-connection-btn');
  if (testBtn) {
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAINudge',
      intendedTime: 5,
      actualTime: 7,
      userGoal: 'test',
      tone: 'encouraging'
    });
    
    showNotification('✅ Connection successful! AI is working.');
  } catch (error) {
    showNotification('❌ Connection failed. Check your key.');
  }
  
  if (testBtn) {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

async function removeAPIKey() {
  if (confirm('Remove your Smart Mode key? You can always add it back later.')) {
    await chrome.storage.local.remove('apiKey');
    showNotification('Key removed. Switched to Basic Mode.');
    loadAPISettings();
  }
}

function showVisualGuide() {
  // Create a modal with visual instructions
  const modal = document.createElement('div');
  modal.className = 'visual-guide-modal';
  modal.innerHTML = `
    <div class="visual-guide-content">
      <button class="visual-guide-close">×</button>
      <h3>📸 How to Get Your Key</h3>
      <div class="visual-guide-steps">
        <div class="guide-step">
          <div class="guide-step-num">1</div>
          <div class="guide-step-content">
            <p>After signing in to Groq, look for <strong>"API Keys"</strong> in the left sidebar menu</p>
            <div class="guide-illustration">
              <div class="mock-sidebar">
                <div class="mock-item">🏠 Overview</div>
                <div class="mock-item">📊 Usage</div>
                <div class="mock-item highlight">🔑 API Keys ← Click here</div>
                <div class="mock-item">⚙️ Settings</div>
              </div>
            </div>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">2</div>
          <div class="guide-step-content">
            <p>Click the <strong>"Create API Key"</strong> button</p>
            <div class="guide-illustration">
              <div class="mock-button">+ Create API Key</div>
            </div>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">3</div>
          <div class="guide-step-content">
            <p>Give it a name (like "ScrollSense") and click <strong>Create</strong></p>
          </div>
        </div>
        <div class="guide-step">
          <div class="guide-step-num">4</div>
          <div class="guide-step-content">
            <p>Copy the key that appears (it starts with <code>gsk_</code>)</p>
            <div class="guide-illustration">
              <div class="mock-key">gsk_xxxxxxxxxxxx... <span class="mock-copy">📋 Copy</span></div>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary guide-done-btn">Got it!</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close handlers
  modal.querySelector('.visual-guide-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.guide-done-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
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
  
  // Note: API key save is now handled by setupSmartRemindersListeners()
}

// ==========================================
// AI INSIGHTS SECTION
// ==========================================

// Load insights data and render visualizations
async function loadInsights() {
  const data = await chrome.storage.local.get(['weeklyHistory', 'sessions']);
  const weeklyHistory = data.weeklyHistory || [];
  
  if (weeklyHistory.length > 0) {
    renderWeeklyStats(weeklyHistory);
    renderTrendChart(weeklyHistory);
    renderPlatformComparison(weeklyHistory);
    renderHourlyHeatmap(weeklyHistory);
    renderQuickInsights(weeklyHistory);
  }
  
  setupInsightsEventListeners();
}

// Setup event listeners for insights tab
function setupInsightsEventListeners() {
  const loadDemoBtn = document.getElementById('load-demo-data-btn');
  const analyzeTrendsBtn = document.getElementById('analyze-trends-btn');
  const clearDataBtn = document.getElementById('clear-insights-data-btn');
  
  if (loadDemoBtn) {
    loadDemoBtn.addEventListener('click', async () => {
      loadDemoBtn.disabled = true;
      loadDemoBtn.innerHTML = '<span class="loading-spinner"></span> Generating...';
      
      const syntheticData = generateSyntheticData();
      await chrome.storage.local.set({ 
        weeklyHistory: syntheticData.dailyData,
        sessions: syntheticData.sessions
      });
      
      await loadInsights();
      await loadDashboard();
      
      loadDemoBtn.disabled = false;
      loadDemoBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 6px;">
          <path d="M8 1V5M8 5L6 3M8 5L10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="2" y="6" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="5" cy="10" r="1" fill="currentColor"/>
          <circle cx="8" cy="10" r="1" fill="currentColor"/>
          <circle cx="11" cy="10" r="1" fill="currentColor"/>
        </svg>
        Load Demo Data
      `;
      
      showNotification('✨ Demo data loaded successfully!');
    });
  }
  
  if (analyzeTrendsBtn) {
    analyzeTrendsBtn.addEventListener('click', async () => {
      const data = await chrome.storage.local.get(['weeklyHistory', 'apiKey']);
      
      if (!data.weeklyHistory || data.weeklyHistory.length === 0) {
        showNotification('Please load demo data first!');
        return;
      }
      
      analyzeTrendsBtn.disabled = true;
      analyzeTrendsBtn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
      
      await analyzeWithAI(data.weeklyHistory, data.apiKey);
      
      analyzeTrendsBtn.disabled = false;
      analyzeTrendsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 6px;">
          <path d="M2 14L6 9L9 12L14 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 5H14V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Analyze My Trends
      `;
    });
  }
  
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async () => {
      await chrome.storage.local.remove(['weeklyHistory']);
      location.reload();
      showNotification('Data cleared successfully');
    });
  }
}

// Generate realistic synthetic data for 7 days
function generateSyntheticData() {
  const platforms = ['instagram', 'linkedin', 'reddit'];
  const dailyData = [];
  const sessions = [];
  
  // Peak hours simulation (more usage in evening/night)
  const hourWeights = {
    6: 0.1, 7: 0.2, 8: 0.3, 9: 0.5, 10: 0.4, 11: 0.3,
    12: 0.5, 13: 0.4, 14: 0.3, 15: 0.4, 16: 0.5, 17: 0.6,
    18: 0.8, 19: 0.9, 20: 1.0, 21: 0.95, 22: 0.8, 23: 0.5
  };
  
  // Generate 7 days of data
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseMultiplier = isWeekend ? 1.4 : 1.0;
    
    const dayData = {
      date: date.toISOString(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      platforms: {},
      hourlyUsage: {},
      totalTime: 0,
      sessionsCount: 0,
      goalAdherence: 0
    };
    
    // Generate platform-specific data
    platforms.forEach(platform => {
      let baseTime;
      let variance;
      
      switch (platform) {
        case 'instagram':
          baseTime = 25 + Math.random() * 20; // 25-45 min
          variance = 15;
          break;
        case 'linkedin':
          baseTime = 15 + Math.random() * 15; // 15-30 min
          variance = 10;
          break;
        case 'reddit':
          baseTime = 20 + Math.random() * 25; // 20-45 min
          variance = 20;
          break;
      }
      
      const actualTime = Math.round((baseTime + (Math.random() - 0.5) * variance) * baseMultiplier);
      const intendedTime = Math.round(actualTime * (0.6 + Math.random() * 0.3)); // Usually under-estimate
      const sessionsForPlatform = Math.floor(1 + Math.random() * 3);
      
      dayData.platforms[platform] = {
        actualTime,
        intendedTime,
        sessions: sessionsForPlatform,
        overTime: actualTime - intendedTime
      };
      
      dayData.totalTime += actualTime;
      dayData.sessionsCount += sessionsForPlatform;
      
      // Generate individual sessions
      for (let i = 0; i < sessionsForPlatform; i++) {
        const hour = getRandomHour(hourWeights);
        const sessionTime = Math.round(actualTime / sessionsForPlatform * (0.7 + Math.random() * 0.6));
        const sessionIntended = Math.round(sessionTime * (0.7 + Math.random() * 0.3));
        
        const sessionDate = new Date(date);
        sessionDate.setHours(hour, Math.floor(Math.random() * 60));
        
        sessions.push({
          platform,
          actualTime: sessionTime,
          intendedTime: sessionIntended,
          date: sessionDate.toISOString(),
          hour
        });
        
        // Track hourly usage
        if (!dayData.hourlyUsage[hour]) {
          dayData.hourlyUsage[hour] = 0;
        }
        dayData.hourlyUsage[hour] += sessionTime;
      }
    });
    
    // Calculate goal adherence
    const totalIntended = Object.values(dayData.platforms).reduce((sum, p) => sum + p.intendedTime, 0);
    dayData.goalAdherence = totalIntended > 0 
      ? Math.round((Math.min(totalIntended, dayData.totalTime) / dayData.totalTime) * 100)
      : 0;
    
    dailyData.push(dayData);
  }
  
  return { dailyData, sessions };
}

// Get random hour based on weight
function getRandomHour(weights) {
  const hours = Object.keys(weights).map(Number);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const hour of hours) {
    random -= weights[hour];
    if (random <= 0) return hour;
  }
  return hours[hours.length - 1];
}

// Render weekly stats overview
function renderWeeklyStats(weeklyData) {
  const totalTime = weeklyData.reduce((sum, day) => sum + day.totalTime, 0);
  const totalSessions = weeklyData.reduce((sum, day) => sum + day.sessionsCount, 0);
  const avgAdherence = Math.round(weeklyData.reduce((sum, day) => sum + day.goalAdherence, 0) / weeklyData.length);
  const avgSession = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;
  
  const formatTime = (mins) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remaining = mins % 60;
      return `${hours}h ${remaining}m`;
    }
    return `${mins}m`;
  };
  
  document.getElementById('weekly-total-time').textContent = formatTime(totalTime);
  document.getElementById('weekly-sessions').textContent = totalSessions;
  document.getElementById('weekly-goal-adherence').textContent = `${avgAdherence}%`;
  document.getElementById('weekly-avg-session').textContent = formatTime(avgSession);
}

// Render 7-day trend chart
function renderTrendChart(weeklyData) {
  const container = document.getElementById('trend-chart');
  const maxTime = Math.max(...weeklyData.map(d => d.totalTime));
  
  const chartHTML = `
    <div class="trend-chart-wrapper">
      <div class="trend-chart-bars">
        ${weeklyData.map((day, index) => {
          const height = (day.totalTime / maxTime) * 100;
          const isToday = index === weeklyData.length - 1;
          return `
            <div class="trend-bar-container">
              <div class="trend-bar-value">${day.totalTime}m</div>
              <div class="trend-bar ${isToday ? 'today' : ''}" style="height: ${height}%">
                <div class="trend-bar-fill"></div>
              </div>
              <div class="trend-bar-label">${day.dayName}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="trend-line-overlay">
        <svg viewBox="0 0 700 150" preserveAspectRatio="none">
          <path d="${generateTrendLinePath(weeklyData, maxTime)}" 
                fill="none" 
                stroke="url(#trendGradient)" 
                stroke-width="3" 
                stroke-linecap="round"
                stroke-linejoin="round"/>
          <defs>
            <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#8b5cf6"/>
              <stop offset="100%" style="stop-color:#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  `;
  
  container.innerHTML = chartHTML;
}

// Generate SVG path for trend line
function generateTrendLinePath(weeklyData, maxTime) {
  const points = weeklyData.map((day, index) => {
    const x = (index / (weeklyData.length - 1)) * 700;
    const y = 150 - (day.totalTime / maxTime) * 140;
    return `${x},${y}`;
  });
  
  return `M ${points.join(' L ')}`;
}

// Render platform comparison
function renderPlatformComparison(weeklyData) {
  const container = document.getElementById('platform-comparison');
  
  // Aggregate platform data
  const platformTotals = {};
  weeklyData.forEach(day => {
    Object.entries(day.platforms).forEach(([platform, data]) => {
      if (!platformTotals[platform]) {
        platformTotals[platform] = { actual: 0, intended: 0, sessions: 0 };
      }
      platformTotals[platform].actual += data.actualTime;
      platformTotals[platform].intended += data.intendedTime;
      platformTotals[platform].sessions += data.sessions;
    });
  });
  
  const maxActual = Math.max(...Object.values(platformTotals).map(p => p.actual));
  
  const platformColors = {
    instagram: { primary: '#E1306C', secondary: '#F77737' },
    linkedin: { primary: '#0077B5', secondary: '#00A0DC' },
    reddit: { primary: '#FF4500', secondary: '#FF8717' }
  };
  
  const platformIcons = {
    instagram: '📸',
    linkedin: '💼',
    reddit: '🔴'
  };
  
  const comparisonHTML = `
    <div class="platform-cards">
      ${Object.entries(platformTotals).map(([platform, data]) => {
        const adherence = data.intended > 0 
          ? Math.round((Math.min(data.intended, data.actual) / data.actual) * 100)
          : 0;
        const overTime = data.actual - data.intended;
        const colors = platformColors[platform];
        
        return `
          <div class="platform-card" style="--platform-primary: ${colors.primary}; --platform-secondary: ${colors.secondary}">
            <div class="platform-card-header">
              <span class="platform-icon">${platformIcons[platform]}</span>
              <span class="platform-name">${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
            </div>
            <div class="platform-card-stats">
              <div class="platform-stat">
                <span class="platform-stat-value">${formatMinutes(data.actual)}</span>
                <span class="platform-stat-label">Total Time</span>
              </div>
              <div class="platform-stat">
                <span class="platform-stat-value">${data.sessions}</span>
                <span class="platform-stat-label">Sessions</span>
              </div>
              <div class="platform-stat">
                <span class="platform-stat-value ${overTime > 0 ? 'overtime' : 'undertime'}">
                  ${overTime > 0 ? '+' : ''}${overTime}m
                </span>
                <span class="platform-stat-label">vs Intended</span>
              </div>
            </div>
            <div class="platform-progress-bar">
              <div class="platform-progress-fill" style="width: ${(data.actual / maxActual) * 100}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  container.innerHTML = comparisonHTML;
}

// Format minutes to hours and minutes
function formatMinutes(mins) {
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}h ${remaining}m`;
  }
  return `${mins}m`;
}

// Render hourly heatmap
function renderHourlyHeatmap(weeklyData) {
  const container = document.getElementById('hourly-heatmap');
  
  // Aggregate hourly usage
  const hourlyTotals = {};
  for (let h = 6; h <= 23; h++) {
    hourlyTotals[h] = 0;
  }
  
  weeklyData.forEach(day => {
    Object.entries(day.hourlyUsage).forEach(([hour, time]) => {
      hourlyTotals[hour] = (hourlyTotals[hour] || 0) + time;
    });
  });
  
  const maxUsage = Math.max(...Object.values(hourlyTotals));
  
  const heatmapHTML = `
    <div class="heatmap-grid">
      ${Object.entries(hourlyTotals).map(([hour, time]) => {
        const intensity = maxUsage > 0 ? time / maxUsage : 0;
        const hourNum = parseInt(hour);
        const timeLabel = hourNum < 12 ? `${hourNum}am` : hourNum === 12 ? '12pm' : `${hourNum - 12}pm`;
        
        return `
          <div class="heatmap-cell" 
               style="--intensity: ${intensity}"
               title="${timeLabel}: ${time}m total">
            <span class="heatmap-hour">${timeLabel}</span>
            <div class="heatmap-bar" style="height: ${intensity * 100}%"></div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="heatmap-legend">
      <span>Less active</span>
      <div class="heatmap-legend-gradient"></div>
      <span>More active</span>
    </div>
  `;
  
  container.innerHTML = heatmapHTML;
}

// Render quick insights
function renderQuickInsights(weeklyData) {
  const container = document.getElementById('quick-insights');
  
  // Calculate insights
  const insights = [];
  
  // Find most used platform
  const platformTotals = {};
  weeklyData.forEach(day => {
    Object.entries(day.platforms).forEach(([platform, data]) => {
      platformTotals[platform] = (platformTotals[platform] || 0) + data.actualTime;
    });
  });
  
  const sortedPlatforms = Object.entries(platformTotals).sort((a, b) => b[1] - a[1]);
  const topPlatform = sortedPlatforms[0];
  insights.push({
    icon: '🏆',
    title: 'Most Used Platform',
    value: `${topPlatform[0].charAt(0).toUpperCase() + topPlatform[0].slice(1)} (${formatMinutes(topPlatform[1])} this week)`,
    type: 'neutral'
  });
  
  // Find peak day
  const peakDay = weeklyData.reduce((max, day) => day.totalTime > max.totalTime ? day : max);
  insights.push({
    icon: '📅',
    title: 'Peak Usage Day',
    value: `${peakDay.dayName} with ${formatMinutes(peakDay.totalTime)}`,
    type: 'warning'
  });
  
  // Goal adherence trend
  const firstHalfAdherence = weeklyData.slice(0, 3).reduce((sum, d) => sum + d.goalAdherence, 0) / 3;
  const secondHalfAdherence = weeklyData.slice(-3).reduce((sum, d) => sum + d.goalAdherence, 0) / 3;
  const adherenceTrend = secondHalfAdherence - firstHalfAdherence;
  
  insights.push({
    icon: adherenceTrend >= 0 ? '📈' : '📉',
    title: 'Goal Adherence Trend',
    value: `${adherenceTrend >= 0 ? 'Improving' : 'Declining'} by ${Math.abs(Math.round(adherenceTrend))}% this week`,
    type: adherenceTrend >= 0 ? 'success' : 'warning'
  });
  
  // Average overtime
  const totalOvertime = weeklyData.reduce((sum, day) => {
    return sum + Object.values(day.platforms).reduce((s, p) => s + p.overTime, 0);
  }, 0);
  const avgOvertime = Math.round(totalOvertime / weeklyData.length);
  
  insights.push({
    icon: avgOvertime > 0 ? '⏰' : '✅',
    title: 'Daily Overtime Average',
    value: avgOvertime > 0 ? `${avgOvertime}m over intended` : 'On track!',
    type: avgOvertime > 15 ? 'warning' : 'success'
  });
  
  const insightsHTML = `
    <div class="insights-cards">
      ${insights.map(insight => `
        <div class="insight-card ${insight.type}">
          <span class="insight-icon">${insight.icon}</span>
          <div class="insight-content">
            <span class="insight-title">${insight.title}</span>
            <span class="insight-value">${insight.value}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  container.innerHTML = insightsHTML;
}

// Analyze trends with AI
async function analyzeWithAI(weeklyData, apiKey) {
  const container = document.getElementById('ai-analysis');
  
  // Prepare data summary for AI
  const totalTime = weeklyData.reduce((sum, day) => sum + day.totalTime, 0);
  const avgDaily = Math.round(totalTime / weeklyData.length);
  const totalSessions = weeklyData.reduce((sum, day) => sum + day.sessionsCount, 0);
  
  const platformSummary = {};
  weeklyData.forEach(day => {
    Object.entries(day.platforms).forEach(([platform, data]) => {
      if (!platformSummary[platform]) {
        platformSummary[platform] = { total: 0, overtime: 0, sessions: 0 };
      }
      platformSummary[platform].total += data.actualTime;
      platformSummary[platform].overtime += data.overTime;
      platformSummary[platform].sessions += data.sessions;
    });
  });
  
  // Find peak hours
  const hourlyTotals = {};
  weeklyData.forEach(day => {
    Object.entries(day.hourlyUsage).forEach(([hour, time]) => {
      hourlyTotals[hour] = (hourlyTotals[hour] || 0) + time;
    });
  });
  const peakHours = Object.entries(hourlyTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => `${h}:00`);
  
  const dataForAI = {
    weeklyTotalMinutes: totalTime,
    averageDailyMinutes: avgDaily,
    totalSessions,
    platforms: platformSummary,
    peakUsageHours: peakHours,
    goalAdherenceAvg: Math.round(weeklyData.reduce((sum, d) => sum + d.goalAdherence, 0) / weeklyData.length)
  };
  
  if (!apiKey) {
    // Show fallback analysis without API
    container.innerHTML = generateFallbackAnalysis(dataForAI);
    return;
  }
  
  // Show loading state
  container.innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-animation">
        <div class="ai-pulse"></div>
        <span>🤖</span>
      </div>
      <p>Analyzing your usage patterns...</p>
    </div>
  `;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeTrends',
      data: dataForAI
    });
    
    if (response && response.analysis) {
      container.innerHTML = `
        <div class="ai-analysis-result">
          <div class="ai-analysis-header">
            <span class="ai-badge">🤖 AI Analysis</span>
            <span class="ai-timestamp">Generated just now</span>
          </div>
          <div class="ai-analysis-content">
            ${formatAIAnalysis(response.analysis)}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = generateFallbackAnalysis(dataForAI);
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    container.innerHTML = generateFallbackAnalysis(dataForAI);
  }
}

// Format AI analysis response
function formatAIAnalysis(analysis) {
  // Split into paragraphs and add styling
  const paragraphs = analysis.split('\n').filter(p => p.trim());
  return paragraphs.map(p => {
    // Check for bullet points or numbered lists
    if (p.trim().startsWith('-') || p.trim().startsWith('•') || /^\d+\./.test(p.trim())) {
      return `<li>${p.replace(/^[-•\d.]\s*/, '')}</li>`;
    }
    return `<p>${p}</p>`;
  }).join('');
}

// Generate fallback analysis without API
function generateFallbackAnalysis(data) {
  const { weeklyTotalMinutes, averageDailyMinutes, platforms, peakUsageHours, goalAdherenceAvg } = data;
  
  const topPlatform = Object.entries(platforms).sort((a, b) => b[1].total - a[1].total)[0];
  const mostOvertime = Object.entries(platforms).sort((a, b) => b[1].overtime - a[1].overtime)[0];
  
  return `
    <div class="ai-analysis-result fallback">
      <div class="ai-analysis-header">
        <span class="ai-badge">📊 Usage Analysis</span>
        <span class="ai-timestamp">Based on your data</span>
      </div>
      <div class="ai-analysis-content">
        <div class="analysis-section">
          <h4>📈 Weekly Summary</h4>
          <p>You spent <strong>${formatMinutes(weeklyTotalMinutes)}</strong> on social media this week, averaging <strong>${formatMinutes(averageDailyMinutes)}</strong> per day.</p>
        </div>
        
        <div class="analysis-section">
          <h4>🎯 Goal Performance</h4>
          <p>Your goal adherence is at <strong>${goalAdherenceAvg}%</strong>. ${goalAdherenceAvg >= 70 ? "Great job staying on track!" : goalAdherenceAvg >= 50 ? "There's room for improvement." : "Consider setting more realistic time limits."}</p>
        </div>
        
        <div class="analysis-section">
          <h4>📱 Platform Insights</h4>
          <p><strong>${topPlatform[0].charAt(0).toUpperCase() + topPlatform[0].slice(1)}</strong> is your most-used platform at ${formatMinutes(topPlatform[1].total)} this week.</p>
          ${mostOvertime[1].overtime > 0 ? `<p>You tend to exceed your intended time most on <strong>${mostOvertime[0]}</strong> (${mostOvertime[1].overtime}m overtime total).</p>` : ''}
        </div>
        
        <div class="analysis-section">
          <h4>🕐 Peak Hours</h4>
          <p>Your most active hours are around <strong>${peakUsageHours.join(', ')}</strong>. Consider setting reminders during these times.</p>
        </div>
        
        <div class="analysis-section tips">
          <h4>💡 Recommendations</h4>
          <ul>
            ${goalAdherenceAvg < 70 ? '<li>Try setting shorter session times and gradually increase them</li>' : ''}
            ${mostOvertime[1].overtime > 30 ? `<li>Consider stricter limits for ${mostOvertime[0]}</li>` : ''}
            <li>Use the blur feature to help transition away from scrolling</li>
            <li>Set specific goals before each session to stay intentional</li>
          </ul>
        </div>
      </div>
      <div class="ai-api-hint">
        <span>✨ Add your Groq API key in API Settings for personalized AI-powered insights</span>
      </div>
    </div>
  `;
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

