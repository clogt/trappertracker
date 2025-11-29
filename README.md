# TrapperTracker 🗺️🐾

> **Real-time, map-based community safety platform for tracking pet trappers, lost/found pets, and dangerous animal sightings.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)

[Live Demo](#) | [Documentation](./docs) | [Contributing](./CONTRIBUTING.md) | [API Docs](./API.md)

---

## 🎯 Mission

TrapperTracker consolidates scattered social media warnings about pet trappers into a **centralized, reliable, map-based platform** that helps keep pets safe. We combine trapper danger zones, lost & found pet reports, and dangerous animal sightings into one comprehensive safety tool.

**Why TrapperTracker?**
- 📍 Replace endless scrolling through Facebook groups with instant map visualization
- 🔔 Get alerts when trappers are active in your area
- 🐕 Help reunite lost pets with their owners
- ⚠️ Stay informed about dangerous animal sightings
- 🆓 100% free to use, forever

---

## ✨ Features

### Core Features
- 🗺️ **Interactive Real-Time Map** - Leaflet.js powered mapping with OpenStreetMap tiles
- 🎯 **4 Report Types:**
  - Danger Zones (Pet Trappers)
  - Lost Pets
  - Found Pets
  - Dangerous Animals
- 🔍 **Advanced Filtering** - By date range, report type, and geographic area
- 📍 **Geocoding Support** - Convert addresses to map coordinates automatically
- 🔐 **Secure Authentication** - JWT-based user accounts with bcrypt password hashing
- 🌙 **Dark Mode** - Easy on the eyes for late-night pet searching
- 📱 **Mobile Responsive** - Works seamlessly on all devices

### Security & Privacy
- 🔒 SQL injection prevention with parameterized queries
- 🛡️ HTML sanitization on all user inputs
- ⏱️ Rate limiting to prevent abuse
- 🍪 Secure, HttpOnly session cookies
- 🔐 Strong password requirements enforced
- 🌐 Privacy-first: No tracking, no data selling

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Cloudflare Account** (free tier works!)
- **Wrangler CLI** - Install with `npm install -g wrangler`

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/clogt/trappertracker.git
   cd trappertracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment variables**
   ```bash
   cp .env.example .dev.vars
   ```
   Edit `.dev.vars` and set your `JWT_SECRET`:
   ```bash
   JWT_SECRET=your-random-256-bit-secret-here
   ```
   > Generate a secure secret: `openssl rand -base64 32`

4. **Set up the database**

   Create a D1 database:
   ```bash
   wrangler d1 create trappertracker
   ```

   Copy the `database_id` from the output and update `wrangler.toml`.

   Initialize the schema:
   ```bash
   wrangler d1 execute trappertracker --local --file=d1.sql
   ```

5. **Update wrangler.toml**

   Replace the `database_id` in `wrangler.toml` with your database ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "trappertracker"
   database_id = "your-database-id-here"
   ```

6. **Start the development server**
   ```bash
   npm run dev
   # or
   wrangler dev
   ```

   Open http://localhost:8787 in your browser 🎉

---

## 🏗️ Tech Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| **Frontend** | Vanilla JavaScript | Lightweight, no build step |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Maps** | Leaflet.js + OpenStreetMap | Free, open-source mapping |
| **Backend** | Cloudflare Workers | Serverless, edge computing |
| **Database** | Cloudflare D1 (SQLite) | Free tier, SQL capabilities |
| **Authentication** | JWT + bcrypt-ts | Secure, stateless auth |
| **Hosting** | Cloudflare Pages | Free SSL, CDN, global deployment |

**Zero Operating Costs** - Built entirely on free tiers!

---

## 📖 Documentation

- **[API Documentation](./API.md)** - Complete API reference for all endpoints
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute to the project
- **[Master Plan](./GEMINI.md)** - Product roadmap and development phases
- **[Security](./SECURITY.md)** - Security policies and vulnerability reporting

---

## 🗂️ Project Structure

```
trappertracker/
├── assets/
│   └── js/
│       ├── auth.js          # Authentication UI logic
│       ├── map.js           # Map rendering and data fetching
│       └── ui.js            # Form handling and UI interactions
├── functions/
│   └── api/
│       ├── auth/
│       │   └── index.js     # Registration and login endpoints
│       └── report/
│           └── index.js     # Report submission and map data endpoints
├── _worker.js               # Main Cloudflare Worker entry point
├── index.html               # Main application page
├── login.html               # Login/registration page
├── d1.sql                   # Database schema
├── wrangler.toml            # Cloudflare Workers configuration
└── package.json             # Dependencies
```

---

## 🌟 Usage

### 1. Create an Account
Visit `/login.html` and register with your email and a strong password.

### 2. Submit a Report
- Click on the map to set a location
- Or use the geocoding feature to convert an address
- Select report type (Danger Zone, Lost Pet, Found Pet, or Dangerous Animal)
- Fill in the required details
- Submit!

### 3. View Reports
- Toggle layers on/off using the checkboxes
- Filter by date range using the advanced filter
- Click markers/circles for detailed information

---

## 🔌 API Usage

TrapperTracker provides a REST API for programmatic access. See [API.md](./API.md) for complete documentation.

**Example: Fetch map data**
```javascript
const response = await fetch('/api/mapdata?' + new URLSearchParams({
  lat_min: 30.0,
  lat_max: 50.0,
  lon_min: -120.0,
  lon_max: -80.0,
  show_trappers: 'true',
  show_lost_pets: 'true',
  show_found_pets: 'true',
  show_dangerous_animals: 'true'
}));

const data = await response.json();
// { trappers: [...], lost_pets: [...], found_pets: [...], dangerous_animals: [...] }
```

---

## 🚀 Deployment

### Deploy to Cloudflare Pages

1. **Prepare production database**
   ```bash
   wrangler d1 execute trappertracker --remote --file=d1.sql
   ```

2. **Set production secrets**
   ```bash
   wrangler secret put JWT_SECRET
   # Enter your production JWT secret when prompted
   ```

3. **Deploy**
   ```bash
   wrangler pages deploy .
   ```

4. **Configure custom domain** (optional)
   - Go to Cloudflare Dashboard → Pages → your project
   - Custom Domains → Add custom domain
   - Follow DNS configuration instructions

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

See [GEMINI.md](./GEMINI.md) for the complete master plan.

### Phase 1: MVP ✅ (Current)
- ✅ All 4 report types (trappers, lost pets, found pets, dangerous animals)
- ✅ Map display with layer toggles
- ✅ User authentication
- ⏳ Donation link setup

### Phase 2: Polish & Launch 🚧 (In Progress)
- 🔄 Security audit and fixes
- 🔄 UI/UX refinements
- 🔄 Comprehensive testing
- 📅 Production deployment

### Phase 3: Advanced Features 📅 (Future)
- 🔮 AI-powered pet matching (lost ↔ found)
- 📧 Email notification system
- 💼 Premium admin app for power users
- 📸 Direct image uploads

---

## ❤️ Support the Project

TrapperTracker is built and maintained by volunteers with zero operating costs (thanks to free-tier hosting). If this project helps keep your pets safe, please consider supporting us:

- ⭐ **Star this repository** on GitHub
- ☕ **[Buy us a coffee](https://ko-fi.com/trappertracker)** (coming soon)
- 💖 **[Sponsor on GitHub](https://github.com/sponsors/clogt)** (coming soon)
- 🐦 **Share on social media** to help spread the word

Every contribution helps us continue improving pet safety for everyone!

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR:** You can use, modify, and distribute this software freely, even commercially, as long as you include the original copyright notice.

---

## 🙏 Acknowledgments

- **[Leaflet.js](https://leafletjs.com/)** - Amazing open-source mapping library
- **[OpenStreetMap](https://www.openstreetmap.org/)** - Free map tiles and data
- **[Cloudflare](https://www.cloudflare.com/)** - Generous free tier for hosting and databases
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **The pet owner community** - For inspiring this project and keeping our furry friends safe

---

## 📞 Contact & Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/clogt/trappertracker/issues)
- 💡 **Feature Requests:** [GitHub Issues](https://github.com/clogt/trappertracker/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/clogt/trappertracker/discussions)
- 📧 **Email:** [Contact form coming soon]

---

## ⚠️ Disclaimer

TrapperTracker is a community-driven platform for sharing information about pet safety. While we strive for accuracy:

- Always verify reports before taking action
- Contact local authorities for serious threats
- Use common sense and prioritize pet safety
- We are not liable for user-generated content

**Stay safe, keep your pets safe!** 🐾

---

<div align="center">

**Made with ❤️ by the pet-loving open-source community**

[⬆ Back to Top](#trappertracker-️)

</div>
# Trigger deployment
