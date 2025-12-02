# ScrollSense

AI-Powered Social Media Time Management Chrome Extension

ScrollSense helps users manage social media time through AI-powered personalized interventions. It provides progressive friction (not hard blocking) to help you stay mindful of your social media usage while respecting your autonomy.

## Features

- **Session Intent Prompt** - Set your intention when opening social media (5 min / 15 min / 30 min)
- **Progressive Blur Timer** - Gradually blurs the screen after your intended time expires
- **AI-Powered Nudges** - Groq generates personalized messages based on your goals
- **Platform Detection** - Different limits for Instagram (10 min), LinkedIn (30 min), Reddit (15 min)
- **Daily Tracking** - Cumulative usage tracking across all platforms
- **Adaptive Learning** - Suggests personalized defaults after 5+ sessions

## Supported Platforms

- Instagram (instagram.com) - Focus on Reels addiction
- LinkedIn (linkedin.com) - Professional networking
- Reddit (reddit.com) - Mixed educational/entertainment

## Installation

For detailed step-by-step installation instructions, see **[INSTALLATION.md](INSTALLATION.md)**.

**Quick Start:**
1. Generate icons using `create-icons.html` (see INSTALLATION.md for details)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the ScrollSense directory
6. Configure your goals and preferences in Settings

## Setup

### Initial Configuration

1. Click the ScrollSense icon in your Chrome toolbar
2. Click the settings icon (gear) to open the options page
3. Configure your preferences:
   - **Goals Tab**: Set up to 3 personal goals (e.g., "Finish thesis", "Apply to 5 jobs")
   - **Time Limits Tab**: Set default time limits for each platform
   - **Preferences Tab**: Configure blur intensity and message tone
   - **API Settings Tab**: (Optional) Add your Groq API key for personalized AI nudges

### Groq API Setup (Optional)

1. Get your API key from the [Groq Console](https://console.groq.com/)
2. Go to Settings → API Settings
3. Enter your API key
4. Click "Save API Key"

Without an API key, ScrollSense will use fallback messages that are still personalized based on your goals.

## Usage

### Starting a Session

1. Navigate to Instagram, LinkedIn, or Reddit
2. A prompt will appear asking for your session intention
3. Select your intended time (5 min / 15 min / 30 min) or skip
4. Start browsing as normal

### During a Session

- The extension tracks your time automatically
- After your intended time expires, the screen will gradually blur
- An AI-powered nudge will appear with a personalized message
- You can:
  - Click "Done for now" to end the session
  - Click "Continue 10 more min" to extend your session

### Viewing Your Data

- Click the ScrollSense icon to see:
  - Today's total usage
  - Platform breakdown
  - Current session status
- Open Settings for detailed dashboard with:
  - Daily statistics
  - Recent sessions
  - Platform usage charts

## Design Principles

- **Progressive friction, not hard blocking** - Users can always continue
- **Non-judgmental, supportive tone** - Avoids shame-based messaging
- **Context-aware** - Different limits for different platforms
- **Privacy-focused** - All data stored locally, third-party tool not platform-integrated
- **Adaptive** - Learns from user behavior, doesn't force generic limits

## Technical Details

- **Manifest Version**: 3
- **Framework**: Vanilla JavaScript (no frameworks)
- **Storage**: chrome.storage.local
- **AI Integration**: Groq API - optional
- **Styling**: Modern CSS with gradients and animations

## File Structure

```
Scrollsense/
├── manifest.json          # Extension manifest
├── background.js          # Service worker for session tracking
├── content.js            # Content script for UI overlays
├── content.css           # Styles for content script UI
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── popup.css             # Popup styles
├── options.html          # Settings page
├── options.js            # Settings functionality
├── options.css           # Settings styles
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Privacy

- All data is stored locally on your device using Chrome's storage API
- No data is sent to external servers except for AI nudge generation (if API key is configured)
- API keys are stored locally and never shared
- Session data, goals, and preferences remain private

## Troubleshooting

### Extension not working on a platform
- Ensure you're on a supported platform (Instagram, LinkedIn, or Reddit)
- Check that the extension is enabled in `chrome://extensions/`
- Refresh the page after installing the extension

### AI nudges not personalized
- Check that you've set up goals in Settings → Goals
- Verify your API key is correct (if using Groq)
- Fallback messages will still use your goals for personalization

### Blur not appearing
- Check your blur intensity setting in Preferences
- Ensure you've exceeded your intended session time
- Try refreshing the page

## Development

### Testing

1. Load the extension in developer mode
2. Navigate to a supported platform
3. Open Chrome DevTools to see console logs
4. Check `chrome://extensions/` for any errors

### Building

No build process required - the extension uses vanilla JavaScript and can be loaded directly.

## License

This project is part of an academic research project on AI for HCI.

## Credits

Built as part of the "Scroll Sense: From User Insights to AI-Powered Design" project.
