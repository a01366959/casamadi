# Component Patterns & Architectural Guidelines

## Core Principle

**Never modify component structure from shadcn blocks.** Adapt data and styling only. The blocks are battle-tested and optimized for responsiveness.

### Icon Library Rule

**Tabler icons are mandatory everywhere.** When examples are provided from shadcn documentation or other sources with `lucide-react` icons, replace them immediately with Tabler equivalents. The shadcn example structure is binding; its icon references are not.

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

## Pattern 8: Skeleton Loading States (Critical)

**RULE: Every time you create or adjust a UI component, you MUST create a skeleton that accurately represents the final layout.**

Skeletons are not placeholders — they are **visual promises**. Mismatched skeletons create jarring, unprofessional loading experiences. The skeleton must:
1. Match the **exact shape and size** of the final content
2. Preserve **spacing and grid layout** 
3. Show **all major content blocks** that will appear
4. Use `h-*` and `w-*` for precise dimensions

### ✅ CORRECT: Skeleton Matches Real Content

**Real Component:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Reservations</CardTitle>
    <CardDescription>Recent bookings</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {reservations.map(r => (
        <div key={r.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{r.guestName}</p>
            <p className="text-sm text-muted-foreground">{r.roomType}</p>
          </div>
          <Badge>{r.status}</Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Matching Skeleton (Loading State):**
```typescript
{loading && (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

### ❌ WRONG: Mismatched Skeletons

```typescript
// WRONG: Single skeleton doesn't match multi-row layout
{loading && <Skeleton className="h-24 w-full" />}

// WRONG: Different spacing than real content
{loading && (
  <div className="space-y-1">
    <Skeleton className="h-6 w-full" />
    <Skeleton className="h-6 w-full" />
  </div>
)}

// WRONG: Missing columns from real layout
{loading && (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
  </div>
)}
```

### Chat Message Skeleton Example

**Real Message:**
```typescript
<div className="flex gap-3 mb-4">
  <Avatar className="h-8 w-8 shrink-0">
    <AvatarImage src={message.avatar} />
  </Avatar>
  <div className="flex-1">
    <p className="font-medium text-sm mb-1">{message.author}</p>
    <Card className="p-3 bg-muted">
      <p className="text-sm">{message.content}</p>
      <p className="text-xs text-muted-foreground mt-2">{message.time}</p>
    </Card>
  </div>
  <Button size="icon" variant="ghost">
    <IconThumbUp className="h-4 w-4" />
  </Button>
</div>
```

**Matching Skeleton:**
```typescript
{messageLoading && (
  <div className="flex gap-3 mb-4">
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    <div className="flex-1">
      <Skeleton className="h-4 w-20 mb-1" />
      <Card className="p-3 bg-muted space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-12 mt-2" />
      </Card>
    </div>
    <Skeleton className="h-8 w-8" />
  </div>
)}
```

### Sidebar Skeleton Example

**Real Sidebar:**
```typescript
<Sidebar>
  <SidebarHeader>
    <TeamSwitcher teams={teams} />
  </SidebarHeader>
  <SidebarContent>
    <NavMain items={navItems} />
  </SidebarContent>
</Sidebar>
```

**Matching Skeleton:**
```typescript
{loading && (
  <Sidebar>
    <SidebarHeader>
      <div className="flex items-center gap-2 p-2">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </SidebarContent>
  </Sidebar>
)}
```

### Checklist for Skeleton Implementation

- [ ] Skeleton has **same parent container** (div, Card, etc.) as real content
- [ ] **Grid/flexbox layout is identical** between skeleton and real content
- [ ] **Spacing (`gap`, `space-y`, padding) matches exactly**
- [ ] **All major content blocks are represented** (not just one placeholder)
- [ ] **Avatar size** matches (`h-8 w-8`, `h-10 w-10`, etc.)
- [ ] **Text width approximates** real content (40%, 60%, 80%, full)
- [ ] **Badge/Button dimensions** are represented
- [ ] Skeleton **disappears completely** when content loads (no flash of different layout)

---

## Pattern 9: API & Data Fetching

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
- [ ] **Skeleton layout matches real content layout exactly** (see Pattern 8)
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
