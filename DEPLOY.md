# Deploying to Vercel

Laissez is a standard Next.js 16 App Router app, so Vercel needs almost no
configuration. This covers the first deploy, environment variables, the custom
domain, and how preview deployments behave.

Total time for a first deploy: about 15 minutes, most of it waiting for DNS.

---

## 1. Connect the GitHub repository

1. In the [Vercel dashboard](https://vercel.com/new), choose **Add New → Project**.
2. Import `singhabhi12/Laissez`. If it is not listed, use **Adjust GitHub App
   Permissions** to grant Vercel access to the repository.
3. Leave the detected settings as they are:

   | Setting | Value | Why |
   | --- | --- | --- |
   | Framework preset | Next.js | Auto-detected |
   | Root directory | `./` | |
   | Build command | *(default)* | Runs `npm run build`, which validates the dataset and generates `public/data` before `next build` |
   | Install command | *(default)* | `.npmrc` sets `legacy-peer-deps`, which react-simple-maps needs |
   | Output directory | *(default)* | |
   | Node.js version | 22.x | Read from `engines` in `package.json` |

4. Before clicking **Deploy**, add the environment variables from step 2 below,
   or deploy first and add them afterwards. Either works, but some of them only
   take effect after a redeploy (see the note in step 2).

The first build takes about a minute: it validates the dataset, runs 2,189
next-visa rankings, and prerenders roughly 2,200 pages.

> `public/data` is not in git. It is generated on every build from
> `data/visa-unlock-dataset.json`. If the dataset fails validation, the build
> fails with the exact JSON path, and the previous deployment keeps serving.

---

## 2. Environment variables

Set these under **Project → Settings → Environment Variables**. Vercel lets you
scope each one to Production, Preview and Development separately, and **the
scoping matters here**.

| Variable | Production | Preview | Required | What it does |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ❌ leave unset | Recommended | Canonical origin, e.g. `https://laissez.app`, with no trailing slash. Used for canonical URLs, Open Graph image URLs and `sitemap.xml`. |
| `GITHUB_TOKEN` | ✅ | ❌ leave unset | For "Report a problem" | Fine-grained token with **Issues: read and write** on `GITHUB_REPO`, and nothing else. |
| `GITHUB_REPO` | ✅ | ❌ leave unset | For "Report a problem" | `owner/repo` that receives reports as issues labelled `data-report`. |
| `GITHUB_API_URL` | Optional | Optional | No | GitHub Enterprise only. Defaults to `https://api.github.com`. |
| `LANDING_PRERENDER_COUNT` | Optional | Optional | No | Prerender only the top *N* passports' landing pages. The rest render on first request. Only needed if builds become slow. |

**Why Preview should be left unset:**

- **`NEXT_PUBLIC_SITE_URL`.** With it unset, each preview uses its own URL
  (`VERCEL_URL`) for canonicals and share cards, so a preview's Open Graph image
  shows that preview's data rather than production's. In production, if you
  forget to set it, the app falls back to the project's production domain
  (`VERCEL_PROJECT_PRODUCTION_URL`). Setting it explicitly is still recommended,
  because it is how you choose between the apex domain and `www`.
- **`GITHUB_TOKEN` and `GITHUB_REPO`.** Every report sent from a preview would
  file a real issue. With them unset, the form on previews shows an error state
  (`503`) instead. If you want to test reporting on previews, point Preview at a
  separate scratch repository rather than the real one.

> ⚠️ **`GITHUB_REPO` and privacy.** `singhabhi12/Laissez` is public. If reports
> go there, every report is public, **including any email address a reporter
> types in**. Use a private repository for reports.

**These only take effect after a redeploy.** Landing pages, the sitemap and
canonical URLs are rendered at build time, so changing `NEXT_PUBLIC_SITE_URL`
needs a new build: **Deployments → ⋯ → Redeploy**. The GitHub variables are read
at request time and take effect on the next request.

**Leave system environment variables exposed.** The app reads `VERCEL`,
`VERCEL_ENV`, `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`. These are
exposed by default. If someone turns off **Automatically expose System
Environment Variables**, previews will start being indexable and will lose
their own share-card URLs.

### Turn on Web Analytics

Under **Project → Analytics**, click **Enable**. The app sends five events
(`result_viewed`, `rule_opened`, `source_clicked`, `share_clicked`,
`next_visa_tried`). If Analytics is not enabled, every page requests a script
that does not exist, and Lighthouse best-practices drops from 100 to 96.

### GitHub secret for the data sync (not Vercel)

The monthly base-matrix sync workflow runs in GitHub Actions. Add a `SYNC_TOKEN`
**repository secret** in GitHub (**Settings → Secrets and variables → Actions**)
so that CI runs on the pull requests it opens. See the README for details.

---

## 3. Add the custom domain

1. **Project → Settings → Domains → Add**, and enter the domain, e.g.
   `laissez.app`.
2. Vercel offers to add `www.laissez.app` as well, redirecting to the apex (or
   the other way round). Pick one canonical host and let the other redirect.
3. Create the DNS records Vercel shows you at your registrar. Use the exact
   values in the dashboard. Typically:
   - **Apex** (`laissez.app`): an `A` record.
   - **Subdomain** (`www`, `app`, …): a `CNAME` record.
   - Or move the domain's nameservers to Vercel, in which case Vercel manages
     the records itself.
4. Wait for the domain to show **Valid Configuration**. Vercel issues the TLS
   certificate automatically. This usually takes minutes, but DNS can take
   longer.
5. Set `NEXT_PUBLIC_SITE_URL` to the canonical host you chose (Production only)
   and **redeploy**, so canonicals and the sitemap use the real domain instead
   of the `.vercel.app` one.

### HSTS

The app sends `Strict-Transport-Security: max-age=63072000`, which covers this
host only. It deliberately does **not** add `includeSubDomains` or `preload`:

- `includeSubDomains` forces HTTPS on *every* subdomain of the domain. Add it
  only when all of them serve HTTPS.
- `preload` puts the domain into browsers' built-in HTTPS-only lists, which is
  slow and painful to undo. Add it only as a deliberate, permanent decision, and
  then submit the domain at [hstspreload.org](https://hstspreload.org).

Both settings are in `next.config.ts`.

---

## 4. Preview deployments

Every push to a branch other than `main`, and every pull request, gets its own
preview URL, posted by the Vercel bot as a comment on the PR. Merging to `main`
deploys to production.

On previews, the app behaves differently in four deliberate ways:

| | Production | Preview |
| --- | --- | --- |
| Search indexing | Allowed; `robots.txt` lists the sitemap | **Blocked**: `robots.txt` disallows everything and `X-Robots-Tag: noindex, nofollow` is sent |
| Canonical and share-card URLs | Your domain | The preview's own URL |
| Vercel Toolbar (comments, feedback) | Blocked by CSP | **Allowed**: CSP adds only the origins [Vercel documents](https://vercel.com/docs/vercel-toolbar/managing-toolbar) for the toolbar |
| "Report a problem" | Files a GitHub issue | Shows an error state, unless you set Preview-scoped GitHub variables |

The monthly data-sync pull request gets a preview too, so you can click
through the updated numbers before merging it.

**Rolling back.** **Deployments → pick a previous production deployment → ⋯ →
Promote to Production**. This is instant and needs no rebuild.

---

## 5. After the first production deploy

Check these once:

- [ ] **Headers.** Run `curl -sI https://YOUR-DOMAIN/ | grep -iE "content-security|x-frame|referrer|nosniff|permissions|strict-transport"`.
      All six should appear. [securityheaders.com](https://securityheaders.com)
      gives a second opinion.
- [ ] **Sitemap.** `https://YOUR-DOMAIN/sitemap.xml` should list about 2,190 URLs
      on **your** domain, not `laissez.example` or `.vercel.app`. If it does
      not, `NEXT_PUBLIC_SITE_URL` is missing or you did not redeploy after
      setting it.
- [ ] **Search Console.** Submit the sitemap in Google Search Console.
- [ ] **Share cards.** Paste a landing page such as
      `https://YOUR-DOMAIN/india/with-us-visa` into a link-preview checker. The
      card should show the flag, the totals and the Laissez wordmark.
- [ ] **Report a problem.** Open any country's detail on `/results`, send a test
      report, and confirm the issue appears in `GITHUB_REPO` with the
      `data-report` label. Then close it.
- [ ] **Analytics.** After a few visits, the five events should appear under
      **Analytics → Events**.

---

## What is configured where

| Concern | Lives in |
| --- | --- |
| Security headers, CSP, caching, file tracing | `next.config.ts` |
| Canonical origin resolution | `resolveSiteUrl()` in `src/lib/landing.ts` |
| Preview `noindex` | `app/robots.ts` and the `X-Robots-Tag` header in `next.config.ts` |
| Icons and web manifest | `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/icons/`, `app/manifest.ts`, regenerated with `npm run icons:build` |
| Data build | `scripts/build-data.ts`, run by `npm run build` |

### Why the CSP allows inline scripts

`script-src` includes `'unsafe-inline'`. Next.js streams page data as inline
`<script>` tags, and the theme switcher runs a small inline script before first
paint to avoid a flash. The only way to remove `'unsafe-inline'` is a
per-request nonce, and Next.js can only add nonces to pages it renders on every
request. That would turn all 2,189 statically generated landing pages into
server-rendered ones and disable their caching.

Everything else in the policy is closed: there are no third-party script,
style, font, image or connection origins in production. The app also renders no
user-supplied HTML. The report form's text goes to GitHub, never back into a
page.
