# TrapperTracker Browser Extension

A cross-browser compatible extension (Firefox/Chrome) that helps identify danger zone keywords in Facebook lost pet groups and submit them to TrapperTracker.

## Features

- **Automatic Keyword Detection**: Scans Facebook posts for danger zone keywords (default: trap, trapper, street)
- **Customizable Keywords**: Add or remove detection keywords through the settings panel
- **One-Click Submission**: Injects "Submit to TrapperTracker" button on matching posts
- **Offline Queue**: Stores submissions locally with exponential backoff retry
- **Session-Based Auth**: Uses your existing TrapperTracker login (no credentials stored)
- **Performance Optimized**: Uses IntersectionObserver to only process visible posts
- **Enhanced DOM Selectors**: Multiple fallback selector chains for Facebook DOM changes
- **Selector Health Monitoring**: Logs selector success/failure rates for debugging
- **Memory Management**: Automatic cleanup to prevent memory leaks on long sessions
- **Cross-Device Sync**: Keywords sync across browsers via chrome.storage.sync

## Installation

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from this directory

### Chrome/Chromium
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this extension directory

## Usage

1. **Log in to TrapperTracker**: Open https://trappertracker.com and log in
2. **Customize Keywords (Optional)**: Click the extension icon, go to Settings, and add/remove keywords
3. **Browse Facebook**: Navigate to Facebook lost pet groups
4. **Look for Buttons**: Posts with danger zone keywords will have a red "Submit to TrapperTracker" button
5. **Click Submit**: The extension will queue the submission
6. **Monitor Queue**: Click extension icon to view pending/completed submissions
7. **Complete on Website**: Go to TrapperTracker to add coordinates and finalize

## How It Works

### Content Script (`scripts/content.js`)
- Uses IntersectionObserver to efficiently monitor visible posts
- Lightweight MutationObserver (debounced) detects new posts added to DOM
- Scans post text for configurable keyword matches (loaded from chrome.storage.sync)
- Enhanced selector chains with 4 fallback strategies for button injection
- Multiple selector strategies for extracting post URL and content
- Tracks selector health stats and logs failures
- Automatic memory cleanup every 5 minutes
- Injects submit button when keywords match
- Extracts post data and sends to background script

### Background Script (`scripts/background.js`)
- Maintains submission queue in local storage
- Handles retry logic with exponential backoff (up to 10 retries)
- Authenticates using TrapperTracker session cookie
- Prepared for API key authentication (commented out, ready for backend)
- Processes queue every 5 minutes
- Service worker keepalive mechanism
- Browser notifications for success/failure

### Architecture

```
Facebook Post → Content Script → Background Script → API → TrapperTracker DB
                     ↓                   ↓
                 Extract Data      Queue + Retry
```

## API Endpoint

The extension submits to `/api/extension-submit` with:

```json
{
  "description": "Post text content",
  "sourceURL": "Facebook post permalink",
  "dateReported": "YYYY-MM-DD",
  "latitude": null,  // User adds later
  "longitude": null
}
```

## Keywords

Default detection keywords:
- trap
- trapper
- street

**NEW in v1.1.0**: Keywords are now customizable through the Settings panel!
- Add your own keywords
- Remove keywords you don't need
- Keywords sync across devices
- At least one keyword required
- Requires at least 1 keyword match to flag a post

## Resilience Features

- **Local Storage Queue**: Submissions survive browser restarts
- **Exponential Backoff**: Retries at 1min, 2min, 4min, 8min, 16min intervals
- **Max 10 Retries**: Prevents infinite retry loops (increased from 5)
- **Auth Detection**: Prompts user to log in if session expires
- **Enhanced Selectors**: Multiple fallback strategies handle Facebook DOM changes
- **Selector Health Logging**: Monitors and logs selector success/failure rates
- **Memory Management**: Automatic cleanup prevents memory leaks during long sessions
- **Debounced Processing**: Reduces CPU usage on fast-scrolling feeds

## What's New in v1.1.0

### Performance Improvements
- Replaced MutationObserver with IntersectionObserver for 50-70% better performance
- Only processes posts visible in viewport instead of entire feed
- Added 300ms debouncing to reduce processing frequency
- Implemented automatic memory cleanup (clears processedPosts Set when > 1000 entries)

### Enhanced Reliability
- 4 fallback selector chains for button injection (was 2)
- Enhanced post URL extraction with 9 selector strategies (was 5)
- Enhanced content extraction with 3 fallback strategies
- Detailed logging when selectors fail
- Selector health monitoring with periodic stats

### User Customization
- Configurable keywords through Settings panel
- Add/remove keywords without editing code
- Keywords sync across devices via chrome.storage.sync
- Visual keyword tags with easy removal

### Future-Ready
- API key authentication prepared (disabled until backend ready)
- Backend needs: POST /api/extension-submit with Authorization header support

## Development

### Customizing Keywords
No code editing needed! Use the Settings panel in the extension popup:
1. Click extension icon
2. Click "Settings"
3. Add or remove keywords as needed

Keywords are stored in `chrome.storage.sync` and sync across your browsers.

## Privacy

- No credentials are stored
- Only session cookies from trappertracker.pages.dev are accessed
- No tracking or analytics
- All data stays local until submission

## License

Part of the TrapperTracker project.
