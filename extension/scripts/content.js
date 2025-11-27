// TrapperTracker Facebook Content Script
// Monitors Facebook feed for danger zone keywords and injects submit buttons

console.log('TrapperTracker Extension: Content script loaded');

// Keywords to trigger danger zone detection
const KEYWORDS = ['trap', 'trapper', 'street'];

// Track processed posts to avoid duplicates
const processedPosts = new Set();

// Create and inject the submit button on matching posts
function injectSubmitButton(postElement, matchedText) {
    // Check if button already exists
    if (postElement.querySelector('.trappertracker-submit-btn')) {
        return;
    }

    // Create submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'trappertracker-submit-btn';
    submitBtn.textContent = '⚠️ Submit to TrapperTracker';
    submitBtn.title = 'Submit this danger zone to TrapperTracker';

    // Add click handler
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await handleSubmission(postElement, matchedText);
    });

    // Find the best place to inject the button
    // Facebook's structure varies, so we'll try multiple selectors
    const actionBar = postElement.querySelector('[role="article"] [role="toolbar"]') ||
                     postElement.querySelector('[role="article"]');

    if (actionBar) {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'trappertracker-button-wrapper';
        buttonWrapper.appendChild(submitBtn);
        actionBar.appendChild(buttonWrapper);
        console.log('TrapperTracker: Submit button injected');
    }
}

// Extract post data and send to background script
async function handleSubmission(postElement, matchedText) {
    try {
        const submitBtn = postElement.querySelector('.trappertracker-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Extracting...';

        // Extract post URL
        const postLink = postElement.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
        const sourceURL = postLink ? postLink.href : window.location.href;

        // Extract full post text
        const textElements = postElement.querySelectorAll('[data-ad-preview="message"], [dir="auto"]');
        let description = '';
        textElements.forEach(el => {
            const text = el.textContent.trim();
            if (text.length > description.length) {
                description = text;
            }
        });

        // Extract date (Facebook uses various formats)
        const dateElement = postElement.querySelector('a[href*="/posts/"] abbr, a[href*="/permalink/"] span');
        const dateReported = dateElement ? extractDate(dateElement) : new Date().toISOString().split('T')[0];

        // Package the data
        const postData = {
            description: description.substring(0, 1000), // Limit to 1000 chars
            sourceURL: sourceURL,
            dateReported: dateReported,
            extractedAt: new Date().toISOString()
        };

        console.log('TrapperTracker: Extracted post data:', postData);

        // Send to background script
        chrome.runtime.sendMessage({
            action: 'submitToTrapperTracker',
            data: postData
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('TrapperTracker: Error sending to background:', chrome.runtime.lastError);
                submitBtn.textContent = '❌ Error';
                submitBtn.disabled = false;
                return;
            }

            if (response && response.success) {
                submitBtn.textContent = '✓ Queued';
                submitBtn.classList.add('submitted');
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '⚠️ Submit to TrapperTracker';
                }, 3000);
            } else {
                submitBtn.textContent = '❌ Failed';
                submitBtn.disabled = false;
            }
        });

    } catch (error) {
        console.error('TrapperTracker: Error handling submission:', error);
        const submitBtn = postElement.querySelector('.trappertracker-submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '❌ Error';
            submitBtn.disabled = false;
        }
    }
}

// Extract date from various Facebook date formats
function extractDate(element) {
    const text = element.textContent || element.getAttribute('title') || '';
    const today = new Date();

    // Handle relative dates
    if (text.includes('min') || text.includes('hour') || text.includes('hrs')) {
        return today.toISOString().split('T')[0];
    }

    if (text.includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // Try to parse absolute dates
    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (dateMatch) {
        const [, month, day, year] = dateMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Default to today
    return today.toISOString().split('T')[0];
}

// Check if post text contains danger zone keywords
function checkForKeywords(text) {
    const lowerText = text.toLowerCase();
    const matches = KEYWORDS.filter(keyword => lowerText.includes(keyword));
    return matches.length >= 2; // Require at least 2 keyword matches
}

// Process a single post element
function processPost(postElement) {
    // Generate unique ID for this post
    const postId = postElement.getAttribute('data-trappertracker-id') ||
                   postElement.querySelector('a[href*="/posts/"], a[href*="/permalink/"]')?.href ||
                   Math.random().toString(36).substr(2, 9);

    // Skip if already processed
    if (processedPosts.has(postId)) {
        return;
    }

    postElement.setAttribute('data-trappertracker-id', postId);

    // Extract text content
    const textElements = postElement.querySelectorAll('[data-ad-preview="message"], [dir="auto"]');
    let fullText = '';
    textElements.forEach(el => fullText += ' ' + el.textContent);

    // Check for keywords
    if (checkForKeywords(fullText)) {
        console.log('TrapperTracker: Keyword match found in post:', postId);
        injectSubmitButton(postElement, fullText);
        processedPosts.add(postId);
    }
}

// Monitor for new posts using MutationObserver
function observeFeed() {
    const feedContainer = document.querySelector('[role="feed"]') || document.body;

    const observer = new MutationObserver((mutations) => {
        // Find all posts in the feed
        const posts = feedContainer.querySelectorAll('[role="article"]');

        posts.forEach(post => {
            processPost(post);
        });
    });

    // Start observing
    observer.observe(feedContainer, {
        childList: true,
        subtree: true
    });

    console.log('TrapperTracker: MutationObserver started');

    // Process existing posts
    const existingPosts = feedContainer.querySelectorAll('[role="article"]');
    existingPosts.forEach(post => processPost(post));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeFeed);
} else {
    observeFeed();
}

// Re-initialize if navigating within Facebook (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        processedPosts.clear();
        setTimeout(observeFeed, 1000);
    }
}).observe(document, { subtree: true, childList: true });
