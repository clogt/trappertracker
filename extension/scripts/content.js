// TrapperTracker Facebook Content Script
// Monitors Facebook feed for danger zone keywords and injects submit buttons

console.log('TrapperTracker Extension: Content script loaded');

// Keywords to trigger danger zone detection (default - loaded from storage)
let KEYWORDS = ['trap', 'trapper', 'street'];

// Track processed posts to avoid duplicates
const processedPosts = new Set();

// Memory management: clear old entries from processedPosts every 5 minutes
setInterval(() => {
    if (processedPosts.size > 1000) {
        console.log('TrapperTracker: Cleaning processedPosts Set, current size:', processedPosts.size);
        processedPosts.clear();
        console.log('TrapperTracker: processedPosts cleared to prevent memory leak');
    }
}, 5 * 60 * 1000);

// Load keywords from storage on startup
chrome.storage.sync.get(['keywords'], (result) => {
    if (result.keywords && Array.isArray(result.keywords) && result.keywords.length > 0) {
        KEYWORDS = result.keywords;
        console.log('TrapperTracker: Loaded keywords from storage:', KEYWORDS);
    } else {
        // Initialize with defaults
        chrome.storage.sync.set({ keywords: KEYWORDS });
        console.log('TrapperTracker: Initialized default keywords:', KEYWORDS);
    }
});

// Listen for keyword updates from settings
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.keywords) {
        KEYWORDS = changes.keywords.newValue || ['trap', 'trapper', 'street'];
        console.log('TrapperTracker: Keywords updated:', KEYWORDS);
        // Clear processed posts to re-scan with new keywords
        processedPosts.clear();
    }
});

// Selector health monitoring
const selectorStats = {
    actionBarSuccess: 0,
    actionBarFallback: 0,
    postLinkFound: 0,
    postLinkMissing: 0,
    contentFound: 0,
    contentMissing: 0
};

// Log selector health stats every 2 minutes
setInterval(() => {
    if (selectorStats.actionBarSuccess + selectorStats.actionBarFallback > 0) {
        console.log('TrapperTracker: Selector Health Stats:', selectorStats);
    }
}, 2 * 60 * 1000);

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
    // Facebook's structure varies, so we'll try multiple selector chains with fallbacks
    console.log('TrapperTracker: Attempting to inject button into post');

    // ENHANCED SELECTOR CHAINS - Multiple strategies for resilience
    let actionBar = null;

    // Strategy 1: Find action buttons by aria-label (most reliable)
    const likeButton = postElement.querySelector('[aria-label*="Like"]') ||
                       postElement.querySelector('[aria-label*="like"]');
    const commentButton = postElement.querySelector('[aria-label*="Comment"]') ||
                          postElement.querySelector('[aria-label*="comment"]');
    const shareButton = postElement.querySelector('[aria-label*="Share"]') ||
                        postElement.querySelector('[aria-label*="share"]');

    if (likeButton || commentButton || shareButton) {
        const actionButton = likeButton || commentButton || shareButton;
        actionBar = actionButton.closest('div[role="group"]') ||
                   actionButton.closest('[role="toolbar"]') ||
                   actionButton.parentElement?.parentElement ||
                   actionButton.parentElement;
    }

    // Strategy 2: Find by role attributes (common Facebook pattern)
    if (!actionBar) {
        actionBar = postElement.querySelector('[role="toolbar"]') ||
                   postElement.querySelector('[role="group"][aria-label]');
    }

    // Strategy 3: Find by common class name patterns
    if (!actionBar) {
        const classPatterns = ['action', 'footer', 'feedback', 'ufi', 'interaction'];
        for (const pattern of classPatterns) {
            actionBar = postElement.querySelector(`div[class*="${pattern}"]`);
            if (actionBar) break;
        }
    }

    // Strategy 4: Find by structure - look for divs with multiple clickable children
    if (!actionBar) {
        const candidateDivs = postElement.querySelectorAll('div');
        for (const div of candidateDivs) {
            const clickableChildren = div.querySelectorAll('a[role="button"], span[role="button"]');
            if (clickableChildren.length >= 2) {
                actionBar = div;
                break;
            }
        }
    }

    console.log('TrapperTracker: actionBar found:', !!actionBar, actionBar ? 'using preferred location' : 'will use fallback');

    if (actionBar) {
        selectorStats.actionBarSuccess++;
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'trappertracker-button-wrapper';
        buttonWrapper.style.display = 'inline-block';
        buttonWrapper.style.marginLeft = '8px';
        buttonWrapper.appendChild(submitBtn);
        actionBar.appendChild(buttonWrapper);
        console.log('TrapperTracker: Submit button injected successfully into action bar');
    } else {
        selectorStats.actionBarFallback++;
        console.warn('TrapperTracker: Could not find action bar after trying all selector chains, using fallback banner');
        // Fallback: Create a prominent banner below the post content
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'trappertracker-button-wrapper-fallback';
        buttonWrapper.style.cssText = 'margin: 12px 0; padding: 12px; background: #fff3cd; border: 2px solid #ff6b6b; border-radius: 8px; text-align: center;';
        buttonWrapper.appendChild(submitBtn);

        // Try to insert after the post content but before comments
        const postContent = postElement.querySelector('[data-ad-preview="message"]') ||
                           postElement.querySelector('[data-ad-comet-preview="message"]') ||
                           postElement.querySelector('div[dir="auto"]') ||
                           postElement.firstElementChild;
        if (postContent && postContent.parentElement) {
            postContent.parentElement.insertBefore(buttonWrapper, postContent.nextSibling);
        } else {
            postElement.appendChild(buttonWrapper);
        }
        console.log('TrapperTracker: Submit button injected as fallback banner');
    }
}

// Extract post data and send to background script
async function handleSubmission(postElement, matchedText) {
    try {
        const submitBtn = postElement.querySelector('.trappertracker-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Extracting...';

        // Extract post URL - Enhanced with multiple fallback selector chains
        let sourceURL = window.location.href;

        // Try multiple selector strategies for post permalink
        const postLink = postElement.querySelector('a[href*="/posts/"]') ||
                        postElement.querySelector('a[href*="/permalink/"]') ||
                        postElement.querySelector('a[href*="/photo/"]') ||
                        postElement.querySelector('a[href*="/videos/"]') ||
                        postElement.querySelector('a[aria-label*="ago"]') ||
                        postElement.querySelector('a[aria-label*="hour"]') ||
                        postElement.querySelector('a[aria-label*="minute"]') ||
                        postElement.querySelector('a[role="link"][href*="facebook.com"]') ||
                        postElement.querySelector('span[id] a[href^="/"]');

        if (postLink && postLink.href) {
            sourceURL = postLink.href;
            selectorStats.postLinkFound++;
            console.log('TrapperTracker: Post permalink found:', sourceURL);
        } else {
            selectorStats.postLinkMissing++;
            console.warn('TrapperTracker: Could not find post permalink, using page URL');
        }

        // Extract full post text - Enhanced with multiple fallback strategies
        let description = matchedText || ''; // Use the matched text as fallback

        // Strategy 1: Look for data-ad-preview attributes (most reliable for post content)
        const contentDiv = postElement.querySelector('[data-ad-preview="message"]') ||
                          postElement.querySelector('[data-ad-comet-preview="message"]');

        if (contentDiv) {
            description = contentDiv.textContent.trim();
            selectorStats.contentFound++;
            console.log('TrapperTracker: Content extracted via data-ad-preview');
        } else {
            // Strategy 2: Look for divs with dir="auto" and specific styles
            const styledContent = postElement.querySelector('div[dir="auto"][style*="text-align"]');
            if (styledContent && styledContent.textContent.trim().length > 20) {
                description = styledContent.textContent.trim();
                selectorStats.contentFound++;
                console.log('TrapperTracker: Content extracted via styled div');
            } else {
                // Strategy 3: Get all text from divs with dir="auto" and pick the longest
                const textElements = postElement.querySelectorAll('div[dir="auto"]');
                let longestText = '';
                textElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.length > 20 && text.length > longestText.length) {
                        longestText = text;
                    }
                });

                if (longestText) {
                    description = longestText;
                    selectorStats.contentFound++;
                    console.log('TrapperTracker: Content extracted via longest dir=auto text');
                } else {
                    selectorStats.contentMissing++;
                    console.warn('TrapperTracker: Could not extract post content, using matched text');
                }
            }
        }

        // Extract date - try multiple selectors
        const dateElement = postElement.querySelector('a[aria-label*="ago"]') ||
                           postElement.querySelector('abbr') ||
                           postElement.querySelector('a[href*="/posts/"]');

        let dateReported = new Date().toISOString().split('T')[0];
        if (dateElement) {
            const ariaLabel = dateElement.getAttribute('aria-label');
            const title = dateElement.getAttribute('title');
            const text = dateElement.textContent;
            dateReported = extractDate({ textContent: ariaLabel || title || text });
        }

        // Package the data
        const postData = {
            description: description.substring(0, 2000), // Increased from 1000 to 2000 chars
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
                submitBtn.textContent = '✓ Submitted';
                submitBtn.classList.add('submitted');
                // Permanently disable - don't re-enable
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.6';
            } else if (response && response.isDuplicate) {
                submitBtn.textContent = '✓ Already Submitted';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.6';
            } else {
                submitBtn.textContent = '❌ Failed';
                // Only re-enable on actual failure
                setTimeout(() => {
                    submitBtn.disabled = false;
                }, 5000);
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

    // Handle relative dates - minutes and hours
    if (text.includes('min') || text.includes('hour') || text.includes('hrs') || text.includes('hr')) {
        return today.toISOString().split('T')[0];
    }

    // Handle "yesterday"
    if (text.toLowerCase().includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // Handle "X days ago" or "X d" format
    const daysMatch = text.match(/(\d+)\s*(day|days|d)\s*ago/i);
    if (daysMatch) {
        const daysAgo = parseInt(daysMatch[1]);
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    }

    // Handle "X weeks ago" or "X w" format
    const weeksMatch = text.match(/(\d+)\s*(week|weeks|w)\s*ago/i);
    if (weeksMatch) {
        const weeksAgo = parseInt(weeksMatch[1]);
        const date = new Date(today);
        date.setDate(date.getDate() - (weeksAgo * 7));
        return date.toISOString().split('T')[0];
    }

    // Handle "X months ago" format
    const monthsMatch = text.match(/(\d+)\s*(month|months|mo)\s*ago/i);
    if (monthsMatch) {
        const monthsAgo = parseInt(monthsMatch[1]);
        const date = new Date(today);
        date.setMonth(date.getMonth() - monthsAgo);
        return date.toISOString().split('T')[0];
    }

    // Handle month name formats: "December 1" or "Dec 1"
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    for (let i = 0; i < monthNames.length; i++) {
        const monthPattern = new RegExp(`(${monthNames[i]}|${monthAbbr[i]})\\s+(\\d{1,2})`, 'i');
        const monthMatch = text.match(monthPattern);
        if (monthMatch) {
            const day = parseInt(monthMatch[2]);
            const month = i + 1;
            let year = today.getFullYear();

            // If the date is in the future, assume it's from last year
            const parsedDate = new Date(year, month - 1, day);
            if (parsedDate > today) {
                year--;
            }

            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
    }

    // Try to parse MM/DD/YYYY format
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
    return matches.length >= 1; // Require at least 1 keyword match
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

// PERFORMANCE OPTIMIZATION: Use IntersectionObserver instead of MutationObserver
// Only process posts that are visible in the viewport for better performance

let intersectionObserver = null;
let mutationObserver = null;

// Debounce function to reduce processing frequency
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Process posts when they become visible in viewport
function observeFeed() {
    const feedContainer = document.querySelector('[role="feed"]') || document.body;

    // Set up IntersectionObserver to detect when posts enter viewport
    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Only process posts that are visible
            if (entry.isIntersecting) {
                processPost(entry.target);
            }
        });
    }, {
        // Start processing when 10% of the post is visible
        threshold: 0.1,
        // Add some margin to start processing slightly before fully visible
        rootMargin: '50px'
    });

    // Set up lightweight MutationObserver to detect new posts added to DOM
    mutationObserver = new MutationObserver(debounce((mutations) => {
        // Find newly added posts
        const posts = feedContainer.querySelectorAll('[role="article"]');

        posts.forEach(post => {
            // Check if this post is already being observed
            if (!post.hasAttribute('data-trappertracker-observing')) {
                post.setAttribute('data-trappertracker-observing', 'true');
                intersectionObserver.observe(post);
            }
        });
    }, 300)); // Debounce by 300ms to reduce processing frequency

    // Start observing for new posts
    mutationObserver.observe(feedContainer, {
        childList: true,
        subtree: true
    });

    console.log('TrapperTracker: IntersectionObserver + MutationObserver started (optimized)');

    // Process existing posts
    const existingPosts = feedContainer.querySelectorAll('[role="article"]');
    existingPosts.forEach(post => {
        post.setAttribute('data-trappertracker-observing', 'true');
        intersectionObserver.observe(post);
    });

    console.log(`TrapperTracker: Now observing ${existingPosts.length} existing posts`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeFeed);
} else {
    observeFeed();
}

// Re-initialize if navigating within Facebook (SPA)
let lastUrl = location.href;
const navigationObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('TrapperTracker: Navigation detected, reinitializing observers');

        // Clean up old observers
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        // Clear processed posts for new page
        processedPosts.clear();

        // Reinitialize after a short delay to let new page load
        setTimeout(observeFeed, 1000);
    }
});

navigationObserver.observe(document, { subtree: true, childList: true });
