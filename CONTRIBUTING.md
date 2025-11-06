# Contributing to TrapperTracker 🐾

Thank you for considering contributing to TrapperTracker! We're building a community-driven platform to keep pets safe, and every contribution helps.

---

## 🌟 Ways to Contribute

- 🐛 **Report Bugs** - Found something broken? Let us know!
- 💡 **Suggest Features** - Have ideas for improvements?
- 📝 **Improve Documentation** - Help others understand the project
- 🔧 **Submit Code** - Fix bugs or add features
- 🎨 **Design** - Improve UI/UX
- 🧪 **Testing** - Help us find and fix issues

---

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/trappertracker.git
cd trappertracker
git remote add upstream https://github.com/clogt/trappertracker.git
```

### 2. Set Up Development Environment

Follow the [README.md setup instructions](./README.md#quick-start).

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `hotfix/` - Urgent production fixes

---

## 📋 Development Workflow

### Making Changes

1. **Make your changes** in your feature branch
2. **Test thoroughly** - Run the dev server and test manually
3. **Follow code style** - Use existing patterns
4. **Write clear commits** - See commit guidelines below

### Testing Your Changes

```bash
# Start local development server
npm run dev
# or
wrangler dev

# Test in browser at http://localhost:8787

# Test all features:
# - Registration/Login
# - Report submission (all 4 types)
# - Map display and filters
# - Geocoding
# - Dark mode toggle
```

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat(map): add heat map visualization for danger zones"
git commit -m "fix(auth): resolve 500 error on login endpoint"
git commit -m "docs(api): add examples for report submission"
```

---

## 🔄 Submitting a Pull Request

### Before Submitting

- ✅ Code works locally
- ✅ No console errors
- ✅ Follows existing code style
- ✅ Commits follow convention
- ✅ Updated documentation if needed

### Submit PR

```bash
# Push your branch
git push origin feature/your-feature-name
```

1. Go to https://github.com/clogt/trappertracker
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tested locally
- [ ] All features working
- [ ] No console errors

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

---

## 🐛 Reporting Bugs

### Before Reporting

- Check [existing issues](https://github.com/clogt/trappertracker/issues)
- Try to reproduce on latest version
- Test in different browsers if relevant

### Bug Report Template

**Title:** Short, descriptive title

**Description:**
- What happened?
- What did you expect?
- Steps to reproduce
- Browser/OS information
- Screenshots (if applicable)

**Example:**
```
Title: Login fails with 500 error

Description:
When attempting to login with valid credentials, the request
returns a 500 Internal Server Error.

Steps to Reproduce:
1. Go to /login.html
2. Enter valid email/password
3. Click "Login"
4. See error in console

Environment:
- Browser: Chrome 120
- OS: macOS 14
- Server: Local development (wrangler dev)

Console Error:
[Error message here]
```

---

## 💡 Feature Requests

### Before Requesting

- Check [existing issues](https://github.com/clogt/trappertracker/issues)
- Review [GEMINI.md roadmap](./GEMINI.md)
- Consider if it fits project scope

### Feature Request Template

**Title:** Concise feature name

**Description:**
- What problem does this solve?
- Who benefits from this feature?
- How should it work?

**Example:**
```
Title: Add notification system for nearby danger zones

Description:
As a pet owner, I want to receive email notifications when
a trapper is reported within 1 mile of my saved location,
so I can keep my pets safe proactively.

Proposed Solution:
- User can save their home location
- Set notification radius (0.5, 1, 2, 5 miles)
- Receive email when reports match criteria
- Include map link and report details

Alternatives Considered:
- SMS notifications (more expensive)
- Push notifications (requires mobile app)
```

---

## 📐 Code Style Guidelines

### JavaScript

- Use **ES6+ features** (const/let, arrow functions, async/await)
- **Semicolons** - Use them
- **Quotes** - Single quotes for strings
- **Indentation** - 2 spaces (not tabs)

**Example:**
```javascript
// ✅ Good
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};

// ❌ Avoid
function fetchData(url){
    return fetch(url).then(function(response){
        return response.json()
    }).catch(function(error){
        console.error(error)
    })
}
```

### HTML

- Use **semantic HTML5 tags**
- Include **ARIA attributes** for accessibility
- **Tailwind CSS** for styling

### Security

**Always sanitize user input:**
```javascript
// ✅ Good
const description = sanitizeHTML(userInput);

// ❌ Never
element.innerHTML = userInput;
```

**Always use parameterized queries:**
```javascript
// ✅ Good
await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

// ❌ Never
await env.DB.prepare(`SELECT * FROM users WHERE id = '${userId}'`).first();
```

---

## 🧪 Testing

Currently, TrapperTracker doesn't have automated tests (we'd love contributions here!).

**Manual Testing Checklist:**
- [ ] Register new account
- [ ] Login with account
- [ ] Submit each report type (4 types)
- [ ] Verify reports appear on map
- [ ] Test all layer toggles
- [ ] Test date filters
- [ ] Test geocoding
- [ ] Test on mobile viewport
- [ ] Test dark mode

---

## 🔐 Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email: [security contact TBD]
2. Provide detailed description
3. Include steps to reproduce
4. We'll respond within 48 hours

### Security Best Practices

- Never commit secrets (API keys, passwords)
- Always validate and sanitize user input
- Use parameterized SQL queries
- Follow [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 📚 Project Structure

```
trappertracker/
├── assets/js/          # Frontend JavaScript
│   ├── auth.js         # Authentication UI
│   ├── map.js          # Map rendering
│   └── ui.js           # Form handling
├── functions/api/      # Backend API
│   ├── auth/           # Auth endpoints
│   └── report/         # Report endpoints
├── _worker.js          # Cloudflare Worker entry
├── index.html          # Main page
├── login.html          # Auth page
├── d1.sql              # Database schema
└── wrangler.toml       # Cloudflare config
```

---

## 🎯 Good First Issues

Looking to get started? Check out issues labeled:
- `good first issue` - Easy wins for newcomers
- `help wanted` - We need help with these
- `documentation` - Improve docs

---

## 💬 Communication

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas, general chat
- **Pull Request Comments** - Code-specific discussions

---

## 📜 Git Branching Strategy

As defined in [GEMINI.md](./GEMINI.md):

- **`main`** - Production branch
- **`staging`** - Pre-production testing
- **`dev`** - Integration branch (target for PRs)
- **`feature/*`** - Feature development
- **`hotfix/*`** - Urgent fixes

**Pull requests should target `dev` branch.**

---

## ⚖️ Code of Conduct

Be respectful and constructive:
- 💚 Be welcoming and inclusive
- 💬 Communicate clearly and kindly
- 🤝 Collaborate and help others
- ❌ No harassment, discrimination, or trolling

We're building this for pet safety - keep it positive!

---

## 🏅 Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Potential "Hall of Fame" page (coming soon)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

## ❓ Questions?

- 📖 Check [README.md](./README.md)
- 💬 [GitHub Discussions](https://github.com/clogt/trappertracker/discussions)
- 🐛 [Open an Issue](https://github.com/clogt/trappertracker/issues)

---

**Thank you for helping keep pets safe!** 🐾❤️
