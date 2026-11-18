/* Uni Study — oefenpakketten (made by Luca Cicarelli)
   Load an exercise bundle or graph bundle (HTML), practise it item by item with the steps and the answer,
   link it to the chapters of a course, and send items or whole bundles to friends in the chat.
   Everything stays on this device; only what you send to a friend goes through the chat. */
(function () {
  var packs = [], ready = false, DONE_KEY = 'us-pack-done';
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nrm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function g(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function say(t) { var f = g('toast'); if (typeof f === 'function') f(t, 3500); else alert(t); }

  /* ---------- storage (IndexedDB: bundles with graphs can be over a megabyte) ---------- */
  function db() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('unistudy-packs', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('packs', { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('packs', mode), st = t.objectStore('packs'), out = fn(st); t.oncomplete = function () { res(out && out.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  function load() { return tx('readonly', function (st) { return st.getAll(); }).then(function (all) { packs = all || []; ready = true; return packs; }).catch(function () { ready = true; return packs; }); }
  function save(p) { return tx('readwrite', function (st) { st.put(p); }).then(load); }
  function remove(id) { return tx('readwrite', function (st) { st.delete(id); }).then(load); }
  function doneMap() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch (e) { return {}; } }
  function setDone(id, v) { var m = doneMap(); if (v) m[id] = today(); else delete m[id]; try { localStorage.setItem(DONE_KEY, JSON.stringify(m)); } catch (e) {} }

  /* ---------- safety: only keep harmless markup (bundles can come from friends) ---------- */
  var OK = {}; ('b,i,em,strong,sub,sup,span,p,br,ol,ul,li,table,thead,tbody,tr,td,th,figure,figcaption,div,small,code,pre,mark,h4,' +
    'svg,g,path,defs,use,text,tspan,clippath,rect,line,polyline,polygon,circle,ellipse,marker,lineargradient,stop').split(',').forEach(function (t) { OK[t] = 1; });
  function clean(html) {
    var t = document.createElement('template'); t.innerHTML = String(html || '');
    (function walk(n) {
      Array.prototype.slice.call(n.children).forEach(function (el) {
        var tag = el.localName.toLowerCase();
        if (!OK[tag]) { el.remove(); return; }
        Array.prototype.slice.call(el.attributes).forEach(function (a) {
          var nm = a.name.toLowerCase(), v = a.value;
          if (nm.indexOf('on') === 0) el.removeAttribute(a.name);
          else if ((nm === 'href' || nm === 'xlink:href') && v.charAt(0) !== '#') el.removeAttribute(a.name);
          else if (/url\(/i.test(v) && !/^url\(#[\w-]+\)$/.test(v.trim()) && !/url\(#/.test(v)) el.removeAttribute(a.name);
          else if (/javascript:|expression\(/i.test(v)) el.removeAttribute(a.name);
        });
        walk(el);
      });
    })(t.content);
    return t.innerHTML;
  }

  /* ---------- nicer maths: stacked Σ/∏/lim, serif math font, no duplicate "Antwoord" ---------- */
  function mathify(html) {
    var h = String(html || '').replace(/^\s*<b>\s*Antwoord\s*<\/b>\s*/i, '');
    h = h.replace(/([ΣΠ∏∑])\s*<sub>([\s\S]*?)<\/sub>\s*<sup>([\s\S]*?)<\/sup>/g, '<span class="mop"><span class="mup">$3</span><span class="msym">$1</span><span class="mlo">$2</span></span>');
    h = h.replace(/([ΣΠ∏∑])\s*<sup>([\s\S]*?)<\/sup>\s*<sub>([\s\S]*?)<\/sub>/g, '<span class="mop"><span class="mup">$2</span><span class="msym">$1</span><span class="mlo">$3</span></span>');
    h = h.replace(/\blim\s*<sub>([\s\S]*?)<\/sub>/g, '<span class="mop lim"><span class="msym">lim</span><span class="mlo">$1</span></span>');
    h = h.replace(/∫\s*<sub>([\s\S]*?)<\/sub>\s*<sup>([\s\S]*?)<\/sup>/g, '<span class="mop"><span class="mup">$2</span><span class="msym">∫</span><span class="mlo">$1</span></span>');
    return '<span class="math">' + h + '</span>';
  }

  /* ---------- reading a bundle ---------- */
  function parse(html, fname) {
    var doc = new DOMParser().parseFromString(html, 'text/html'), secs = [];
    var name = ((doc.querySelector('h1') || doc.querySelector('title') || {}).textContent || fname || 'Oefenpakket').trim();
    Array.prototype.forEach.call(doc.querySelectorAll('section[id]'), function (s) {
      var key = s.id.toLowerCase(); if (key === 'correctie') return;
      var head = s.querySelector('header'), items = [], sub = '';
      var title = head ? [(head.querySelector('.eyebrow') || {}).textContent, (head.querySelector('h2') || {}).textContent].filter(Boolean).join(' · ') : key.toUpperCase();
      Array.prototype.forEach.call(s.querySelectorAll('h3.sub, article.card'), function (el) {
        if (el.matches('h3.sub')) { sub = el.textContent.trim(); return; }
        var det = el.querySelector('details');
        if (det) {
          items.push({ nr: ((el.querySelector('.nr') || {}).textContent || '').trim(), sub: sub,
            q: clean((el.querySelector('.opg') || el.querySelector('.q') || {}).innerHTML),
            steps: Array.prototype.map.call(det.querySelectorAll('ol > li'), function (li) { return clean(li.innerHTML); }),
            ans: clean((det.querySelector('.ans') || {}).innerHTML) });
        } else {
          var h = el.querySelector('h3'), nr = h && h.querySelector('.num') ? h.querySelector('.num').textContent.trim() : '';
          var t = h ? h.textContent.replace(nr, '').trim() : '';
          items.push({ nr: nr, sub: sub, title: t, graf: 1, q: 'Teken: <b>' + escH(t) + '</b>',
            steps: Array.prototype.map.call(el.querySelectorAll('.txt ol > li'), function (li) { return clean(li.innerHTML); }),
            ans: clean(Array.prototype.map.call(el.querySelectorAll('.figs figure'), function (f) { return f.outerHTML; }).join('')),
            extra: clean(Array.prototype.map.call(el.querySelectorAll('.txt p.pit, .txt p.exam'), function (p) { return p.outerHTML; }).join('')) });
        }
      });
      if (items.length) secs.push({ key: key, title: title, items: items });
    });
    if (!secs.length) throw new Error('Ik vond geen oefeningen of grafieken in dit bestand.');
    var graf = secs.some(function (s) { return s.items.some(function (i) { return i.graf; }); });
    return { name: name.slice(0, 120), kind: graf ? 'graf' : 'oef', secs: secs };
  }
  function count(p) { return p.secs.reduce(function (n, s) { return n + s.items.length; }, 0); }

  /* ---------- link to the chapters of a course ---------- */
  function coursesByName(name) { var lc = g('listCourses'); return lc ? lc().filter(function (c) { return nrm(c.name) === nrm(name); }) : []; }
  function chapterFor(course, pack, key) {
    var chs = g('chaptersOf'); if (!chs || !course) return null;
    var re = new RegExp('(^|[^a-z0-9])' + key + '([^0-9]|$)');
    return chs(course.id).filter(function (ch) {
      var t = nrm(ch.title);
      return pack.kind === 'graf' ? (t.indexOf('grafiek') >= 0 && re.test(t)) : re.test(t) && t.indexOf('grafiek') < 0;
    })[0] || null;
  }

  /* ---------- course page block ---------- */
  function courseHtml(c) {
    var mine = packs.filter(function (p) { return nrm(p.course) === nrm(c.name); }), dm = doneMap();
    var list = mine.map(function (p) {
      var rows = p.secs.map(function (s) {
        var d = s.items.filter(function (_, i) { return dm[p.id + ':' + s.key + ':' + i]; }).length, ch = chapterFor(c, p, s.key);
        return '<button class="up-row" data-up-open="' + p.id + '" data-up-sec="' + s.key + '"><span class="grow"><b>' + escH(s.title) + '</b><br><span class="small muted">' +
          (ch ? '↳ ' + escH(ch.title) + ' · ' : '') + d + '/' + s.items.length + ' gedaan</span></span><span class="up-bar"><i style="width:' + Math.round(100 * d / s.items.length) + '%"></i></span><span aria-hidden="true">›</span></button>';
      }).join('');
      return '<div class="stack"><div class="row" style="align-items:center"><b class="grow">' + (p.kind === 'graf' ? '📈 ' : '✏️ ') + escH(p.name) + '</b><span class="muted small">' + count(p) + (p.kind === 'graf' ? ' grafieken' : ' oefeningen') + '</span></div>' + rows +
        '<div class="row">' + (p.srv ? '<span class="tag good">🌐 online voor iedereen</span>' : '<button class="btn sm primary" data-up-pub="' + p.id + '">🌐 Zet online voor iedereen</button>') + '<button class="btn sm" data-up-share="' + p.id + '">Stuur naar vriend</button><button class="btn sm danger" data-up-del="' + p.id + '">Verwijder</button></div></div>';
    }).join('<hr style="border:0;border-top:1px solid var(--line)">');
    return '<section class="card section stack"><div class="section-head"><h2>Oefenen</h2></div>' +
      (list || '<p class="muted small">Laad een oefenbundel of grafiekenbundel (HTML-bestand). Je oefent dan per werkcollege of hoofdstuk, één oefening of grafiek tegelijk, met tussenstappen en antwoord.</p>') +
      '<label class="btn sm" style="justify-self:start">📚 Oefenbundel of grafieken toevoegen<input type="file" accept=".html,.htm,text/html" hidden data-up-file="' + escH(c.name) + '"></label></section>';
  }

  /* ---------- trainer ---------- */
  var T = null;
  function open(packId, key, i) {
    var p = packs.filter(function (x) { return x.id === packId; })[0]; if (!p) return;
    var si = Math.max(0, p.secs.findIndex(function (s) { return s.key === key; })), s = p.secs[si], dm = doneMap();
    if (i == null) { i = s.items.findIndex(function (_, k) { return !dm[p.id + ':' + s.key + ':' + k]; }); if (i < 0) i = 0; }
    T = { p: p, s: s, i: i, shown: 0, ans: false };
    var box = document.getElementById('uptrain'); if (!box) { box = document.createElement('div'); box.id = 'uptrain'; document.body.appendChild(box); }
    document.body.style.overflow = 'hidden'; draw();
  }
  function close() { var b = document.getElementById('uptrain'); if (b) b.remove(); document.body.style.overflow = ''; T = null; var r = g('render'); if (typeof r === 'function') r(); }
  function draw() {
    var box = document.getElementById('uptrain'); if (!box || !T) return;
    var it = T.s.items[T.i], id = T.p.id + ':' + T.s.key + ':' + T.i, dm = doneMap(), n = T.s.items.length;
    var d = T.s.items.filter(function (_, k) { return dm[T.p.id + ':' + T.s.key + ':' + k]; }).length;
    var steps = it.steps.slice(0, T.ans ? it.steps.length : T.shown).map(function (h, k) { return '<li><span class="up-n">' + (k + 1) + '</span><div>' + mathify(h) + '</div></li>'; }).join('');
    var left = it.steps.length - T.shown;
    box.innerHTML = '<div class="up-top"><button class="up-x" data-up="close" aria-label="Sluiten">✕</button><div class="grow"><b>' + escH(T.s.title) + '</b><div class="up-bar wide"><i style="width:' + Math.round(100 * d / n) + '%"></i></div></div><span class="small muted">' + (T.i + 1) + '/' + n + '</span></div>' +
      '<div class="up-body"><article class="up-card">' +
      '<p class="small muted">' + escH(it.sub || '') + (dm[id] ? ' · <span class="up-ok">✓ gedaan</span>' : '') + '</p>' +
      '<div class="up-q"><span class="up-nr">' + escH(it.nr) + '</span><div>' + mathify(it.q) + '</div></div>' +
      (steps ? '<p class="up-lbl">' + (it.graf ? 'Zo teken je het' : 'Tussenstappen') + '</p><ol class="up-steps">' + steps + '</ol>' : '') +
      (T.ans ? '<div class="up-ans"><p class="up-lbl">' + (it.graf ? 'De grafiek' : 'Antwoord') + '</p><div class="up-res">' + (it.graf ? it.ans : mathify(it.ans)) + '</div>' + (it.ans ? '' : '<p class="muted">Geen antwoord in de bundel.</p>') + (it.extra || '') + '</div>' : '') +
      '</article></div>' +
      '<div class="up-foot">' + (!T.ans
        ? (left > 0 ? '<button class="btn" data-up="step">Volgende stap (' + left + ')</button>' : '') + '<button class="btn primary" data-up="ans">' + (it.graf ? 'Toon de grafiek' : 'Toon antwoord') + '</button>'
        : '<button class="btn" data-up="again">Nog eens later</button><button class="btn primary" data-up="ok">Ik kon het ✓</button>') +
      '<div class="up-nav"><button class="btn sm ghost" data-up="prev"' + (T.i ? '' : ' disabled') + '>‹ Vorige</button><button class="btn sm ghost" data-up="send">Stuur naar vriend</button><button class="btn sm ghost" data-up="next"' + (T.i < n - 1 ? '' : ' disabled') + '>Volgende ›</button></div></div>';
    box.querySelector('.up-body').scrollTop = T.ans || T.shown ? box.querySelector('.up-body').scrollHeight : 0;
  }
  function go(k) { T.i = Math.max(0, Math.min(T.s.items.length - 1, k)); T.shown = 0; T.ans = false; draw(); }
  function markOk() {
    var id = T.p.id + ':' + T.s.key + ':' + T.i, first = !doneMap()[id]; setDone(id, true);
    if (first) {
      var c = coursesByName(T.p.course)[0], ch = chapterFor(c, T.p, T.s.key), ap = g('applyProgress'), cm = g('commit');
      try { if (ch && ap) { ap(ch, 'study', 1); if (cm) cm({ day: today() }); } } catch (e) {}
    }
    var dm = doneMap(), n = T.s.items.length;
    for (var k = 1; k <= n; k++) { var j = (T.i + k) % n; if (!dm[T.p.id + ':' + T.s.key + ':' + j]) { go(j); return; } }
    say('Alles van ' + T.s.title + ' gedaan! 🎉'); close();
  }

  /* ---------- sending to friends ---------- */
  async function gz(str) { var s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); var b = new Uint8Array(await new Response(s).arrayBuffer()), out = ''; for (var i = 0; i < b.length; i += 32768) out += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(out); }
  async function ungz(b64) { var bin = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); return await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  async function sendItem() {
    var it = T.s.items[T.i], data = { pack: T.p.name, sec: T.s.title, it: it };
    var label = (it.graf ? 'Grafiek ' : 'Oefening ') + it.nr + ' · ' + T.s.title;
    if (!window.UniSend) return say('Versturen lukt hier niet.');
    await UniSend(label + '\n⟦UI:' + await gz(JSON.stringify(data)) + '⟧');
  }
  async function sendPack(id) {
    var p = packs.filter(function (x) { return x.id === id; })[0]; if (!p || !window.UniSend) return;
    say('Pakket klaarmaken…');
    await UniSend('Oefenpakket: ' + p.name + ' (' + count(p) + ')\n⟦UP:' + await gz(JSON.stringify({ name: p.name, kind: p.kind, course: p.course, secs: p.secs })) + '⟧');
  }

  /* ---------- chat: show sent items and bundles ---------- */
  var cache = {}, whoOf = {};
  function chatHtml(m, mine, who, time) {
    var r = /⟦(UI|UP):([^⟧]+)⟧/.exec(m.body || ''); if (!r) return null;
    var k = 'm' + m.id; whoOf[k] = who;
    if (!cache[k]) { cache[k] = { busy: true }; ungz(r[2]).then(function (t) { cache[k] = { d: JSON.parse(t), type: r[1] }; fill(k); }).catch(function () { cache[k] = { err: 1 }; fill(k); }); }
    return '<div class="msg ' + (mine ? 'mine' : '') + '"><div class="bubble up-chat" data-upm="' + k + '">' + inner(k, mine, who) + '</div>' + time + '</div>';
  }
  function inner(k, mine, who) {
    var c = cache[k] || {}; if (c.busy) return '<span class="small">Laden…</span>'; if (c.err) return '<span class="small">Dit kon ik niet openen.</span>';
    var d = c.d;
    if (c.type === 'UI') {
      var it = d.it || {};
      return '<p class="small muted">' + escH(d.sec || '') + '</p><div class="up-q"><span class="up-nr">' + escH(it.nr) + '</span><div>' + mathify(clean(it.q)) + '</div></div>' +
        '<details><summary>' + (it.graf ? 'Toon hoe je het tekent' : 'Toon tussenstappen en antwoord') + '</summary><ol class="up-steps">' + (it.steps || []).map(function (h, i) { return '<li><span class="up-n">' + (i + 1) + '</span><div>' + mathify(clean(h)) + '</div></li>'; }).join('') + '</ol>' +
        '<div class="up-ans"><div class="up-res">' + (it.graf ? clean(it.ans) : mathify(clean(it.ans))) + '</div>' + clean(it.extra || '') + '</div></details>';
    }
    var n = (d.secs || []).reduce(function (a, s) { return a + (s.items || []).length; }, 0);
    return '<b>' + (mine ? 'Je stuurde een oefenpakket' : '@' + escH(who) + ' stuurt je een oefenpakket') + '</b><p>' + (d.kind === 'graf' ? '📈 ' : '✏️ ') + escH(d.name) + ' · ' + n + (d.kind === 'graf' ? ' grafieken' : ' oefeningen') + '</p>' +
      (mine ? '' : '<button class="btn primary sm" data-up-take="' + k + '">Zet in mijn app (vak ' + escH(d.course || '') + ')</button>');
  }
  function fill(k) { Array.prototype.forEach.call(document.querySelectorAll('[data-upm="' + k + '"]'), function (el) { el.innerHTML = inner(k, el.parentNode.classList.contains('mine'), whoOf[k] || ''); }); }
  async function take(k) {
    var d = cache[k] && cache[k].d; if (!d) return;
    var p = { id: 'p' + Date.now().toString(36), name: String(d.name || 'Oefenpakket').slice(0, 120), kind: d.kind === 'graf' ? 'graf' : 'oef', course: String(d.course || 'Wiskunde').slice(0, 120), at: Date.now(),
      secs: (d.secs || []).map(function (s) { return { key: String(s.key).slice(0, 20), title: String(s.title || '').slice(0, 160), items: (s.items || []).map(function (it) { return { nr: String(it.nr || '').slice(0, 20), sub: String(it.sub || '').slice(0, 160), title: it.title, graf: it.graf ? 1 : 0, q: clean(it.q), steps: (it.steps || []).map(clean), ans: clean(it.ans), extra: clean(it.extra || '') }; }) }; }) };
    await save(p);
    if (confirm('Toegevoegd aan je app bij het vak ' + p.course + '. Nu openen in Planning?')) location.href = 'planner.html#courses';
  }

  /* ---------- online: bundles for everyone who is signed in ---------- */
  function sbc() { return (g('Sync') && g('Sync').sb) || (g('Cloud') && g('Cloud').sb) || null; }
  async function me() { var s = sbc(); if (!s) return null; var r = await s.auth.getSession(); return r && r.data && r.data.session ? r.data.session.user : null; }
  function fromData(d) {
    return { name: String(d.name || 'Oefenpakket').slice(0, 120), kind: d.kind === 'graf' ? 'graf' : 'oef', course: String(d.course || 'Wiskunde').slice(0, 120),
      secs: (d.secs || []).map(function (s) { return { key: String(s.key).slice(0, 20), title: String(s.title || '').slice(0, 160), items: (s.items || []).map(function (it) { return { nr: String(it.nr || '').slice(0, 20), sub: String(it.sub || '').slice(0, 160), title: it.title, graf: it.graf ? 1 : 0, q: clean(it.q), steps: (it.steps || []).map(clean), ans: clean(it.ans), extra: clean(it.extra || '') }; }) }; }) };
  }
  async function publish(id) {
    var p = packs.filter(function (x) { return x.id === id; })[0], s = sbc(), u = await me();
    if (!p) return; if (!s || !u) { say('Log eerst in om online te zetten.'); return; }
    say('Online zetten…');
    var srv = p.srv || ('k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    var r = await s.from('study_packs').upsert({ id: srv, course: p.course, name: p.name, kind: p.kind, items: count(p), data: await gz(JSON.stringify({ name: p.name, kind: p.kind, course: p.course, secs: p.secs })), updated_at: new Date().toISOString() });
    if (r.error) { say('Online zetten lukte niet: ' + r.error.message); return; }
    p.srv = srv; p.owner = u.id; p.at = Date.now(); await save(p); say('Online ✓ Iedereen die ingelogd is ziet dit nu bij ' + p.course); rerender();
  }
  var pulling = false;
  async function pull() {
    if (pulling) return; pulling = true;
    try {
      var s = sbc(), u = await me(); if (!s || !u) return;
      var r = await s.from('study_packs').select('id,owner,course,name,kind,items,updated_at'); if (r.error || !r.data) return;
      var changed = false;
      for (var i = 0; i < r.data.length; i++) {
        var row = r.data[i], have = packs.filter(function (x) { return x.srv === row.id; })[0], t = Date.parse(row.updated_at) || 0;
        if (have && (have.at || 0) >= t) continue;
        if (have && have.owner === u.id) continue;
        var full = await s.from('study_packs').select('data').eq('id', row.id).single(); if (full.error) continue;
        var p = fromData(JSON.parse(await ungz(full.data.data)));
        p.id = have ? have.id : 's-' + row.id; p.srv = row.id; p.owner = row.owner; p.at = t;
        await save(p); changed = true;
      }
      if (changed) rerender();
    } catch (e) { /* offline */ } finally { pulling = false; }
  }
  async function unpublish(p) { var s = sbc(); if (s && p.srv) await s.from('study_packs').delete().eq('id', p.srv); }
  function rerender() { var r = g('render'); if (typeof r === 'function' && /planner/.test(location.pathname)) r(); }

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-up],[data-up-open],[data-up-share],[data-up-del],[data-up-take],[data-up-pub]'); if (!b) return;
    if (b.dataset.upOpen) return open(b.dataset.upOpen, b.dataset.upSec);
    if (b.dataset.upShare) return sendPack(b.dataset.upShare);
    if (b.dataset.upPub) return publish(b.dataset.upPub);
    if (b.dataset.upTake) return take(b.dataset.upTake);
    if (b.dataset.upDel) { var dp = packs.filter(function (x) { return x.id === b.dataset.upDel; })[0] || {}; me().then(function (u) { var mineOnline = dp.srv && u && dp.owner === u.id; if (!confirm(mineOnline ? 'Dit pakket ook online verwijderen, voor iedereen?' : dp.srv ? 'Dit online pakket komt terug zolang het online staat. Toch van dit toestel verwijderen?' : 'Dit oefenpakket van dit toestel verwijderen?')) return; (mineOnline ? unpublish(dp) : Promise.resolve()).then(function () { return remove(b.dataset.upDel); }).then(rerender); }); return; }
    var a = b.dataset.up; if (!T) return;
    if (a === 'close') close();
    else if (a === 'step') { T.shown++; draw(); }
    else if (a === 'ans') { T.ans = true; draw(); }
    else if (a === 'ok') markOk();
    else if (a === 'again') { setDone(T.p.id + ':' + T.s.key + ':' + T.i, false); go((T.i + 1) % T.s.items.length); }
    else if (a === 'prev') go(T.i - 1);
    else if (a === 'next') go(T.i + 1);
    else if (a === 'send') sendItem();
  });
  document.addEventListener('keydown', function (e) { if (!T) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(T.i + 1); else if (e.key === 'ArrowLeft') go(T.i - 1); else if (e.key === ' ' && !T.ans) { e.preventDefault(); if (T.shown < T.s.items[T.i].steps.length) T.shown++; else T.ans = true; draw(); } });
  document.addEventListener('change', async function (e) {
    var el = e.target; if (!el.dataset || el.dataset.upFile == null || !el.files[0]) return;
    try {
      var f = el.files[0], p = parse(await f.text(), f.name.replace(/\.html?$/i, ''));
      p.id = 'p' + Date.now().toString(36); p.course = el.dataset.upFile; p.at = Date.now();
      await save(p); say(count(p) + (p.kind === 'graf' ? ' grafieken' : ' oefeningen') + ' toegevoegd ✓');
      var r = g('render'); if (typeof r === 'function') r();
    } catch (err) { say(err.message || 'Dit bestand kon ik niet lezen.'); }
    el.value = '';
  });

  var css = document.createElement('style');
  css.textContent = '.up-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--surface,#fff);color:inherit;font:inherit;cursor:pointer}' +
    '.up-row:hover{border-color:var(--accent,#1F3FB5)}.up-bar{width:64px;height:6px;border-radius:9px;background:var(--line,#ddd);overflow:hidden;flex:none}.up-bar.wide{width:100%;margin-top:6px}.up-bar i{display:block;height:100%;background:var(--accent,#1F3FB5)}' +
    '#uptrain{position:fixed;inset:0;z-index:70;background:var(--bg,#f6f6f8);color:var(--ink,#111);display:grid;grid-template-rows:auto 1fr auto}' +
    '#uptrain .up-top{display:flex;align-items:center;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;border-bottom:1px solid var(--line,#ddd);background:var(--surface,#fff)}' +
    '#uptrain .up-x{width:40px;height:40px;border-radius:12px;border:1px solid var(--line,#ddd);background:none;color:inherit;font-size:1.1rem;cursor:pointer}' +
    '#uptrain .up-body{overflow:auto;padding:18px 16px}.up-card{max-width:680px;margin:0 auto;background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:20px;padding:20px;display:grid;gap:14px;box-shadow:var(--shadow,none)}' +
    '.up-q{display:flex;gap:12px;align-items:flex-start;font-size:1.12rem;line-height:1.55}.up-nr{flex:none;min-width:38px;height:30px;padding:0 8px;border-radius:9px;background:var(--accent-soft,#e1e7fa);color:var(--accent,#1F3FB5);font-weight:800;display:grid;place-items:center;font-size:.9rem}' +
    '.up-lbl{margin:4px 0 0;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#667)}' +
    '.up-steps{list-style:none;margin:0;padding:0;display:grid;gap:8px}.up-steps li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--bg,#f6f6f8);line-height:1.5;animation:upin .25s ease}' +
    '.up-n{flex:none;width:24px;height:24px;border-radius:50%;background:var(--accent,#1F3FB5);color:#fff;font-size:.78rem;font-weight:800;display:grid;place-items:center}' +
    '.up-ans{padding:14px 16px;border-radius:14px;border:2px solid var(--accent,#1F3FB5);display:block;line-height:1.6;animation:upin .25s ease}.up-ans>*+*{margin-top:10px}.up-res{font-size:1.12rem}.up-ans figure{margin:0}.up-ans svg{max-width:100%;height:auto;color:var(--ink,#111)}' +
    '.up-ans .pit,.up-ans .exam{margin:0;padding:10px 12px;border-radius:12px;background:var(--accent-soft,#e1e7fa)}.up-ok{color:#2a8a4a;font-weight:700}' +
    '#uptrain .up-foot{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,#ddd);background:var(--surface,#fff)}#uptrain .up-foot>.btn:only-of-type{grid-column:1/-1}' +
    '#uptrain .up-foot .btn{min-height:50px}.up-nav{grid-column:1/-1;display:flex;justify-content:space-between}.up-chat .up-steps li{background:rgba(127,127,127,.12)}.up-chat details{margin-top:8px}.up-chat svg{max-width:100%;height:auto}' +
    '@keyframes upin{from{transform:translateY(6px)}to{opacity:1;transform:none}}@media(min-width:760px){#uptrain .up-foot{max-width:712px;width:100%;margin:0 auto;border:0;background:none}}';
  css.textContent += '.math{font-family:"STIX Two Text","Cambria Math","Cambria","Latin Modern Roman","Times New Roman",serif;font-size:1.08em;letter-spacing:.005em}' +
    '.math sub,.math sup{font-size:.68em;line-height:0}.math sup{vertical-align:.55em}.math sub{vertical-align:-.3em}' +
    '.mop{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .15em;line-height:1}.mop .msym{font-size:1.55em;line-height:1}.mop.lim .msym{font-size:1em;font-style:normal}' +
    '.mop .mup,.mop .mlo{font-size:.62em;line-height:1.15;white-space:nowrap}.up-q .math{font-size:1.06em}.up-steps .math{display:inline}';
  document.head.appendChild(css);
  if (!document.querySelector('link[data-stix]')) { var lf = document.createElement('link'); lf.rel = 'stylesheet'; lf.dataset.stix = 1; lf.href = 'https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap'; document.head.appendChild(lf); }

  window.UniPack = { load: load, courseHtml: courseHtml, chatHtml: chatHtml, open: open, get ready() { return ready; }, get packs() { return packs; } };
  load().then(function () { if (packs.length) rerender(); setTimeout(pull, 2000); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pull(); });
})();
