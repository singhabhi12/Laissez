# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Product summary

**The product is called Laissez, and only Laissez.** "Visa Unlock" was a Lovable-era
placeholder; never use it in UI, metadata, docs or code. (`data/visa-unlock-dataset.json`
keeps its name: it is the dataset's filename, set by the owner, and describes the data.)

**Laissez** answers one question: *what does your passport
actually open, once you count the visas and residence permits you already hold?*

Many countries waive their own visa for someone who holds a valid US visa, a Schengen
visa, a UK residence permit, a Canadian PR card or a US green card. That second layer is
invisible on a normal passport-index map. The app makes it visible:

1. The user picks a passport.
2. The user adds documents they hold (visa / residence permit / permanent residence,
   issued by a country or a group such as Schengen, EU, GCC).
3. The app shows a world map and list where each destination is coloured by entry
   requirement, with the countries **unlocked by the documents** highlighted, plus a
   "next best visa" ranking of which document would open the most new countries.

Deliberate product rules baked into the code:

- A rule only counts when it is **better than the base requirement** (ranked via `RANK`
  in `src/lib/unlock.ts`). A visa-on-arrival rule for someone who already gets
  visa-on-arrival is not an "unlock".
- **Transit-only benefits are listed separately and never counted** in totals
  (`grant: "transit"` → `TravelPower.transit`).
- Every rule carries `conditions`, `confidence` and official `sources`, and the UI shows
  them. The app is explicitly not legal advice.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 16 App Router** (Turbopack), React 19 Server Components |
| UI | React 19, TypeScript 5.8 (strict) |
| Styling | Tailwind CSS v4 (CSS-first, `@theme inline` in `src/styles.css`) via `@tailwindcss/postcss` |
| Components | shadcn/ui "new-york" (Radix primitives), lucide-react icons |
| Theme | **next-themes** (`attribute="class"`, `defaultTheme="system"`, storage key `theme`) |
| Fonts | **next/font** Inter as the fallback; the system stack stays first in `--font-sans` |
| Animation | framer-motion |
| Map | react-simple-maps 3 + world-atlas TopoJSON from jsDelivr, via `next/dynamic` with `ssr: false` |
| Tests | Vitest 4 (node environment, pure logic only) |
| Package manager | npm (`package-lock.json`; `.npmrc` sets `legacy-peer-deps` for react-simple-maps' React 18 peer) |

Scripts: `npm run dev`, `build`, `start`, `lint`, `typecheck`, `format`, `test`, `test:watch`.

`npm run typecheck` runs `next typegen` first because `typedRoutes` is enabled:
route types live in `.next/dev/types` and must exist before `tsc`.

## Folder conventions

```
app/                     App Router routes, each a thin server component
  layout.tsx             html/body shell, ThemeProvider, header/footer, root metadata
  page.tsx               /            (static)
  results/page.tsx       /results     (dynamic: reads searchParams)
  next-visa/page.tsx     /next-visa   (dynamic: reads searchParams)
  about/page.tsx         /about       (static)
  how-it-works/page.tsx  /how-it-works (static)
  error.tsx              client error boundary
  not-found.tsx          404
src/
  styles.css       the whole design system: @theme tokens, :root / .dark, @utility
  data/            ALL mock data (countries, base, rules, documents) — swappable
  lib/             pure logic: unlock.ts, query-state.ts, routes.ts, utils.ts
  components/      app components; *View components hold the client-side state
  components/results/  results-page pieces (WorldMap, CountryList, CountCards, …)
  components/ui/   shadcn/ui primitives — regenerate, don't hand-edit
  hooks/           use-mobile.tsx
```

Pages are server components that parse `searchParams` and hand plain props to a
client view (`ResultsView`, `NextVisaView`, `HomePlanner`). Add `"use client"`
only where interaction actually needs it — `StatusPill` and `Legend` are shared
and stay server-renderable.

Imports use the `@/*` alias for `./src/*`. Components under `components/ui/` come
from the shadcn registry configured in `components.json`.

## Design tokens

All tokens are CSS custom properties in [src/styles.css](src/styles.css); Tailwind
utility names are mapped from them in the `@theme inline` block. The palette is an
Apple-style system palette with a light `:root` set and a `.dark` override.

### Colour (light → dark)

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#ffffff` | `#000000` |
| `--foreground` | `#1d1d1f` | `#f5f5f7` |
| `--grouped` (section fills) | `#f5f5f7` | `#1c1c1e` |
| `--card` / `--popover` | `#ffffff` | `#1c1c1e` |
| `--primary` / `--accent` / `--ring` | `#0071e3` | `#0a84ff` |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--secondary` / `--muted` | `#f5f5f7` | `#2c2c2e` / `#1c1c1e` |
| `--muted-foreground` | `#6e6e73` | `#98989d` |
| `--destructive` | `#d70015` | `#ff453a` |
| `--border` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.12)` |
| `--input` | `rgba(0,0,0,.12)` | `rgba(255,255,255,.16)` |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(28,28,30,.72)` |

Status palette (drives the map fills, pills and legend):

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--status-free` | `#34c759` | `#30d158` | visa free |
| `--status-eta` | `#5ac8fa` | `#64d2ff` | eTA **and** visa on arrival |
| `--status-evisa` | `#ff9f0a` | `#ffd60a` | eVisa |
| `--status-required` | `#d2d2d7` | `#3a3a3c` | visa required |
| `--status-nodata` | `#ececf0` | `#242426` | country outside our dataset |
| `--status-ink` | `#1d1d1f` | `#000000` | text/icon on a status chip |

Charts: `--chart-1…5` = `#0071e3`, `#34c759`, `#5ac8fa`, `#ff9f0a`, `#d2d2d7`.
Sidebar tokens mirror the grouped/primary set.

### Radii

`--radius: 12px` is the base; the scale derives from it:
`sm = radius-4`, `md = radius-2`, `lg = radius`, `xl = radius+4` (16px),
`2xl = +8`, `3xl = +12`, `4xl = +16`, plus a fixed `--radius-sheet: 20px`
(sheets, drawers and the hero card use `rounded-[20px]`). Pills and chips are
`rounded-full`.

### Type

- `--font-sans`: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", var(--font-inter), "Helvetica Neue", sans-serif` — the system stack comes first and `--font-inter` is supplied by next/font
- `--font-display`: same, favouring `SF Pro Display`
- `body`: 17px / 1.47, antialiased
- `@utility text-display`: `clamp(40px, 7vw, 56px)`, 1.07, 600, `-0.02em`
- `@utility text-title`: 28px / 1.14, 600, `-0.01em`
- `@utility text-body`: 17px / 1.47
- `@utility text-caption`: 13px / 1.38
- One-off sizes used inline: `text-[21px]` (hero sub), `text-[19px]` (wordmark),
  `text-[15px]` (controls), `text-[88px]` (the big count)

### Other

- `@utility glass`: `background: var(--glass)` + `backdrop-filter: saturate(180%) blur(20px)` — used by the header, the sticky results bar, sheets and the map tooltip
- `--float-shadow` → `shadow-float`: `0 8px 32px rgba(0,0,0,.12)` (dark: `.6`)
- `@utility tnum` (tabular numerals) on every number that animates or aligns
- `@utility no-scrollbar` for the horizontal card/chip scrollers
- Focus: `:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px }`
- A global `prefers-reduced-motion` block flattens animations; `AnimatedNumber` also
  checks `useReducedMotion()`
- Touch targets are consistently `h-11` (44px) / `min-h-14`
- Theme is class-based (`.dark` on `<html>`), managed by next-themes (pre-paint
  script, system default, `localStorage.theme`) and toggled by `ThemeToggle`

## Rules

These are hard constraints. Follow them unless the user explicitly says otherwise.

1. **Keep the Lovable design pixel-identical unless asked.** Do not restyle, re-space,
   re-colour, swap fonts, or "tidy" markup while making a functional change. New UI
   reuses the existing tokens and utilities (`text-display`, `text-title`,
   `text-caption`, `glass`, `tnum`, `bg-grouped`, `shadow-float`, `h-11`) rather than
   introducing new values. If a change must alter visuals, say so first.
2. **TypeScript strict.** `strict` is on along with `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`,
   `noFallthroughCasesInSwitch` and `noImplicitOverride`. Index-signature reads use
   bracket access (`s["p"]`), optional props are declared `prop?: T | undefined`, and
   `any` is not an acceptable escape hatch.
3. **No backend database.** There is no server DB, no ORM, no auth, no user accounts and
   nothing is persisted server-side. All data is static and ships in the bundle; all
   user state lives in the URL query (`?p=IND&d=USA-visa`, parsed in
   `src/lib/query-state.ts`) so results are shareable. The only `localStorage` use is the
   theme preference. Do not introduce a database, a server mutation or a session.
4. **All visa logic lives in `src/lib`, pure and unit tested.** `computeTravelPower` in
   [src/lib/unlock.ts](src/lib/unlock.ts) is the single source of truth: no I/O, no
   `Date.now()` surprises (the travel date is an injected argument), rules injectable for
   tests. The UI must never reimplement matching, ranking, date-window or
   issuer-group logic — it reads `DestinationResult` / `TravelPower` and renders.
   Every logic change ships with a case in
   [src/lib/unlock.test.ts](src/lib/unlock.test.ts), and `bun run test` must pass.
5. **Every user-facing rule shows its source.** A rule is only displayed together with
   its `conditions`, its `confidence` level (with the plain-language explanation) and its
   official `sources` links, as `CountryDetail` does. Never add a rule to
   `src/data/rules.ts` without at least one official `sources` URL, and never surface an
   unlock in the UI without a path to that source. The "not legal advice / airlines
   decide boarding / check the official source" disclaimer stays.

## Production (Vercel)

Deployment steps live in `DEPLOY.md`. What matters when changing code:

- **CSP allows `'unsafe-inline'` scripts, deliberately.** A nonce-based CSP forces every
  page to render dynamically and would remove static generation from all 2189 landing
  pages. Everything else is locked to `'self'`. If you add a third-party origin (a font,
  an embed, an API), the CSP in `next.config.ts` will block it until you list it.
  Vercel Toolbar origins are added on preview deployments only.
- **Never render theme-dependent markup from `useTheme()`.** next-themes resolves the
  theme synchronously on the client, which the server cannot know, so every
  dark-mode visitor got a hydration mismatch and the whole document was re-rendered.
  `ThemeToggle` now picks its icon *and* accessible name with `dark:` CSS variants.
  Do the same for anything else that depends on the theme.
- `SITE_URL` comes from `resolveSiteUrl()`: `NEXT_PUBLIC_SITE_URL`, then the Vercel
  production domain, then the preview's own `VERCEL_URL`. Previews are `noindex`
  (`robots.ts` plus an `X-Robots-Tag` header).
- `<Analytics />` renders only when `VERCEL` is set; `/_vercel/insights` does not exist
  elsewhere.
- `images.unoptimized` is on because nothing uses `next/image`. Turn it off if that
  changes.
- `outputFileTracingIncludes` lists `public/data` for every route that reads it at
  request time. Without it, a refactor of `load.server.ts` could drop the files from
  the deployed functions and fail only in production.
- Error boundaries use Next 16's `retry()` (re-fetch then re-render), not `reset()`, and
  receive `error: unknown`; read the digest via `errorDigest()`.
- Icons are generated from one geometric "L" in `scripts/generate-icons.tsx`
  (`npm run icons:build`) and committed. The full wordmark is illegible at 16-32 px.
- `scripts/` is in `tsconfig.json`'s `include`. It was not before, so the scripts were
  never type-checked; keep it there.

## CI and data upkeep

`ci.yml` order matters: `data:build` must run before `test`, because the tests read the
generated `public/data`. `data:freshness` runs last so a date-driven failure never hides
a code failure.

`scripts/check-freshness.ts` wraps the pure `analyseFreshness` in `src/lib/freshness.ts`.
It **fails** on `valid_until` in the past, and **warns** on expiring within 30 days,
`last_verified` older than 90 days, or `confidence: "low"`. `FRESHNESS_TODAY=YYYY-MM-DD`
simulates a date. As of 2026-10-17, `IRL-1` (2026-10-31) and `NZL-2` (2026-11-02) are
about to expire: CI goes red on 2026-11-01 unless they are updated.

Also on the watch list from the 2026-10-19 data update (no data change yet):
Montenegro plans visas for RUS, BLR, CHN, SAU and TUR from 2026-11-01 (pending the
Official Gazette), and South Africa's eTA becomes mandatory around 2026-11-01.

**The sync's monthly schedule is off.** On 2026-10-19 the base matrix moved to
imorte's passport-index-data (17 Feb 2026) plus 927 hand-researched corrections
(`NEW DATA/laissez-patch-2026-10-19.json` lists every cell with its source). The
sync still pulls ilyankou's CSV and would revert them, so it runs only on
`workflow_dispatch` until a new upstream and a way to keep corrections exist.

`scripts/sync-base-matrix.ts` wraps `src/lib/base-matrix-diff.ts`. It writes back the
**raw** JSON object, never the Zod-parsed one — parsing applies schema defaults, which
would stamp schema defaults into every rule and bury the real change in a whole-file
diff. It also matches the source formatting exactly (one-space indent, no trailing
newline). `scripts/sync-base-matrix.test.ts` runs the real script against an in-process
HTTP server and asserts only the edited lines change; it fails if that bug comes back.
`DATASET_PATH`, `SUMMARY_PATH` and `PASSPORT_INDEX_CSV_URL` exist so this can run on a
copy.

Actions are pinned to commit SHAs with the tag in a comment. Bump them deliberately.

## Trust, accessibility and performance

The disclaimer and the base-matrix credit live in `src/lib/legal.ts` and are shown
in the footer, on /about and in every country detail. One wording, one place.

**Contrast.** Light `--primary` is `#006de2`, not `#0071e3`: the original was
4.31:1 as a link on `bg-grouped` and failed AA. In dark mode no single blue can be
both a white-text surface and a link on `#1c1c1e` at AA — the maths does not allow
it — so there are two tokens: `--primary` (surface, white text sits on it) and
`--link` (link text). Use `text-link` for links and `bg-primary` for filled
controls. Both themes pass AA on every pairing.

**Accessibility.** Lighthouse scores 100 on /, /results and a landing page. The
map's interactive countries carry `role="button"` (an `aria-label` on a bare
`<path>` is invalid ARIA) and the rest are `aria-hidden`; the list view is the
text alternative. The map/list control is a real tabs widget with arrow-key
navigation and `tabpanel` association, and the headline count sits in an
`aria-live="polite"` region.

**Performance.** world-110m is vendored into `public/` rather than loaded from
jsDelivr, and the map mounts on `requestIdleCallback` so its chunk does not
evaluate on the critical path. `/results` sets `Cache-Control: public` so it can
enter the back/forward cache, which dynamic pages otherwise cannot.

**Analytics.** `src/lib/analytics.ts` holds the five events so a rename cannot
split one event in two.

## Report a problem

`POST /api/report` files a GitHub issue labelled `data-report`, titled
`[MEX-1] Mexico, IND passport: report`. No database is involved.

The route is a thin shell over four testable modules in `src/lib/report`:
`schema.ts` (Zod), `rate-limit.ts`, `issue.ts` (title/body builders) and
`github.ts` (REST client, `fetch` injectable).

Three things that are deliberate, not oversights:

- **The honeypot field validates successfully.** Rejecting `website` in the
  schema returns a 400 naming the field, which tells a bot exactly what caught
  it. The schema accepts it and the route answers `202 {ok:true}` while filing
  nothing.
- **Rate limiting is in-process memory**, 5 per hour per IP. It resets on
  redeploy and is not shared between instances. That is the honest trade for
  having no database: it stops casual repeat submissions, not a determined
  attacker. Swap in a shared store if that stops being enough.
- **The reporter's message is fenced**, never interpolated, so nothing they type
  can forge the context table below it.

Without `GITHUB_TOKEN`/`GITHUB_REPO` the route returns 503 and the form shows an
error — it never pretends to have worked. `GITHUB_API_URL` points at GitHub
Enterprise, and is what the end-to-end test aims at a stub server.

**Privacy:** issues are filed in `GITHUB_REPO`. If that repo is public, so is
every report and any email a reporter gives. The form says so above the submit
button; the README and `.env.example` repeat it.

## Landing pages

`/{passport-slug}/with-{document-slug}` (e.g. `/india/with-us-visa`) — 199 x 11 =
**2189 pages**, all prerendered. Next only allows whole-segment params, so the route
is `app/[passport]/[document]/` and the `with-` prefix is validated by
`parseWithSlug`; anything else 404s.

Slugs, demonyms and demonym plurals are generated into `countries.json` at build
time (`world-countries`, plus a Kosovo override), and the build fails on a slug
collision. Two language rules live in `src/lib`:

- `demonymPlural` — "Indians", but "British passport holders", because "Britishs"
  and "Chineses" are not words.
- `indefiniteArticle` — by sound, not spelling: "an EU residence permit" (ee-you)
  but "a US visa" and "a UK visa" (yoo); "a Ukrainian" but "an Uzbekistani".

All page copy comes from `landingCopy`, which is built from the computed
`TravelPower`, so a page can never state a number the engine did not produce.

OG images: `app/[passport]/[document]/opengraph-image.tsx` for landing pages and
`app/og/route.tsx` for `/results` (an `opengraph-image` cannot see search params).
Both render through `src/lib/og.tsx`. Two satori constraints apply there: every
`div` with more than one child needs an explicit `display`, and emoji need
`emoji: "twemoji"` because satori ships no emoji glyphs. Its colours are literal
copies of the light-mode tokens and must be kept in step with `styles.css`.

`sitemap.ts`, `robots.ts` and `metadataBase` cover SEO; set `NEXT_PUBLIC_SITE_URL`
or canonicals fall back to `https://laissez.example`.

## Next best visa

`scripts/build-data.ts` precomputes, for all 199 passports x 11 presets, what each
preset document would add to a traveller holding nothing else, and stores it in that
passport's shard as `next_visa` (with `next_visa_as_of`). 2189 engine runs, ~370 ms.

`/next-visa` uses the stored ranking when no documents are held **and** no `?date=`
is given. Otherwise it ranks in the browser, scoring each preset by what it adds *on
top of* the documents already held — so a Schengen visa drops from +64 to +36 once a
US visa is in hand, and presets already held disappear from the list.

Both paths call the same `rankPresets` in `src/lib/next-visa.ts`, and
`next-visa.test.ts` asserts the stored shards equal a fresh ranking at their
`as_of` date, so the two can never drift.

`next_visa_as_of` is the dataset's `researched_on`, not the build clock, which keeps
builds reproducible. The trade-off: if a rule's `valid_from`/`valid_until` boundary
falls between that date and the day someone visits, the stored ranking is stale for
that one rule until the next build. Passing `?date=` always recomputes.

## Unlock logic

`src/lib/unlock.ts` is the single engine. `computeTravelPower(passport, held,
travelDate, data)` is pure — the dataset is a parameter so the 973 kB source never
reaches a bundle. `withDataset(data)` binds it and returns the plain
`(passport, held, travelDate)` signature.

It applies, in order: base requirement -> active on `travelDate` -> `nat` matches ->
a held document matches a doc spec (expanded issuer list, listed type,
`permanent_residence` also satisfies `residence_permit`, **documents issued by the
destination itself ignored**) -> upgrade only when the grant outranks the base.
Transit grants, `partial: true` rules and the group destination `SCHENGEN` go to
`notes` and are never counted.

`baseFor` takes **already-normalised** requirements, which is exactly the shape of
`public/data/passports/{ISO3}.json`, so the browser feeds a fetched shard straight in.

The UI must never reimplement any of this; screens read `TravelPower` and render it.

### A date boundary that moves the numbers

`UZB-1` has `valid_from: 2026-09-01`. For an Indian passport with US, UK and
Schengen visas, easy access is **121 before** that date and **122 on or after** it,
Uzbekistan being the only destination that differs. `unlock.test.ts` pins both.
Any golden number quoted without a travel date is ambiguous because of this.

## Data

One dataset, validated at build time and sharded for the browser. The mock data
that used to live in `src/data` is gone, as is `src/lib/unlock.mock.ts`.

```
data/visa-unlock-dataset.json   SINGLE SOURCE OF TRUTH, 973 kB, never shipped to the browser
src/lib/data/schema.ts          Zod schemas + inferred types for every section
src/lib/data/iso.ts             iso3 -> [iso2, region] for all 199 countries; flagEmoji()
src/lib/data/enrich.ts          Region/EnrichedCountry types, normaliseBase(), REQUIREMENT_RANK
src/lib/data/load.server.ts     server-side readers (fs + process cache)
src/lib/data/client.ts          client fetch + cache for one passport shard at a time
scripts/build-data.ts           validates, then shards into public/data
public/data/                    GENERATED - do not edit
  countries.json                21 kB: iso3 -> name, iso2, numeric, region, flag emoji
  iso-numeric.json              2 kB: ISO numeric -> iso3 for the map, plus a name fallback
  rules.json                    80 kB: rules, territory_rules, warnings, groups, coverage, apply
  passports/{ISO3}.json         199 files, <6 kB each: base requirements + next-visa ranking
```

**How a screen gets data.** The server component reads the shared files plus the
requested passport's shard from disk and passes them to a client view inside
`<DataProvider>`. When the visitor switches passport the client fetches just that
shard from `/data/passports/{ISO3}.json` and caches it, so a switch costs one
request under 5 kB. The 973 kB source is never served; `/data/visa-unlock-dataset.json`
is a 404.

`npm run data:build` runs automatically before both `dev` and `build`. It exits
non-zero with the offending JSON path on any schema or reference error, so a bad
dataset cannot reach a build; validation happens before anything is written, so a
failure leaves the previous `public/data` intact.

Two env vars exist for testing the failure paths only: `DATASET_PATH` and
`DATA_OUT_DIR`.

### Dataset semantics worth knowing

Both come from the dataset's own `meta` block and are quoted in `schema.ts`:

- **`meta.nat_semantics`** — a rule's `nat` is either `{list: [...]}` (only those
  passports) or `{all: true, except: [...]}` (any passport not listed). Never both;
  the schema is a strict union, so a mixture is rejected.
- **`meta.matching_logic`** — `docs` is a list of *alternatives*, each an
  issuers x types set; issuers may be group codes needing expansion; a held
  `permanent_residence` also satisfies a `residence_permit` requirement; and a rule
  only upgrades a destination when its grant outranks the base status.

Normalised base requirements (`normaliseBase`): a day count or `"visa free"` ->
`visa_free` (the day count is preserved separately in `visa_free_days`), `"eta"` ->
`eta`, `"visa on arrival"` -> `visa_on_arrival`, `"e-visa"` -> `e_visa`,
`"visa required"` -> `visa_required`, `"no admission"` -> `no_admission`, `"-1"` ->
`home`. Note the UI's five-value `Status` has no `no_admission` or `home`, which is
one reason the two data sets are not yet joined.

Every rule carries `last_verified`, defaulted by the schema to `2026-10-19`
(the dataset's `meta.researched_on`).

`apply` maps every destination to `how_to_apply`, an optional https `official_url`
and an optional `confirmed_on` (the date the link was checked by hand).
`CountryDetail` shows it as "How to apply" unless the final status is visa free,
home or no admission (`applyInfoFor` in `src/lib/apply.ts`). Only `/results`
receives it; `/next-visa` is passed just the rules.

Quirks the validator accepts on purpose: the `SCH-ATV` rule's `dest` is the group code
`SCHENGEN` rather than a country, and `issuers` may contain the pseudo-codes `ANY` and
`VOA_ELIGIBLE`.

`WorldMap.tsx` also fetches country geometry at runtime from
`https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`.

## Gotchas

- `public/data` is generated by `scripts/build-data.ts`. Never edit it, and never
  add a second copy of the dataset: `data/visa-unlock-dataset.json` is the only one.
- OG images are rendered on demand, not prerendered: 2189 satori renders would
  dominate the build. They are cached by `revalidate`.
- `load.server.ts` caches parsed shards **only in production**. In development it
  re-reads every request, because `npm run data:build` rewrites them under a running
  dev server and a stale cache otherwise serves pre-regeneration data.
- URL state is the source of truth, but the two interactive pages update it with
  `window.history.replaceState` rather than `router.replace`, so editing the
  passport or documents recomputes instantly without a server round trip (this
  matches the `replace: true` behaviour the previous router had). Deep links
  still server-render correctly from `searchParams`.
- `src/lib/routes.ts` is the only place that builds a travel URL, and it casts to
  Next's `Route` type because `typedRoutes` cannot narrow a template literal.
- Page-level `openGraph` **replaces** the layout's rather than merging, so every
  page repeats `type: "website"`.
- The world map is browser-only: keep it behind `next/dynamic` with `ssr: false`
  inside a client component.
- Lint does not enforce formatting (no `eslint-plugin-prettier`): the inherited
  source is written wider than prettier's default. Use `npm run format`.
- React's newer purity rules are switched off for `src/components/ui/**`, which is
  unmodified shadcn registry output.
- `next dev` appends a block to `AGENTS.md` on every run; that is Next's own
  behaviour, not a stray edit.
