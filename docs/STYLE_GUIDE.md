# Style Guide — Casamadi Frontend

## Color System

**Only use shadcn preset colors.** Never mix colors or create custom color combinations.

### Allowed Badge Variants (shadcn)
```tsx
<Badge variant="default">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

**Rule:** One badge style per feature. Do not mix variant types in the same UI section.

Example of ❌ **wrong:**
```tsx
// Bad - mixing styles
<Badge variant="default">Pending</Badge>
<Badge className="bg-orange-500">In Progress</Badge>  // custom color
<Badge variant="destructive">Cancelled</Badge>
```

Example of ✅ **correct:**
```tsx
// Good - consistent preset colors
<Badge variant="default">Pending</Badge>
<Badge variant="secondary">In Progress</Badge>
<Badge variant="destructive">Cancelled</Badge>
```

---

## Typography & Emojis

### ⚠️ CRITICAL: No Emojis on Frontend

**NEVER USE EMOJIS IN ANY CODE OR UI.** This means:
- Page titles and headers
- Button labels and text
- Badges, labels, tags
- System prompts and agent messages
- Navigation items
- Loading states
- ANY text visible to users

The reason: Emojis render inconsistently across platforms and devices, making the UI look unprofessional and unpredictable.

❌ **WRONG:**
```tsx
<h1>🍽️ Menu</h1>
<Button>📞 Contact Us</Button>
<Badge>✅ Complete</Badge>
<p>📋 Your order: 2x Café</p>
```

✅ **CORRECT — Use Tabler Icons:**
```tsx
import { IconUtensils, IconPhone, IconCheck, IconList } from '@tabler/icons-react'

<h1 className="flex items-center gap-2 text-2xl font-bold">
  <IconUtensils className="h-6 w-6" />
  Menu
</h1>

<Button className="flex items-center gap-2">
  <IconPhone className="h-4 w-4" />
  Contact Us
</Button>

<Badge variant="default" className="flex items-center gap-1">
  <IconCheck className="h-3 w-3" />
  Complete
</Badge>

<p className="flex items-center gap-2">
  <IconList className="h-4 w-4" />
  Your order: 2x Café
</p>
```

### Icon Guidelines
- Import from `@tabler/icons-react` — never mix icon libraries
- Use consistent sizing: `className="h-4 w-4"` for inline, `className="h-5 w-5"` for larger contexts
- Always pair icons with text (unless `aria-label` is present)

### **CRITICAL: Override shadcn Examples with Tabler**

When a shadcn UI example is provided (code snippet, component demo, etc.), **always replace any icon library with Tabler icons**. This applies even if the example uses `lucide-react`, `react-icons`, or any other icon library.

❌ **Don't follow the example exactly if it has different icons:**
```tsx
// Original shadcn example (uses lucide)
import { Archive, MoreHorizontal } from 'lucide-react'
<Button><Archive /></Button>
<Button><MoreHorizontal /></Button>
```

✅ **Always convert to Tabler:**
```tsx
// Corrected (uses Tabler)
import { IconArchive, IconDots } from '@tabler/icons-react'
<Button><IconArchive /></Button>
<Button><IconDots /></Button>
```

**Examples are for STRUCTURE and LAYOUT only.** Icon references are never binding — Tabler is the single source of truth for all icons in Casamadi.

---

## Spanish-First Text

All UI strings must flow through the centralized `ES` constant in [lib/spanish.ts](../apps/web/src/lib/spanish.ts).

```tsx
import { ES } from '@/lib/spanish'

// ✅ Correct
<Button>{ES.nav.conversations}</Button>

// ❌ Wrong
<Button>Conversations</Button>
```

---

## Reserved Color Meanings (via Badge variants)

Use badge variant to signal semantic meaning:

| Variant | Use Case | Example |
|---------|----------|---------|
| `default` | Primary/Active status | Confirmed, Pending, Active |
| `secondary` | Secondary/Neutral status | Paused, Waiting, Info |
| `destructive` | Error/Cancelled/Delete | Cancelled, Failed, Urgent |
| `outline` | Disabled/Ghost status | Archived, Inactive, Optional |

---

## Shadcn Component Usage

1. **Always use shadcn components** for UI elements (Button, Badge, Card, Dialog, etc.)
2. **Never customize shadcn component internals** — wrap or compose instead
3. **Theme colors via Tailwind only** — never inline styles with hex codes
4. **Responsive classes** — use Tailwind breakpoints (`sm:`, `md:`, `lg:`)

---

## Form & Input

- Use `<Input />` + `<Label />` from shadcn (not custom inputs)
- Validation via `react-hook-form` + `zod`
- Error messages in red via `text-destructive`
- Required fields marked with `<span className="text-destructive">*</span>`

---

## Commit Message Checklist

Before committing UI changes:
- ✅ No custom colors (only shadcn preset variants)
- ✅ No emojis (use Tabler Icons)
- ✅ All Spanish text via `ES` constant
- ✅ No mixed badge variants in one section
- ✅ All component imports from shadcn/ui (except icons)
- ✅ TypeScript: `pnpm tsc --noEmit` passes

