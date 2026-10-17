<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- The dataset is data/visa-unlock-dataset.json; scripts/build-data.ts validates it and shards it into public/data. Never hand-edit public/data, and never add a second copy of the dataset.
- The unlock calculation is a single pure function in src/lib/unlock.ts (computeTravelPower); UI must not reimplement rule logic. Tests in src/lib/unlock.test.ts.
- Passport, documents and travel date live in the URL query (?p=IND&d=USA-visa&date=2026-11-01) so results are shareable; parsing in src/lib/query-state.ts, building in src/lib/routes.ts.
- The world map (react-simple-maps) is loaded with next/dynamic and `ssr: false` to keep SSR free of browser-only code.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
