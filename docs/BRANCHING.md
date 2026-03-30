# Casamadi — Git Branching & Deployment Strategy

**Version:** 1.0.0
**Last Updated:** March 2026

---

## Branch Model

Casamadi uses a simplified Git Flow with two permanent environments.

```
main (production)
  └── hotfix/* (critical fixes only, branch from main)

develop (staging / test)
  ├── feature/*   (new features)
  ├── bugfix/*    (bug fixes)
  └── chore/*     (deps, docs, refactoring)
```

---

## Branch Naming

Pattern: `{type}/{short-description}`

| Type | When | Example |
|---|---|---|
| `feature/` | New capability | `feature/booking-flow` |
| `bugfix/` | Bug fix | `bugfix/payment-webhook-verify` |
| `chore/` | Deps, docs, config | `chore/update-shadcn-components` |
| `hotfix/` | Critical production fix | `hotfix/cloudbeds-token-refresh` |

**Rules:**
- Always branch off `develop` (except hotfix → branch from `main`)
- Always pull latest `develop` before creating a branch
- One feature per branch
- Delete branch after merge

---

## Daily Workflow

### Starting Work

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### Committing

**Copilot rule:** Always suggest a commit message in this format before committing.

```
type: short description

Optional body if needed.
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `chore`

**Examples:**
```
feat: Add check_availability tool with Cloudbeds integration
feat: Add booking flow state machine
fix: Verify payment before confirming reservation
fix: Handle Cloudbeds 422 room unavailable response
docs: Update ARCHITECTURE.md with push notification routing
chore: Update pnpm-workspace.yaml packages field
refactor: Extract DebugCollector from agent runner
```

### Pushing to Test

```bash
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```

Then on GitHub: open Pull Request → merge into `develop` → auto-deploys to test environment.

Or push directly to `develop` for small changes:
```bash
git checkout develop
git merge feature/my-feature
git push origin develop   # → auto-deploys to Railway test + Vercel preview
```

### Promoting to Production

Only when test environment is confirmed working:

1. GitHub → New Pull Request → `develop` into `main`
2. Review changes
3. Merge → auto-deploys to Railway production + Vercel production

**Never push directly to `main`.**

---

## Environment Mapping

| Branch | Railway | Vercel | Supabase | When |
|---|---|---|---|---|
| `develop` | `agent-test` | Preview URL | `casamadi-test` | Every push to develop |
| `main` | `agent-production` | Production URL | `casamadi-prod` | On PR merge to main |
| `feature/*` | — | PR preview URL | — | On PR open |

---

## Hotfix Process

For critical production bugs only:

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/description

# Fix, test, commit
git add .
git commit -m "fix: Critical issue description"

# Merge to main
git checkout main
git merge --no-ff hotfix/description
git push origin main

# Also merge back to develop
git checkout develop
git merge --no-ff hotfix/description
git push origin develop

# Delete hotfix branch
git branch -d hotfix/description
```

---

## CI/CD Pipeline

### `deploy-test.yml` (on push to `develop`)
1. `pnpm install`
2. `tsc --noEmit` on all packages
3. `pnpm lint`
4. Deploy `apps/agent` to Railway test
5. Trigger Vercel preview deploy
6. Run `supabase/migrations/*.sql` on `casamadi-test`

### `deploy-prod.yml` (on push to `main`)
1. Same checks
2. Deploy `apps/agent` to Railway production
3. Deploy `apps/dashboard` to Vercel production
4. Run migrations on `casamadi-prod`

---

## Commit Checklist Before PR

- [ ] TypeScript compiles with zero errors (`pnpm tsc --noEmit`)
- [ ] No `console.log` left in production code
- [ ] New env variables added to `.env.example`
- [ ] Schema changes have a migration file in `supabase/migrations/`
- [ ] RLS policies updated if table access changed
- [ ] All UI uses shadcn components — no custom styling
- [ ] Colors from shadcn theme only — no custom hex values

---

## VS Code Source Control

For day-to-day work without terminal:

1. Make changes in VS Code
2. Source Control panel (left sidebar) → type commit message → click ✓
3. Click **Sync** (push to GitHub)
4. GitHub Actions runs automatically → deploys to test environment
5. Verify at test URLs
6. Open PR on GitHub → merge to `main` → deploys to production

The **Sync** button = commit + push. It is the correct workflow, not an error.