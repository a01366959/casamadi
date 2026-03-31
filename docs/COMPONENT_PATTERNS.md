# Component Patterns & Architectural Guidelines

## Core Principle

**Never modify component structure from shadcn blocks.** Adapt data and styling only. The blocks are battle-tested and optimized for responsiveness.

---

## Pattern 1: Using shadcn Blocks

### ✅ Correct Pattern

1. **Copy the block structure exactly** — Don't remove sections
2. **Pass data into the block** — Create a `data` object with the structure the block expects
3. **Use `ES` constant for strings** — Replace hardcoded English with Spanish translations
4. **Customize styling only** — Add Tailwind classes, not JSX structure changes

### Example: AppSidebar

```typescript
// CORRECT: Preserve block structure, pass data
const data = {
  teams: [
    { name: "Casa Mädi", logo: <IconHotelService />, plan: "Hotel" },
  ],
  navMain: [
    { title: ES.nav.dashboard, url: "/dashboard", icon: <IconHome className="h-4 w-4" /> },
    // ... more items
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />  {/* ← Keep structure */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />     {/* ← Pass data */}
      </SidebarContent>
      {/* ... */}
    </Sidebar>
  )
}
```

### ❌ Anti-Pattern: Custom Components

```typescript
// WRONG: Removed NavMain, added custom header
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group/logo">
        <div className="flex items-center gap-2 px-2 py-2">
          {/* ← Custom JSX instead of structure */}
        </div>
      </SidebarHeader>
      {/* NavMain removed — block broken */}
    </Sidebar>
  )
}
```

---

## Pattern 2: Data-Driven Components

All shadcn components receive data via props. Never hardcode.

```typescript
// ✅ CORRECT
const navItems = [
  { title: ES.nav.dashboard, url: "/dashboard", icon: <IconHome /> },
]
<NavMain items={navItems} />

// ❌ WRONG
<NavMain>
  <NavItem title="Dashboard" url="/dashboard" />
  <NavItem title="Orders" url="/orders" />
</NavMain>
```

---

## Pattern 3: Role-Based Access

Use conditional data, not conditional JSX.

```typescript
// ✅ CORRECT: Filter data based on role
const navItems = user.role === 'admin' 
  ? [...baseNavItems, ...adminItems]
  : baseNavItems
<NavMain items={navItems} />

// ❌ WRONG: Conditional JSX
{user.role === 'admin' && <AdminSection />}
{user.role === 'staff' && <StaffSection />}
```

---

## Pattern 4: Clean Component Structure

Every component should follow this order:

```typescript
"use client"

// 1. React imports
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// 2. Internal hooks/context
import { useAuth } from "@/lib/supabase/auth-provider"

// 3. Components
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// 4. UI utilities
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbList } from "@/components/ui/breadcrumb"

// 5. Icons & utilities
import { IconHome } from "@tabler/icons-react"
import { ES } from "@/lib/spanish"

// 6. Data/types
interface DashboardData {
  items: any[]
}

// 7. Component
export default function DashboardPage() {
  // Logic
  // JSX
}
```

---

## Pattern 5: Responsive Design

Use shadcn's responsive grid system. Never create custom breakpoints.

```typescript
// ✅ CORRECT
<div className="grid auto-rows-min gap-4 md:grid-cols-3">
  <div className="aspect-video rounded-xl bg-muted/50" />
  <div className="aspect-video rounded-xl bg-muted/50" />
  <div className="aspect-video rounded-xl bg-muted/50" />
</div>

// ❌ WRONG: Custom breakpoints
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

---

## Pattern 6: Spanish Translations

All user-facing strings go in `@/lib/spanish.ts`. Never hardcode.

```typescript
// ✅ CORRECT
<h1>{ES.dashboard.title}</h1>
<Button>{ES.common.save}</Button>

// ❌ WRONG
<h1>Dashboard</h1>
<Button>Save</Button>
```

**Adding new strings:**
1. Add to `ES` object in correct category
2. Import in component
3. Reference via `ES.category.key`

See `docs/I18N.md` for details.

---

## Pattern 7: Loading & Error States

Use `Skeleton` for loading, `Alert` for errors.

```typescript
// ✅ CORRECT
{loading && <Skeleton className="h-12 w-full" />}
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
{data && <Card>{data}</Card>}

// ❌ WRONG
{loading && <p>Loading...</p>}
{error && <div className="text-red-500">{error}</div>}
```

---

## Pattern 8: API & Data Fetching

Never fetch in components. Use server-side utilities or custom hooks.

```typescript
// ✅ CORRECT: Fetch in effect with proper error handling
"use client"
export function MyComponent() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await supabase.from('table').select()
        setData(result.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (/* use data, loading, error */)
}

// ❌ WRONG: Inline fetch
export function MyComponent() {
  const [data] = useState(fetch('/api/data'))
}
```

---

## Checklist Before Committing

- [ ] No TypeScript `any` types (use `as` with comment for edge cases)
- [ ] All UI strings use `ES.*` constant
- [ ] No custom component structure — only shadcn blocks and data
- [ ] Responsive design tested on mobile (375px) + tablet (768px) + desktop (1920px)
- [ ] Loading and error states implemented
- [ ] Component imports ordered: React → hooks → components → ui → icons → utils → data
- [ ] Props documented with JSDoc
- [ ] No unused imports (ESLint fails if violated)
- [ ] TypeScript compilation clean (`pnpm tsc --noEmit`)

---

## When to Break These Rules

**Never.** These patterns exist to keep the codebase maintainable and consistent. If you think you need to break a pattern, ask the team first.

---

## File Organization

```
apps/web/src/
  app/                          # Next.js pages (routes)
    dashboard/
      page.tsx                  # Dashboard page
    conversations/
      page.tsx                  # Conversations list
      [id]/
        page.tsx                # Conversation thread
  components/
    app-sidebar.tsx             # Main sidebar (block from shadcn)
    nav-main.tsx                # Navigation (block from shadcn)
    nav-projects.tsx            # Projects (block from shadcn)
    nav-user.tsx                # User menu (block from shadcn)
    team-switcher.tsx           # Team selector (block from shadcn)
    login-form.tsx              # Custom: login form
    ui/                         # shadcn components (auto-generated)
  lib/
    supabase/
      auth-provider.tsx         # Auth context
      client.ts                 # Supabase client
      server.ts                 # Server-only Supabase
    spanish.ts                  # Spanish translations
    utils.ts                    # Utilities
```

---

## Git Workflow

1. Create feature branch: `git checkout -b feature/conversations-list`
2. Make changes, commit with descriptive message
3. Push: `git push origin feature/conversations-list`
4. Create PR with detailed description
5. Request review
6. Merge after approval

**Commit message format:**
```
type: description

Optionally: why this change was needed

type: feat | fix | docs | style | refactor | chore
```

Example:
```
feat: Add Conversations list page with DataTable and real-time updates

- Uses shadcn DataTable block for consistency
- Implements real-time updates via Supabase
- Spanish labels throughout via ES constant
- Mobile responsive with proper skeleton loading states
```

---

## Resources

- [`docs/I18N.md`](./I18N.md) — Spanish translation guidelines
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — System design
- [`docs/MODULES.md`](./MODULES.md) — Module responsibilities
- [`docs/PRD.md`](./PRD.md) — Product requirements

---

**Last Updated:** March 30, 2026
**Owner:** Engineering Team
