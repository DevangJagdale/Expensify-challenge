/* Core, framework-free helpers shared by app and tests */
'use strict';
(function(){
  const TXCore = window.TXCore = window.TXCore || {};

  const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

  function formatAmountCentsToUSD(cents) {
    const v = Number(cents || 0) / 100;
    return v.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  function formatDate(value) {
    if (!value) return '';
    const t = Date.parse(value);
    if (!isNaN(t)) {
      return dateFmt.format(new Date(t));
    }
    return ('' + value).slice(0, 10);
  }

  function normalizeTx(tx) {
    const date = tx.created || tx.createdAt || tx.date || tx.posted || tx.transactionDate || tx.inserted || '';
    const merchant = tx.merchant || tx.merchantName || tx.payee || tx.vendor || '';
    let amountCents = null;
    if (typeof tx.amount === 'number') amountCents = Math.round(tx.amount);
    else if (typeof tx.amountCents === 'number') amountCents = tx.amountCents;
    else if (typeof tx.amountInCents === 'number') amountCents = tx.amountInCents;
    else if (typeof tx.amountUSD === 'number') amountCents = Math.round(tx.amountUSD * 100);
    const currency = tx.currency || tx.currencyCode || 'USD';
    const comment = tx.comment || tx.note || tx.description || '';

    const obj = { raw: tx, date, merchant, amountCents, currency, comment };
    obj.merchantLC = (merchant || '').toLowerCase();
    obj.commentLC = (comment || '').toLowerCase();
    obj.amountFormatted = amountCents != null ? formatAmountCentsToUSD(amountCents) : '';
    obj.dateFormatted = formatDate(date);
    return obj;
  }

  function computeInitialChunkSize(total, targetFrames) {
    const frames = targetFrames || 70;
    return Math.max(80, Math.ceil(total / frames));
  }

  // Expose
  TXCore.formatAmountCentsToUSD = formatAmountCentsToUSD;
  TXCore.formatDate = formatDate;
  TXCore.normalizeTx = normalizeTx;
  TXCore.computeInitialChunkSize = computeInitialChunkSize;
})();
