/**
 * ============================================================================
 * SCROLLSENSE - Background Service Worker
 * ============================================================================
 * 
 * This file serves as the background service worker for the ScrollSense
 * Chrome extension. It handles:
 * 
 * 1. SESSION MANAGEMENT
 *    - Starting and ending user sessions
 *    - Tracking session duration and intent
 *    - Storing session history
 * 
 * 2. DATA PERSISTENCE
 *    - Managing chrome.storage.local for all user data
 *    - Daily usage tracking and reset
 *    - Platform-specific statistics
 * 
 * 3. AI INTEGRATION
 *    - Generating personalized nudge messages via Groq API
 *    - Analyzing usage trends with AI
 *    - Providing fallback messages when API unavailable
 * 
 * 4. TAB MONITORING
 *    - Detecting supported platforms (Instagram, LinkedIn, Reddit)
 *    - Tracking tab changes and updates
 * 
 * ARCHITECTURE:
 * - Uses Chrome Extension Manifest V3
 * - Communicates with content.js via chrome.runtime messaging
 * - Stores data in chrome.storage.local (all data stays on user's device)
 * 
 * @author ScrollSense Team
 * @version 1.0.0
 * ============================================================================
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Default time limits for each platform (in minutes)
 * These values are used when user hasn't set custom limits
 */
const DEFAULT_PLATFORM_LIMITS = {
  instagram: 10,  // Instagram tends to be more addictive (Reels)
  linkedin: 30,   // LinkedIn is more professional/purposeful
  reddit: 15      // Reddit is mixed educational/entertainment
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize extension storage on first install
 * Sets up default values for all user preferences and data
 * This runs only once when the extension is first installed
 */
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([
    'userGoals',
    'platformLimits',
    'sessions',
    'dailyUsage',
    'preferences',
    'currentSession'
  ]);

  // Only set defaults if this is a fresh install (no existing data)
  if (!data.userGoals) {
    await chrome.storage.local.set({
      userGoals: [],                              // User's personal goals (up to 3)
      platformLimits: DEFAULT_PLATFORM_LIMITS,   // Time limits per platform
      sessions: [],                              // Session history array
      dailyUsage: {},                            // Today's usage stats
      preferences: {
        blurIntensity: 50,                       // Blur effect strength (0-100%)
        messageTone: 'encouraging',              // AI message tone
        dailyLimit: 120                          // Total daily limit across all platforms
      },
      currentSession: null                       // Active session data
    });
  }
});

// ============================================================================
// TAB MONITORING
// ============================================================================

/**
 * Listen for tab activation changes
 * Triggered when user switches between tabs
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await handleTabChange(tab);
});

/**
 * Listen for tab URL updates
 * Triggered when a tab navigates to a new URL
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await handleTabChange(tab);
  }
});

/**
 * Handle tab changes - detect platform and prepare for session
 * @param {chrome.tabs.Tab} tab - The tab that was activated or updated
 */
async function handleTabChange(tab) {
  const platform = detectPlatform(tab.url);
  if (!platform) return;

  const data = await chrome.storage.local.get(['currentSession', 'platformLimits']);
  
  // Check if we need to start a new session
  if (!data.currentSession || data.currentSession.platform !== platform) {
    // Reset daily usage if it's a new day
    await resetDailyUsageIfNeeded();
    
    // Store platform info for content script to use
    await chrome.storage.local.set({
      currentPlatform: platform,
      sessionStartTime: Date.now()
    });
  }
}

/**
 * Detect which supported platform a URL belongs to
 * @param {string} url - The URL to check
 * @returns {string|null} - Platform name or null if not supported
 */
function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('reddit.com')) return 'reddit';
  return null;
}

// ============================================================================
// DAILY USAGE MANAGEMENT
// ============================================================================

/**
 * Reset daily usage statistics if it's a new day
 * Compares today's date with the last reset date
 * Automatically resets at midnight
 */
async function resetDailyUsageIfNeeded() {
  const data = await chrome.storage.local.get(['dailyUsage']);
  const today = new Date().toDateString();
  const lastReset = data.dailyUsage?.lastReset;
  
  // If the stored date doesn't match today, reset all counters
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

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Central message handler for all communication from content scripts and popup
 * Routes different action types to appropriate handler functions
 * 
 * Actions supported:
 * - startSession: Begin a new timed session
 * - endSession: End current session and save data
 * - getAINudge: Get AI-generated reminder message
 * - updateDailyUsage: Update usage statistics
 * - analyzeTrends: Get AI analysis of usage patterns
 */
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
  
  if (request.action === 'analyzeTrends') {
    analyzeTrendsWithAI(request.data).then(sendResponse);
    return true;
  }
});

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Start a new session with user's intended duration
 * @param {number} intent - Intended session duration in minutes
 * @param {string} platform - Platform name (instagram, linkedin, reddit)
 * @returns {Object} - Success status
 */
async function startSession(intent, platform) {
  const session = {
    platform,
    intent,
    startTime: Date.now(),
    intendedTime: intent * 60000 // Convert minutes to milliseconds
  };
  
  await chrome.storage.local.set({ currentSession: session });
  return { success: true };
}

/**
 * End current session and save to history
 * @param {string} platform - Platform name
 * @param {number} actualTime - Actual time spent in milliseconds
 * @returns {Object} - Success status
 */
async function endSession(platform, actualTime) {
  const data = await chrome.storage.local.get(['currentSession', 'sessions', 'dailyUsage']);
  const session = data.currentSession;
  
  if (session) {
    // Create session record for history
    const sessionData = {
      platform: session.platform,
      intendedTime: session.intent,
      actualTime: Math.round(actualTime / 60000), // Convert milliseconds to minutes
      date: new Date().toISOString()
    };
    
    const sessions = data.sessions || [];
    sessions.push(sessionData);
    
    // Keep only last 100 sessions to prevent storage bloat
    if (sessions.length > 100) {
      sessions.shift();
    }
    
    await chrome.storage.local.set({
      sessions,
      currentSession: null
    });
    
    // Update daily usage statistics
    await updateDailyUsage(platform, sessionData.actualTime);
  }
  
  return { success: true };
}

/**
 * Update daily usage statistics for a platform
 * @param {string} platform - Platform name
 * @param {number} minutes - Minutes to add
 * @returns {Object} - Updated daily usage object
 */
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
  
  // Add minutes to specific platform and recalculate total
  dailyUsage[platform] = (dailyUsage[platform] || 0) + minutes;
  dailyUsage.total = (dailyUsage.instagram || 0) + (dailyUsage.linkedin || 0) + (dailyUsage.reddit || 0);
  
  await chrome.storage.local.set({ dailyUsage });
  return dailyUsage;
}

// ============================================================================
// AI INTEGRATION - NUDGE MESSAGES
// ============================================================================

/**
 * Get AI-generated nudge message using Groq API
 * Falls back to local messages if API unavailable
 * 
 * @param {number} intendedTime - User's intended session duration (0 for post-session)
 * @param {number} actualTime - Actual time spent
 * @param {string} userGoal - User's current goal
 * @param {string} tone - Message tone (encouraging, neutral, direct)
 * @returns {string} - Generated nudge message
 */
async function getAINudge(intendedTime, actualTime, userGoal, tone) {
  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  // Get user preferences and API key
  const data = await chrome.storage.local.get(['preferences', 'apiKey']);
  const preferences = data.preferences || {};
  const API_KEY = data.apiKey;
  const messageTone = tone || preferences.messageTone || 'encouraging';
  
  // If no API key, use fallback messages
  if (!API_KEY) {
    return generateFallbackMessage(intendedTime, actualTime, userGoal, messageTone);
  }
  
  // Build appropriate prompt based on context
  let prompt;
  if (intendedTime === 0) {
    // Post-session context: User is browsing after session ended
    prompt = `Generate a supportive, non-judgmental reminder for a user who has been scrolling for ${actualTime} minutes after their session ended. Their current goal is: ${userGoal || 'managing social media time'}. Encourage them to start a new mindful session. Keep the message under 20 words, with a ${messageTone} tone.`;
  } else {
    // Active session context: User exceeded intended time
    prompt = `Generate a supportive, non-judgmental reminder for a user who planned to scroll ${intendedTime} minutes but has been scrolling ${actualTime} minutes. Their current goal is: ${userGoal || 'managing social media time'}. Keep the message under 20 words, with a ${messageTone} tone.`;
  }
  
  try {
    // Make API request to Groq
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast, reliable model
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
        temperature: 0.7,  // Some creativity but not too random
        max_tokens: 60     // Keep responses short
      })
    });
    
    // Handle API errors
    if (!response.ok) {
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
    
    // Extract message from response
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

/**
 * Generate fallback message when AI API is unavailable
 * Provides varied, personalized messages based on context
 * 
 * @param {number} intendedTime - Intended session duration (0 for post-session)
 * @param {number} actualTime - Actual time spent
 * @param {string} userGoal - User's goal
 * @param {string} tone - Message tone
 * @returns {string} - Generated message
 */
function generateFallbackMessage(intendedTime, actualTime, userGoal, tone) {
  const overTime = actualTime - intendedTime;
  const goal = userGoal || 'your goals';
  
  // Message templates organized by context and tone
  let messages;
  if (intendedTime === 0) {
    // POST-SESSION MESSAGES
    // User is browsing after their session ended, no active session
    messages = {
      encouraging: [
        `Hey! ${actualTime} minutes since your session. "${goal}" is waiting for your awesome focus! 🌟`,
        `Quick check-in: ${actualTime} min of scrolling. Ready to tackle "${goal}"? You've got this! 💪`,
        `${actualTime} minutes browsing time! How about channeling that energy into "${goal}"? ✨`,
        `Time flies! ${actualTime} min already. "${goal}" would love your attention right about now! 🎯`,
        `Friendly nudge: ${actualTime} min scrolled. Your future self will thank you for working on "${goal}"! 🙌`
      ],
      neutral: [
        `You've been browsing for ${actualTime} minutes since your session ended.`,
        `Time check: ${actualTime} min. Your goal "${goal}" is still there.`,
        `${actualTime} minutes of scrolling. Consider setting a new intention.`,
        `Quick update: ${actualTime} min browsing time logged.`,
        `Checking in: ${actualTime} minutes since your last session.`
      ],
      direct: [
        `${actualTime} minutes scrolling. Time for "${goal}".`,
        `${actualTime} min up. Back to "${goal}"?`,
        `Heads up: ${actualTime} min since session. "${goal}" awaits.`,
        `${actualTime} minutes. Start a new session or switch to "${goal}".`,
        `Time check: ${actualTime} min. Ready to refocus?`
      ]
    };
  } else {
    // ACTIVE SESSION MESSAGES
    // User exceeded their intended time during an active session
    const overTimeText = overTime > 0 ? ` (${overTime} min over)` : '';
    messages = {
      encouraging: [
        `${actualTime} minutes in${overTimeText}! "${goal}" is calling your name - you've totally got this! 🌟`,
        `Hey there! ${actualTime} min scrolled. Ready to show "${goal}" what you're made of? 💪`,
        `Time check: ${actualTime} min! Your awesome goal "${goal}" could use your energy right now! ✨`,
        `${actualTime} minutes of scrolling${overTimeText}. "${goal}" believes in you - time to make it happen! 🎯`,
        `Quick nudge: ${actualTime} min! How about we crush "${goal}" together? You're doing great! 🙌`
      ],
      neutral: [
        `You've been scrolling for ${actualTime} minutes${overTimeText}.`,
        `Session update: ${actualTime} min elapsed. Goal: "${goal}".`,
        `Time check: ${actualTime} minutes${overTimeText}. Your goal is "${goal}".`,
        `${actualTime} min on this session. Planned: ${intendedTime} min.`,
        `Current session: ${actualTime} minutes. Remember: "${goal}".`
      ],
      direct: [
        `${actualTime} min${overTimeText}. Time for "${goal}".`,
        `Session at ${actualTime} min. Back to "${goal}".`,
        `${actualTime} minutes scrolled. "${goal}" is waiting.`,
        `Time's up at ${actualTime} min. Focus on "${goal}".`,
        `${actualTime} min${overTimeText}. Let's switch to "${goal}".`
      ]
    };
  }
  
  // Select random message from appropriate tone category
  const toneMessages = messages[tone] || messages.encouraging;
  return toneMessages[Math.floor(Math.random() * toneMessages.length)];
}

// ============================================================================
// AI INTEGRATION - TREND ANALYSIS
// ============================================================================

/**
 * Analyze user's usage trends using AI
 * Provides personalized insights about usage patterns
 * Used in the AI Insights tab of the options page
 * 
 * @param {Object} usageData - Weekly usage data summary
 * @returns {Object} - Analysis result with success status
 */
async function analyzeTrendsWithAI(usageData) {
  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  const data = await chrome.storage.local.get(['apiKey', 'userGoals']);
  const API_KEY = data.apiKey;
  const userGoals = data.userGoals || [];
  
  // Can't analyze without API key
  if (!API_KEY) {
    return { analysis: null, error: 'No API key configured' };
  }
  
  // Build detailed prompt with user's data
  const platformSummary = Object.entries(usageData.platforms)
    .map(([platform, stats]) => `${platform}: ${stats.total}min total, ${stats.overtime}min overtime, ${stats.sessions} sessions`)
    .join('; ');
  
  const prompt = `You are ScrollSense, an AI assistant helping users understand their social media usage patterns. Analyze this week's usage data and provide personalized insights.

User's Data Summary:
- Total weekly screen time: ${usageData.weeklyTotalMinutes} minutes (${Math.round(usageData.weeklyTotalMinutes / 60 * 10) / 10} hours)
- Average daily usage: ${usageData.averageDailyMinutes} minutes
- Total sessions this week: ${usageData.totalSessions}
- Goal adherence rate: ${usageData.goalAdherenceAvg}%
- Peak usage hours: ${usageData.peakUsageHours.join(', ')}
- Platform breakdown: ${platformSummary}
${userGoals.length > 0 ? `- User's stated goals: ${userGoals.join(', ')}` : ''}

Please provide a brief, friendly analysis (max 200 words) covering:
1. A key observation about their usage pattern
2. What's going well (if anything)
3. One specific area for improvement
4. A practical, actionable tip

Keep the tone supportive and non-judgmental. Use simple language and be encouraging. Don't use bullet points - write in short paragraphs.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are ScrollSense, a friendly and supportive AI that helps users build healthier social media habits. You provide insightful, personalized analysis without being preachy or judgmental.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });
    
    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        console.error('Groq API error:', errorData);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content?.trim();
    
    if (analysis) {
      return { analysis, success: true };
    }
    
    throw new Error('Empty response from AI');
  } catch (error) {
    console.error('AI trend analysis error:', error);
    return { analysis: null, error: error.message };
  }
}

// ============================================================================
// ADAPTIVE SUGGESTIONS
// ============================================================================

/**
 * Generate adaptive time limit suggestions based on user behavior
 * Analyzes past sessions to suggest more realistic limits
 * Only activates after 5+ sessions to have enough data
 * 
 * @returns {Object|null} - Suggested limits per platform or null if not enough data
 */
async function getAdaptiveSuggestions() {
  const data = await chrome.storage.local.get(['sessions']);
  const sessions = data.sessions || [];
  
  // Need at least 5 sessions for meaningful suggestions
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
  
  // Generate suggestions for platforms where user consistently exceeds intent
  const suggestions = {};
  Object.keys(platformStats).forEach(platform => {
    const stats = platformStats[platform];
    const avgIntended = stats.intended.reduce((a, b) => a + b, 0) / stats.intended.length;
    const avgActual = stats.actual.reduce((a, b) => a + b, 0) / stats.actual.length;
    
    // If actual time consistently exceeds intended, suggest higher limit
    if (avgActual > avgIntended) {
      suggestions[platform] = Math.round(avgActual / 5) * 5; // Round to nearest 5
    }
  });
  
  return suggestions;
}
