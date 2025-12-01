// Background service worker for ScrollSense
console.log('ScrollSense background service worker started');

// Track active tabs and their time
const activeTabs = new Map();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);
  
  switch (message.type) {
    case 'SESSION_START':
      handleSessionStart(message.session);
      break;
    case 'SESSION_END':
      handleSessionEnd();
      break;
    case 'SETTINGS_UPDATE':
      handleSettingsUpdate(message.settings);
      break;
    case 'GET_SESSION':
      handleGetSession(sendResponse);
      return true; // Keep channel open for async response
    case 'UPDATE_TIME':
      handleUpdateTime(sender.tab.id);
      break;
    case 'REQUEST_NUDGE':
      handleRequestNudge(message.data, sendResponse);
      return true;
  }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  checkAndNotifyTab(tab);
});

// Monitor tab updates (URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    checkAndNotifyTab(tab);
  }
});

async function checkAndNotifyTab(tab) {
  if (!tab.url) return;
  
  const platform = detectPlatform(tab.url);
  if (platform) {
    const data = await chrome.storage.local.get(['currentSession', 'settings']);
    if (data.currentSession && data.currentSession.active) {
      // Notify content script about active session
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SESSION_ACTIVE',
          session: data.currentSession,
          settings: data.settings || {}
        });
      } catch (error) {
        // Tab might not have content script loaded yet
        console.log('Could not send message to tab:', error.message);
      }
    }
  }
}

function detectPlatform(url) {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('reddit.com')) return 'reddit';
  return null;
}

async function handleSessionStart(session) {
  console.log('Session started:', session);
  
  // Create alarm to check session periodically
  chrome.alarms.create('checkSession', { periodInMinutes: 1 });
  
  // Notify all relevant tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const platform = detectPlatform(tab.url);
    if (platform) {
      try {
        const data = await chrome.storage.local.get(['settings']);
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SESSION_ACTIVE',
          session: session,
          settings: data.settings || {}
        });
      } catch (error) {
        console.log('Could not notify tab:', tab.id);
      }
    }
  }
}

async function handleSessionEnd() {
  console.log('Session ended');
  
  // Clear alarm
  chrome.alarms.clear('checkSession');
  
  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    const platform = detectPlatform(tab.url);
    if (platform) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SESSION_ENDED'
        });
      } catch (error) {
        console.log('Could not notify tab:', tab.id);
      }
    }
  }
}

function handleSettingsUpdate(settings) {
  console.log('Settings updated:', settings);
}

async function handleGetSession(sendResponse) {
  const data = await chrome.storage.local.get(['currentSession', 'settings']);
  sendResponse({
    session: data.currentSession,
    settings: data.settings || {}
  });
}

function handleUpdateTime(tabId) {
  // Track time spent on social media platforms
  const now = Date.now();
  if (!activeTabs.has(tabId)) {
    activeTabs.set(tabId, { lastUpdate: now });
  } else {
    activeTabs.get(tabId).lastUpdate = now;
  }
}

async function handleRequestNudge(data, sendResponse) {
  const settings = await chrome.storage.local.get(['settings']);
  const apiKey = settings.settings?.claudeApiKey;
  
  if (!apiKey) {
    sendResponse({
      success: false,
      message: "You've been scrolling for a while. Remember your intention!",
      usedDefault: true
    });
    return;
  }
  
  try {
    const nudge = await generateClaudeNudge(apiKey, data);
    sendResponse({
      success: true,
      message: nudge,
      usedDefault: false
    });
  } catch (error) {
    console.error('Error generating nudge:', error);
    sendResponse({
      success: false,
      message: "Time flies when you're scrolling! Maybe take a moment to reflect?",
      usedDefault: true
    });
  }
}

async function generateClaudeNudge(apiKey, data) {
  const { intent, timeLimit, timeSpent, platform, sessionCount } = data;
  
  const prompt = `You are a supportive and empathetic digital wellness coach. A user set an intention to spend ${timeLimit} minutes on ${platform} for: "${intent}". They've now been scrolling for ${timeSpent} minutes.

Generate a brief, warm, non-judgmental nudge (1-2 sentences, max 120 characters) that:
- Acknowledges their intention
- Gently reminds them of the time
- Is supportive and encouraging, never scolding
- Uses a friendly, conversational tone

${sessionCount >= 5 ? `This user has completed ${sessionCount} sessions, so personalize based on their pattern of setting intentions.` : ''}

Nudge:`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Fast, cost-effective model for brief nudges
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });
  
  if (!response.ok) {
    throw new Error('Claude API request failed');
  }
  
  const result = await response.json();
  return result.content[0].text.trim();
}

// Check session periodically
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkSession') {
    const data = await chrome.storage.local.get(['currentSession']);
    if (data.currentSession && data.currentSession.active) {
      const elapsed = (Date.now() - data.currentSession.startTime) / 1000 / 60;
      
      // Check if time limit exceeded
      if (elapsed > data.currentSession.timeLimit) {
        // Notify tabs about exceeded time
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          const platform = detectPlatform(tab.url);
          if (platform) {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                type: 'TIME_EXCEEDED',
                session: data.currentSession
              });
            } catch (error) {
              console.log('Could not notify tab:', tab.id);
            }
          }
        }
      }
    }
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ScrollSense installed');
  
  // Initialize storage with defaults
  const data = await chrome.storage.local.get(['settings', 'sessionHistory', 'dailyStats']);
  
  if (!data.settings) {
    await chrome.storage.local.set({
      settings: {
        enableBlur: true,
        enableNudges: true,
        claudeApiKey: ''
      }
    });
  }
  
  if (!data.sessionHistory) {
    await chrome.storage.local.set({ sessionHistory: [] });
  }
  
  if (!data.dailyStats) {
    await chrome.storage.local.set({ dailyStats: {} });
  }
});
