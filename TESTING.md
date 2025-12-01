# ScrollSense Testing Guide

## Installation Testing

1. **Load Extension**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the ScrollSense directory
   - ✅ Extension icon appears in toolbar

## Popup UI Testing

1. **Initial State**
   - Click extension icon
   - ✅ "Set Your Intention" screen appears
   - ✅ Textarea for intention is visible
   - ✅ Time limit dropdown shows options (5, 10, 15, 20, 30 minutes)
   - ✅ "Start Session" button is visible

2. **Settings Panel**
   - Click "⚙️ Settings"
   - ✅ Settings panel appears
   - ✅ Claude API key input field present
   - ✅ Enable blur checkbox (checked by default)
   - ✅ Enable nudges checkbox (checked by default)
   - ✅ "Save Settings" button works

3. **Session Management**
   - Set intention: "Check messages"
   - Select 5 minutes
   - Click "Start Session"
   - ✅ UI switches to "Active Session" view
   - ✅ Shows intention, time limit, and time spent
   - ✅ Progress bar appears
   - ✅ "End Session" button visible

## Platform Detection Testing

Test on each supported platform:

### Instagram (instagram.com)
- Navigate to instagram.com
- ✅ Content script loads (check console)
- ✅ Platform detected correctly
- Start session, wait for blur
- ✅ Blur overlay appears at 80% of time limit

### LinkedIn (linkedin.com)
- Navigate to linkedin.com
- ✅ Content script loads
- ✅ Platform detected correctly
- ✅ Overlays work correctly

### Reddit (reddit.com)
- Navigate to reddit.com
- ✅ Content script loads
- ✅ Platform detected correctly
- ✅ Overlays work correctly

### Non-supported sites
- Navigate to google.com
- ✅ Extension does nothing (no content script)

## Feature Testing

### Progressive Blur
1. Start session with 5-minute limit
2. Wait 4 minutes (80% of limit)
3. ✅ Blur overlay begins to appear
4. Continue to 5 minutes
5. ✅ Blur increases progressively
6. Continue to 6.5 minutes (130% of limit)
7. ✅ Blur reaches maximum

### AI Nudges (without API key)
1. Start session with 5-minute limit
2. Wait 5+ minutes
3. ✅ Nudge appears with default message
4. ✅ Nudge has "Reflect" and "Dismiss" buttons
5. Click "Reflect"
6. ✅ Reflection prompt shows user's intention
7. ✅ "Yes, I'm done" and "Continue" buttons work

### AI Nudges (with API key)
1. Add Claude API key in settings
2. Start session with 5-minute limit
3. Wait 5+ minutes
4. ✅ Nudge appears with personalized AI message
5. ✅ Message is supportive and non-judgmental

### Daily Statistics
1. Complete multiple sessions
2. Open popup
3. ✅ "Today's Usage" shows total minutes
4. ✅ Shows number of sessions
5. ✅ Updates after each session

### Session History
1. Complete 5+ sessions
2. Check chrome.storage.local
3. ✅ sessionHistory array contains sessions
4. ✅ Limited to 100 sessions max
5. ✅ Adaptive learning data available

## User Flow Testing

### Happy Path: 5min → 12min
1. Click extension, set intention "Check messages"
2. Select 5-minute limit
3. Click "Start Session"
4. Navigate to instagram.com
5. Scroll for 4 minutes
6. ✅ Blur starts to appear (80% threshold)
7. Continue to 5 minutes
8. ✅ Nudge appears
9. Continue to 12 minutes
10. ✅ Blur at maximum
11. ✅ Can still interact with page (no blocking)
12. Click extension, "End Session"
13. ✅ Stats updated
14. ✅ Blur removed

## Storage Testing

1. Open Chrome DevTools
2. Go to Application → Storage → Local Storage → chrome-extension://[id]
3. ✅ currentSession stored during active session
4. ✅ settings stored
5. ✅ sessionHistory array present
6. ✅ dailyStats object with dates

## Edge Cases

### Multiple Tabs
1. Start session
2. Open multiple social media tabs
3. ✅ Each tab receives session state
4. ✅ Blur appears on all tabs at appropriate time
5. ✅ Nudge appears only once

### Session Cleanup
1. Start session
2. Close all social media tabs
3. Wait 5+ minutes
4. Open new social media tab
5. ✅ Session still active
6. ✅ Blur/nudge state correct based on elapsed time

### Long Sessions
1. Start 5-minute session
2. Leave for 30 minutes
3. Return to social media
4. ✅ Blur at maximum
5. ✅ Time tracking accurate

## Performance

1. ✅ Content script doesn't slow page load
2. ✅ No console errors
3. ✅ Blur transitions are smooth
4. ✅ Storage operations are async (no blocking)

## Security

1. ✅ No URL validation issues (CodeQL clean)
2. ✅ API key stored securely in chrome.storage
3. ✅ No external requests without API key
4. ✅ XSS protection (escapeHtml in content.js)
5. ✅ Proper hostname validation

## Browser Compatibility

- ✅ Chrome latest version
- ✅ Works with Manifest V3
- ✅ Service worker (not background page)

## Known Limitations

- Extension only works on specified platforms
- Requires manual session start (intentional design)
- AI nudges require Claude API key (optional)
- No cross-device sync (local storage only)
