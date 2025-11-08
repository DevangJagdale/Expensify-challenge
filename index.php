<?php
// Simple SPA entry point for Expensify candidate challenge
// Basic security headers (adjust CSP as needed; kept lenient for inline/init scripts)
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');
// Minimal CSP allowing self, jQuery CDN, Google Fonts; inline scripts allowed for simplicity
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://code.jquery.com 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none';");
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Expensify Transactions – Candidate Challenge</title>
  <link rel="stylesheet" href="assets/css/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <header class="app-header">
    <div class="container header-inner">
      <h1 class="app-title">Expensify – Transactions</h1>
      <div class="header-actions">
        <button id="logoutBtn" class="btn btn-secondary" title="Clear session and sign out" style="display:none;">Logout</button>
      </div>
    </div>
  </header>

  <main class="container app-main">
    <!-- Global alerts -->
    <div id="alert" class="alert" role="alert" style="display:none;"></div>

    <!-- Auth view -->
    <section id="authView" class="card" style="display:none;">
      <h2>Sign in</h2>
      <p class="muted">Use the provided test account or your own Expensify credentials.</p>
      <form id="loginForm" autocomplete="on">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <div class="actions">
          <button id="signInBtn" type="submit" class="btn btn-primary">Sign In</button>
        </div>
      </form>
      <details class="tips">
        <summary>Test account credentials</summary>
        <div class="tip-grid">
          <div><strong>Email</strong><div>expensifytest@mailinator.com</div></div>
          <div><strong>Password</strong><div>hire_me</div></div>
        </div>
      </details>
    </section>

    <!-- App view -->
    <section id="appView" style="display:none;">
  <div class="card full-bleed" id="toolbarCard">
        <div class="toolbar">
          <div class="left">
            <div class="field compact">
              <label for="search">Search</label>
              <input id="search" type="search" placeholder="Filter by merchant or note" />
            </div>
          </div>
          <div class="right">
            <div class="chips" id="summaryChips" aria-live="polite" aria-label="Transaction summary">
              <span class="chip" id="chipCount" title="Filtered transaction count"></span>
              <span class="chip" id="chipIncome" title="Total credits (income)"></span>
              <span class="chip" id="chipExpense" title="Total debits (expenses)"></span>
              <span class="chip" id="chipNet" title="Net (income + expenses)"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid two">
        <div class="card sticky-side">
          <h2>Add transaction</h2>
          <form id="addForm" autocomplete="off">
            <div class="two-col">
              <div class="field">
                <label for="txDate">Date</label>
                <input id="txDate" name="date" type="date" required max="<?php echo date('Y-m-d'); ?>" />
              </div>
              <div class="field">
                <label for="txAmount">Amount (USD)</label>
                <input id="txAmount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
              </div>
            </div>
            <div class="field">
              <span class="label-group">Type</span>
              <div class="radio-row" role="radiogroup" aria-label="Transaction type">
                <label class="radio">
                  <input type="radio" name="txType" value="debit" checked />
                  <span>Debit (expense)</span>
                </label>
                <label class="radio">
                  <input type="radio" name="txType" value="credit" />
                  <span>Credit (income)</span>
                </label>
              </div>
            </div>
            <div class="field">
              <label for="txMerchant">Merchant</label>
              <input id="txMerchant" name="merchant" type="text" placeholder="Acme Coffee" required />
            </div>
            <div class="field">
              <label for="txNote">Note (optional)</label>
              <input id="txNote" name="note" type="text" placeholder="e.g., client meeting" />
            </div>
            <div class="actions">
              <button id="addBtn" type="submit" class="btn btn-primary">Add</button>
            </div>
          </form>
        </div>

        <div class="card">
          <h2>Transactions</h2>
          <div class="table-wrap">
            <table id="txTable" class="table">
              <thead>
                <tr>
                  <th class="col-date" data-sort-key="date" data-sort-type="date" title="Sort by date">Date</th>
                  <th class="truncate col-merchant" data-sort-key="merchant" data-sort-type="text" title="Sort by merchant">Merchant</th>
                  <th class="num col-amount" data-sort-key="amountCents" data-sort-type="number" title="Sort by amount">Amount</th>
                  <th class="col-currency" data-sort-key="currency" data-sort-type="text" title="Sort by currency">Currency</th>
                  <th class="truncate col-comment" data-sort-key="comment" data-sort-type="text" title="Sort by comment">Comment</th>
                </tr>
              </thead>
              <tbody id="txBody"></tbody>
            </table>
            <div id="renderStatus" class="render-status muted small" aria-live="polite" style="padding:6px 8px;"></div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Transaction details modal -->
  <div id="txModal" class="modal" style="display:none;">
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="txModalTitle">
      <button class="modal-close" id="txModalClose" aria-label="Close">×</button>
      <h3 id="txModalTitle">Transaction details</h3>
      <div class="modal-body">
        <dl class="details">
          <div><dt>Date</dt><dd id="mDate"></dd></div>
          <div><dt>Merchant</dt><dd id="mMerchant"></dd></div>
          <div><dt>Amount</dt><dd id="mAmount"></dd></div>
          <div><dt>Currency</dt><dd id="mCurrency"></dd></div>
          <div><dt>Comment</dt><dd id="mComment"></dd></div>
        </dl>
      </div>
    </div>
  </div>

  <div id="loading" class="loading" style="display:none;">
    <div class="spinner"></div>
    <div class="loading-text">Loading…</div>
  </div>

  <footer class="container app-footer">
    <small class="muted">Expensify Candidate Challenge</small>
  </footer>

  <!-- jQuery is allowed per challenge requirements -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
  <script src="assets/js/core.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/render.js"></script>
  <script>window.__APP__ = { proxy: 'proxy.php' };</script>
  <script src="assets/js/app.js"></script>
</body>
</html>
