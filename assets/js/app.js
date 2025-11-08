/* global $ */
'use strict';
(function () {
  // -----------------------
  // TXApp module
  // -----------------------
  const TXApp = window.TXApp = window.TXApp || {};
  const IS_TEST = !!window.__TEST__;

  // Cached DOM refs
  const $alert = $('#alert');
  const $loading = $('#loading');
  const $authView = $('#authView');
  const $appView = $('#appView');
  const $logoutBtn = $('#logoutBtn');
  const $txBody = $('#txBody');
  const $renderStatus = $('#renderStatus');
  // Summary chip refs
  const $chipCount = $('#chipCount');
  const $chipIncome = $('#chipIncome');
  const $chipExpense = $('#chipExpense');
  const $chipNet = $('#chipNet');

  // Use modular helpers
  const Api = window.TXApi || {};
  const Render = window.TXRender || {};
  const Core = window.TXCore || {};

  function showAlert(message, type = 'error') {
    $alert.removeClass('success error info').addClass(type);
    $alert.text(message).show();
  }

  function hideAlert() { $alert.hide().text(''); }

  function showLoading(msg) {
    if (msg) $('.loading-text').text(msg);
    $loading.show();
  }
  function hideLoading() { $loading.hide(); }

  // API requests delegated to TXApi.request

  // -----------------------
  // State
  // -----------------------
  let authToken = null;
  let transactions = [];
  let filtered = [];
  let currentSort = { key: 'date', dir: 'desc', type: 'date' };
  // Rendering and helpers are provided by TXRender/TXCore

  function applyFilter() {
    const q = ($('#search').val() || '').toString().toLowerCase().trim();
    if (!q) filtered = transactions; else filtered = transactions.filter(t => t.merchantLC.includes(q) || t.commentLC.includes(q));
  $chipCount.text(`${filtered.length} tx`);
  updateSummary();
    if (!filtered.length) {
      $txBody.html('<tr class="empty"><td colspan="5" class="muted center">No transactions found</td></tr>');
      return;
    }
  if (Render.setTargets) { Render.setTargets({ bodyEl: $txBody[0], statusEl: $renderStatus[0] }); }
  (Render.renderTableChunked || function(){}) (filtered);
  }

  function updateSummary() {
    if (!filtered.length) {
      $chipCount.text('0 tx');
      $chipIncome.text('Income 0');
      $chipExpense.text('Expense 0');
      $chipNet.text('Net 0');
      return;
    }
    let income = 0, expense = 0;
    for (const t of filtered) {
      const v = (t.amountCents || 0);
      if (v > 0) income += v; else expense += v;
    }
    const net = income + expense; // expense negative
    $chipCount.text(`${filtered.length} tx`);
  $chipIncome.text(`Income ${Core.formatAmountCentsToUSD ? Core.formatAmountCentsToUSD(income) : (income/100).toFixed(2)}`);
  $chipExpense.text(`Expense ${Core.formatAmountCentsToUSD ? Core.formatAmountCentsToUSD(Math.abs(expense)) : (Math.abs(expense)/100).toFixed(2)}`);
  $chipNet.text(`Net ${Core.formatAmountCentsToUSD ? Core.formatAmountCentsToUSD(net) : (net/100).toFixed(2)}`);
  }

  function sortData(key, type) {
    const dir = (currentSort.key === key && currentSort.dir === 'asc') ? 'desc' : 'asc';
    currentSort = { key, dir, type };
    const factor = dir === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    filtered = [...filtered].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (type === 'number') {
        return ((va || 0) - (vb || 0)) * factor;
      }
      if (type === 'date') {
        return (Date.parse(va) - Date.parse(vb)) * factor;
      }
      return collator.compare((va || '').toString(), (vb || '').toString()) * factor;
    });
  (Render.renderTableChunked || function(){}) (filtered);
    indicateSort();
  }

  function indicateSort() {
    $('#txTable thead th').each(function () {
      const $th = $(this);
      const key = $th.data('sort-key');
      if (!key) { $th.removeClass('sort-asc sort-desc'); return; }
      if (key === currentSort.key) {
        $th.removeClass('sort-asc sort-desc').addClass(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      } else {
        $th.removeClass('sort-asc sort-desc');
      }
    });
  }

  function onLoginSubmit(e) {
    e.preventDefault();
    hideAlert();

    const email = $('#email').val();
    const password = $('#password').val();
    if (!email || !password) {
      showAlert('Please provide both email and password.', 'error');
      return;
    }

    $('#signInBtn').prop('disabled', true).text('Signing in…');
    showLoading('Authenticating…');

  (Api.request || function(){ return $.Deferred().reject({status:0}); })('Authenticate', {
      partnerUserID: email,
      partnerUserSecret: password,
      // partner credentials are attached server-side by proxy
    }).done(function (data) {
      // Expected: data.authToken on success
      if (data && data.authToken) {
        authToken = data.authToken;
  (Api.setCookie || function(){})('authToken', authToken, 3);
        $authView.hide();
        $appView.show();
        $logoutBtn.show();
        fetchTransactions();
      } else {
        const msg = (data && (data.message || data.error)) || 'Authentication failed.';
        showAlert(msg, 'error');
      }
    }).fail(function (err) {
      const msg = (err.payload && (err.payload.error || err.payload.message)) || err.status + ' auth error';
      showAlert(msg || 'Network error during authentication.', 'error');
    }).always(function () {
      $('#signInBtn').prop('disabled', false).text('Sign In');
      hideLoading();
    });
  }

  function fetchTransactions() {
    showLoading('Fetching transactions…');

    const params = {
      authToken: authToken,
      // The legacy Expensify API often uses returnValueList to specify which data to return.
      // We request transactionList explicitly; if API ignores it, proxy still forwards.
      returnValueList: 'transactionList',
      // Intentionally not paginating per the challenge instructions
    };

  (Api.request || function(){ return $.Deferred().reject({status:0}); })('Get', params).done(function (data) {
      // Try to extract transactions from common shapes
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.transactionList)) {
        list = data.transactionList;
      } else if (data && data.transactionList && Array.isArray(data.transactionList.transactionList)) {
        // sometimes nested
        list = data.transactionList.transactionList;
      } else if (data && Array.isArray(data.transactions)) {
        list = data.transactions;
      } else if (data && data.raw && Array.isArray(data.raw.transactions)) {
        list = data.raw.transactions;
      }

  const norm = Core.normalizeTx || function(x){ return x; };
  transactions = list.map(norm);
      filtered = transactions;
      $chipCount.text(`${filtered.length} tx`);
  updateSummary();
  if (Render.setTargets) { Render.setTargets({ bodyEl: $txBody[0], statusEl: $renderStatus[0] }); }
  (Render.renderTableChunked || function(){}) (filtered);
    }).fail(function (err) {
      let msg = 'Failed to fetch transactions.';
      if (err.payload && (err.payload.error || err.payload.message)) {
        msg = err.payload.error || err.payload.message;
      } else if (err.status) {
        msg += ` (HTTP ${err.status})`;
      }
      if (err.raw && err.raw.length < 400) {
        msg += ` :: ${err.raw}`;
      }
      showAlert(msg, 'error');
    }).always(function () { hideLoading(); });
  }

  function onAddSubmit(e) {
    e.preventDefault();
    hideAlert();

    const date = $('#txDate').val();
    const merchant = $('#txMerchant').val();
    const amountUSD = parseFloat($('#txAmount').val());
    const note = $('#txNote').val();
  const type = $('input[name="txType"]:checked').val(); // 'debit' or 'credit'

    if (!date || !merchant || !(amountUSD >= 0)) {
      showAlert('Please provide date, merchant, and a valid amount.', 'error');
      return;
    }

    // Disallow future dates
    const today = new Date(); today.setHours(0,0,0,0);
    const picked = new Date(date + 'T00:00:00');
    if (picked > today) {
      showAlert('Future dates are not allowed.', 'error');
      return;
    }

    let amountCents = Math.round(amountUSD * 100);
    if (type === 'debit') {
      amountCents = -Math.abs(amountCents); // debit => negative (red)
    } else {
      amountCents = Math.abs(amountCents);  // credit => positive (green)
    }

    $('#addBtn').prop('disabled', true).text('Adding…');

  (Api.request || function(){ return $.Deferred().reject({status:0}); })('CreateTransaction', {
      authToken: authToken,
      created: date, // many API variants accept ISO date; if epoch required, backend may coerce
      merchant: merchant,
      amount: amountCents, // cents
      currency: 'USD',
      comment: note || ''
    }).done(function (data) {
      // Optimistically add the new row to the top
      const newTx = (Core.normalizeTx || function(x){return x;} )({
        created: date,
        merchant: merchant,
        amount: amountCents,
        currency: 'USD',
        comment: note || ''
      });
      transactions.unshift(newTx);
      applyFilter();
      showAlert('Transaction created.', 'success');
      // reset form
      $('#addForm')[0].reset();
    }).fail(function (err) {
      const msg = (err.payload && (err.payload.error || err.payload.message)) || 'Failed to create transaction.';
      showAlert(msg, 'error');
    }).always(function () {
      $('#addBtn').prop('disabled', false).text('Add');
    });
  }

  function initViews() {
  authToken = (Api.getCookie || function(){ return null; })('authToken');

    if (authToken) {
      $authView.hide();
      $appView.show();
      $logoutBtn.show();
      fetchTransactions();
    } else {
      $authView.show();
      $appView.hide();
      $logoutBtn.hide();
    }
  }

  function bindEvents() {
    $('#loginForm').on('submit', onLoginSubmit);
    $('#addForm').on('submit', onAddSubmit);
    $('#search').on('input', function () {
      // adaptive debounce (more rows -> slightly longer debounce)
      const baseDelay = transactions.length > 10000 ? 200 : 120;
      if (bindEvents._t) clearTimeout(bindEvents._t);
      bindEvents._t = setTimeout(applyFilter, baseDelay);
    });

    $('#txTable thead').on('click', 'th[data-sort-key]', function () {
      const key = $(this).data('sort-key');
      const type = $(this).data('sort-type') || 'text';
      sortData(key, type);
    });

    // Row click -> modal
    $('#txBody').on('click', 'tr', function () {
      const idx = $(this).data('txIndex');
      if (idx == null) return;
      const tx = filtered[idx];
      if (!tx) return;
  $('#mDate').text(Core.formatDate ? Core.formatDate(tx.date) : (''+tx.date).slice(0,10));
      $('#mMerchant').text(tx.merchant || '');
  $('#mAmount').text(tx.amountCents != null ? (Core.formatAmountCentsToUSD ? Core.formatAmountCentsToUSD(tx.amountCents) : (tx.amountCents/100).toFixed(2)) : '');
      $('#mCurrency').text(tx.currency || '');
      $('#mComment').text(tx.comment || '');
  // Raw JSON removed per request.
      $('#txModal').addClass('show').show();
    });

    $('[data-close-modal], #txModalClose').on('click', function () {
      $('#txModal').removeClass('show').hide();
    });

    $('#densityToggle').on('click', function () {
      $('body').toggleClass('compact-mode');
    });

    $logoutBtn.on('click', function () {
  (Api.eraseCookie || function(){})('authToken');
      authToken = null;
      transactions = [];
      filtered = [];
      $txBody.empty();
      $chipCount.text('');
      $logoutBtn.hide();
      $appView.hide();
      $authView.show();
      hideAlert();
    });
  }

  // Export some module APIs (optional)
  TXApp.refresh = function () { fetchTransactions(); };
  TXApp.state = function () { return { authToken, total: transactions.length, filtered: filtered.length, sort: currentSort }; };
  if (IS_TEST) {
    TXApp._test = {
      normalizeTx: Core.normalizeTx,
      formatDate: Core.formatDate,
      formatAmountCentsToUSD: Core.formatAmountCentsToUSD,
      computeInitialChunkSize: Core.computeInitialChunkSize,
      sortKeys: function(list, key, type, dir){
        const factor = (dir === 'asc') ? 1 : -1;
        const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
        return [...list].sort(function(a,b){
          const va = a[key]; const vb = b[key];
          if (type === 'number') return ((va || 0) - (vb || 0)) * factor;
          if (type === 'date') return (Date.parse(va) - Date.parse(vb)) * factor;
          return collator.compare((va || '').toString(), (vb || '').toString()) * factor;
        }).map(function(x){ return x[key]; });
      }
    };
  }

  if (!IS_TEST) {
    $(function () {
      if (Render.setTargets) {
        Render.setTargets({ bodyEl: $txBody[0], statusEl: $renderStatus[0] });
      }
      bindEvents();
      initViews();
      indicateSort();
    });
  }
})();
