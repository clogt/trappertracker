# TrapperTracker Extension - Known Issues and Limitations

**Version:** 1.0.0
**Last Updated:** 2025-12-03
**Status:** Personal Use / Pre-Production

---

## Critical Issues

### 1. Facebook DOM Selector Fragility

**Severity:** HIGH
**Impact:** Button injection may fail
**Status:** Known limitation

**Description:**
The extension relies on Facebook's DOM structure to:
- Detect posts (`[role="article"]`)
- Extract post text (`[data-ad-preview="message"]`, `[dir="auto"]`)
- Find post URLs (`a[href*="/posts/"]`, `a[href*="/permalink/"]`)
- Inject submit button (`[role="toolbar"]`)

Facebook frequently changes its HTML structure without notice. These changes can break:
- Post detection (no posts found)
- Text extraction (empty descriptions)
- URL extraction (wrong sourceURL)
- Button placement (button appears in wrong location or not at all)

**Workarounds:**
- Inspect Facebook's current DOM structure using browser DevTools
- Update selectors in `/home/hobo/Desktop/tt/extension/scripts/content.js`
- Common breakage points:
  - Line 35: Button injection selector
  - Line 55: Post URL selector
  - Line 59: Text extraction selector
  - Line 69: Date extraction selector

**Monitoring:**
Watch for these symptoms:
- Submit button stops appearing on matching posts
- Extracted descriptions are empty
- Source URLs point to facebook.com instead of specific posts
- Button appears in unexpected locations (overlapping content, wrong post, etc.)

**Long-term Solution:**
Consider using Facebook's Graph API instead of DOM scraping (requires Facebook app approval and user OAuth).

---

## Authentication & Security Issues

### 2. Cookie-Based Authentication Limitations

**Severity:** MEDIUM
**Impact:** Authentication may fail in certain scenarios
**Status:** Acceptable for personal use, needs improvement for multi-user

**Description:**
The extension extracts session cookies from trappertracker.com using a simple name pattern match:
```javascript
const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
```

**Limitations:**
1. **Cookie Name Dependency:** If the backend changes session cookie naming, extraction will fail
2. **No Token Refresh:** If session expires, user must manually refresh by logging in again
3. **Cross-Browser Cookie Access:** Cookie API behavior differs between Firefox and Chrome
4. **Subdomain Issues:** Cookies set for subdomains may not be accessible
5. **Secure Cookie Flags:** HttpOnly cookies cannot be read by extensions

**Symptoms of Failure:**
- Submissions marked as `auth_required`
- Console shows: "User not logged in to TrapperTracker"
- All submissions stuck in pending state

**Workarounds:**
1. Ensure you're logged into trappertracker.com before using extension
2. If extraction fails, check cookie name:
   ```javascript
   chrome.cookies.getAll({domain: 'trappertracker.com'}, console.log);
   ```
3. Update cookie name in `background.js` line 183 if needed

**Long-term Solution:**
Implement extension-specific authentication:
- OAuth 2.0 flow with PKCE
- Extension generates API key via web UI
- Store API key in extension storage (encrypted)
- Send API key in Authorization header instead of cookie

---

### 3. No Cookie Encryption in Storage

**Severity:** LOW (personal use), HIGH (multi-user)
**Impact:** Session cookies stored in plaintext
**Status:** Acceptable for personal use only

**Description:**
Extension storage is not encrypted by default. While we don't explicitly store cookies in extension storage, the submission queue contains data that could be sensitive (post text, URLs).

**Risk:**
- Other extensions can access chrome.storage.local
- Malware could extract queued submissions
- Physical access to device exposes data

**Mitigation (Current):**
- Queue is cleared after successful submission
- No long-term storage of user data
- Extension runs in browser's sandbox

**Long-term Solution:**
- Encrypt submission queue before storing
- Use chrome.storage.session for temporary data (cleared on browser close)
- Implement data expiration (auto-clear after 7 days)

---

## Data Extraction Issues

### 4. Incomplete Date Parsing

**Severity:** LOW
**Impact:** Dates may be inaccurate or default to "today"
**Status:** Known limitation

**Description:**
Facebook uses various date formats:
- "5 min ago"
- "2 hrs"
- "Yesterday"
- "December 1 at 3:45 PM"
- "12/1/2025"

The extension handles some formats but may default to current date for:
- Relative dates beyond "yesterday"
- Non-English date formats
- Timezone-specific formats

**Impact:**
- `dateReported` field may be today's date instead of actual post date
- User must manually correct date on trappertracker.com if needed

**Current Handling:**
```javascript
// Line 117-143 in content.js
// Handles: minutes, hours, yesterday, MM/DD/YYYY
// Defaults to today for everything else
```

**Improvement Needed:**
- Parse "X days ago" format
- Handle month names (e.g., "December 1")
- Respect user's timezone
- Extract from `<abbr>` title attribute (more reliable)

---

### 5. Text Truncation at 1000 Characters

**Severity:** LOW
**Impact:** Long posts are truncated
**Status:** By design, but may need adjustment

**Description:**
Post descriptions are limited to 1000 characters:
```javascript
description: description.substring(0, 1000)
```

**Rationale:**
- Keeps submission payload small
- Most relevant info is in first paragraph
- Backend database may have column limits

**Issues:**
- Important details might be in later paragraphs
- User may not realize text was truncated
- No indication in UI that truncation occurred

**Recommendation:**
- Increase to 2000 characters (if backend supports)
- Add visual indicator when truncation occurs
- Store full text in extension storage for user reference

---

## Queue & Retry Issues

### 6. Exponential Backoff May Be Too Aggressive

**Severity:** LOW
**Impact:** Failed submissions may not retry soon enough
**Status:** Current implementation may need tuning

**Description:**
Retry schedule:
- Attempt 1: Immediate
- Attempt 2: +1 minute
- Attempt 3: +2 minutes
- Attempt 4: +4 minutes
- Attempt 5: +8 minutes
- After 5 attempts: Marked as permanently failed

**Issues:**
1. **Short Network Outages:** If backend is down for 10 minutes, submissions are marked as failed before recovery
2. **No Manual Override:** User cannot force retry of permanently failed items
3. **No Distinction Between Error Types:** Network errors treated same as validation errors
4. **Alarm Precision:** Browser alarms may not fire exactly on schedule

**Recommendation:**
- Increase MAX_RETRIES to 10 for network errors
- Add retry button for permanently failed items
- Distinguish between temporary (network) and permanent (validation) failures
- Implement jitter to prevent thundering herd

---

### 7. No Queue Persistence on Browser Crash

**Severity:** LOW
**Impact:** Pending submissions lost if browser crashes
**Status:** Acceptable for current use case

**Description:**
Queue is stored in `chrome.storage.local`, which persists across browser restarts. However:
- Service worker may be terminated mid-processing
- No transaction guarantee for storage writes
- Corrupted storage possible on crash

**Observed Scenarios:**
- Browser force-quit during submission
- Service worker terminated by browser
- Extension disabled/removed during processing

**Impact:**
Submissions in queue at time of crash may be:
- Lost entirely
- Stuck in "in_progress" state
- Duplicated (if storage write completed but status update didn't)

**Mitigation:**
- Queue processing resumes on browser restart
- Each submission has unique ID to prevent duplicates on backend
- User can see pending count in popup

**Long-term Solution:**
- Implement transaction log for queue operations
- Add queue integrity check on startup
- Store backup queue in IndexedDB

---

## Browser Compatibility Issues

### 8. Service Worker Lifecycle Differences

**Severity:** MEDIUM
**Impact:** Background script behavior varies by browser
**Status:** Known Manifest V3 limitation

**Description:**
Chrome and Firefox handle service workers differently:

**Chrome:**
- Aggressively terminates service workers (after 30 seconds idle)
- Alarms may not fire if service worker is terminated
- Storage access may fail if service worker is starting up

**Firefox:**
- More lenient timeout (5 minutes idle)
- Better alarm reliability
- Temporary extension install (lost on browser close)

**Symptoms:**
- Retry alarms don't fire on schedule
- Queue processing stalls
- Console messages disappear (service worker terminated)

**Workarounds:**
- Test in both browsers
- Expect retry delays in Chrome
- Keep extension popup open during testing (keeps service worker alive)

**Investigation Needed:**
- Implement service worker keepalive strategy
- Use persistent alarms instead of one-time alarms
- Add service worker restart detection and recovery

---

### 9. Cookie Access Restrictions

**Severity:** MEDIUM
**Impact:** Cookie extraction may fail in some configurations
**Status:** Browser security policy, not a bug

**Description:**
Browser security policies restrict cookie access:

**Restrictions:**
1. **HttpOnly Cookies:** Cannot be read by extensions (by design)
2. **SameSite Strict:** May block cross-origin cookie access
3. **Third-Party Cookie Blocking:** If user blocks third-party cookies
4. **Incognito/Private Mode:** Separate cookie jar

**Current Requirement:**
- `host_permissions` for `trappertracker.com` (already in manifest)
- User must be logged in via regular browser session
- Cannot access cookies set with HttpOnly flag

**If Backend Uses HttpOnly Cookies:**
Extension cannot extract session cookie. Solutions:
1. **Backend:** Provide non-HttpOnly cookie specifically for extension
2. **Extension:** Switch to API key authentication
3. **Workaround:** Use message passing between extension and web page (page can access cookies)

---

## User Experience Issues

### 10. No Feedback for Background Processing

**Severity:** LOW
**Impact:** User doesn't know if submission succeeded until checking popup or website
**Status:** UX improvement needed

**Description:**
After clicking "Submit to TrapperTracker":
- Button shows "Queued" briefly
- No indication if API submission succeeded or failed
- No browser notification on completion
- User must open popup to check status

**User Expectations:**
- Browser notification when submission completes
- Badge on extension icon showing pending count
- Visual indicator on Facebook post (checkmark vs. error icon)

**Recommendations:**
- Add browser notification: `chrome.notifications.create()`
- Update badge text: `chrome.action.setBadgeText()`
- Keep button in "submitted" state instead of reverting
- Add timestamp to show when submission completed

---

### 11. No Bulk Operations

**Severity:** LOW
**Impact:** Cannot clear queue or retry all at once efficiently
**Status:** Feature request

**Description:**
Current limitations:
- No "Clear All Failed" button
- No "Retry All Pending" button
- No queue visibility/management in popup
- Cannot delete specific submissions from queue

**User Scenarios:**
- After fixing auth issue, want to retry all 20 pending submissions
- Accidentally submitted wrong post, want to remove from queue
- Want to clear old failed submissions to clean up stats

**Recommendations:**
- Add queue viewer in popup (list of submissions with status)
- Add "Clear Failed" button
- Add "Remove" button for individual items
- Add filter/search in queue viewer

---

## Performance Issues

### 12. MutationObserver Performance on Long Feeds

**Severity:** LOW
**Impact:** May slow down Facebook scrolling on long feeds
**Status:** Acceptable for normal use

**Description:**
The content script uses MutationObserver to watch for new posts:
```javascript
observer.observe(feedContainer, {
    childList: true,
    subtree: true
});
```

**Issue:**
- Fires on every DOM change (not just new posts)
- Processes entire feed on each mutation
- May cause lag on infinite scroll

**Observed Behavior:**
- Facebook feed has 100+ posts loaded
- Every scroll triggers mutations
- processPost() called repeatedly on same posts
- processedPosts Set grows unbounded

**Current Mitigation:**
- Check if post already processed (line 160)
- Skip if button already exists (line 15)

**Improvements Needed:**
- Use IntersectionObserver instead of MutationObserver
- Only process visible posts
- Throttle/debounce mutation callback
- Clear processedPosts Set periodically (memory leak risk)

---

### 13. No Rate Limiting for User Actions

**Severity:** LOW
**Impact:** User can spam submissions
**Status:** Not a concern for personal use

**Description:**
User can click "Submit to TrapperTracker" multiple times on the same post:
- Button re-enables after 3 seconds (line 98)
- No check for duplicate sourceURL
- Each click creates new queue entry
- Backend may receive duplicate submissions

**Backend Mitigation:**
Should have unique constraint on sourceURL to prevent duplicates.

**Extension Improvement:**
- Disable button permanently after first submission
- Check queue for existing submission with same sourceURL
- Store processed post IDs persistently (survive page reload)

---

## Deployment & Packaging Issues

### 14. Not Production-Ready for Public Distribution

**Severity:** HIGH
**Impact:** Cannot publish to extension stores yet
**Status:** Personal use only

**Missing for Production:**

1. **Store Listing Requirements:**
   - Privacy policy document
   - Detailed description and screenshots
   - Support/contact information
   - Terms of service

2. **Code Signing:**
   - Chrome Web Store requires verification
   - Firefox Add-ons requires code review
   - No automated build/release process

3. **Update Mechanism:**
   - No auto-update URL configured
   - No version checking
   - Manual install only

4. **Error Reporting:**
   - No crash reporting (e.g., Sentry)
   - No analytics (user engagement metrics)
   - No remote logging

5. **Internationalization:**
   - Hardcoded English strings
   - No support for other languages
   - No locale detection

**Recommendation:**
Keep as personal use for now. Before public release:
- Add privacy policy
- Implement error reporting
- Set up Chrome Web Store and Firefox Add-ons accounts
- Create automated build pipeline
- Add update manifest for auto-updates

---

## Security Considerations

### 15. No Content Security Policy for Injected Content

**Severity:** LOW
**Impact:** Injected button could be vulnerable to XSS
**Status:** Low risk due to limited scope

**Description:**
The extension injects HTML into Facebook:
```javascript
submitBtn.textContent = '⚠️ Submit to TrapperTracker';
```

**Current Safety:**
- Uses textContent (not innerHTML)
- No user input in injected content
- No eval() or dynamic script execution

**Potential Risk:**
If future changes use innerHTML or inject user-controlled content, could introduce XSS vulnerability.

**Best Practices:**
- Continue using textContent/createElement (never innerHTML)
- Sanitize any user input before display
- Implement Content Security Policy in manifest.json (currently not set)

---

## Testing Gaps

### 16. No Automated Testing

**Severity:** MEDIUM
**Impact:** Regressions may go unnoticed
**Status:** Manual testing only

**Missing Tests:**
- Unit tests for content script functions
- Integration tests for background script
- E2E tests for full submission flow
- Mock tests for Facebook DOM
- Regression tests for cookie extraction

**Recommendations:**
- Set up Jest for unit tests
- Mock chrome.* APIs with sinon-chrome
- Test extraction functions with sample HTML
- Test queue logic with mock storage
- Add CI/CD pipeline (GitHub Actions)

---

### 17. No Error Reporting in Production

**Severity:** MEDIUM
**Impact:** Cannot diagnose user issues
**Status:** Console logs only (not accessible from users)

**Issue:**
When users encounter errors:
- No way to send error reports
- Cannot reproduce without access to user's browser
- Console logs not accessible remotely

**Recommendations:**
- Integrate Sentry or similar error tracking
- Add "Report Issue" button in popup
- Collect anonymized diagnostic info
- Implement opt-in telemetry

---

## Future Multi-User Deployment Concerns

### 18. Scalability for Multiple Users

**Severity:** N/A (single user currently)
**Impact:** Backend may need optimization
**Status:** Consider before opening to multiple users

**Potential Issues:**

1. **API Rate Limiting:**
   - No rate limiting implemented
   - Multiple users could overwhelm backend
   - Need per-user or per-IP rate limits

2. **Database Constraints:**
   - pending_submissions table may need indexes
   - No partitioning or archival strategy
   - May need to limit submissions per user

3. **Authentication:**
   - Cookie-based auth not scalable
   - Need proper API authentication
   - Consider OAuth 2.0 or API keys

4. **Concurrent Submissions:**
   - Race conditions on duplicate sourceURL check
   - Need proper database transactions
   - Consider message queue (Redis, RabbitMQ)

**Recommendation:**
Current architecture acceptable for 1-5 users. Before scaling:
- Implement API rate limiting
- Switch to token-based authentication
- Add database indexes
- Implement submission deduplication
- Consider serverless queue (e.g., AWS SQS)

---

## Monitoring & Observability

### 19. Limited Visibility into Extension Health

**Severity:** MEDIUM
**Impact:** Cannot proactively identify issues
**Status:** No monitoring in place

**Current State:**
- User must check popup for stats
- No alerts for repeated failures
- No aggregate metrics (success rate, latency, etc.)
- No version tracking

**Needed for Production:**

1. **Metrics:**
   - Submission success rate
   - Average retry count
   - Queue size over time
   - Authentication failure rate

2. **Alerts:**
   - High failure rate (>50%)
   - Queue backup (>100 pending)
   - Authentication issues (all submissions failing)

3. **Dashboards:**
   - Real-time submission count
   - Geographic distribution (if multi-user)
   - Browser version distribution
   - Error rate trends

**Recommendation:**
For personal use: Check popup stats daily.
For multi-user: Implement centralized logging and monitoring.

---

## Summary of Priority Issues

### Must Fix Before Multi-User Deployment

1. **Replace cookie-based auth** → API key or OAuth (Issue #2)
2. **Facebook DOM monitoring** → Set up alerts for selector breakage (Issue #1)
3. **Error reporting** → Implement Sentry or equivalent (Issue #17)
4. **Rate limiting** → Add API rate limits (Issue #18)
5. **Testing** → Add automated test suite (Issue #16)

### Can Fix Later

- Date parsing improvements (Issue #4)
- Queue management UI (Issue #11)
- Performance optimization (Issue #12)
- Browser notifications (Issue #10)
- Duplicate prevention (Issue #13)

### Acceptable for Current Use

- Text truncation (Issue #5)
- Retry backoff tuning (Issue #6)
- Queue persistence on crash (Issue #7)
- Manual testing only (Issue #16)

---

## Change Log

**2025-12-03:**
- Initial known issues documentation
- Identified 19 issues across categories
- Prioritized issues for future development
- Established acceptable limitations for personal use

---

## Contributing

If you encounter an issue not listed here:
1. Check browser console for errors
2. Review TESTING_GUIDE.md for debugging steps
3. Document the issue with steps to reproduce
4. Note which browser/version you're using
5. Check if issue persists after extension reload

---

## References

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Facebook DOM Changes Tracker](https://github.com/topics/facebook-scraper)
