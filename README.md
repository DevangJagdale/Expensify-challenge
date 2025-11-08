# Expense Tracker SPA (PHP + jQuery)

A lightweight expense transaction viewer & creator built with:

- PHP (backend proxy) – secure request forwarding, credential protection, streaming JSON passthrough.
- jQuery (frontend) – single-page interactions (no full page reloads).
- No frameworks, build tools, or transpilers, minimal dependencies.

## Features

- Authenticate against upstream API (auth token stored in a transient cookie).
- Fetch full transaction list (no pagination) and render progressively for responsiveness.
- Create new transactions with immediate optimistic UI update.
- Client-side search (merchant/comment) + column sorting (date, amount, text fields).
- Adaptive performance (chunked rendering, DOM row reuse, debounced filtering).
- Transaction detail modal (clean normalized fields, no raw JSON dump).
- Basic accessibility (live region for render status, focusable modal close).
- Environment-based secret management (partner credentials via environment variables).

## Tech Stack & Rationale

| Layer | Choice | Reason |
|-------|--------|-------|
| Proxy | PHP built-in server | Rapid iteration, simple cURL usage, streaming response. |
| Frontend | jQuery + vanilla JS | Minimal DOM manipulation & AJAX without framework overhead. |
| Styling | CSS | Control + low complexity, no build step. |
| Testing | Browser page (`tests/`) | Unit tests |

## Directory Structure

```
.
├── index.php          # HTML shell & security headers
├── proxy.php          # Secure streaming proxy (env-based secrets)
├── assets
│   ├── css/styles.css # Layout/table/modal styles
│   └── js
│       ├── core.js    # Formatting, normalization, chunk sizing helpers (TXCore)
│       ├── api.js     # AJAX + cookie utilities (TXApi)
│       ├── render.js  # Adaptive chunked rendering (TXRender)
│       └── app.js     # Orchestration (TXApp)
├── tests
│   ├── test.html      # Harness (sets window.__TEST__)
│   └── test.js        # Assertions for helpers
├── Dockerfile         # Render deployment
├── .dockerignore      
├── render.yaml        
└── README.md
```

## Getting Started Locally

Prerequisites: PHP 8.x (or 7.x) with cURL extension.

```bash
cd Expensify
export PARTNER_NAME=applicant
export PARTNER_PASSWORD='YOUR_SECRET_HERE'
php -S 127.0.0.1:8000
open http://127.0.0.1:8000
```

Test account (for smoke tests):
```
Email:    expensifytest@mailinator.com
Password: hire_me
```

## Testing

Open the harness:
```bash
php -S 127.0.0.1:8000
open http://127.0.0.1:8000/tests/test.html
```
Current coverage:
- Chunk size calculation
- Normalization variants & formatting
- Date formatting fallback
- Sorting comparator for text/number/date

## Deploy (Render – Docker)

Render requires a Docker image for PHP. A `Dockerfile`, `.dockerignore`, and `render.yaml` are included.

Steps

1. Sign in at https://render.com → New + Web Service.
2. Choose your repo, Render auto-detects Docker.
3. Confirm settings:
	- Name: expensify-challenge (or any)
	- Region: Oregon (or closest)
	- Plan: Free
	- Root Directory: (leave blank if project root)
4. Create & deploy. First build pulls the base image and installs curl extension.
5. After deploy finishes, open the URL, login with test credentials.

Files

- `Dockerfile` – php:8.2-cli base, installs curl extension, runs `php -S 0.0.0.0:$PORT`.
- `.dockerignore` – excludes nonessential files from the build context.
- `render.yaml` – optional blueprint if you use Render's Infrastructure as Code.

## Performance techniques

- Streaming proxy: avoids JSON decode/encode in PHP to keep memory low with large payloads.
- Adaptive chunked rendering: targets ~70 frames, chunk size grows/shrinks based on frame time to keep the UI responsive even with ~17k+ rows.
- DOM reuse: rows are cached and reused for sorts/filters to reduce garbage and layout churn.
- Debounced filtering: dynamically adjusts debounce based on dataset size.


## Assumptions & Design Choices

These deliberate simplifications / interpretations are made for the challenge scope:

1. Amount Sign Convention: Negative values represent debits/expenses, positive values represent credits/income. The radio button (Debit/Credit) sets sign client-side before calling `CreateTransaction`. If the upstream API expects only positive numbers, mapping can be adjusted easily in `onAddSubmit`.
2. Amount Units: Amounts are treated as integer cents when sending (`amount` is in cents). If the API expects another field (e.g., `amountInCents` or a float), normalization can be adapted in `normalizeTx` and `CreateTransaction` payload.
3. Date Format: Dates are sent as ISO `YYYY-MM-DD` strings, if epoch milliseconds are required, modify `created` before posting. Future dates are blocked intentionally (no scheduling feature implemented).
4. Full Dataset Fetch: No pagination per instructions. Chunked DOM rendering (`500` or `200` rows/frame) is used to keep the UI responsive for large sets (>25k rows adaptively shrinks chunk size).
5. Transaction Field Variability: The app probes several potential property names (e.g., `merchant`, `merchantName`, `payee`) to be resilient across response shapes.
6. Security Scope: Partner credentials reside only in `proxy.php`. No encryption or token refresh mechanisms added as they were out-of-scope for the challenge, would be required in production.
7. Modal Raw Data: Raw JSON removed for clarity per feedback, modal shows normalized fields only.
8. Cookie Persistence: `authToken` stored as a plain cookie (not HttpOnly / Secure) according to challenge guidance. In production this would be replaced by a secure session or short-lived token.
9. Sorting & Search: Implemented client-side in memory without indexing. Adequate for demo scale, for very large datasets, server-side filtering or virtual scrolling would be preferable.
10. Accessibility: Basic semantics provided (aria-live for render status, focusable modal dismiss button). Further enhancements (focus trap, Escape key close, aria-sort) intentionally deferred but noted for future iteration.

## Submission Write-Up

### Time Spent (Approximate)
These durations are reconstructed from development sequence and are approximate (hours:minutes):
| Task | Time(hours:minutes) |
|------|------|
| Initial scaffold | 2:30 |
| Authentication + fetch all transactions | 1:30 |
| Create transaction flow (optimistic update) | 1:30 |
| Performance: streaming proxy + adaptive chunk rendering | 3:00 |
| UI/UX polish (chips, modal, truncation, sticky header) | 2:30 |
| Data normalization & edge handling | 1:00 |
| Security hardening (origin checks, headers, whitelist) | 2:00 |
| Modular refactor (core/api/render/app split) | 2:00 |
| Testing harness & helper unit tests | 1:30 |
| Deployment (Dockerfile, render.yaml) | 1:00 |
| Secret management | 1:00 |
| Documentation (original + rewrite + submission section) | 2:00 |
| Final review & cleanup | 1:00 |
| Total | ~22:30 |

### Hosted Solution Access Instructions
I deployed using Render (Docker).
Reason being only provided who did not ask for asny card details for free teir.

Render Deployment:
1. Push repository to Git hosting (GitHub/GitLab/Bitbucket).
2. Create Web Service in Render → Select repo (Docker auto-detected).
3. Set Environment Variables:
	- PARTNER_NAME=applicant
	- PARTNER_PASSWORD=<your_partner_secret>
4. Deploy. After build completes, visit the service URL.
5. Log in with the test account (Email: expensifytest@mailinator.com / Password: hire_me) or real credentials.
6. Observe progressive row rendering and summary chips updating.

Local Quickstart:
```bash
export PARTNER_NAME=applicant
export PARTNER_PASSWORD='YOUR_SECRET_HERE'
php -S 127.0.0.1:8000
open http://127.0.0.1:8000
```

### Issues Encountered & Resolutions
| Issue | Impact | Resolution |
|-------|--------|-----------|
| Large JSON payload caused PHP memory spikes | Risk of OOM & slow response | Implemented streaming proxy (no decode/encode round trip). |
| Long render lock-up for thousands of rows | UI freeze, poor UX | Adaptive chunked rendering algorithm with dynamic frame-based sizing; DOM row reuse. |
| Inconsistent transaction field names (merchant, amount, date variants) | Incorrect display / sorting | Robust normalization function mapping multiple candidate keys and caching formatted values. |
| Credential exposure risk | Security vulnerability | Moved partner credentials to environment variables; added fail-fast if missing; optional local .env (ignored if real env set). |
| Potential cross-origin misuse | CSRF / data exfiltration risk | Origin & referer host validation; command whitelist. |
| Modal originally showed raw JSON | Cluttered UI, possible leakage of unused fields | Replaced with curated normalized field list & formatting. |
| Search performance degradation on huge sets | Laggy input handling | Debounced search with adaptive delay based on dataset size. |
| Documentation initially challenge-centric | Less reusable for future | Rewrote README to project-centric and added this submission section. |
