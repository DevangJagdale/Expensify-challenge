(function(){
  function log(el, ok, msg){
    const li = document.createElement('li');
    li.className = ok ? 'pass' : 'fail';
    li.textContent = (ok ? '✓ ' : '✗ ') + msg;
    el.appendChild(li);
  }
  function assertEqual(el, actual, expected, msg){
    const ok = (actual === expected);
    if (!ok) console.error('AssertEqual failed:', {actual, expected, msg});
    log(el, ok, msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
  }
  function assertTrue(el, cond, msg){
    if (!cond) console.error('AssertTrue failed:', msg);
    log(el, !!cond, msg);
  }

  function run(){
    const R = document.getElementById('results');
    const T = window.TXApp && window.TXApp._test;
    if (!T){
      log(R, false, 'TXApp._test not available');
      return;
    }

    // computeInitialChunkSize
    assertEqual(R, T.computeInitialChunkSize(0, 70), 80, 'Chunk size min clamp at 80');
    assertEqual(R, T.computeInitialChunkSize(17705, 70), Math.ceil(17705/70), 'Chunk size for 17,705 @70 frames');
    assertEqual(R, T.computeInitialChunkSize(5600, 70), Math.ceil(5600/70), 'Chunk size for 5,600 @70 frames');

    // normalizeTx amount selection and cached fields
    const a = T.normalizeTx({ created:'2023-01-02', merchant:'Acme', amount:12345, currency:'USD', comment:'Lunch' });
    assertEqual(R, a.amountCents, 12345, 'normalizeTx amount from amount (cents-int)');
    assertEqual(R, a.merchantLC, 'acme', 'normalizeTx merchantLC cached');
    assertEqual(R, a.commentLC, 'lunch', 'normalizeTx commentLC cached');
    assertTrue(R, typeof a.amountFormatted === 'string' && a.amountFormatted.length > 0, 'normalizeTx amountFormatted non-empty');
    assertTrue(R, typeof a.dateFormatted === 'string' && a.dateFormatted.length > 0, 'normalizeTx dateFormatted non-empty');

    const b = T.normalizeTx({ createdAt:'2023-02-03', merchantName:'Shop', amountInCents:200, currencyCode:'USD', note:'Note' });
    assertEqual(R, b.amountCents, 200, 'normalizeTx amount from amountInCents');

    const c = T.normalizeTx({ date:'2023-03-04', payee:'Payee', amountUSD: 12.34, description:'Desc' });
    assertEqual(R, c.amountCents, 1234, 'normalizeTx amount from amountUSD dollars->cents');

    // formatDate fallback behavior: invalid date returns first 10 chars
    assertEqual(R, T.formatDate('NOT_A_DATE_XXXXX'), 'NOT_A_DATE', 'formatDate fallback returns first 10 chars');

    // sort comparator behavior (text, number, date)
    if (typeof T.sortKeys === 'function') {
      const list = [
        { merchant: 'beta', amountCents: 200, date: '2023-01-02' },
        { merchant: 'Alpha', amountCents: -100, date: '2022-12-31' },
        { merchant: 'charlie', amountCents: 0, date: '2023-01-01' }
      ];
      const s1 = T.sortKeys(list, 'merchant', 'text', 'asc');
      assertEqual(R, s1.join(','), 'Alpha,beta,charlie', 'Sort text asc (case-insensitive, numeric-aware)');
      const s2 = T.sortKeys(list, 'amountCents', 'number', 'desc');
      assertEqual(R, s2.join(','), '200,0,-100', 'Sort numbers desc');
      const s3 = T.sortKeys(list, 'date', 'date', 'asc');
      assertEqual(R, s3.join(','), '2022-12-31,2023-01-01,2023-01-02', 'Sort dates asc');
    }

    console.log('Tests completed');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
