# Laissez

What your passport opens, once you count the visas and residence permits you
already hold.

## Development

Requires Node.js 20.9+.

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local`. The app runs without any of them; only
"Report a problem" needs the GitHub pair.

| Variable | Required | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | no | Absolute origin for canonical URLs, OG image URLs and `sitemap.xml`. Defaults to `https://laissez.example`, so set it before deploying. |
| `GITHUB_TOKEN` | for reports | Fine-grained token with **Issues: read and write** on `GITHUB_REPO`. Server-side only. |
| `GITHUB_REPO` | for reports | `owner/repo` that receives reports, as issues labelled `data-report`. |

Without `GITHUB_TOKEN` / `GITHUB_REPO`, `POST /api/report` returns 503 and the
form shows an error state — it never looks like it worked.

> Reports become issues in `GITHUB_REPO`. If that repository is public, so is
> every report, including any email address the reporter supplies. Use a private
> repository unless you intend them to be public.

Build-only overrides, both optional:

| Variable | What it does |
| --- | --- |
| `LANDING_PRERENDER_COUNT` | Prerender only the N highest-traffic passports instead of all 199. The rest render on demand and are cached. |
| `LANDING_PRERENDER_ISO3` | Comma-separated ISO3 codes defining that priority order. |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest (pure logic in `src/lib`) |

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci`
2. `npm run data:build` — validates the dataset and writes `public/data`, which the tests read
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run data:freshness` — **fails** if any rule's `valid_until` has passed; warns on
   rules expiring within 30 days, unverified for over 90 days, or with low confidence,
   and prints a table of the rule IDs that need attention

The freshness step runs last because it fails on the calendar, not on code. It will
start failing on its own when a rule expires — that is the point. Fix it by updating or
removing the rule in `data/visa-unlock-dataset.json`.

## Monthly base matrix sync

`.github/workflows/sync-base-matrix.yml` runs at 06:00 UTC on the 1st of each month
(and on demand from the Actions tab). It downloads the latest
[passport-index-dataset](https://github.com/ilyankou/passport-index-dataset) tidy ISO3
CSV, compares it with `base_matrix`, and if anything changed opens a pull request
labelled `data-sync` whose description lists every changed passport and destination
pair. Run it locally with `npm run data:sync`.

It only ever touches `base_matrix` and the download date in `meta`; the rules are left
alone, and the file's formatting is preserved so the PR diff shows only data.

**Set a `SYNC_TOKEN` secret.** A pull request opened with the default `GITHUB_TOKEN`
does not trigger other workflows, so CI would never run on the sync PR. A fine-grained
token (or GitHub App token) with *Contents* and *Pull requests* write on this repository
fixes that. Without it the workflow still opens the PR, but you have to start CI on it
yourself.

Expect the sync PR's tests to fail when the data genuinely moves: golden counts such as
"India, no documents: 58 easy-access destinations" are pinned to the current matrix.
Update them as part of reviewing the change.

## Built with

- Next.js (App Router)
- TypeScript (strict)
- React
- Tailwind CSS v4 + shadcn/ui
- Framer Motion
- next-themes
