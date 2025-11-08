# Expensify Candidate Challenge – PHP + JS SPA

A single-page app (no page refreshes) using PHP (as a simple API proxy) and vanilla JavaScript (with jQuery only) to:

- Authenticate to an Expensify account
- Download and render all transactions (no pagination)
- Create a new transaction and update UI immediately

No MVCs or external JS libraries except jQuery are used. CSS is hand-rolled.

## Files

- `index.php` — SPA entry; renders auth form, controls, transactions table, modal; sets security headers
- `proxy.php` — Minimal PHP proxy that forwards requests to Expensify API, injects required header, enforces origin checks, and streams responses
- `assets/js/core.js` — Pure helpers (formatting, normalization, chunk size computation)
- `assets/js/api.js` — API and cookie utilities (jQuery AJAX to the PHP proxy; cookie get/set/erase)
- `assets/js/render.js` — High-performance rendering (adaptive chunked table rendering, DOM reuse)
- `assets/js/app.js` — Orchestrates UI (auth, fetch, create, filtering, sorting, summary, modal) using the above modules
- `assets/css/styles.css` — Minimal styles for readability

## Local run (PHP built-in server)

Requirements: PHP 8.x or 7.x with cURL enabled.

```bash
# From the project root
php -S 127.0.0.1:8000
# Visit http://127.0.0.1:8000
```

## Testing

This project includes a minimal, dependency-free browser test harness (no external test frameworks).

- Location: `tests/`
	- `tests/test.html` – loads jQuery, sets `window.__TEST__ = true`, then loads the app and the tests.
	- `tests/test.js` – tiny assert helper with a few focused unit tests.
- What’s tested:
	- `normalizeTx` for multiple upstream shapes and cached fields (lowercase tokens, formatted amount/date)
	- `computeInitialChunkSize` used by progressive rendering
	- `formatDate` fallback behavior

How to run tests:

Option A: Open directly in your browser
- Open `tests/test.html` from Finder/Explorer or via your editor’s “Open With Live Server/Browser”.

Option B: Via local PHP server
- If you already started the PHP server (per Usage), navigate to:
- http://127.0.0.1:8000/tests/test.html

Notes:
- When `window.__TEST__` is true, the app skips UI initialization so the tests can run in isolation.
- No new libraries were added; the tests run purely in the browser.

```

## Deploy (Replit – no Docker)

If you want a quick, free deploy without Docker, Replit works well for a PHP app with a single proxy.

Steps

1. Create a new Replit (Language: PHP) and import this repository (or upload files).
2. Set the Run command to:

```bash
php -S 0.0.0.0:8000
```

3. Click Run. Replit will show a web URL; open it to use the app. The app will be served at port 8000 inside Replit.

Notes

- Make sure all files (including `proxy.php`, `index.php`, and the `assets/` and `tests/` folders) are at the project root.
- HTTPS is handled by Replit’s frontend proxy; cookies will include `Secure` automatically.
- This is suitable for challenge review; not for production.
 - Included: `.replit` and `replit.nix` so you should only need to “Import from GitHub” and press Run.

## Deploy (Render – Docker)

Render requires a Docker image for PHP. A `Dockerfile`, `.dockerignore`, and `render.yaml` are included.

Steps

1. Push this repository to GitHub (private or public).
2. Sign in at https://render.com → New + Web Service.
3. Choose your repo; Render auto-detects Docker.
4. Confirm settings:
	- Name: expensify-spa (or any)
	- Region: Oregon (or closest)
	- Plan: Free
	- Root Directory: (leave blank if project root)
5. Create & deploy. First build pulls the base image and installs curl extension.
6. After deploy finishes, open the URL; login with test credentials.

Files

- `Dockerfile` – php:8.2-cli base, installs curl extension, runs `php -S 0.0.0.0:$PORT`.
- `.dockerignore` – excludes nonessential files from the build context.
- `render.yaml` – optional blueprint if you use Render's Infrastructure as Code.

Verification checklist

- Home page loads (HTTP 200) with CSP and security headers.
- Authenticate returns an `authToken` via `proxy.php`.
- Transactions table progressively renders.
- Adding a transaction updates the UI immediately.
- Tests page at `/tests/test.html` loads (optional).

Troubleshooting

- If build fails on curl: ensure Dockerfile kept the `docker-php-ext-install curl` line.
- If the app 404s: confirm `Root Directory` was correct (project root, not a subfolder).
- If blank page: check logs in Render dashboard for PHP errors (e.g., missing extension).
- If cookie not persisted: confirm site served over HTTPS (Secure flag active) or accept plain HTTP for challenge.

## Deploy (Heroku example)

Heroku still supports PHP via official buildpack.

```bash
heroku create your-expensi-spa --buildpack heroku/php
git init && git add . && git commit -m "Deploy Expensify challenge"
heroku git:remote -a your-expensi-spa
git push heroku HEAD:main
```

Other options: Render.com, Fly.io, AWS Lightsail/Elastic Beanstalk. Ensure `proxy.php` is reachable at `/proxy.php`.

### Can I use Render without Docker?

Render does not natively run PHP without Docker. To deploy on Render:

- Preferred: Use a tiny Dockerfile (see earlier guidance) and create a Web Service.
- If you must avoid Docker entirely, choose a host that supports PHP out-of-the-box (e.g., Replit, 000webhost, AlwaysData free tier) or port `proxy.php` to a supported runtime (e.g., a small Node server or serverless function) which changes this project’s stack.

## Security hardening

- Partner credentials are embedded server-side in `proxy.php` and never sent to the browser.
- `proxy.php` adds the required `expensifyengineeringcandidate` header to all upstream requests.
- Same-origin guard: if `Origin` or `Referer` is present, the host must match the current host.
- Whitelisted commands only: `Authenticate`, `Get`, `CreateTransaction`.
- Responses are marked `Cache-Control: no-store` and proxied as a pass-through stream to avoid decode/encode overhead.
- Security headers set in `index.php`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a conservative `Content-Security-Policy`.
- Cookies set with `SameSite=Lax` and `Secure` when served over HTTPS.

### On securing partner credentials

For the challenge, credentials live in `proxy.php` to keep them out of client code. In a production setting you should:

- Keep secrets out of source: load via environment variables or a secrets manager (e.g., `$_ENV['PARTNER_PASSWORD']`).
- Avoid committing secrets to git; rotate credentials after public review window ends.
- Restrict the proxy route (rate-limiting/CORS/origin checks) and log failed auth attempts.
- Do not expose the proxy publicly after the evaluation period; remove or disable credentials.

This app follows the challenge spirit by putting credentials on the server side only; that is “relatively secure” compared to embedding them in JS, but still treat them as sensitive and rotate/remove post-review.

## Performance techniques

- Streaming proxy: avoids JSON decode/encode in PHP to keep memory low with large payloads.
- Adaptive chunked rendering: targets ~70 frames; chunk size grows/shrinks based on frame time to keep the UI responsive even with ~17k+ rows.
- DOM reuse: rows are cached and reused for sorts/filters to reduce garbage and layout churn.
- Debounced filtering: dynamically adjusts debounce based on dataset size.

## Notes on the Expensify API

- The proxy posts to `https://www.expensify.com/api` with `command` and `params` as form-encoded fields.
- The app uses commands: `Authenticate`, `Get`, and `CreateTransaction`.
- For `Authenticate`, the proxy attaches `partnerName=applicant` and `partnerPassword=d7c3119c6cdab02d68d9`.
- For `Get`, we request the full dataset (no pagination). The UI renders rows in adaptive chunks for responsiveness.
- For `CreateTransaction`, the app sends `created` (ISO date), `merchant`, `amount` (cents), `currency=USD`, `comment`.

Because the API shape may vary, the UI normalizes several common field names when rendering (date, merchant, amount, currency, comment).

## Assumptions & Design Choices

These deliberate simplifications / interpretations are made for the challenge scope:

1. Amount Sign Convention: Negative values represent debits/expenses; positive values represent credits/income. The radio button (Debit/Credit) sets sign client-side before calling `CreateTransaction`. If the upstream API expects only positive numbers, mapping can be adjusted easily in `onAddSubmit`.
2. Amount Units: Amounts are treated as integer cents when sending (`amount` is in cents). If the API expects another field (e.g., `amountInCents` or a float), normalization can be adapted in `normalizeTx` and `CreateTransaction` payload.
3. Date Format: Dates are sent as ISO `YYYY-MM-DD` strings; if epoch milliseconds are required, modify `created` before posting. Future dates are blocked intentionally (no scheduling feature implemented).
4. Full Dataset Fetch: No pagination per instructions. Chunked DOM rendering (`500` or `200` rows/frame) is used to keep the UI responsive for large sets (>25k rows adaptively shrinks chunk size).
5. Transaction Field Variability: The app probes several potential property names (e.g., `merchant`, `merchantName`, `payee`) to be resilient across response shapes.
6. Security Scope: Partner credentials reside only in `proxy.php`. No encryption or token refresh mechanisms added as they were out-of-scope for the challenge; would be required in production.
7. Modal Raw Data: Raw JSON removed for clarity per feedback; modal shows normalized fields only.
8. Cookie Persistence: `authToken` stored as a plain cookie (not HttpOnly / Secure) according to challenge guidance. In production this would be replaced by a secure session or short-lived token.
9. Sorting & Search: Implemented client-side in memory without indexing. Adequate for demo scale; for very large datasets, server-side filtering or virtual scrolling would be preferable.
10. Accessibility: Basic semantics provided (aria-live for render status, focusable modal dismiss button). Further enhancements (focus trap, Escape key close, aria-sort) intentionally deferred but noted for future iteration.