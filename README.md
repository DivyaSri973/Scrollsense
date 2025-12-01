# ScrollSense 🧘

A Chrome extension for mindful social media time management with AI-powered supportive nudges.

## Features

- **Session Intent Prompts**: Set your intention before browsing social media
- **Progressive Blur Overlays**: Visual feedback as you approach your time limit
- **AI-Powered Nudges**: Personalized, supportive messages from Claude API
- **Platform Detection**: Works on Instagram, LinkedIn, and Reddit
- **Daily Usage Tracking**: Monitor your social media time
- **Adaptive Learning**: Personalized suggestions after 5+ sessions
- **No Hard Blocking**: Supportive approach, never forced interruptions

## How It Works

1. **Set Your Intention**: Before browsing, set what you want to accomplish and a time limit (e.g., "Check messages for 5 minutes")
2. **Browse Mindfully**: The extension tracks your time on supported platforms
3. **Progressive Feedback**: At 80% of your time limit, a gentle blur overlay begins to appear
4. **Supportive Nudge**: When you exceed your limit, receive a personalized AI message
5. **Reflect**: Consider whether you've accomplished your intention

### Example Flow
- User sets intention: "Check messages" with 5-minute limit
- User scrolls for 12 minutes
- Blur overlay activates at 4 minutes (80% of limit)
- AI nudge appears at 5 minutes with supportive message
- No hard blocking - user remains in control

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/DivyaSri973/Scrollsense.git
cd Scrollsense
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the `Scrollsense` directory

5. The extension icon should appear in your toolbar

## Configuration

### Claude API Key (Optional)

For personalized AI nudges, add your Claude API key:

1. Click the ScrollSense extension icon
2. Click "⚙️ Settings"
3. Enter your Claude API key (get one from https://console.anthropic.com/)
4. Click "Save Settings"

Without an API key, the extension uses friendly default messages.

### Settings

- **Enable progressive blur**: Visual feedback as time limit approaches
- **Enable AI nudges**: Personalized supportive messages
- **Claude API Key**: For AI-powered personalization

## Supported Platforms

- Instagram (instagram.com)
- LinkedIn (linkedin.com)
- Reddit (reddit.com)

## Technology Stack

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No framework dependencies
- **chrome.storage.local**: Local data persistence
- **Claude API**: AI-powered personalized nudges
- **Progressive Web Standards**: Modern CSS and DOM APIs

## Privacy & Data

- All data stored locally using `chrome.storage.local`
- No data sent to external servers (except Claude API if configured)
- Session history limited to last 100 sessions
- Daily stats limited to last 30 days
- No tracking or analytics

## Development

### File Structure

```
Scrollsense/
├── manifest.json         # Extension manifest (V3)
├── background.js         # Service worker for session management
├── content.js           # Content script for blur/nudges
├── content.css          # Styles for overlays and nudges
├── popup.html           # Extension popup UI
├── popup.css            # Popup styles
├── popup.js             # Popup logic
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Components

**Background Service Worker** (`background.js`)
- Manages session state
- Platform detection
- Periodic session checks
- Claude API integration

**Content Script** (`content.js`)
- Runs on social media platforms
- Implements progressive blur
- Displays AI nudges
- Tracks user activity

**Popup UI** (`popup.html`, `popup.js`, `popup.css`)
- Session intention setup
- Active session monitoring
- Daily statistics
- Settings management

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with supportive digital wellness principles - helping users build healthier social media habits through gentle guidance, not restriction.