'use strict';
(function(){
  const TXRender = window.TXRender = window.TXRender || {};
  const Core = window.TXCore || {};
  let tbody = null; let statusEl = null;
  const rowCache = new WeakMap();

  function setTargets(opts){
    tbody = opts && opts.bodyEl ? opts.bodyEl : tbody;
    statusEl = opts && opts.statusEl ? opts.statusEl : statusEl;
  }

  function ensureTargets(){ if (!tbody) throw new Error('TXRender: tbody not set'); }

  function renderRows(list, startIndex){
    ensureTargets();
    const frag = document.createDocumentFragment();
    for (let i=0;i<list.length;i++){
      const item = list[i];
      let tr = rowCache.get(item);
      if (!tr){
        tr = document.createElement('tr');
        const tdDate = document.createElement('td'); tdDate.className='no-wrap col-date'; tdDate.textContent = Core.formatDate ? Core.formatDate(item.date) : (item.dateFormatted || '');
        const tdMerchant = document.createElement('td'); tdMerchant.className='truncate col-merchant'; tdMerchant.title=item.merchant||''; tdMerchant.textContent=item.merchant||'';
        const tdAmount = document.createElement('td'); tdAmount.className='num col-amount';
        const amtText = item.amountFormatted || (Core.formatAmountCentsToUSD ? Core.formatAmountCentsToUSD(item.amountCents) : '');
        tdAmount.textContent = amtText; if (typeof item.amountCents==='number'){ if (item.amountCents<0) tdAmount.classList.add('neg'); else if (item.amountCents>0) tdAmount.classList.add('pos'); }
        const tdCurrency = document.createElement('td'); tdCurrency.className='col-currency'; tdCurrency.textContent=item.currency||'USD';
        const tdComment = document.createElement('td'); tdComment.className='truncate col-comment'; tdComment.title=item.comment||''; tdComment.textContent=item.comment||'';
        tr.append(tdDate, tdMerchant, tdAmount, tdCurrency, tdComment);
        rowCache.set(item, tr);
      }
      tr.dataset.txIndex = (startIndex + i);
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  function renderTableChunked(items, chunkSize){
    ensureTargets();
    const total = items.length; if (!chunkSize){ chunkSize = Core.computeInitialChunkSize ? Core.computeInitialChunkSize(total, 70) : Math.max(80, Math.ceil(total/70)); }
    tbody.innerHTML = '';
    let idx = 0; const t0 = performance.now();
    function setStatus(text){ if (statusEl) statusEl.textContent = text; }
    function step(){
      const frameStart = performance.now();
      const end = Math.min(idx + chunkSize, items.length);
      renderRows(items.slice(idx, end), idx);
      idx = end;
      const frameTime = performance.now() - frameStart;
      if (frameTime < 6 && chunkSize < 1500) chunkSize = Math.round(chunkSize * 1.15);
      else if (frameTime > 18 && chunkSize > 80) chunkSize = Math.round(chunkSize * 0.8);
      const pct = Math.floor((idx/total)*100); const dt = Math.max(1, performance.now()-t0);
      const framesDone = Math.ceil(idx / chunkSize); const framesTotal = Math.ceil(total / chunkSize); const remaining = Math.max(0, framesTotal - framesDone);
      setStatus(`Rendering ${idx}/${total} (${pct}%) • chunk ${chunkSize} • frame ${framesDone}/${framesTotal} • ${remaining} left • ${dt.toFixed(0)}ms elapsed`);
      if (idx < items.length) requestAnimationFrame(step); else setStatus('');
    }
    step();
  }

  TXRender.setTargets = setTargets; TXRender.renderRows = renderRows; TXRender.renderTableChunked = renderTableChunked;
})();
