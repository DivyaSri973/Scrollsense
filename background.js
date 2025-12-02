// Background Service Worker for ScrollSense
// Handles session tracking, AI integration, and data management

const DEFAULT_PLATFORM_LIMITS = {
  instagram: 10,
  linkedin: 30,
  reddit: 15
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    'userGoals',
    'platformLimits',
    'sessions',
    'dailyUsage',
    'preferences',
    'currentSession'
  ]);

  if (!data.userGoals) {
    await chrome.storage.local.set({
      userGoals: [],
      platformLimits: DEFAULT_PLATFORM_LIMITS,
      sessions: [],
      dailyUsage: {},
      preferences: {
        blurIntensity: 50,
        messageTone: 'encouraging',
        dailyLimit: 120
      },
      currentSession: null
    });
  }
});

// Track tab changes and session start
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await handleTabChange(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await handleTabChange(tab);
  }
});

async function handleTabChange(tab) {
  const platform = detectPlatform(tab.url);
  if (!platform) return;

  const data = await chrome.storage.local.get(['currentSession', 'platformLimits']);
  
  // Check if we need to start a new session
  if (!data.currentSession || data.currentSession.platform !== platform) {
    // Reset daily usage if it's a new day
    await resetDailyUsageIfNeeded();
    
    // Store platform info for content script
    await chrome.storage.local.set({
      currentPlatform: platform,
      sessionStartTime: Date.now()
    });
  }
}

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('reddit.com')) return 'reddit';
  return null;
}

async function resetDailyUsageIfNeeded() {
  const data = await chrome.storage.local.get(['dailyUsage']);
  const today = new Date().toDateString();
  const lastReset = data.dailyUsage?.lastReset;
  
  if (lastReset !== today) {
    await chrome.storage.local.set({
      dailyUsage: {
        lastReset: today,
        instagram: 0,
        linkedin: 0,
        reddit: 0,
        total: 0
      }
    });
  }
}

// Start a new session with intent
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSession') {
    startSession(request.intent, request.platform).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'endSession') {
    endSession(request.platform, request.actualTime).then(sendResponse);
    return true;
  }
  
  if (request.action === 'getAINudge') {
    getAINudge(request.intendedTime, request.actualTime, request.userGoal, request.tone)
      .then(sendResponse);
    return true;
  }
  
  if (request.action === 'updateDailyUsage') {
    updateDailyUsage(request.platform, request.minutes).then(sendResponse);
    return true;
  }
});

async function startSession(intent, platform) {
  const session = {
    platform,
    intent,
    startTime: Date.now(),
    intendedTime: intent * 60000 // Convert to milliseconds
  };
  
  await chrome.storage.local.set({ currentSession: session });
  return { success: true };
}

async function endSession(platform, actualTime) {
  const data = await chrome.storage.local.get(['currentSession', 'sessions', 'dailyUsage']);
  const session = data.currentSession;
  
  if (session) {
    const sessionData = {
      platform: session.platform,
      intendedTime: session.intent,
      actualTime: Math.round(actualTime / 60000), // Convert milliseconds to minutes
      date: new Date().toISOString()
    };
    
    const sessions = data.sessions || [];
    sessions.push(sessionData);
    
    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions.shift();
    }
    
    await chrome.storage.local.set({
      sessions,
      currentSession: null
    });
    
    // Update daily usage
    await updateDailyUsage(platform, sessionData.actualTime);
  }
  
  return { success: true };
}

async function updateDailyUsage(platform, minutes) {
  await resetDailyUsageIfNeeded();
  const data = await chrome.storage.local.get(['dailyUsage']);
  const dailyUsage = data.dailyUsage || {
    lastReset: new Date().toDateString(),
    instagram: 0,
    linkedin: 0,
    reddit: 0,
    total: 0
  };
  
  dailyUsage[platform] = (dailyUsage[platform] || 0) + minutes;
  dailyUsage.total = (dailyUsage.instagram || 0) + (dailyUsage.linkedin || 0) + (dailyUsage.reddit || 0);
  
  await chrome.storage.local.set({ dailyUsage });
  return dailyUsage;
}

async function getAINudge(intendedTime, actualTime, userGoal, tone) {
  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  const data = await chrome.storage.local.get(['preferences', 'apiKey']);
  const preferences = data.preferences || {};
  const API_KEY = data.apiKey;
  const messageTone = tone || preferences.messageTone || 'encouraging';
  
  if (!API_KEY) {
    // Fallback message if API key not set
    return generateFallbackMessage(intendedTime, actualTime, userGoal, messageTone);
  }
  
  // Different prompts for active session vs post-session
  let prompt;
  if (intendedTime === 0) {
    // Post-session nudge (user skipped session complete popup)
    prompt = `Generate a supportive, non-judgmental reminder for a user who has been scrolling for ${actualTime} minutes after their session ended. Their current goal is: ${userGoal || 'managing social media time'}. Encourage them to start a new mindful session. Keep the message under 20 words, with a ${messageTone} tone.`;
  } else {
    // Active session nudge (during an active session)
    prompt = `Generate a supportive, non-judgmental reminder for a user who planned to scroll ${intendedTime} minutes but has been scrolling ${actualTime} minutes. Their current goal is: ${userGoal || 'managing social media time'}. Keep the message under 20 words, with a ${messageTone} tone.`;
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and reliable Groq model
        messages: [
          {
            role: 'system',
            content: 'You are ScrollSense, a supportive assistant that helps users stay mindful of their social media time without judgment.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 60
      })
    });
    
    if (!response.ok) {
      // Get error details from response
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Groq API error details:', errorData);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    const aiMessage = result.choices?.[0]?.message?.content?.trim();
    if (aiMessage) {
      return aiMessage;
    }
    throw new Error('Empty Groq response');
  } catch (error) {
    console.error('AI API error:', error.message || error);
    // Return fallback message on any error
    return generateFallbackMessage(intendedTime, actualTime, userGoal, messageTone);
  }
}

function generateFallbackMessage(intendedTime, actualTime, userGoal, tone) {
  const overTime = actualTime - intendedTime;
  
  // Different messages for post-session vs active session
  let messages;
  if (intendedTime === 0) {
    // Post-session messages
    messages = {
      encouraging: [
        `You've been scrolling ${actualTime} min since your session ended. Ready to start a mindful session? 🌟`,
        `Time check: ${actualTime} min. How about setting a new intention? 💪`,
        `${actualTime} minutes scrolling. Ready to work on "${userGoal || 'your goals'}"?`
      ],
      neutral: [
        `You've been scrolling ${actualTime} minutes since your session ended.`,
        `Time check: ${actualTime} min.`,
        `Current browsing: ${actualTime} minutes.`
      ],
      direct: [
        `You've been scrolling ${actualTime} min. Start a new session?`,
        `${actualTime} minutes up. Set a new intention.`,
        `Time to be mindful. You've been on for ${actualTime} min.`
      ]
    };
  } else {
    // Active session messages
    messages = {
      encouraging: [
        `You've been scrolling ${actualTime} min. Ready to work on "${userGoal || 'your goals'}"? 🌟`,
        `Time check: ${actualTime} min. You've got this! 💪`,
        `${actualTime} minutes in. How about we tackle "${userGoal || 'that task'}" now?`
      ],
      neutral: [
        `You've been scrolling ${actualTime} minutes.`,
        `Time check: ${actualTime} min.`,
        `Current session: ${actualTime} minutes.`
      ],
      direct: [
        `Back to work. You've been scrolling ${actualTime} min.`,
        `${actualTime} minutes up. Time to focus.`,
        `Done scrolling? You've been on for ${actualTime} min.`
      ]
    };
  }
  
  const toneMessages = messages[tone] || messages.encouraging;
  return toneMessages[Math.floor(Math.random() * toneMessages.length)];
}

// Get adaptive suggestions after 5+ sessions
async function getAdaptiveSuggestions() {
  const data = await chrome.storage.local.get(['sessions']);
  const sessions = data.sessions || [];
  
  if (sessions.length < 5) {
    return null;
  }
  
  // Calculate average intended vs actual time per platform
  const platformStats = {};
  sessions.forEach(session => {
    if (!platformStats[session.platform]) {
      platformStats[session.platform] = { intended: [], actual: [] };
    }
    platformStats[session.platform].intended.push(session.intendedTime);
    platformStats[session.platform].actual.push(session.actualTime);
  });
  
  const suggestions = {};
  Object.keys(platformStats).forEach(platform => {
    const stats = platformStats[platform];
    const avgIntended = stats.intended.reduce((a, b) => a + b, 0) / stats.intended.length;
    const avgActual = stats.actual.reduce((a, b) => a + b, 0) / stats.actual.length;
    
    // Suggest limit based on average actual time (rounded to nearest 5)
    if (avgActual > avgIntended) {
      suggestions[platform] = Math.round(avgActual / 5) * 5;
    }
  });
  
  return suggestions;
}

