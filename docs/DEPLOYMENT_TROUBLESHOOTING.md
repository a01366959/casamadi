# Deployment Troubleshooting Guide

## GitHub & Vercel Issues

### Issue 1: Folder Appears Empty on GitHub

**Problem**: `apps/web` folder was empty on GitHub and couldn't be deployed to Vercel.

**Root Cause**: A nested `.git` directory in `apps/web` caused Git to track it as a **gitlink** (submodule reference) instead of actual files.

**Solution**:
```bash
# Remove the nested .git folder
rm -rf apps/web/.git

# Stage and commit the files
git add apps/web/
git commit -m "Remove nested git repo from apps/web"
git push
```

**Prevention**: Avoid creating git repositories inside subdirectories of your main repo. Use monorepo tools (like Turborepo) instead for managing multiple packages.

---

### Issue 2: Prerender Error on Client Components

**Problem**: Build fails with `Error occurred prerendering page "/conversations"` even though the page is marked as `'use client'`.

**Root Cause**: Next.js attempts to prerender all pages at build time. Client components that depend on runtime context (auth, browser APIs, etc.) fail during this phase.

**Solution**: Add `export const dynamic = 'force-dynamic'` to any client component that:
- Uses authentication hooks (`useAuth`, `useSession`)
- Accesses router/navigation
- Depends on browser APIs
- Should not be statically generated

Example:
```typescript
'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '@/lib/auth'

export default function Page() {
  // component code
}
```

**When to use**:
- Pages with dynamic user-specific content
- Pages requiring runtime authentication checks
- Pages with real-time data

**When NOT to use**:
- Static marketing pages
- Pages that can be prerendered (use ISR instead)

---

### Issue 3: Environment Variables Not Available During Build

**Problem**: Vercel env vars set in project settings aren't passed to the build process, causing build failures when code tries to access them.

```
Warning - the following environment variables are set on your Vercel project, 
but missing from "turbo.json". These variables WILL NOT be available to your 
application and may cause your build to fail.
```

**Root Cause**: Turborepo needs environment variable names explicitly listed in `turbo.json` to pass them through during build.

**Solution**: Add all required env vars to the `globalDependencies` object in `turbo.json`:

```json
{
  "globalDependencies": ["**/.env.local", "**/.env"],
  "globalEnv": [
    "NODE_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ]
}
```

**Types of variables to list**:
- `NEXT_PUBLIC_*` variables (used in client code)
- Service keys used during build (API paths, database connections)
- Any env var referenced in your app that needs to be available at build time

**Testing locally**:
```bash
turbo run build --env-mode strict
```

This will fail if required env vars are missing, matching Vercel's behavior.

---

### Issue 4: Build Cleanup

**Problem**: Duplicate files accumulate in the workspace (e.g., `package 2.json`, `README 2.md`).

**Solution**: 
- Remove duplicates before committing
- Add patterns to `.gitignore` to prevent future duplicates
- Use consistent file naming conventions

**Prevention**:
```
# .gitignore
*\ 2.*
duplicate_*
```

---

## Checklist for Vercel Deployments

✅ No nested `.git` folders in subdirectories  
✅ All client components with runtime deps use `export const dynamic = 'force-dynamic'`  
✅ All required env vars are listed in `turbo.json` under `globalEnv`  
✅ Environment variables are set in Vercel project settings  
✅ No duplicate files or build artifacts committed  
✅ Test locally: `turbo run build --env-mode strict`  

---

## References

- [Next.js Dynamic Rendering Docs](https://nextjs.org/docs/app/building-your-application/rendering/dynamic-rendering)
- [Turborepo Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
