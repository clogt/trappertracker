# TrapperTracker Secrets Management Strategy

**Created:** 2025-12-13
**Purpose:** Plan for securing existing secrets and preventing future leaks

---

## 🎯 STRATEGY OVERVIEW

Instead of rewriting git history (risky and complex), we will:

1. **Audit** - Identify what secrets exist in git history
2. **Rotate** - Change all secrets that may have been exposed
3. **Protect** - Ensure no future secrets are committed
4. **Monitor** - Set up detection for secret commits

---

## 📋 STEP-BY-STEP PLAN

### Phase 1: Discovery (Safe - Read-Only)

**Goal:** Find out what secrets (if any) exist in git history

#### Step 1.1: Automated Scan
```bash
# Search for common secret patterns
git log --all --full-history -p | grep -iE "(password|secret|token|api[_-]?key)" > potential_secrets.txt

# Check for specific files that shouldn't be there
git log --all --full-history --source -- '*.env'
git log --all --full-history --source -- '.dev.vars'
git log --all --full-history --source -- '*_SECRET*'
git log --all --full-history --source -- '*_PASSWORD*'

# Look for hardcoded credentials
git grep -iE "(password|token|secret|api[_-]?key)\s*=\s*['\"][^'\"]{10,}" $(git rev-list --all) -- '*.js' '*.ts' '*.json'
```

#### Step 1.2: Manual Review
- Review `potential_secrets.txt` manually
- Check for false positives (variable names vs actual secrets)
- Document findings in `SECURITY_TRACKING.md`

**Output:** List of exposed secrets (if any)

---

### Phase 2: Risk Assessment (No Changes Yet)

For each secret found, determine:

| Secret | Exposure Level | Current Status | Risk | Action |
|--------|----------------|----------------|------|--------|
| Example: `JWT_SECRET` | Committed in v0.1.0 | Still in use | HIGH | Rotate immediately |
| Example: `ADMIN_PASSWORD` | Never committed | Safe | LOW | Keep monitoring |

**Risk Levels:**
- **CRITICAL:** Secret still valid, actively used, high-privilege access
- **HIGH:** Secret still valid, limited exposure window
- **MEDIUM:** Secret rotated since exposure, old value useless
- **LOW:** Secret never actually committed (false positive)

---

### Phase 3: Immediate Mitigation (Safe - No Git Rewrite)

**For each HIGH/CRITICAL risk secret:**

#### Step 3.1: Rotate Secret
```bash
# Generate new value
NEW_SECRET=$(openssl rand -base64 32)

# Update in Cloudflare
wrangler secret put SECRET_NAME
# Paste new value when prompted

# Update locally
echo "SECRET_NAME=$NEW_SECRET" >> .dev.vars
```

#### Step 3.2: Invalidate Old Value
- If secret was an API token: Revoke old token
- If secret was a password: Change it
- If secret was a JWT key: All old JWTs become invalid (users re-login)

#### Step 3.3: Document Rotation
Add to `SECURITY_TRACKING.md`:
```markdown
| SECRET_NAME | Rotated: 2025-12-13 | Reason: Found in git history (commit abc123) |
```

**Outcome:** Even if attacker has old secret from git, it no longer works

---

### Phase 4: Long-Term Solution (Optional - Complex)

**Only if secrets are CRITICAL and widely distributed in history:**

#### Option A: BFG Repo-Cleaner (Easier)
```bash
# Backup first!
git clone --mirror https://github.com/user/trappertracker.git trappertracker-backup.git

# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove sensitive files
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-files .dev.vars

# Remove text patterns
java -jar bfg.jar --replace-text passwords.txt  # File with secret=*** replacements

# Cleanup
cd trappertracker.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (DANGEROUS - coordinate with team)
git push --force
```

#### Option B: git-filter-repo (More Control)
```bash
# Install git-filter-repo
pip3 install git-filter-repo

# Remove specific files
git filter-repo --path .env --invert-paths
git filter-repo --path .dev.vars --invert-paths

# Remove text patterns
git filter-repo --replace-text <(echo "SECRET_VALUE==>***REMOVED***")

# Force push
git push --force
```

**⚠️ WARNINGS for Git History Rewrite:**
- **Breaks all forks** - Collaborators must re-clone
- **Breaks all PRs** - Open PRs become invalid
- **Changes all commit SHAs** - Breaks references
- **Requires coordination** - All developers must sync
- **Can't undo** - Make backups first

**🎯 RECOMMENDATION:** Only do this if:
- Secret is CRITICAL (database credentials, production API keys)
- Secret has NOT been rotated yet
- Repository is young with few collaborators
- You can coordinate downtime

---

### Phase 5: Prevention (Ongoing)

#### Step 5.1: Pre-Commit Hooks
```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml <<EOF
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-added-large-files
      - id: check-json
      - id: check-yaml
      - id: detect-private-key
EOF

# Initialize
pre-commit install
pre-commit run --all-files
```

#### Step 5.2: GitHub Secret Scanning
- Enable "Secret scanning" in repository settings
- Enable "Push protection" to block secret commits
- Review alerts weekly

#### Step 5.3: Environment Variable Checklist
Before committing, always verify:
- [ ] No `.env` or `.dev.vars` files staged
- [ ] No hardcoded passwords/tokens in code
- [ ] All secrets use environment variables
- [ ] `.gitignore` includes all secret patterns
- [ ] Pre-commit hooks ran successfully

---

## 🔑 CURRENT SECRETS STATUS

### Secrets Known to Exist

| Secret | Purpose | Location | Committed to Git? | Action Needed |
|--------|---------|----------|-------------------|---------------|
| `JWT_SECRET` | User JWT signing | Cloudflare Secret | 🔍 UNKNOWN | Audit git history |
| `ADMIN_PASSWORD` | Admin basic auth | Cloudflare Secret | ❌ NO (verified) | None (but should hash) |
| `TURNSTILE_SECRET_KEY` | CAPTCHA validation | Cloudflare Secret | ❌ NO | None |
| `CLOUDFLARE_API_TOKEN` | Deployment | Local env | ❌ NO | None |

### Secrets to Create

| Secret | Purpose | Priority | Created? |
|--------|---------|----------|----------|
| `USER_JWT_SECRET` | User tokens (separate from admin) | HIGH | ❌ NO |
| `ADMIN_JWT_SECRET` | Admin tokens (separate from user) | HIGH | ❌ NO |
| `R2_ACCESS_KEY_ID` | R2 uploads (if not using binding) | MEDIUM | N/A (using binding) |
| `R2_SECRET_ACCESS_KEY` | R2 uploads (if not using binding) | MEDIUM | N/A (using binding) |

---

## 📊 DECISION MATRIX

**Should you rewrite git history?**

```
                     Secret Rotated?
                     YES    |    NO
                     -------|-------
Secret      HIGH  |   2     |    1
Risk        -------|---------|-------
Level       LOW   |   4     |    3
```

1. **Rewrite History** - Critical unrotated secret
2. **Monitor Only** - Already rotated, history is safe
3. **Rotate + Monitor** - Not critical but should rotate
4. **No Action** - Safe, already handled

---

## 🚀 QUICK START (TODAY)

**Minimum viable security (30 minutes):**

1. **Run discovery scan:**
   ```bash
   git log --all --oneline | grep -iE "(password|secret|token|key)" > scan1.txt
   git grep -iE "ADMIN_PASSWORD.*=" $(git rev-list --all) -- '*.js' > scan2.txt
   ```

2. **If anything found:**
   - Document in `SECURITY_TRACKING.md`
   - Rotate those secrets immediately
   - Update `.gitignore` (already done ✅)

3. **If nothing found:**
   - Mark audit as complete in `SECURITY_TRACKING.md`
   - Schedule next audit for 2026-01-13

4. **Going forward:**
   - Never commit files with "SECRET" or "PASSWORD" in name
   - Always use `.dev.vars` for local secrets
   - Always use Cloudflare Secrets for production
   - Review this document monthly

---

## 📞 QUESTIONS TO ANSWER

Before proceeding, clarify:

1. **Is this a private or public repository?**
   - Private: Lower risk, can be more selective about rewrites
   - Public: Higher risk, any exposed secret is compromised

2. **How many active collaborators?**
   - Just you: Easy to coordinate rewrites
   - 2-5 people: Moderate coordination needed
   - 5+ people: Rewrites very disruptive

3. **Repository age and size?**
   - New (<6 months): Easier to rewrite
   - Mature (>6 months): More disruption, harder to coordinate

4. **Current deployment status?**
   - Dev only: Can take downtime for rewrites
   - Production: Rewrites risky, prefer rotation

5. **Backup status?**
   - No backups: Must create before any rewrites
   - Backups exist: Safer to proceed

---

## ✅ RECOMMENDED APPROACH FOR TRAPPERTRACKER

Based on current state:

1. **TODAY:** Run discovery scan (Step 1)
2. **THIS WEEK:** Rotate any found secrets (Step 3)
3. **THIS MONTH:** Implement pre-commit hooks (Step 5.1)
4. **LATER:** Only rewrite history if CRITICAL secret found AND unrotated

**Reasoning:**
- Repository appears young (~1 month old based on commits)
- Appears to be 1-2 person project
- Better to secure going forward than fix past
- Rotation is faster and safer than rewrites

---

**Next Steps:**
1. Run the discovery scan commands above
2. Report findings in `SECURITY_TRACKING.md`
3. Decide on rotation vs rewrite based on results
