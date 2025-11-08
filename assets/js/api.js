'use strict';
(function(){
  const TXApi = window.TXApi = window.TXApi || {};
  const getProxy = () => (window.__APP__ && window.__APP__.proxy) || 'proxy.php';

  function setCookie(name, value, days){
    const d = new Date(); d.setTime(d.getTime() + days*24*60*60*1000);
    const expires = 'expires=' + d.toUTCString();
    let cookie = name + '=' + (value || '') + '; ' + expires + '; path=/; SameSite=Lax';
    if (window.location && window.location.protocol === 'https:') cookie += '; Secure';
    document.cookie = cookie;
  }
  function getCookie(name){
    const nameEQ = name + '='; const ca = document.cookie.split(';');
    for (let i=0;i<ca.length;i++){ let c = ca[i]; while(c.charAt(0)===' ') c=c.substring(1); if (c.indexOf(nameEQ)===0) return c.substring(nameEQ.length); }
    return null;
  }
  function eraseCookie(name){ document.cookie = name + '=; Max-Age=-99999999; path=/'; }

  function request(command, params){
    return $.ajax({
      url: getProxy(), method: 'POST', contentType: 'application/json', dataType: 'json',
      data: JSON.stringify({ command, params })
    }).then(function (data, _ts, jqXHR){
      return data;
    }, function (jqXHR){
      let payload=null; try{ payload = JSON.parse(jqXHR.responseText); }catch(e){}
      return $.Deferred().reject({ status: jqXHR.status, payload, raw: jqXHR.responseText || null });
    });
  }

  TXApi.setCookie = setCookie; TXApi.getCookie = getCookie; TXApi.eraseCookie = eraseCookie; TXApi.request = request;
})();
