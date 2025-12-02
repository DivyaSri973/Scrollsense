# ScrollSense Quick Start Guide

## Installation Steps

1. **Generate Icons** (First time only)
   - Open `create-icons.html` in Chrome or Edge
   - Icons generate automatically on load
   - Click "Save to Icons Folder" and select the `icons/` directory (fallback: downloads)

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the ScrollSense folder
   - The extension should now be installed

3. **Initial Setup**
   - Click the ScrollSense icon in your Chrome toolbar
   - Click the settings (gear) icon
   - Go to the "Goals" tab and add 1-3 personal goals
   - (Optional) Go to "API Settings" and add your Groq API key

## Testing the Extension

1. **Test Intent Prompt**
   - Navigate to `instagram.com`, `linkedin.com`, or `reddit.com`
   - You should see a modal asking for your session intention
   - Select a time option (5 min / 15 min / 30 min)

2. **Test Progressive Blur**
   - Wait for your intended time to expire
   - The screen should gradually blur
   - A nudge message should appear

3. **Test Popup**
   - Click the ScrollSense icon in the toolbar
   - You should see today's usage and current session info

4. **Test Settings**
   - Open Settings from the popup
   - Try changing time limits, preferences, and goals
   - Check the Dashboard tab to see your usage data

## Common Issues

**Extension not working on a page:**
- Make sure you're on a supported platform (instagram.com, linkedin.com, or reddit.com)
- Refresh the page after installing
- Check `chrome://extensions/` for any errors

**Icons not showing:**
- Make sure you've generated and placed the icon files in the `icons/` directory
- The files should be named exactly: `icon16.png`, `icon48.png`, `icon128.png`

**AI nudges not working:**
- Check that you've set up goals in Settings
- If using Groq, verify your API key is correct
- Fallback messages will still work without an API key

## Next Steps

- Customize the UI colors and styling in the CSS files
- Replace placeholder icons with professional designs
- Test on different platforms and adjust as needed
- Review the code and customize for your specific needs

