# TrapperTracker Extension Testing Guide

## Installation Instructions

### Firefox Installation

1. Open Firefox browser
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `/home/hobo/Desktop/tt/extension/`
5. Select the `manifest.json` file
6. Extension will load and appear in your toolbar

**Note:** Temporary extensions in Firefox are removed when the browser closes. You'll need to reload it each session during development.

### Chrome Installation

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `/home/hobo/Desktop/tt/extension/` directory
6. Extension will load and appear in your toolbar

**Note:** Chrome retains unpacked extensions between sessions.

---

## Pre-Testing Setup

### 1. Verify You're Logged Into TrapperTracker

Before testing, ensure you're authenticated:

1. Open `https://trappertracker.com` in your browser
2. Log in with your credentials
3. Verify you can access the dashboard and pending submissions page

**Why this matters:** The extension uses your TrapperTracker session cookie to authenticate API requests. Without authentication, submissions will be marked as `auth_required` and won't be processed.

### 2. Check Browser Console

Open the browser console to monitor extension activity:

- **Firefox:** `Ctrl+Shift+K` (Linux/Windows) or `Cmd+Option+K` (Mac)
- **Chrome:** `Ctrl+Shift+J` (Linux/Windows) or `Cmd+Option+J` (Mac)

Look for these console messages:
```
TrapperTracker Extension: Background script loaded
TrapperTracker Extension: Content script loaded
```

If you don't see these, the extension didn't load properly.

---

## Testing Scenarios

### Test 1: Extension Loads Without Errors

**Objective:** Verify the extension initializes properly.

**Steps:**
1. Install the extension (see Installation Instructions above)
2. Open browser console (`F12`)
3. Check for errors in the console

**Expected Results:**
- No red error messages in console
- Console shows: `TrapperTracker Extension: Background script loaded`
- Extension icon appears in toolbar
- Clicking icon opens popup with stats (all zeros initially)

**Common Issues:**
- **Error: "Failed to load service worker"** - Manifest syntax error (should be fixed)
- **Error: "Could not load icon"** - Missing icon files in `/extension/icons/`
- **No console messages** - Extension didn't load; check manifest.json for syntax errors

---

### Test 2: Keyword Detection on Facebook

**Objective:** Verify the content script detects danger zone keywords in Facebook posts.

**Prerequisites:**
- Logged into Facebook
- Member of at least one pet-related Facebook group

**Steps:**
1. Navigate to `https://www.facebook.com`
2. Open browser console
3. Scroll through your feed or group posts
4. Look for posts containing keywords: "trap", "trapper", "street"

**Expected Results:**
- Console shows: `TrapperTracker Extension: Content script loaded`
- Console shows: `TrapperTracker: MutationObserver started`
- When a post with 2+ keywords is found, console shows: `TrapperTracker: Keyword match found in post: [post-id]`
- A red "Submit to TrapperTracker" button appears on matching posts

**Test Cases:**

| Post Text | Should Match? | Why |
|-----------|---------------|-----|
| "Cat found on Main Street near the trapper" | YES | Contains "street" + "trapper" (2 keywords) |
| "Lost dog, last seen near trap on Oak Street" | YES | Contains "trap" + "street" (2 keywords) |
| "Found a cat on the street" | NO | Only "street" (1 keyword) |
| "My cat was trapped by animal control" | NO | Only "trap" (1 keyword) |
| "Street trapper caught three cats this morning" | YES | Contains "street" + "trapper" (2 keywords) |

**Manual Testing (if no matching posts found naturally):**

Create a test post in a group you admin:
```
TEST POST: Found a cat on Main Street this morning. Worried about the trapper in the area.
```

**Common Issues:**
- **Button doesn't appear:** Check if post actually contains 2+ keywords
- **Content script not loading:** Extension might not have permission for facebook.com
- **Button appears in wrong location:** Facebook's DOM structure varies; this is a known issue

---

### Test 3: Submit Button Click and Queue

**Objective:** Verify clicking the submit button extracts post data and adds to queue.

**Steps:**
1. Find a post with the "Submit to TrapperTracker" button (see Test 2)
2. Open browser console
3. Click the "Submit to TrapperTracker" button
4. Watch console messages

**Expected Results:**
- Button text changes to "Extracting..."
- Console shows: `TrapperTracker: Extracted post data:` followed by object with:
  - `description`: Post text (up to 1000 chars)
  - `sourceURL`: Facebook post URL
  - `dateReported`: Date in YYYY-MM-DD format
  - `extractedAt`: ISO timestamp
- Console shows: `TrapperTracker: Added to queue: [submission-id]`
- Button text changes to "Queued" briefly, then back to "Submit to TrapperTracker"

**Data Validation Checks:**
- `description` should contain actual post text (not empty)
- `sourceURL` should be a valid Facebook post URL (not just facebook.com)
- `dateReported` should be reasonable (not far in future)

**Common Issues:**
- **Button shows "Error":** Check console for error messages
- **Empty description:** Facebook's DOM selectors may have changed
- **Wrong sourceURL:** Extension couldn't find the post permalink

---

### Test 4: Background Queue Processing

**Objective:** Verify the background script processes the submission queue and sends to API.

**Prerequisites:**
- Completed Test 3 (submission in queue)
- Logged into TrapperTracker at `https://trappertracker.com`

**Steps:**
1. After clicking submit (Test 3), check browser console
2. Look for background script messages
3. Open extension popup (click extension icon)
4. Check stats display

**Expected Results:**

**In Console:**
```
TrapperTracker: Attempting submission [id] (attempt 1)
TrapperTracker: Submission [id] successful
```

**In Extension Popup:**
- Total Found: 1
- Submitted: 1
- Pending: 0
- Failed: 0

**Verify on TrapperTracker:**
1. Open `https://trappertracker.com/pending-submissions.html`
2. You should see the submitted post in the table
3. Coordinates should be empty (extension doesn't submit coordinates)

**Common Issues:**
- **"User not logged in to TrapperTracker":** Not authenticated; log into trappertracker.com
- **"Authentication failed" (401):** Cookie extraction failed; see Authentication Debugging below
- **"API returned 500":** Backend error; check server logs
- **Submission stuck in "Pending":** Network error or API endpoint unreachable

---

### Test 5: Authentication Cookie Extraction

**Objective:** Verify the extension can extract session cookies from trappertracker.com.

**Steps:**
1. Ensure you're logged into `https://trappertracker.com`
2. Open browser console
3. Run this test in console (paste and press Enter):

```javascript
// For Chrome/Firefox
chrome.cookies.getAll({domain: 'trappertracker.com'}, (cookies) => {
    console.log('TrapperTracker cookies:', cookies);
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
    if (sessionCookie) {
        console.log('Found session cookie:', sessionCookie.name);
    } else {
        console.error('No session cookie found!');
    }
});
```

**Expected Results:**
- Console shows array of cookies from trappertracker.com
- Console shows: `Found session cookie: [cookie-name]`

**Common Issues:**
- **"No session cookie found!":**
  - Not logged into TrapperTracker
  - Cookie name doesn't contain "session" or "auth"
  - Cookie is set for wrong domain (check backend session management)
- **Empty cookies array:**
  - Missing host_permissions in manifest.json (should already have it)
  - Browser blocked third-party cookies

**Cookie Name Verification:**

If the session cookie has a different name, you'll need to update `background.js`:

```javascript
// Line 183 in background.js
const sessionCookie = cookies.find(c => c.name === 'YOUR_ACTUAL_COOKIE_NAME');
```

---

### Test 6: Popup UI and Stats Display

**Objective:** Verify the extension popup correctly displays statistics.

**Steps:**
1. Click the extension icon in toolbar
2. Popup should open
3. Check stats display
4. Click "Retry Failed Submissions" button
5. Click "Open TrapperTracker" button

**Expected Results:**
- Popup opens with current stats
- Stats match actual submission counts
- "Retry Failed Submissions" button triggers queue reprocessing
- "Open TrapperTracker" button opens `https://trappertracker.com` in new tab

**Test with Various States:**

**After Fresh Install:**
- All stats should be 0
- No auth warning visible

**After Successful Submission:**
- Total Found: 1+
- Submitted: 1+
- Pending: 0
- Failed: 0

**After Failed Submission (not logged in):**
- Auth warning should appear: "Please log in to TrapperTracker to submit danger zones"
- Pending count should show failed submissions

---

### Test 7: Retry Logic and Exponential Backoff

**Objective:** Verify failed submissions are retried with exponential backoff.

**Setup:**
1. Log out of TrapperTracker (to force failure)
2. Submit a post via extension
3. Monitor retry behavior

**Steps:**
1. Submit a post (it should fail with auth error)
2. Check console for retry scheduling
3. Wait for retry attempts

**Expected Results:**
```
TrapperTracker: Attempting submission [id] (attempt 1)
TrapperTracker: Authentication failed
TrapperTracker: Scheduled retry in 1 minutes

[After 1 minute]
TrapperTracker: Retry alarm triggered
TrapperTracker: Attempting submission [id] (attempt 2)
TrapperTracker: Authentication failed
TrapperTracker: Scheduled retry in 2 minutes

[After 2 minutes]
TrapperTracker: Retry alarm triggered
TrapperTracker: Attempting submission [id] (attempt 3)
...
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: +1 minute
- Attempt 3: +2 minutes
- Attempt 4: +4 minutes
- Attempt 5: +8 minutes
- After 5 attempts: Marked as "failed"

**To Test Success After Retry:**
1. Log back into TrapperTracker
2. Wait for next retry alarm
3. Submission should succeed

---

### Test 8: Multiple Submissions and Queue Management

**Objective:** Verify the extension handles multiple submissions properly.

**Steps:**
1. Find 3-5 posts with danger zone keywords
2. Click "Submit to TrapperTracker" on each
3. Open extension popup
4. Check queue processing

**Expected Results:**
- All submissions added to queue
- Background script processes them sequentially
- 500ms delay between submissions (rate limiting)
- All appear in pending submissions on TrapperTracker

**Monitor in Console:**
```
TrapperTracker: Processing 5 pending submissions
TrapperTracker: Attempting submission [id-1] (attempt 1)
TrapperTracker: Submission [id-1] successful
[500ms delay]
TrapperTracker: Attempting submission [id-2] (attempt 1)
TrapperTracker: Submission [id-2] successful
...
```

---

## Debugging Tips

### Extension Not Loading

**Check:**
1. Manifest.json syntax (use JSON validator)
2. File paths in manifest match actual files
3. Browser console for load errors

**Common Fixes:**
- Reload extension: `about:debugging` (Firefox) or `chrome://extensions/` (Chrome)
- Check file permissions (should be readable)
- Remove and re-add extension

### Content Script Not Injecting Button

**Check:**
1. Facebook page loaded completely
2. Console shows "Content script loaded"
3. Posts actually contain 2+ keywords
4. Facebook didn't change DOM structure

**Debug in Console:**
```javascript
// Check if content script loaded
console.log('Content script test');

// Manually check for posts
document.querySelectorAll('[role="article"]').length

// Manually check post text
const posts = document.querySelectorAll('[role="article"]');
posts.forEach(post => console.log(post.textContent));
```

### Background Script Not Submitting

**Check:**
1. Background script loaded (check console)
2. Queue has items: Open extension popup and check stats
3. Authentication cookie exists (see Test 5)
4. API endpoint is reachable

**Debug in Console:**
```javascript
// Check storage
chrome.storage.local.get(['submissionQueue', 'stats'], (result) => {
    console.log('Queue:', result.submissionQueue);
    console.log('Stats:', result.stats);
});

// Manually trigger queue processing
chrome.runtime.sendMessage({ action: 'retryFailed' });
```

### Authentication Issues

**Check:**
1. Logged into trappertracker.com
2. Cookie domain matches (should be `trappertracker.com`)
3. Cookie name contains "session" or "auth"
4. Cookie hasn't expired

**Debug:**
```javascript
// Check all cookies
chrome.cookies.getAll({domain: 'trappertracker.com'}, (cookies) => {
    console.table(cookies);
});
```

**If cookie name is different:**
Update line 183 in `/home/hobo/Desktop/tt/extension/scripts/background.js`:
```javascript
const sessionCookie = cookies.find(c => c.name === 'your_actual_cookie_name');
```

### API Request Failures

**Check:**
1. Backend API is running
2. Endpoint exists at `/api/extension-submit`
3. Request format matches backend expectations
4. CORS headers configured correctly

**Monitor Network Requests:**
1. Open DevTools Network tab
2. Filter by "extension-submit"
3. Check request/response details

**Common API Issues:**
- 401: Authentication failed (cookie issue)
- 404: Endpoint doesn't exist (check backend routes)
- 500: Backend error (check server logs)
- CORS error: Missing CORS headers in backend

---

## Verification Checklist

Use this checklist to verify the extension is working correctly:

### Installation
- [ ] Extension loads without console errors
- [ ] Extension icon appears in toolbar
- [ ] Popup opens and shows stats (all zeros)

### Keyword Detection
- [ ] Content script loads on Facebook
- [ ] Submit button appears on posts with 2+ keywords
- [ ] Button does NOT appear on posts with <2 keywords
- [ ] Button styling looks correct (red button)

### Submission
- [ ] Clicking button extracts post data
- [ ] Description contains actual post text
- [ ] Source URL is valid Facebook post URL
- [ ] Date is extracted correctly
- [ ] Button shows "Queued" feedback

### Queue Processing
- [ ] Background script processes submissions
- [ ] Submissions appear on trappertracker.com/pending-submissions.html
- [ ] Stats in popup update correctly
- [ ] Multiple submissions work

### Authentication
- [ ] Cookie extraction works when logged in
- [ ] Auth warning shows when logged out
- [ ] Submissions fail gracefully without auth
- [ ] Retry works after logging in

### Error Handling
- [ ] Failed submissions retry automatically
- [ ] Exponential backoff is applied
- [ ] After 5 attempts, marked as failed
- [ ] Retry button in popup works

---

## Test Data Examples

### Sample Facebook Post Texts (Should Match)

1. **Street + Trapper**
```
URGENT: Found a lost tabby cat on Main Street this morning. Very scared.
Concerned about the trapper that operates in this area. Please help!
```

2. **Trap + Street**
```
Lost dog last seen near Oak Street. Heard there's a trap set up nearby.
Please keep an eye out!
```

3. **All Three Keywords**
```
PSA: Street trapper has set multiple traps in the downtown area.
If your pet is missing, check these locations immediately.
```

### Sample Posts (Should NOT Match)

1. **Only "street"**
```
Found a cat on Elm Street. Looks well-fed. Anyone missing a cat?
```

2. **Only "trap"**
```
My cat got trapped in the garage overnight. She's fine now but was scared.
```

3. **No keywords**
```
Lost my orange cat yesterday. Last seen near the park. Please help!
```

---

## Performance Expectations

**Content Script:**
- Should process posts within 100ms of appearing in DOM
- Minimal impact on Facebook scrolling performance
- Button injection < 50ms per post

**Background Script:**
- Queue processing starts immediately after submission
- Each API request completes within 1-2 seconds (network dependent)
- 500ms delay between batch submissions
- Retry alarms fire accurately (within 1 second of scheduled time)

**Popup:**
- Opens instantly (<100ms)
- Stats load within 200ms
- Button clicks responsive (<50ms)

---

## Browser Compatibility Notes

### Firefox
- Works with Manifest V3 service workers
- Cookie extraction: Use `browser.cookies` or `chrome.cookies` (both work)
- Extension persists only during browser session (temporary install)

### Chrome
- Full Manifest V3 support
- Cookie extraction: Use `chrome.cookies`
- Extension persists between sessions (unpacked mode)

### Known Browser Differences
- **Alarm precision:** Firefox alarms may fire up to 1 minute later than scheduled
- **Cookie domains:** Chrome may require exact domain match (no subdomains)
- **Service worker lifecycle:** Chrome may terminate service worker more aggressively

---

## Next Steps After Testing

Once all tests pass:

1. **Collect Submissions:** Use extension normally for 1-2 days
2. **Monitor Queue:** Check for failed submissions or patterns
3. **Review Pending Submissions:** Verify data quality on trappertracker.com
4. **Facebook DOM Changes:** Watch for button injection failures (Facebook changes layout frequently)
5. **Authentication Issues:** If cookie extraction fails, may need to switch to alternative auth method

---

## Support and Troubleshooting

**If you encounter issues during testing:**

1. Check browser console for error messages
2. Verify authentication (logged into trappertracker.com)
3. Check extension permissions in browser settings
4. Review storage contents:
   ```javascript
   chrome.storage.local.get(null, (data) => console.log(data));
   ```
5. Clear extension storage and retry:
   ```javascript
   chrome.storage.local.clear();
   ```

**For persistent issues:**

1. Collect console logs (copy full output)
2. Note specific steps that trigger the issue
3. Check if issue is reproducible
4. Verify backend API is functioning (test with curl/Postman)

---

## Appendix: Manual API Testing

To test the backend API independently of the extension:

### Using curl

```bash
# Get your session cookie from browser DevTools (Application/Storage tab)
COOKIE="your_session_cookie_name=your_session_cookie_value"

# Test submission
curl -X POST https://trappertracker.com/api/extension-submit \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "description": "Test submission from curl",
    "sourceURL": "https://facebook.com/test",
    "dateReported": "2025-12-03",
    "latitude": null,
    "longitude": null
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "id": 123
}
```

### Using Browser Console

```javascript
// Test API from browser console (must be on trappertracker.com domain)
fetch('/api/extension-submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    description: 'Test submission from console',
    sourceURL: 'https://facebook.com/test',
    dateReported: '2025-12-03',
    latitude: null,
    longitude: null
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Version Information

- **Extension Version:** 1.0.0
- **Manifest Version:** 3
- **Target Browsers:** Firefox, Chrome
- **Target Domain:** https://trappertracker.com
- **API Endpoint:** /api/extension-submit
