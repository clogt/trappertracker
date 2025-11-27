# **TrapperTracker Development Plan (Directed to Claude CLI)**

## **Project Mission Statement: Resilience and High-Accuracy Data Collection**

This project is structured in three phases to ensure maximum development efficiency, data accuracy, and operational resilience against real-world constraints.  
**The core strategic reasoning for this approach is:**

1. **Resilience (Phase 2):** Acknowledging the user's reliance on generator power and potentially unstable internet, the extension is designed with a mandatory local storage queue and exponential backoff retry system. This guarantees that critical data collected from Facebook is not lost, even during connectivity interruptions.  
2. **Data Accuracy (Phase 2):** To overcome the highly variable nature of Facebook's structure and ensure the highest confidence in keyword detection, the user is required to manually expand posts ("See More"). The extension focuses only on presenting an easily clickable "Submit" button, prioritizing accurate extraction over full scraping automation.  
3. **Security & Efficiency (Phase 2):** The extension leverages the user's existing, active login session on the TrapperTracker website for authentication. This eliminates the need to handle or store sensitive credentials in the extension, simplifying the architecture and maintaining security.  
4. **Verification and Outreach (Phase 3):** The immediate implementation of a Submission Log and Social Share feature provides the user with crucial confirmation that their effort was successful, and enables rapid community outreach concerning new Danger Zones.

This plan details the critical website fix (P1), the extension's robust architecture (P2), and the necessary website enhancements (P3).

## **Phase 1: Critical Bug Fix (TrapperTracker Website)**

**Goal:** Resolve the critical issue where a user-submitted "Danger Zone" blip is accepted by the server but does not visually appear on the map after submission in the current web application version.  
**Action Required:**

1. **Diagnose:** Review the existing TrapperTracker codebase (in the current subdirectory) to determine why submitted data is not being rendered on the map in real-time or upon refresh.  
2. **Implement Fix:** Ensure that successful submissions trigger a map data refresh or that the new blip is immediately added to the map's visual layer.  
3. **Verification:** Confirm that after a successful "Report Danger Zone" submission, the new pin/blip is visible to the logged-in user without manual browser refresh.

## **Phase 2: Browser Extension Development (Chrome/Firefox Compatible)**

**Goal:** Create a secure, reliable browser extension for Firefox/Chromium (Kali Linux compatible) that helps the user gather data from Facebook Lost Pet pages and submit it to TrapperTracker.

### **2.1 Technical Specifications (The Extension)**

| Feature | Details | Implementation Priority |
| :---- | :---- | :---- |
| **Compatibility** | Must be designed for cross-browser compatibility (Manifest V3) for both **Firefox** and **Chromium** on Linux (Kali). | High |
| **Authentication** | The extension **must not** store login credentials. It should be dependent on the user being *already logged into* the TrapperTracker website in a separate tab. The extension must extract and use the active user's session token/cookie for API submissions. | Highest |
| **Data Collection** | Use a **MutationObserver** in the content script to continuously monitor the Facebook feed for new posts as the user scrolls. | High |
| **Keyword Trigger** | Scan the visible text of each new post for a combination of keywords to flag high-confidence matches. Initial keywords: trap, trapper, street. | High |
| **Submission Trigger** | When a match is found, inject a small, visually distinct, non-intrusive UI button/badge (e.g., "Submit to TrapperTracker") directly onto the Facebook post element. | High |
| **User Flow** | **The user is willing to manually click the "See More" button on Facebook posts if it improves the accuracy of keyword checks and eases development complexity.** The extension should proceed with extraction *after* the text is fully expanded. | High |
| **Resilience/Retry** | The background script must implement a mechanism to handle potential failures due to unstable internet (generator power). Use **chrome.storage.local** (or equivalent for Firefox) to create a queue of failed submissions and implement **exponential backoff** to retry them periodically when connectivity is detected. | High |

### **2.2 Integration Specifications (TrapperTracker API)**

**Action Required:**

1. **API Endpoint:** Design and implement a dedicated, secure API endpoint on the TrapperTracker backend (e.g., /api/extension-submit) specifically for this extension.  
2. **Input Schema:** This endpoint must securely accept the following JSON payload, ensuring all fields are present and valid:  
   `{`  
     `"latitude": "DECIMAL_COORDINATE",`  
     `"longitude": "DECIMAL_COORDINATE",`  
     `"dateReported": "YYYY-MM-DD",`  
     `"description": "STRING_OF_FACEBOOK_POST_CONTENT",`  
     `"sourceURL": "STRING_OF_FACEBOOK_POST_PERMALINK"`  
   `}`

3. **Data Handling:** The endpoint must use the authenticated user context (via token/session) to validate the submission and create the new "Danger Zone" record in the database.  
4. **Coordinate Handling:** The extension will need to prompt the user to manually enter or select the coordinates on the TrapperTracker map *after* the Facebook data is extracted, as the location information on Facebook is often vague or missing.

## **Phase 3: TrapperTracker Website UI/UX Enhancement (Submission Log & Share)**

**Goal:** Create a user-friendly log file on the TrapperTracker website to confirm extension submissions and enable social sharing.  
**Action Required:**

1. **Submission Log Component:** Create a persistent, toggleable log component (e.g., a slide-out panel or fixed overlay) on the main map page of the TrapperTracker website.  
2. **Display Filter:** The log must only display "Danger Zone" entries submitted by the currently authenticated user.  
3. **Data Display:** Each entry in the log must display:  
   * Date/Time of Submission  
   * Shortened Description  
   * Coordinates (Lat/Lon)  
4. **Interaction:** Clicking a log entry must trigger the map to immediately **zoom and pan** to the location of the selected blip.  
5. **Social Sharing Feature:** Add a **"Share to Social Media"** button/icon next to each log entry. This button should generate a unique URL for the submitted point on TrapperTracker and open the user's social media share dialogue (e.g., Facebook, X/Twitter) pre-populating the link and a generic descriptive message.

## **Conclusion and Next Steps**

This comprehensive plan covers the bug fix, the resilient extension, and the necessary website enhancements.  
**Claude, please review this updated plan and start by addressing Phase 1, then proceed with the core architecture for the extension (Phase 2), and finally integrate the Submission Log (Phase 3).**