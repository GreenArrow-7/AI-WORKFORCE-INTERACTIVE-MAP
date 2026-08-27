# Atlas — AI Workforce Interactive Map

An interactive map of a company as an AI workforce. It is not an org chart: it is
built to answer the questions that come *before* you build anything.

| Question | Where it is answered |
| --- | --- |
| What can AI do here? | The radial map: Company Brain → 7 departments → functions → agents |
| What should we build first? | Deployment waves, dependency closure, and "Recommended next" in the progress panel |
| How autonomous can it be? | Node fill, border and glyph — never colour alone |
| What does it depend on? | Hover or select an agent to light its upstream chain back to the brain |
| What skills make it work? | The agent drawer, with the generated Markdown skill file |
| What tools does it use? | Tool badges, which double as a filter across the whole map |
| Who still needs to be involved? | The human-in-the-loop block: who stays involved, what needs approval, what stays human-owned |
| Have we deployed it yet? | Your own status per agent, persisted and rolled up everywhere |

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run verify       # typecheck + lint + unit tests
npm run build && npm start
npm run test:browser # walks the definition of done in a real browser
```

`test:browser` needs a running server. Point it with `BASE_URL`, and if Playwright
cannot find a browser, give it `CHROMIUM_PATH`:

```bash
BASE_URL=http://localhost:3000 npm run test:browser
```

## What is where

```
app/          routes. Each view owns ONE optional catch-all so the map never remounts
components/   presentation only — app-shell, graph, agents, brain, search,
              rollout, command-centers, progress, skill-preview, mobile, shared
lib/          all domain logic, testable without React
  schemas/    Zod schemas; every type is inferred from them
  catalog/    validate → repair → index the authored data
  graph/      layout (d3-hierarchy as a calculator), camera, highlighting
  progress/   rollups and "what should I build first?"
  search/     fuzzy matcher and the ⌘K index
  storage/    WorkforceRepository — localStorage today, Postgres later
  skills/     skill-file generation and a small Markdown tokeniser
data/         the authored catalogue, split per department
stores/       Zustand: user state only
tests/        unit suites (vitest) + the browser walkthrough (playwright)
```

`lib/` never imports from `components/`.

## The three ideas worth knowing

**Canonical data and user state are separate, and cannot be confused.** An `Agent`
has no `status` field. How autonomous an agent is (`autonomy`) is a property of
its design; how far *you* have deployed it (`status`) is yours, and lives in a
different module, a different store and a different file on disk. Marking an
agent live never mutates the catalogue.

**The camera is not React state.** It lives in a ref and writes `transform`
straight onto one `<g>` inside `requestAnimationFrame`. Panning and zooming cost
one attribute write per frame and zero renders, at any node count. Highlighting
works the same way: it toggles `data-hl` on the handful of affected elements and
lets CSS do the dimming, so hovering never re-renders a node.

**Everything is data.** Adding an agent is a record in `data/agents/`. No
coordinate, no card and no graph relationship is written into a component — the
layout is computed, the dashboards are declared as widget lists, and department
colours and icons are token names resolved at render time.

## Adding to the catalogue

1. Add the record to `data/agents/<department>.ts` (and a skill in
   `data/skills/<department>.ts` if it needs one).
2. Run `npm test`. `tests/unit/catalog.test.ts` fails if any reference dangles,
   any slug collides or any dependency cycle appears.

Nothing else. The map, the rollout lanes, search, filters, progress and the
dashboards all pick it up.

Bad records never take the app down: the loader drops what it cannot validate and
strips references it cannot resolve, reporting both in `catalog.issues`, so one
malformed agent cannot blank the graph.

## State and persistence

Anonymous progress is kept in `localStorage`, behind a `WorkforceRepository`
interface with three methods. A Supabase or Postgres implementation drops in
without touching the store or any component. Snapshots are version-stamped and
re-validated on read, so corrupted or stale storage degrades to "start fresh"
rather than a crash — and the same validation guards imported files.

## Accessibility

- Every graph node is focusable, labelled and operable from the keyboard.
- The map has a full hierarchical text equivalent in the accessibility tree — the
  content, not a summary.
- Autonomy and status are encoded by shape and glyph as well as colour.
- `prefers-reduced-motion` removes animation, and the camera jumps instead of
  tweening.
- Below `md` the radial map is replaced by a real drill-down list, not shrunk.

## Scale

Measured to 1,000 agents in `tests/unit/layout.test.ts`; rings grow so nodes
never collide. SVG is the right tool at this size. Past roughly 2,000
simultaneously rendered nodes, move edges to a `<canvas>` beneath the SVG and
keep nodes in SVG for hit-testing and accessibility; past ~10,000, move both to
WebGL. Not before.

## Notes on content

The brand, the company, the agent catalogue, the skill files and every dashboard
figure are original placeholder content written for this project. `ARCHITECTURE.md`
records the design decisions and the reasoning behind them.
