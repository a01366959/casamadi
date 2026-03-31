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

### No Emojis on Frontend

❌ **Never use emojis in UI:**
```tsx
// Wrong
<Button>👍 Accept</Button>
<div>🏥 Hotel Management</div>
<Badge>✨ Premium</Badge>
```

✅ **Use Tabler Icons instead:**
```tsx
import { IconThumbUp, IconBuilding, IconStar } from '@tabler/icons-react'

<Button><IconThumbUp /> Accept</Button>
<div><IconBuilding /> Hotel Management</div>
<Badge><IconStar /> Premium</Badge>
```

### Icon Guidelines
- Import from `@tabler/icons-react` — never mix icon libraries
- Use consistent sizing: `className="h-4 w-4"` for inline, `className="h-5 w-5"` for larger contexts
- Always pair icons with text (unless `aria-label` is present)

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

