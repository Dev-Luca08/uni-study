/* Uni Study — one bottom bar on every screen (made by Luca Cicarelli)
   Vandaag · Vakken · Flashcards · Chat · Vrienden, with red badges for new messages and friend requests. */
(function () {
  var page = /flashcards\.html/.test(location.pathname) ? 'cards' : 'plan';
  var ITEMS = [
    ['today', 'planner.html#today', 'today', 'Vandaag'],
    ['courses', 'planner.html#courses', 'book', 'Vakken'],
    ['cards', 'flashcards.html', 'cards', 'Flashcards'],
    ['chats', 'flashcards.html#go=chats', 'chat', 'Chat'],
    ['friends', 'flashcards.html#go=friends', 'people', 'Vrienden']
  ];
  var counts = { chats: 0, friends: 0 };
  // The apps keep these as top-level let/const, which are not on window: read them by name
  function g(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  var svg = {
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.5c2.2.3 3.6 1.9 4 4.5"/>'
  };
  function ic(name) {
    if (svg[name]) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' + svg[name] + '</svg>';
    try { if (typeof icon === 'function') return icon(name); } catch (e) {}
    return '';
  }
  function current() {
    if (page === 'plan') {
      var t = (g('view') && g('view').tab) || 'today';
      return t === 'courses' ? 'courses' : 'today';
    }
    var v = (g('view') && g('view').name) || 'home';
    if (v === 'chats' || v === 'chat') return 'chats';
    if (v === 'friends' || v === 'profile' || v === 'notifs') return 'friends';
    return 'cards';
  }
  function draw() {
    var bar = document.getElementById('unibar');
    if (!bar) { bar = document.createElement('nav'); bar.id = 'unibar'; bar.setAttribute('aria-label', 'Hoofdmenu'); document.body.appendChild(bar); document.body.classList.add('has-unibar'); }
    var cur = current();
    bar.innerHTML = ITEMS.map(function (it) {
      var n = counts[it[0]] || 0;
      return '<a href="' + it[1] + '" data-go="' + it[0] + '"' + (cur === it[0] ? ' class="on" aria-current="page"' : '') + '><i>' + ic(it[2]) +
        (n ? '<b class="ub-badge">' + (n > 9 ? '9+' : n) + '</b>' : '') + '</i><span>' + it[3] + '</span></a>';
    }).join('');
  }
  // Same page: switch without reloading
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('#unibar a'); if (!a) return;
    var go = a.dataset.go;
    if (page === 'plan' && (go === 'today' || go === 'courses') && g('ACT') && g('ACT').tab) {
      e.preventDefault(); if (g('view')) g('view').course = null; g('ACT').tab({ dataset: { tab: go } }); draw(); scrollTo(0, 0);
    } else if (page === 'cards' && g('ACT')) {
      var fn = go === 'chats' ? g('ACT').chats : go === 'friends' ? g('ACT').friends : go === 'cards' ? g('ACT').home : null;
      if (fn) { e.preventDefault(); fn({ dataset: {} }); draw(); }
    }
  });
  function fromHash() {
    var m = location.hash.match(/^#(go=)?(today|courses|chats|friends)$/); if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    var go = m[2];
    if (page === 'plan' && g('ACT') && g('ACT').tab) g('ACT').tab({ dataset: { tab: go } });
    if (page === 'cards' && g('ACT')) {
      var tries = 0; (function wait() {
        // Chat and friends need the account: wait until it has loaded
        if (g('Cloud') && g('Cloud').ready) { (go === 'chats' ? g('ACT').chats : g('ACT').friends)({ dataset: {} }); draw(); }
        else if (tries++ < 40) setTimeout(wait, 250);
      })();
    }
    draw();
  }
  var client = null;
  async function refreshCounts() {
    try {
      var sb = (g('Cloud') && g('Cloud').sb) || (g('Sync') && g('Sync').sb) || null;
      if (!sb && window.supabase && window.SUPA_URL_SHARED) sb = client || (client = supabase.createClient(SUPA_URL_SHARED, SUPA_KEY_SHARED));
      if (!sb) return;
      var s = await sb.auth.getSession(); var u = s && s.data && s.data.session && s.data.session.user; if (!u) return;
      var m = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('to_user', u.id).is('read_at', null);
      var f = await sb.from('friendships').select('id', { count: 'exact', head: true }).eq('addressee', u.id).eq('status', 'pending');
      counts.chats = m.count || 0; counts.friends = f.count || 0; draw();
    } catch (e) { /* offline */ }
  }
  // Keep the active item in sync with the app's own screen changes
  var last = '';
  setInterval(function () { var c = current(); if (c !== last) { last = c; draw(); } }, 400);
  setInterval(function () { if (document.visibilityState === 'visible') refreshCounts(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refreshCounts(); });
  window.addEventListener('hashchange', fromHash);
  var css = document.createElement('style');
  css.textContent = '#unibar{position:fixed;left:0;right:0;bottom:0;z-index:30;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;' +
    'background:var(--surface,#fff);border-top:1px solid var(--line,#ddd);padding:6px max(8px,env(safe-area-inset-right,0px)) calc(6px + env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));box-shadow:0 -4px 18px rgba(0,0,0,.06)}' +
    '#unibar a{display:grid;justify-items:center;gap:2px;padding:4px 2px;border-radius:12px;text-decoration:none;color:var(--muted,#667);font-size:.72rem;font-weight:700}' +
    '#unibar a.on{color:var(--accent,#1F3FB5);background:var(--accent-soft,#e1e7fa)}' +
    '#unibar i{position:relative;display:grid;place-items:center;width:26px;height:26px;font-style:normal}#unibar i svg,#unibar i .ic{width:22px;height:22px}' +
    '#unibar .ub-badge{position:absolute;top:-4px;right:-9px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#d33;color:#fff;font-size:.62rem;display:grid;place-items:center;line-height:1}' +
    'body.has-unibar{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}body.has-unibar nav.tabs,body.has-unibar .app-switch{display:none!important}' +
    '@media(min-width:900px){#unibar{left:50%;right:auto;transform:translateX(-50%);width:560px;bottom:12px;border:1px solid var(--line,#ddd);border-radius:18px}}';
  document.head.appendChild(css);
  function start() { draw(); fromHash(); setTimeout(refreshCounts, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // Send any text (exam roster, planning …) to friends inside the app
  function sbNow() { return (g('Cloud') && g('Cloud').sb) || (g('Sync') && g('Sync').sb) || client; }
  function escH(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  async function send(text) {
    var sb = sbNow(); if (!sb) return false;
    var s = await sb.auth.getSession(); var me = s && s.data && s.data.session && s.data.session.user;
    if (!me) { if (confirm('Log in om naar vrienden te sturen. Nu inloggen?')) location.href = 'flashcards.html#auth'; return true; }
    var fs = (await sb.from('friendships').select('requester,addressee,status').eq('status', 'accepted')).data || [];
    var ids = fs.map(function (f) { return f.requester === me.id ? f.addressee : f.requester; });
    var names = {}; if (ids.length) ((await sb.from('profiles').select('id,username').in('id', ids)).data || []).forEach(function (p) { names[p.id] = p.username; });
    var box = document.createElement('div'); box.id = 'unisend';
    box.innerHTML = '<div class="us-in"><b>Stuur naar een vriend</b><pre>' + escH(text.slice(0, 400)) + (text.length > 400 ? '…' : '') + '</pre>' +
      (ids.length ? ids.map(function (id) { return '<button data-uid="' + id + '">@' + escH(names[id] || 'vriend') + '</button>'; }).join('') : '<p>Nog geen vrienden. Voeg ze toe bij Vrienden.</p>') +
      '<button data-x="1" class="us-x">Sluiten</button></div>';
    document.body.appendChild(box);
    box.onclick = async function (e) {
      var b = e.target.closest('button'); if (e.target === box || (b && b.dataset.x)) { box.remove(); return; } if (!b) return;
      b.disabled = true; b.textContent = 'Versturen…';
      var r = await sb.from('messages').insert({ from_user: me.id, to_user: b.dataset.uid, body: text });
      b.textContent = r.error ? 'Mislukt' : 'Verstuurd ✓';
    };
    return true;
  }
  var css2 = document.createElement('style');
  css2.textContent = '#unisend{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.45);display:grid;place-items:end center}' +
    '#unisend .us-in{width:min(520px,100%);max-height:80vh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#111);border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));display:grid;gap:8px}' +
    '#unisend pre{white-space:pre-wrap;font:inherit;font-size:.85rem;color:var(--muted,#667);margin:0;max-height:120px;overflow:auto}' +
    '#unisend button{min-height:46px;border-radius:12px;border:1px solid var(--line,#ddd);background:var(--accent-soft,#e1e7fa);color:inherit;font:inherit;font-weight:700;text-align:left;padding:0 14px}#unisend .us-x{background:none;text-align:center}';
  document.head.appendChild(css2);
  window.UniSend = send;
  window.UniBar = { draw: draw, refresh: refreshCounts };
})();
