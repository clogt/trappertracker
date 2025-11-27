# TrapperTracker Browser Extension

A cross-browser compatible extension (Firefox/Chrome) that helps identify danger zone keywords in Facebook lost pet groups and submit them to TrapperTracker.

## Features

- **Automatic Keyword Detection**: Scans Facebook posts for danger zone keywords (trap, trapper, street)
- **One-Click Submission**: Injects "Submit to TrapperTracker" button on matching posts
- **Offline Queue**: Stores submissions locally with exponential backoff retry
- **Session-Based Auth**: Uses your existing TrapperTracker login (no credentials stored)
- **MutationObserver**: Continuously monitors feed as you scroll

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

1. **Log in to TrapperTracker**: Open https://trappertracker.pages.dev and log in
2. **Browse Facebook**: Navigate to Facebook lost pet groups
3. **Look for Buttons**: Posts with danger zone keywords will have a red "Submit to TrapperTracker" button
4. **Click Submit**: The extension will queue the submission
5. **Complete on Website**: Go to TrapperTracker to add coordinates and finalize

## How It Works

### Content Script (`scripts/content.js`)
- Uses MutationObserver to watch for new Facebook posts
- Scans post text for keyword combinations
- Injects submit button when 2+ keywords match
- Extracts post data and sends to background script

### Background Script (`scripts/background.js`)
- Maintains submission queue in local storage
- Handles retry logic with exponential backoff
- Authenticates using TrapperTracker session cookie
- Processes queue every 5 minutes

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

Current detection keywords:
- trap
- trapper
- street

Requires at least 2 matches to flag a post.

## Resilience Features

- **Local Storage Queue**: Submissions survive browser restarts
- **Exponential Backoff**: Retries at 1min, 2min, 4min, 8min, 16min intervals
- **Max 5 Retries**: Prevents infinite retry loops
- **Auth Detection**: Prompts user to log in if session expires

## Development

To modify keywords, edit the `KEYWORDS` array in `scripts/content.js`:

```javascript
const KEYWORDS = ['trap', 'trapper', 'street', 'bait'];
```

## Privacy

- No credentials are stored
- Only session cookies from trappertracker.pages.dev are accessed
- No tracking or analytics
- All data stays local until submission

## License

Part of the TrapperTracker project.
