# Lifely

**Track today. Build tomorrow.**

A mobile personal operating system: capture your whole day, do the work, earn credits, reflect,
and see what it adds up to. Built with React Native, Expo and TypeScript against
[`lifely_claude_code_product_spec.md`](../lifely_claude_code_product_spec.md).

---

## Running it

The app talks to the Lifely API in [`../server`](../server), so start that first:

```bash
cd ../server && npm install && npm run dev   # http://localhost:4000
cd ../lifely  && npm install && npm start    # then press i / a, or scan the QR with Expo Go
```

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start on a specific platform |
| `npm test` | Jest — unit, store and render tests |
| `npm run typecheck` | `tsc --noEmit`, strict mode |

### Finding the server

`src/api/config.ts` resolves the API's address at runtime, because the same bundle has to reach it
from four different places:

| Where the app runs | What it uses |
| --- | --- |
| Web, iOS simulator | `http://localhost:4000` |
| Android emulator | `http://10.0.2.2:4000` (the host, seen from inside the emulator) |
| Physical device, Expo Go | The LAN address Metro is served from, port 4000 |

Set `EXPO_PUBLIC_API_URL` to override all of it — that is what you want once the server is deployed
somewhere real:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com npm start
```

The sign-in screen prints the address it resolved, so if the app cannot reach the server you can see
immediately which one it tried.

**First launch:** create an account, then onboarding takes under a minute. If you would rather see a
populated app immediately, tap *"Just show me around with sample data"* on the welcome screen — the
server fills your account with a believable fortnight, written through the real credit engine. The
same is available later under **Settings → Load sample data**.

---

## What is built

The MVP scope from §42 of the spec, in full.

| Area | Screen | Notes |
| --- | --- | --- |
| Onboarding | `app/onboarding.tsx` | 5 steps: name, focus areas, first goal, habits, hours |
| Dashboard | `app/(tabs)/index.tsx` | Life Score, four metrics, progress, current focus, habits, priority tasks |
| Timeline | `app/(tabs)/timeline.tsx` | Chronological day, 14-day date strip, untracked gaps |
| Insights | `app/(tabs)/insights.tsx` | Trends, time allocation, habit heatmap, written summary |
| Profile | `app/(tabs)/profile.tsx` | Streak, lifetime credits, average score, navigation |
| Tasks | `app/tasks.tsx`, `app/task-editor.tsx` | Today / Upcoming / Done, full CRUD |
| Habits | `app/habits.tsx`, `app/habit-editor.tsx` | Streaks, rest days, custom schedules |
| Goals | `app/goals.tsx`, `app/goal/[id].tsx`, `app/goal-editor.tsx` | Milestones or numeric targets |
| Credits | `app/credits.tsx` | Balance and the full ledger, grouped by day |
| Rewards | `app/rewards.tsx`, `app/reward-editor.tsx` | Self-priced, double-redemption guarded |
| Reflection | `app/reflection.tsx`, `app/reflections.tsx` | Five questions, mood and energy |
| Focus | `app/focus.tsx` | 25 / 50 / 90 minute blocks, survives backgrounding |
| Assistant | `app/assistant.tsx` | Reads a structured context, never invents data |
| Quick add | `app/quick-add.tsx` | The centre `+`, reachable from every tab |
| Settings | `app/settings.tsx` | Profile, hours, credit values, notifications, privacy, data |

---

## Architecture

```
app/                 Routes (expo-router, file-based)
src/
  theme/             Colours, type scale, spacing, radii, elevation
  types/             Domain models — mirrors §19–§24 of the spec
  lib/               Dates, ids, formatting, haptics
  domain/            Business rules, all pure and all unit-tested
    credits.ts         The credit engine
    lifeScore.ts       The Life Score algorithm
    habits.ts          Scheduling and streaks
    goals.ts           Progress
    ai.ts              AIService abstraction over the server's assistant
  api/               Typed API client — auth, token refresh, endpoint wrappers
  store/             Zustand stores (session + account data), derived reads
  components/        Reusable UI — cards, charts, primitives
```

### Three rules the code holds to

**1. Credits only move on the server.** No screen touches a balance, and neither does the store.
Completing a task posts to `/tasks/:id/complete`; the server writes the ledger row and the timeline
entry in one transaction and returns what it did. The client then re-reads those slices rather than
predicting them, so the two can never drift. Balances and lifetime totals come from the server's own
aggregate over the whole ledger — the client caches only a recent window of rows.

**2. Nothing derived is stored.** The Life Score, daily records, streaks and every analytics number
are recomputed on read from the cached logs. There is no cached score that can go stale.

**3. The assistant only reads what exists.** It runs server-side and builds its context from the
database, so it always answers from the current record. Where data is missing it says so instead of
filling the gap ("I don't see a workout recorded today"). No screen imports a provider.

---

## Design system

Light mode only, per §5.1. Everything comes from `src/theme` — no screen hardcodes a colour or a
font size.

- **Canvas** warm off-white `#F6F7F5`, white cards, hairline borders, 16–32px radii, soft shadows.
- **Accent** a single emerald (`#0E9F6E`). Colour is used sparingly enough that when something *is*
  coloured, it means something.
- **Type** Inter, six steps. Font scaling stays enabled and is capped at 1.45× so large
  accessibility sizes do not break layouts.
- **Motion** subtle and short. Entry fades on the dashboard, a spring on completion, a credit toast
  that leaves in under three seconds. The Life Score ring respects *Reduce Motion*.

### Chart colours

The eight category colours double as the categorical series palette, so a category keeps one
identity across chips, cards and charts. They were validated as an **ordered** palette — the order
in `CATEGORY_SERIES_ORDER` is the colourblind-safety mechanism, not decoration, which is why charts
render categories in that fixed order rather than sorting slices by size.

The set passes all six checks on a white surface: lightness band, chroma floor, adjacent-pair CVD
separation (worst ΔE 8.8 deutan), the normal-vision floor (worst ΔE 17.6), and 3:1 contrast.
**Re-run the validator before changing any of those hexes or their order.** Magnitude encodings
(the habit heatmap) use the single-hue sequential ramp instead, never the categorical set.

---

## Accessibility

- Touch targets are at least 44px throughout.
- State is never carried by colour alone — a completed task shows a strikethrough *and* a
  "Completed" chip; a completed habit shows a check *and* a filled dot.
- Progress rings and bars expose `accessibilityValue`; charts label every mark.
- Every interactive element has a role and a label, including the icon-only ones.

---

## Testing

```bash
npm test
```

78 tests, covering what the spec asks for in §51:

- **Credit engine** — priority values, focus tiers, the streak-bonus cap, ledger arithmetic.
- **Life Score** — weighting, normalisation, clamping, division-by-zero on an empty day.
- **Streaks** — rest days and unscheduled days step over a streak; a genuine miss breaks it; today
  stays neutral while still open.
- **Goals** — numeric targets beat milestones, progress caps at 100%.
- **Store integration** — complete a task → credits, ledger entry and timeline entry appear
  together; undo removes all three; a reward cannot be redeemed twice or overdraw; a reflection
  pays out once and not again on edit.
- **Render** — every card and chart mounts, renders its numbers, and handles the empty case.

---

## Not built

Deliberately out of MVP scope, and where each would go:

- **Offline use.** The store is now server-backed: it loads the account on launch and every write
  goes to the API. There is no outbox, so actions taken without a connection fail with a toast
  rather than queueing.
- **Push notifications.** The preferences UI and model exist in Settings and save to the account;
  scheduling them needs `expo-notifications` and a dev build.
- **Calendar, health and screen-time integrations** (§30) — Phase 2 and 3.
