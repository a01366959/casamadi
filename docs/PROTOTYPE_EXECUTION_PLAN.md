# Casamadi Prototype Execution Plan

Version: 2026-04-07
Objective: Reach a rough but real end-to-end prototype where each page works with live DB data and core flows can be tested page by page.

## Principles
- Docs-first: PRD, ARCHITECTURE, MODULES, EPICS, TASKS are source of truth.
- Real flows only: no fake/static-only screens for prototype completion.
- No seed/demo rows: validate using real agent-generated traffic and real staff interactions.
- shadcn consistency: all UI blocks built with existing shadcn components in repo.
- Single-hotel policy: keep internal hotel_id, hide complexity from staff UX.

## Current Reality (Code + DB)
- Implemented pages exist for dashboard, conversations list/thread, orders, tasks, sandbox, admin users, guest menu.
- Agent tools currently write to Spanish tables for operations:
  - tareas
  - pedidos (partially through menu/order flows)
- Some dashboard pages currently read from English tables:
  - orders
  - tasks
- Result: not all pages are connected to the same live operational data.

## Critical Decision (Must Lock First)
Choose one canonical operational model for prototype:

Option A (Recommended for fastest working prototype)
- Canonical staff-operational tables: pedidos + tareas
- Update Orders/Tasks pages to read/write pedidos/tareas.
- Keep orders/tasks tables untouched for now.

Option B
- Canonical staff-operational tables: orders + tasks
- Refactor agent tools to write orders/tasks instead of pedidos/tareas.
- Requires broader backend changes and higher risk.

Recommended: Option A to get all pages working faster with current agent behavior.

## Definition of "Working Prototype" per Page
A page is prototype-complete only if:
1. Loads real DB records.
2. Empty/loading/error states are present.
3. Primary user action writes to DB and is visible in UI.
4. Realtime or refresh path updates state after write.
5. Route is reachable from sidebar/navigation.

## Delivery Phases

### Phase 1: Foundation Alignment (Day 1)
- Lock canonical tables for operations (pedidos/tareas recommended).
- Normalize route consistency:
  - /dashboard/tasks
  - /guests/menu/:hotelId
- Fix type/lint blockers only in touched files.
- Add minimal smoke checks for pages and APIs.

Acceptance
- Agent build passes.
- Web dev server runs.
- Core navigation paths work without 404.

### Phase 2: Conversations + Sandbox (Day 1-2)
Scope
- Conversations list + thread fully connected.
- Sandbox chat sends/receives through real agent path.
- Thread rename and message send path stable.

Acceptance
- New sandbox message creates/updates conversation/messages.
- Conversation appears in /conversations and thread opens.

### Phase 3: Orders + Tasks Operational Flows (Day 2-3)
Scope
- Orders page connected to canonical table (pedidos recommended).
- Tasks page connected to canonical table (tareas recommended).
- Status transitions write and reflect in realtime.

Acceptance
- Agent-created task (example: extra towels) appears in Tasks page.
- Staff can assign/complete task from UI.
- Room service order appears in Orders page and status can progress.

### Phase 4: Dashboard KPIs + Admin Users (Day 3)
Scope
- Dashboard cards show live counts from conversations/pedidos/tareas/reservations.
- Admin users page CRUD works on users table.

Acceptance
- KPI numbers change after creating sandbox records.
- Admin updates role/status and changes persist.

### Phase 5: Guest Menu + Menu API (Day 3-4)
Scope
- Guest menu page loads live menu_items.
- Menu API resolves hotel correctly in single-hotel mode.
- Remove UI hardcoded text where still present (ES dictionary usage).

Acceptance
- /guests/menu/:hotelId renders active sections/items from DB.
- No dead links from agent menu responses.

### Phase 6: End-to-End Test Pass (Day 4)
Test script
1. Sandbox: guest asks availability.
2. Agent replies and stores messages.
3. Guest requests towels -> task created.
4. Staff completes task in Tasks page.
5. Guest asks for menu -> menu shown from DB.
6. Guest order -> order appears in Orders page.

Acceptance
- All six steps pass in one environment without manual DB edits.

## Page-by-Page Checklist
- Dashboard (/dashboard)
  - Real KPIs
  - Basic trend widgets or placeholders with real counts
- Conversations (/conversations, /conversations/:id)
  - List/read/send/realtime
- Orders (/orders)
  - Board/list + status updates on canonical table
- Tasks (/dashboard/tasks)
  - List + assign + complete on canonical table
- Sandbox (/sandbox)
  - Real chat + simulate payment endpoint reachable
- Admin Users (/admin/users)
  - Load + edit role/status
- Guest Menu (/guests/menu/:hotelId)
  - Live menu items grouped by section

## Out of Scope for Prototype Stage
- Final polish, animation tuning, visual refinements.
- Deep performance optimization.
- Full PWA score hardening.
- Final copy polish.

## Working Sequence (Execution Order)
1. Data model alignment decision (pedidos/tareas vs orders/tasks).
2. Conversations + Sandbox hardening.
3. Orders + Tasks hardening.
4. Dashboard KPI connectivity.
5. Guest menu and menu API hardening.
6. End-to-end script verification.
