# TrapperTracker Architecture

This document provides a high-level overview of the TrapperTracker project's architecture.

## 1. Frontend

The frontend is a single-page application (SPA) built with HTML, CSS, and vanilla JavaScript. It uses the Leaflet.js library for the interactive map and the MarkerCluster plugin for clustering markers.

### Key Components:

*   **`public/index.html`:** The main HTML file for the application.
*   **`public/assets/js/map.js`:** The main JavaScript file for the map functionality.
*   **`public/assets/js/ui.js`:** The JavaScript file for the user interface.
*   **`public/assets/js/auth.js`:** The JavaScript file for authentication.

## 2. Backend

The backend is a serverless API built with Cloudflare Workers. It uses the Cloudflare D1 database for data storage.

### Key Components:

*   **`functions/api`:** This directory contains the API endpoints.
*   **`functions/api/report.js`:** The endpoint for submitting new reports.
*   **`functions/api/mapdata.js`:** The endpoint for fetching map data.
*   **`functions/api/admin`:** This directory contains the admin-only API endpoints.

## 3. Database

The database is a Cloudflare D1 database. The schema is defined in the `d1.sql` file.

### Key Tables:

*   **`blips`:** This table stores the main report data.
*   **`users`:** This table stores user data.
*   **`report_moderation`:** This table stores the moderation history of each report.
*   **`admin_audit_log`:** This table stores a log of all admin actions.

## 4. Diagrams

### High-Level Architecture

```
+-----------------+      +----------------------+      +--------------------+
|   Frontend      |----->|   Cloudflare Workers |----->|   Cloudflare D1    |
| (HTML, JS, CSS) |      |      (Backend API)   |      |      (Database)    |
+-----------------+      +----------------------+      +--------------------+
```

### Database Schema

(A more detailed schema diagram can be generated from the `d1.sql` file.)
