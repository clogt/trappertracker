# TrapperTracker Master Project Plan

**Version:** 0.1.0
**Last Updated:** 2025-11-06

## 1. Core Vision & Mission

TrapperTracker is a real-time, map-based community safety application accessible on all devices. Its primary mission is to consolidate and clearly visualize "danger zones" where pet trappers are active, and to provide a centralized platform for reporting and viewing lost and found pets. It aims to replace the scattered, inefficient warnings on social media with an easy-to-use, reliable service for pet owners.

## 2. Guiding Principles & Strategy

### 2.1. Cost-First Architecture
The project will be built and operated entirely within the **free tiers** of all chosen services. The primary goal is to eliminate all operational costs until the platform is generating revenue.
- **Hosting/Database:** Cloudflare Pages, Workers, and D1 (Free Tier).
- **Maps:** Leaflet.js with OpenStreetMap tiles (Free).
- **Image Hosting:** No direct uploads. Users will provide links to images hosted on external services (e.g., Imgur).

### 2.2. "Freemium" Monetization Strategy
- **Core Product:** The public website (`trappertracker.com`) will be free to use.
- **Phase 1 Revenue:**
  - **Donations (High Priority):** A subtle "Support Us" link will be implemented.
  - **Advertising (Medium Priority):** Non-intrusive ads will be added once traffic is established.
- **Phase 2 Revenue (Long-Term Goal):**
  - **Premium Admin App:** A dedicated, paid mobile/desktop application for power users (e.g., social media group admins) with advanced management and automation features.

### 2.3. Open-Source & Community-Driven
The project is public and open-source to foster trust, transparency, and community contributions.
- **License:** MIT License.
- **Collaboration:** The public GitHub repository allows for community involvement, which is key to our growth strategy.

## 3. Feature Roadmap

### Phase 0: Foundational Setup (Complete)
- [X] Establish Master Project Plan (`GEMINI.md`).
- [X] Define and fix database schema (`d1.sql`) for all report types.
- [X] Add MIT License.
- [X] Implement secure secret management (via `.dev.vars` and Wrangler secrets).

### Phase 1: MVP Implementation
- [X] **Backend:** Update API to support `found_pets` and `dangerous_animals` report types.
- [X] **Frontend (Form):** Update UI to allow submission of all new report types.
- [X] **Frontend (Map):** Update map to display all new report types as toggleable layers with unique icons.
- [X] **Donation Feature:** Add a placeholder "Support Us" link to the UI.

### Phase 2: Polish & Launch
- [X] **Security Review:** Perform a full "Red Team" audit of all new code.
- [X] **UI/UX Refinement:** Improve usability and mobile experience.
- [X] **Testing:** Full end-to-end testing of all features.
- [X] **Deployment:** Deploy to production and connect the custom domain.

### Phase 3: Post-Launch / V2.0 Features
- [X] **AI-Powered Matching:** Engine to match `lost` and `found` pet reports.
- [X] **Notification System:** Email alerts for matched pets.
- [ ] **Premium Admin App:** Design and development of the paid application.
- [ ] **Direct Image Uploads:** Implement a solution for direct photo uploads.

## 4. Development Process

### 4.1. Git Branching Strategy
- **`main`:** Production branch. Only receives merges from `staging`.
- **`staging`:** Pre-production / QA testing branch.
- **`dev`:** Main integration branch for new features.
- **`feature/*`:** Individual branches for new feature development.
- **`hotfix/*`:** Branches for urgent production bug fixes.

### 4.2. Security ("Red Team" Mandate)
- Security is a primary concern.
- All code will be reviewed for vulnerabilities before being merged to `staging`.
- Automated tools (`npm audit`) will be used to monitor dependencies.
- No secrets will ever be committed to the repository.