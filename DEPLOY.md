# Deploying to Vercel

The app is a standard Next.js 16 project — Vercel auto-detects it, honours the
security headers and image handling in `next.config.ts`, and builds the OG
image, `robots.txt`, and `sitemap.xml` for you. No `vercel.json` is needed.

## One-time setup (GitHub connect — no CLI, no tokens)

1. **Import the repo.** At <https://vercel.com/new>, choose *Import Git
   Repository* and pick `abdul037/portfolio`. If Vercel can't see it, install
   the Vercel GitHub app for that repo first.
2. **Framework preset:** Vercel detects **Next.js** automatically. Leave the
   build command (`next build`) and output settings at their defaults.
3. **Production branch:** set it to `claude/previous-work-context-ie7vk4` (or
   merge that branch into `main` first and deploy `main` — your call).
4. **Environment variables** — add these two (Project → Settings → Environment
   Variables), for the **Production** environment:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://YOUR-DOMAIN` (no trailing slash) |
   | `NEXT_PUBLIC_ALLOW_INDEXING` | `true` — **only once you're ready to be found in search** |

   Leaving `NEXT_PUBLIC_ALLOW_INDEXING` unset (or not `true`) keeps the site
   `noindex` with `Disallow: /` — the safe default. You can deploy first with it
   off, confirm everything looks right on the live URL, then flip it to `true`
   and redeploy.
5. **Deploy.** First build takes a couple of minutes.

## Custom domain

1. Project → Settings → **Domains** → add `YOUR-DOMAIN`.
2. Point DNS at Vercel as it instructs (an `A`/`ALIAS` record for the apex, or a
   `CNAME` for `www`). TLS is issued automatically.
3. Make sure `NEXT_PUBLIC_SITE_URL` matches the primary domain exactly, then
   redeploy so canonical/OG URLs and the sitemap use it.

## After the first deploy — quick checks

- `https://YOUR-DOMAIN/` loads; the boot intro plays once, then the hero.
- `https://YOUR-DOMAIN/opengraph-image` returns the social card.
- `https://YOUR-DOMAIN/robots.txt` shows `Allow: /` **only** after you set
  `NEXT_PUBLIC_ALLOW_INDEXING=true`; otherwise `Disallow: /`.
- Response headers include `Content-Security-Policy` and `Strict-Transport-Security`.
- Paste the URL into a Slack/iMessage/LinkedIn draft to preview the OG card.

## Redeploys

Every push to the production branch triggers an automatic deploy. Pull requests
get their own preview URLs (always `noindex`).

## Notes

- **Node:** `package.json` pins `>=20.9`; Vercel uses a recent Node 22 by default.
- **Screenshots** are all blurred in the committed files, and the pre-redaction
  sharp originals were purged from git history — nothing sensitive ships or sits
  in the repo.
- If you ever move off Vercel to plain static hosting, the `headers()` in
  `next.config.ts` won't apply (no Node server) — you'd replicate them at the
  CDN. On Vercel this is handled for you.
