# Quick Test Guide - Extension v1.1.0

## 5-Minute Smoke Test

### 1. Install Extension (1 min)

**Chrome**:
```
1. Open chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select: /home/hobo/Desktop/tt/extension
5. Verify extension appears with version 1.1.0
```

**Firefox**:
```
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Select: /home/hobo/Desktop/tt/extension/manifest.json
4. Verify extension loads
```

### 2. Test Settings Panel (1 min)

```
1. Click extension icon in toolbar
2. Click "⚙️ Settings" button
3. Verify you see 3 default keywords: trap, trapper, street
4. Type "bait" in input field, click "+ Add"
5. Verify "bait" appears as a tag
6. Click × on "bait" tag
7. Verify it's removed
8. Try to remove all keywords - should warn "at least one keyword"
```

### 3. Test Facebook Detection (2 min)

```
1. Log in to TrapperTracker.com
2. Go to Facebook.com
3. Navigate to any post/feed
4. Open browser console (F12)
5. Look for logs:
   - "TrapperTracker Extension: Content script loaded"
   - "TrapperTracker: IntersectionObserver + MutationObserver started (optimized)"
   - "TrapperTracker: Loaded keywords from storage: [...]"
6. Scroll through feed
7. Verify no errors in console
```

### 4. Test Button Injection (1 min)

**Option A: Create Test Post**
```
1. Create a Facebook post with text: "Found a trap on Main Street"
2. Verify red "Submit to TrapperTracker" button appears
3. Click it
4. Verify button changes to "⏳ Extracting..."
5. Then "✓ Submitted"
```

**Option B: Use Keyword Inspector**
```
1. Open console on Facebook page
2. Run: document.body.innerHTML.toLowerCase().includes('trap')
3. If true, posts with "trap" should have buttons
```

---

## Performance Test (Optional, 5 min)

### CPU/Memory Test
```
1. Open Facebook feed
2. Open browser Task Manager (Shift+Esc in Chrome)
3. Find "Extension: TrapperTracker" process
4. Note initial CPU % and Memory
5. Scroll rapidly through 100+ posts
6. Verify:
   - CPU stays < 10% (should be ~2-5%)
   - Memory stays < 100MB
   - Scrolling feels smooth
```

### Selector Health Test
```
1. Browse Facebook for 2+ minutes
2. Check console for:
   "TrapperTracker: Selector Health Stats: {...}"
3. Verify:
   - actionBarSuccess > actionBarFallback (preferred)
   - postLinkFound > postLinkMissing
   - contentFound > contentMissing
4. If fallback counts high, selectors may need updating
```

---

## Regression Test (10 min)

Ensure nothing broke from old functionality:

### Queue Management
- [ ] Click extension icon → "📋 View Queue"
- [ ] Verify queue shows submissions
- [ ] Test "🔄 Retry Failed Submissions"
- [ ] Test "Clear Failed" button
- [ ] Verify stats update correctly

### Badge Counter
- [ ] Submit a post
- [ ] Check extension icon for badge count
- [ ] After successful submission, badge should clear

### Notifications
- [ ] Submit a post
- [ ] Verify browser notification appears
- [ ] Check notification says "Success!"

### Persistence
- [ ] Add custom keyword "test"
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Open extension settings
- [ ] Verify "test" keyword still there

---

## Console Commands for Testing

### Check Current Keywords
```javascript
chrome.storage.sync.get(['keywords'], (r) => console.log(r.keywords))
```

### Force Add Keyword
```javascript
chrome.storage.sync.set({keywords: ['trap', 'trapper', 'street', 'bait']})
```

### Check Queue
```javascript
chrome.storage.local.get(['submissionQueue'], (r) => console.log(r))
```

### Check Selector Stats (run in Facebook page)
```javascript
// Available in console after 2 minutes of browsing
```

---

## Expected Results

### All Green
- ✅ Extension loads without errors
- ✅ Settings panel works
- ✅ Keywords can be added/removed
- ✅ Button appears on posts with keywords
- ✅ Submissions work
- ✅ Queue management works
- ✅ Performance is smooth
- ✅ No console errors during normal use

### Known OK Warnings
These are normal and can be ignored:
- "TrapperTracker: Could not find action bar..." (if using fallback)
- "TrapperTracker: Could not find post permalink..." (if using page URL)
- Sandbox violation logs (normal for extension operations)

### Red Flags
Stop and investigate if you see:
- ❌ Extension fails to load
- ❌ JavaScript syntax errors
- ❌ Cannot add/remove keywords
- ❌ Buttons never appear
- ❌ Submissions always fail
- ❌ CPU usage > 20% sustained
- ❌ Memory leak (grows unbounded)
- ❌ Browser becomes unresponsive

---

## Quick Fixes

### Button Not Appearing
```
1. Check console for selector failures
2. Verify keywords match post text
3. Try adding a simple keyword like "the" to test
4. Reload Facebook page
```

### Settings Not Saving
```
1. Check browser permissions
2. Verify chrome.storage.sync is available
3. Try chrome.storage.local instead (requires code change)
```

### Performance Issues
```
1. Check IntersectionObserver is active:
   Look for "IntersectionObserver + MutationObserver started"
2. If not, check for errors in content.js load
3. Verify browser supports IntersectionObserver (all modern browsers do)
```

---

## Success Criteria

Extension is working correctly if:

1. ✅ Loads without errors
2. ✅ Settings accessible and functional
3. ✅ Keywords customizable
4. ✅ Buttons inject on matching posts
5. ✅ Submissions queue correctly
6. ✅ Performance acceptable (smooth scrolling)
7. ✅ No memory leaks
8. ✅ No breaking errors in console

**If all criteria met**: Extension is production-ready for v1.1.0
**If any criteria fail**: Check CHANGELOG_v1.1.0.md for debugging tips
