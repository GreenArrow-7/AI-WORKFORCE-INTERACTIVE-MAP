# ARCHITECTURE — AI Workforce Interactive Map

> Status: living document. Update it in the same commit as any change it describes.

---

## 0. Phase 1 — reference inspection

The brief nominates `https://skilltree.altari.ai/preview` as an interaction reference.
**This environment's egress proxy blocks that host** (`EGRESS_BLOCKED`, HTTP 403 via
`CONNECT` tunnel), so the reference could not be inspected. No attempt was made to
route around the block.

Consequence: every interaction pattern below is derived from the written brief and from
first-principles product design, not from observing another product. Nothing in this
repository is copied from, or transcribed from, the reference — the brand, copy, colour
system, agent catalogue, skill files and dashboards are all original placeholder content
authored for this project. That was a requirement anyway (§41 of the brief); the block
simply makes it verifiable.

The interaction model we are building to, restated as testable behaviour:

| Question the user is asking | Interaction that answers it |
| --- | --- |
| What can AI do here? | Radial overview: brain → 7 departments, each showing agent count + progress |
| What should we build first? | `recommendedOrder` + dependency depth; "Recommended next deployments" in the summary; rollout lanes |
| How autonomous can it be? | Node fill/border/icon encodes `autonomy` (never colour alone) |
| What does it depend on? | Hover/select highlights upstream dependency closure and the path back to the brain |
| What skills make it work? | Agent drawer → skills list → Markdown skill-file preview |
| What tools does it use? | Tool badges on the agent, filterable globally |
| Who still needs to be involved? | `humanInLoop` block in the drawer, surfaced in rollout rows too |
| Have we deployed it yet? | User `status` (not_started/planned/building/live), persisted, rolled up everywhere |

---

## 1. Product architecture

One dataset, three views. The canonical catalogue is loaded once, validated once, and
indexed once; every view is a projection of that same index.

```
                        data/*.ts  (authored seed catalogue)
                              │
                              ▼
                   lib/schemas  (Zod, parse-at-boundary)
                              │
                              ▼
                   lib/catalog  (validate → index → derive)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
      MAP                 ROLL OUT            COMMAND CENTERS
  radial SVG graph     autonomy lanes        dashboard mockups
        └─────────────────────┼─────────────────────┘
                              ▼
                    shared AgentDrawer  (one component, all views)
                              │
                              ▼
              stores/workforce-store  (Zustand, USER state only)
                              │
                              ▼
              lib/storage  (Repository interface → localStorage today,
                            Supabase/Postgres tomorrow)
```

**The load-bearing rule (§2, §35):** canonical data is immutable and never carries user
state. `Agent` has no `status` field. User progress lives in a separate keyed map
(`Record<AgentId, UserAgentState>`) in the store. Adding an agent means adding a record to
`data/agents.ts` — no component changes, no layout changes, no coordinates.

---

## 2. Route architecture

Views are linkable, but the map must **not** unmount between navigations (§7: animate the
camera, don't navigate to a static page). Two mechanisms:

1. Each view mode owns an **optional catch-all** route, so all of its states resolve to a
   single page component that never remounts:
   - `app/map/[[...path]]/page.tsx`
   - `app/rollout/[[...path]]/page.tsx`
   - `app/command-centers/[[...path]]/page.tsx`
2. Within a view, URL changes use `window.history.pushState`/`replaceState` (natively
   supported by the Next 15 App Router and reflected in `usePathname`). No server
   round-trip, no remount, no lost camera.

Segment parsing is a **pure function** (`lib/routing.ts`), so it is unit-testable and both
directions (URL → state, state → URL) share one definition.

| URL | Meaning |
| --- | --- |
| `/` | redirect → `/map` |
| `/map` | overview: brain + departments |
| `/map/sales` | department focus: functions + agents |
| `/map/sales/prospect-research` | department focus + agent selected, drawer open |
| `/map/brain` | Company Brain detail |
| `/agents/prospect-research` | resolver → redirects to canonical `/map/<dept>/<agent>` |
| `/rollout` | rollout, first department |
| `/rollout/sales` | rollout, that department |
| `/rollout/sales/prospect-research` | rollout + drawer |
| `/command-centers` | grid of preview cards |
| `/command-centers/pipeline` | that dashboard |

Unknown slugs do not 404 the app — they fall back to the nearest valid state and the URL
is corrected via `replaceState` (§36).

---

## 3. Data model

Zod is the single source of truth; TypeScript types are `z.infer`red from the schemas so
the two can never drift.

```ts
Department    { id, name, slug, description, accent, icon, order, mission }
FunctionGroup { id, departmentId, name, slug, description, order }
Agent         { id, departmentId, functionId, name, slug,
                shortDescription, description, businessOutcome,
                autonomy: 'human-led'|'assisted'|'autonomous',
                maturity: 'concept'|'emerging'|'proven',
                dependencies: AgentId[], skills: SkillId[], tools: ToolId[],
                inputs[], outputs[], replaces[],
                humanInLoop { owner, approvalPoints[], retainedByHumans[] },
                buildNotes[], recommendedOrder, evolution { manual, assisted, autonomous } }
Skill         { id, agentId, name, slug, description, version,
                instructions[], inputs[], outputs[], tools[],
                examplePrompt, exampleOutput, fileContent? }
Tool          { id, name, category }
CommandCenter { id, name, slug, description, departmentIds, metrics[], widgets[] }
UserAgentState{ agentId, status: 'not_started'|'planned'|'building'|'live',
                notes?, updatedAt }
```

Deviations from the brief's sketch, and why:

- **`Agent.autonomy` and `UserAgentState.status` are in different files entirely.** The
  brief warns not to confuse them (§11); separating the modules makes confusing them a
  type error rather than a convention.
- **`humanInLoop` is structured, not prose.** The brief asks three distinct questions (who
  stays involved / when approval is needed / what stays human-owned); three fields answer
  them and stay renderable and filterable.
- **`evolution` added.** §21 asks rollout rows to show manual → assisted → autonomous.
  That is data, so it lives in the record.
- **`Skill.fileContent` is optional.** When absent it is *generated* from the structured
  fields by `lib/skills/render.ts`. Authoring a skill twice (once structured, once as
  Markdown) would guarantee drift.
- **`tools` are IDs into a registry**, not free strings, so the tool filter and badges have
  a closed vocabulary.
- **`Department.accent` is a token name**, never a hex value (§33).

### Validation posture (§36)

`lib/catalog/load.ts` validates every record and **quarantines** bad ones rather than
throwing: a malformed agent is dropped into a `CatalogIssue[]` and the rest of the graph
renders. Referential integrity (unknown `departmentId`, dangling `dependencies`, cyclic
dependencies) is checked in the same pass and reported the same way. One bad record can
never blank the map.

---

## 4. Graph rendering approach

**Custom SVG + `d3-hierarchy`.** No graph framework: the brief needs precise control of
radial layout, camera choreography and per-node DOM, which React Flow / Cytoscape would
fight us on. `d3-hierarchy` is used purely as a *calculator* — it never touches the DOM.
`d3-selection`, `d3-zoom` and `d3-transition` are deliberately **not** dependencies.

### Layout

`lib/graph/layout.ts` is a pure function:

```ts
computeLayout(input: LayoutInput): GraphLayout   // nodes[], edges[], bounds
```

- **Overview:** brain at origin; departments on a ring, angle `i / n * 2π` with a fixed
  phase offset. Deterministic, no simulation, no random.
- **Department:** `d3.tree()` over `department → functions → agents`, laid out in polar
  space over an angular sector, then converted to cartesian. `separation` is tuned by
  sibling/cousin so agent labels never collide.
- Edges are typed: `hierarchy` (brain→dept→function→agent) and `dependency`
  (agent→agent). Hierarchy edges are radial/cubic curves; dependency edges are arcs with
  a curvature proportional to angular distance, which is what keeps the picture untangled
  (§8) without an edge-routing pass.

Because layout is a pure function of `(mode, focusedDepartmentId, filteredAgentIds)`, it
is `useMemo`'d and recomputed only when one of those changes. **Filtering never destroys
camera state** (§16) — the camera lives outside React entirely.

### Camera — the central performance decision (§27)

The camera `{x, y, k}` is **not React state**. It lives in a ref inside
`lib/graph/camera.ts` and is applied by writing `transform` directly onto one `<g>`
element inside a `requestAnimationFrame` loop. Pan and zoom therefore cost one DOM
attribute write per frame and **zero React renders**, regardless of node count.

Animated camera moves (department entry, search focus, fit-to-screen) interpolate
`{x, y, k}` in the same rAF loop with an ease-out-cubic over 300–700ms, collapsing to an
instant set under `prefers-reduced-motion`.

Wheel/pointer handling is custom (~150 lines) rather than `d3-zoom`: we need
ctrl/meta-wheel pinch to zoom while plain wheel pans (trackpad-correct behaviour), plus
keyboard camera control, and we need it to not own the DOM node React renders.

### Highlighting without re-rendering (§31, §32)

Hover and selection highlight an agent, its upstream dependency closure, and the path back
to the Company Brain — which means *most nodes on screen change appearance*. Doing that in
React would re-render every node on every hover.

Instead a `HighlightController` computes the affected id set (memoised per agent) and
imperatively toggles `data-hl="on" | "dim"` on the ~k affected elements; CSS does the
rest. Cost is O(changed), not O(n). Node components are `React.memo`'d and their props do
not change on hover at all.

### When to abandon SVG

Documented threshold rather than premature WebGL: SVG holds ~2 DOM nodes per graph node.
Measured comfortably to 300+ nodes (see `tests/unit/layout.perf.test.ts` and the
`?stress=N` dev flag). Beyond **~2,000 simultaneously rendered nodes**, move edges to a
single `<canvas>` under the SVG (nodes stay SVG for hit-testing and a11y); beyond ~10,000,
move both to WebGL. Not before.

---

## 5. State management

Three cleanly separated tiers:

| Tier | Where | Lifetime | Re-renders React? |
| --- | --- | --- | --- |
| Canonical catalogue | `lib/catalog` module singleton | process | no (immutable) |
| User + view state | `stores/workforce-store.ts` (Zustand) | persisted / session | yes, via selectors |
| Camera + highlight | refs + DOM (`lib/graph/*`) | session | **no** |

The Zustand store holds only: `agentStates`, `filters`, `viewMode`, `focusedDepartmentId`,
`selectedAgentId`, `theme`, `searchOpen`. Components subscribe with narrow selectors so a
status change repaints a badge, not the graph.

Persistence goes through a `WorkforceRepository` interface:

```ts
interface WorkforceRepository {
  load(): Promise<WorkspaceSnapshot | null>;
  save(s: WorkspaceSnapshot): Promise<void>;
  clear(): Promise<void>;
}
```

`LocalStorageRepository` implements it today. A `SupabaseRepository` implements the same
interface later with no store or component changes — that is the whole point of the
indirection. Snapshots are versioned and Zod-validated on read, so corrupted or
stale-schema localStorage degrades to "start fresh" instead of a crash (§36).

Hydration: the store starts from canonical defaults on the server, and the persisted
snapshot is applied in a mount effect. Server and first client render therefore agree —
**no hydration errors** (§39).

---

## 6. Component hierarchy

```
app/
  layout.tsx                     theme boot (pre-paint, no flash), fonts, providers
  map/[[...path]]/page.tsx       → MapView
  rollout/[[...path]]/page.tsx   → RolloutView
  command-centers/[[...path]]/   → CommandCentersView
  agents/[slug]/page.tsx         canonical-URL resolver

components/
  app-shell/      AppShell TopNav ViewModeTabs ProgressIndicator ThemeToggle WorkspaceMenu
  graph/          WorkforceMap GraphViewport GraphNode BrainNode DepartmentNode
                  FunctionNode AgentNode GraphEdge GraphControls GraphTooltip
                  GraphTextAlternative   ← a11y peer of the canvas (§28)
  agents/         AgentDrawer AgentHeader AgentStatusSelector AgentSkills
                  AgentDependencies AgentToolBadges AgentHumanInLoop
  brain/          BrainDrawer BrainContextSections
  search/         GlobalSearch SearchResultRow
  rollout/        RolloutView RolloutLane RolloutAgentRow RolloutDepartmentTabs
  command-centers/CommandCenterGrid CommandCenterCard dashboards/*
  progress/       ProgressPanel ProgressBar DepartmentBreakdown
  skill-preview/  SkillFilePreview MarkdownPreview
  shared/         Badge Button Drawer Sheet EmptyState Segmented StatusDot AutonomyGlyph

lib/
  schemas/  catalog/  graph/  search/  export/  storage/  skills/  progress/  routing.ts
data/       departments.ts functions.ts agents.ts skills.ts tools.ts
            commandCenters.ts companyBrain.ts
stores/     workforce-store.ts
```

Rule: `lib/` never imports from `components/`. Domain logic is testable without React.

---

## 7. Technical risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Re-render storm on hover with 300+ nodes | Highlight via imperative DOM attributes + CSS; memoised nodes (§4) |
| Camera state lost on filter change | Camera lives outside React; filters only change layout input |
| Hydration mismatch from theme/localStorage | Theme applied by a pre-paint inline script; persisted state applied post-mount only |
| Dependency cycles from authored data | Cycle detection in the catalog load pass; cycles reported, not thrown |
| Skill Markdown drifting from structured fields | `fileContent` generated from the record unless explicitly overridden |
| Radial tree unusable on phones | Mobile gets a real drill-down list UI, not a squeezed graph (§26) |
| Tangled dependency edges | Typed edges + curvature by angular distance; dependency edges hidden until relevant |
| Import JSON as an attack surface | Zod parse + id allow-listing against the catalogue; unknown ids dropped and reported |
| `any` creeping in at the D3 boundary | `d3-hierarchy` is typed; layout output is our own interface, not d3's |

---

## 8. Implementation checklist

- [x] P1 Reference inspection (blocked — documented above)
- [x] P2 ARCHITECTURE.md, directory structure, tooling
- [x] P3 Zod schemas, tool registry, seed catalogue (63 agents), catalog loader + indexes
- [x] P4 App shell, design tokens, dark/light themes, top nav
- [x] P5 Radial overview map, camera, controls, tooltip
- [x] P6 Department tree layout + animated transitions, active path, hover closure
- [x] P7 Agent drawer, skill-file preview, copy/download
- [x] P8 Status system, repository layer, progress rollups
- [x] P9 Global search (⌘K, fuzzy) + filters
- [x] P10 Export / import / copy summary / reset
- [x] P11 Rollout view (autonomy lanes, progressive disclosure)
- [x] P12 Command centers + interactive dashboards
- [x] P13 Responsive: tablet reduction, mobile drill-down + bottom sheet
- [x] P14 Accessibility pass, text alternative, 300- and 1,000-node performance checks
- [x] P15 Visual polish, clean `typecheck` + `lint` + `test` + `build`

## 9. Verification

| Command | Covers |
| --- | --- |
| `npm run verify` | strict typecheck, lint, 134 unit tests |
| `npm run test:browser` | 49 checks walking §43's definition of done in Chromium |

Unit suites cover schema validation and loader resilience (malformed records,
cross-department functions, dangling references, cycles, duplicate ids), progress
rollups and deployment recommendations, dependency closure, fuzzy search, route
parsing and repair, export/import validation, localStorage recovery, skill-file
generation and Markdown tokenising, and layout correctness including
non-collision at 300 and 1,000 agents.

The browser walkthrough is deliberately a real browser rather than jsdom: the
core of this product is a pan-and-zoom SVG canvas whose behaviour depends on
pointer capture, hit-testing and layout, none of which jsdom models. It caught
four defects that unit tests could not have: pointer capture swallowing node
clicks, the brain's connector crossing the agent ring, fit-to-screen clipping
every label, and a stale hover dimming a freshly opened department.
