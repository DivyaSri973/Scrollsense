# ScrollSense - Complete Installation Guide

This guide will walk you through installing and setting up the ScrollSense Chrome extension from scratch.

## Prerequisites

- Google Chrome browser (version 88 or later)
- A computer with internet access
- (Optional) Groq API key from the Groq Console for personalized AI nudges

## Step 1: Generate Extension Icons

The extension requires icon files to display in Chrome. Follow these steps:

1. **Open the icon generator**
   - Navigate to the ScrollSense folder on your computer
   - Double-click `create-icons.html` to open it in your browser (preferably Chrome or Edge)
   - You should see three canvas previews (16x16, 48x48, 128x128) with gradient clock icons
   - Icons are automatically generated when the page loads

2. **Save icons to the icons folder**

   **Option A: Automatic Save (Recommended - Chrome/Edge)**
   - Click the "Save to Icons Folder" button
   - A folder picker will appear - navigate to and select the `icons` folder inside your ScrollSense directory
   - Click "Select Folder" (or "Open")
   - The icons will be automatically saved with the correct names!
   - You should see a success message

   **Option B: Manual Download (Fallback)**
   - If the automatic save doesn't work, icons will download automatically
   - Open the `icons` folder inside the ScrollSense directory
   - Move the three downloaded PNG files into the `icons` folder
   - Make sure the files are named exactly:
     - `icon16.png`
     - `icon48.png`
     - `icon128.png`

3. **Verify icons are in place**
   - Check that the `icons` folder contains all three PNG files
   - The files should be named exactly as listed above

## Step 2: Load the Extension in Chrome

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Type `chrome://extensions/` in the address bar and press Enter
   - Or go to: Menu (three dots) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Look for a toggle switch labeled "Developer mode" in the top-right corner
   - Click the toggle to enable it (it should turn blue/on)
   - You'll see additional options appear below

3. **Load the Extension**
   - Click the "Load unpacked" button that appears
   - A file browser window will open
   - Navigate to and select the **ScrollSense folder** (the folder containing `manifest.json`)
   - Click "Select Folder" (or "Open" on Mac/Linux)

4. **Verify Installation**
   - You should see "ScrollSense" appear in your extensions list
   - The extension icon should appear in your Chrome toolbar (top right)
   - If you see any errors, check the "Errors" section below

## Step 3: Initial Configuration

### 3.1 Open the Extension

1. **Access the Popup**
   - Click the ScrollSense icon in your Chrome toolbar
   - A popup window should appear showing "Today's Usage"

2. **Open Settings**
   - Click the gear/settings icon in the popup header
   - This opens the full settings page in a new tab

### 3.2 Set Up Your Goals

1. **Navigate to Goals Tab**
   - In the settings page, click the "Goals" tab
   - You can set up to 3 personal goals

2. **Add Goals**
   - Click the "+ Add Goal" button
   - Enter a goal (e.g., "Finish thesis", "Apply to 5 jobs", "Complete project")
   - Click "Save"
   - Repeat for additional goals (up to 3 total)

**Why goals matter:** Your goals are used to personalize AI nudges and reminders.

### 3.3 Configure Time Limits (Optional)

1. **Navigate to Limits Tab**
   - Click the "Time Limits" tab in settings

2. **Set Platform Limits**
   - Adjust the default time limits for each platform:
     - **Instagram**: Default 10 minutes (focus on Reels addiction)
     - **LinkedIn**: Default 30 minutes (professional networking)
     - **Reddit**: Default 15 minutes (mixed use)
   - You can change these to match your preferences

3. **Set Daily Limit**
   - Scroll down to "Daily Limit"
   - Set your total daily time limit across all platforms (default: 120 minutes)
   - Click "Save Limits"

### 3.4 Configure Preferences (Optional)

1. **Navigate to Preferences Tab**
   - Click the "Preferences" tab

2. **Adjust Blur Intensity**
   - Use the slider to set how much the screen blurs after time limit (0-100%)
   - Default is 50%
   - Higher values = more blur

3. **Choose Message Tone**
   - Select your preferred tone for reminders:
     - **Encouraging**: "You've got this!" style messages
     - **Neutral**: Simple time check messages
     - **Direct**: "Back to work" style messages
   - Click "Save Preferences"

### 3.5 Set Up AI Integration (Optional but Recommended)

1. **Get Groq API Key**
   - Visit the [Groq Console](https://console.groq.com/)
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key (starts with `gsk-...`)

2. **Add API Key to Extension**
   - In ScrollSense settings, click the "API Settings" tab
   - Paste your API key into the "Groq API Key" field
   - Click "Save API Key"
   - You should see a success message

**Note:** Without an API key, ScrollSense will use fallback messages that are still personalized based on your goals.

## Step 4: Test the Extension

### 4.1 Test on Instagram

1. Navigate to `instagram.com` or `www.instagram.com`
2. You should see a modal popup asking "What's your intention for this session?"
3. Select one of the time options (5 min / 15 min / 30 min) or click "Skip for now"
4. Start browsing normally
5. After your intended time expires:
   - The screen should gradually blur
   - A personalized nudge message should appear
   - You can click "Done for now" or "Continue 10 more min"

### 4.2 Test on LinkedIn

1. Navigate to `linkedin.com` or `www.linkedin.com`
2. The same intent prompt should appear
3. Test the session tracking and blur functionality

### 4.3 Test on Reddit

1. Navigate to `reddit.com` or `www.reddit.com`
2. Verify the extension works correctly

### 4.4 Check the Popup

1. Click the ScrollSense icon in your toolbar
2. You should see:
   - Today's total usage
   - Platform breakdown (if you've used any platforms)
   - Current session info (if a session is active)
   - Quick action buttons

### 4.5 Check the Dashboard

1. Open Settings (gear icon in popup)
2. Click the "Dashboard" tab
3. You should see:
   - Today's summary statistics
   - Platform usage breakdown
   - Recent sessions list

## Troubleshooting

### Extension Not Appearing

**Problem:** Extension doesn't show up after loading
- **Solution:** 
  - Check that you selected the correct folder (the one containing `manifest.json`)
  - Make sure Developer mode is enabled
  - Refresh the extensions page
  - Check for error messages in red text

### Icons Not Showing

**Problem:** Extension icon is blank or shows an error icon
- **Solution:**
  - Verify the `icons` folder contains `icon16.png`, `icon48.png`, and `icon128.png`
  - Make sure file names are exactly correct (case-sensitive)
  - Regenerate icons using `create-icons.html` if needed
  - Reload the extension (click the refresh icon on the extension card)

### Intent Prompt Not Appearing

**Problem:** No modal appears when visiting Instagram/LinkedIn/Reddit
- **Solution:**
  - Make sure you're on the correct domain (instagram.com, linkedin.com, or reddit.com)
  - Refresh the page
  - Check that the extension is enabled (toggle should be on in chrome://extensions/)
  - Open Chrome DevTools (F12) and check the Console for errors
  - Try disabling and re-enabling the extension

### Blur Not Working

**Problem:** Screen doesn't blur after time limit
- **Solution:**
  - Check your blur intensity setting in Preferences (should be > 0)
  - Make sure you selected an intent time when the prompt appeared
  - Wait for the full intended time to expire
  - Check that the session is actually tracking (look at the popup)

### AI Nudges Not Personalized

**Problem:** Messages seem generic
- **Solution:**
  - Make sure you've set up goals in the Goals tab
  - If using Groq, verify your API key is correct
  - Check the API Settings tab for any error messages
  - Fallback messages will still use your goals, but may be less varied

### Data Not Saving

**Problem:** Settings or goals don't persist
- **Solution:**
  - Make sure you clicked "Save" buttons after making changes
  - Check Chrome's storage permissions (should be granted automatically)
  - Try reloading the extension
  - Clear browser cache if issues persist

### Extension Crashes or Errors

**Problem:** Extension shows errors or doesn't work
- **Solution:**
  1. Open `chrome://extensions/`
  2. Find ScrollSense
  3. Click "Errors" or the error icon
  4. Read the error message
  5. Common fixes:
     - Reload the extension (refresh icon)
     - Check that all files are present
     - Verify manifest.json is valid
     - Make sure you're using Chrome 88 or later

## Verification Checklist

After installation, verify everything works:

- [ ] Extension appears in Chrome toolbar
- [ ] Extension icon displays correctly (not blank)
- [ ] Popup opens when clicking the icon
- [ ] Settings page opens from popup
- [ ] Goals can be added and saved
- [ ] Time limits can be adjusted
- [ ] Preferences can be saved
- [ ] Intent prompt appears on Instagram
- [ ] Intent prompt appears on LinkedIn
- [ ] Intent prompt appears on Reddit
- [ ] Session tracking works (time counts up)
- [ ] Blur appears after time limit
- [ ] Nudge message appears
- [ ] Daily usage updates in popup
- [ ] Dashboard shows session history

## Next Steps

Once installation is complete:

1. **Customize Your Experience**
   - Set goals that matter to you
   - Adjust time limits based on your needs
   - Choose your preferred message tone

2. **Use the Extension Regularly**
   - The extension learns from your behavior
   - After 5+ sessions, you'll get personalized suggestions
   - Check the Dashboard regularly to see your patterns

3. **Fine-tune Settings**
   - Adjust blur intensity if it's too strong/weak
   - Modify platform limits based on actual usage
   - Update goals as your priorities change

## Uninstallation

To remove the extension:

1. Go to `chrome://extensions/`
2. Find ScrollSense
3. Click "Remove"
4. Confirm removal

**Note:** All your data (goals, sessions, preferences) is stored locally and will be deleted when you remove the extension. There's no way to recover it after removal.

## Support

If you encounter issues not covered in this guide:

1. Check the error messages in `chrome://extensions/`
2. Open Chrome DevTools (F12) and check the Console tab
3. Review the README.md for technical details
4. Check that all files are present and correctly named

## File Structure Verification

Make sure your ScrollSense folder contains:

```
Scrollsense/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup.html
├── popup.js
├── popup.css
├── options.html
├── options.js
├── options.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── INSTALLATION.md (this file)
└── create-icons.html
```

All files should be present for the extension to work properly.

---

**Congratulations!** You've successfully installed ScrollSense. Start using it on Instagram, LinkedIn, or Reddit to begin managing your social media time more mindfully.

