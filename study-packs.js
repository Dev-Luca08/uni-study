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
    // real fractions: a/b, (..)/(..), [..]/h, df/dx (not for words like en/of)
    var opnd = '(\\[[^\\[\\]]{1,80}\\]|\\((?:[^()]|\\([^()]*\\)){1,80}\\)|[∂A-Za-z0-9′\'²³ⁿ.!α-ωπ∞]+(?:<su[bp]>[^<]{0,20}<\\/su[bp]>)*)';
    var tok = '([∂A-Za-z0-9′\'²³ⁿ.!α-ωπ∞]+(?:<su[bp]>[^<]{0,20}<\\/su[bp]>)*)';
    var frac = function (all, a, b) {
      if (/^[A-Za-z]{3,}$/.test(a) && /^[A-Za-z]{3,}$/.test(b)) return all;
      var strip = function (x) { return (/^\(.*\)$/.test(x) && x.indexOf(')') === x.length - 1) || /^\[.*\]$/.test(x) ? x.slice(1, -1) : x; };
      return '<span class="mfrac"><span>' + strip(a) + '</span><span>' + strip(b) + '</span></span>';
    };
    h = h.replace(new RegExp(tok + '\\s{0,3}\\/\\s{0,3}' + tok, 'g'), frac); // simple ones first (also inside brackets)
    h = h.replace(new RegExp(opnd + '\\s{0,3}\\/\\s{0,3}' + opnd, 'g'), frac);
    h = h.replace(/\(\s*([a-z])<sub>ij<\/sub>\s*\)/, function (all, v) {
      var c = function (s) { return '<span>' + s + '</span>'; }, e = function (i, j) { return c(v + '<sub>' + i + j + '</sub>'); };
      return all + ' = <span class="mmat" style="grid-template-columns:repeat(4,auto)">' + e(1, 1) + e(1, 2) + c('⋯') + e(1, 'n') + e(2, 1) + e(2, 2) + c('⋯') + e(2, 'n') + c('⋮') + c('⋮') + c('⋱') + c('⋮') + e('m', 1) + e('m', 2) + c('⋯') + e('m', 'n') + '</span>';
    });
    // one formula per line: split on ";" and wide gaps
    h = h.replace(/([\[(])((?:[^\[\]()<;]|<su[bp]>[^<]*<\/su[bp]>)+(?:;(?:[^\[\]()<;]|<su[bp]>[^<]*<\/su[bp]>)+)+)([\])])/g, function (all, o, body, c) {
      var rows = body.split(';').map(function (r) { return r.trim().split(/\s*,\s*|\s+/).filter(Boolean); }); var n = rows[0].length;
      if (rows.length < 2 || n < 1 || rows.some(function (r) { return r.length !== n; })) return all;
      return '<span class="mmat' + (o === '(' ? ' par' : '') + '" style="grid-template-columns:repeat(' + n + ',auto)">' + rows.map(function (r) { return r.map(function (x) { return '<span>' + x + '</span>'; }).join(''); }).join('') + '</span>';
    });
    h = h.replace(/;\s+(?=[^<]*(?:<|$))/g, '<br>').replace(/(?:\s|&nbsp;){3,}/g, '<br>');
    // ⇔ / ⇒ start a new line; a chain a = b = c gets one step per line, like in a handbook
    h = h.replace(/\s*(⇔|⇒|⟺|⟹)\s*/g, '<br>$1 ');
    h = h.split('<br>').map(function (line) {
      if (/\.\.|…|mmat/.test(line)) return line; var parts = line.split(/ = (?![^<]*>)/); if (parts.length < 3) return line;
      return parts[0] + ' = ' + parts[1] + parts.slice(2).map(function (p) { return '<br><span class="meq">= ' + p + '</span>'; }).join('');
    }).join('<br>').replace(/^(<br>)+/, '');
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
  // read an .xlsx ourselves so subscripts/superscripts (rich text) become real <sub>/<sup>
  async function xlsxRows(file) {
    var ls = g('loadScript'), L = g('LIB'); if (ls && L && L.jszip) await ls(L.jszip, 'JSZip');
    if (!window.JSZip) return null;
    var zip = await JSZip.loadAsync(await file.arrayBuffer()), P = new DOMParser();
    var runHtml = function (node) {
      var rs = node.getElementsByTagName('r'); if (!rs.length) { var tt = node.getElementsByTagName('t'); return Array.prototype.map.call(tt, function (x) { return escH(x.textContent); }).join(''); }
      return Array.prototype.map.call(rs, function (r) { var tx = escH(Array.prototype.map.call(r.getElementsByTagName('t'), function (x) { return x.textContent; }).join('')), va = r.getElementsByTagName('vertAlign')[0], v = va && va.getAttribute('val'), bo = r.getElementsByTagName('b')[0];
        if (v === 'subscript') tx = '<sub>' + tx + '</sub>'; else if (v === 'superscript') tx = '<sup>' + tx + '</sup>'; if (bo && bo.getAttribute('val') !== '0' && bo.getAttribute('val') !== 'false') tx = '<b>' + tx + '</b>'; return tx; }).join('');
    };
    var ss = [], sf = zip.file('xl/sharedStrings.xml');
    if (sf) ss = Array.prototype.map.call(P.parseFromString(await sf.async('string'), 'application/xml').getElementsByTagName('si'), runHtml);
    var wbx = P.parseFromString(await zip.file('xl/workbook.xml').async('string'), 'application/xml'), names = Array.prototype.map.call(wbx.getElementsByTagName('sheet'), function (s) { return s.getAttribute('name'); });
    var files = Object.keys(zip.files).filter(function (f) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(f); }).sort(function (x, y) { return parseInt(x.replace(/\D/g, ''), 10) - parseInt(y.replace(/\D/g, ''), 10); });
    var use = files.map(function (f, i) { return { f: f, n: nrm(names[i] || '') }; }).filter(function (s) { return !/^(uitleg|info|lees|instructie)/.test(s.n); });
    var alle = use.filter(function (s) { return /^alle/.test(s.n); }); if (alle.length) use = alle;
    var rows = [];
    for (var k = 0; k < use.length; k++) {
      var sx = P.parseFromString(await zip.file(use[k].f).async('string'), 'application/xml');
      Array.prototype.forEach.call(sx.getElementsByTagName('row'), function (row) {
        var out = [];
        Array.prototype.forEach.call(row.getElementsByTagName('c'), function (c) {
          var col = (c.getAttribute('r') || 'A').replace(/\d+/g, ''), idx = 0; for (var q = 0; q < col.length; q++) idx = idx * 26 + col.charCodeAt(q) - 64; idx--;
          var ty = c.getAttribute('t'), html = '';
          if (ty === 's') html = ss[parseInt((c.getElementsByTagName('v')[0] || {}).textContent, 10)] || '';
          else if (ty === 'inlineStr') html = runHtml(c.getElementsByTagName('is')[0] || c);
          else html = escH((c.getElementsByTagName('v')[0] || {}).textContent || '');
          out[idx] = html;
        });
        for (var z = 0; z < out.length; z++) if (out[z] == null) out[z] = '';
        rows.push(out);
      });
    }
    return rows;
  }
  function plain(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
  async function parseSheet(file) {
    var rows = /\.xlsx$/i.test(file.name) ? await xlsxRows(file).catch(function () { return null; }) : null;
    if (!rows) {
      var ls = g('loadScript'); if (ls) await ls('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
      if (!window.XLSX) throw new Error('Excel lezen lukt hier niet.');
      var wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' }); rows = [];
      wb.SheetNames.filter(function (n) { return !/^(uitleg|info)/i.test(n); }).forEach(function (n) { rows = rows.concat(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }).map(function (r) { return r.map(function (c) { return escH(c); }); })); });
    }
    rows = rows.filter(function (r) { return r.some(function (c) { return plain(c).trim(); }); });
    if (!rows.length) throw new Error('Dit bestand is leeg.');
    var head = rows[0].map(function (c) { return nrm(plain(c)); }), hi = -1, ti = -1, di = -1, vi = -1, ei = -1;
    head.forEach(function (h, i) {
      if (hi < 0 && /^(h|hfst|hoofdstuk|chapter|ch)\b/.test(h)) hi = i;
      else if (ti < 0 && /(begrip|term|woord|vraag|voorkant|naam)/.test(h)) ti = i;
      else if (di < 0 && /(definitie|uitleg|betekenis|antwoord|achterkant|omschrijving|formule)/.test(h)) di = i;
      else if (vi < 0 && /(voorwaarde|let op|wanneer|opmerking)/.test(h)) vi = i;
      else if (ei < 0 && /(voorbeeld|example|visual)/.test(h)) ei = i;
    });
    var hasHead = hi >= 0 || ti >= 0 || di >= 0;
    if (!hasHead) { var n = rows[0].length; if (n >= 3) { ti = 0; di = 1; vi = 2; } else { ti = 0; di = 1; } }
    if (ti < 0) ti = [0, 1, 2].filter(function (i) { return i !== hi && i !== di; })[0];
    if (di < 0) di = [0, 1, 2].filter(function (i) { return i !== hi && i !== ti; })[0];
    var fm = /(?:^|[^a-z])h(\d+)(?:[^0-9]|$)/i.exec(file.name), fileKey = fm ? 'h' + fm[1] : '';
    var isFormula = /formule/i.test(file.name) || head[di] === 'formule';
    var bySec = {}, order = [];
    rows.slice(hasHead ? 1 : 0).forEach(function (r) {
      var term = String(r[ti] || '').trim(), def = String(r[di] || '').trim(), extra = vi >= 0 ? String(r[vi] || '').trim() : '', exm = ei >= 0 ? String(r[ei] || '').trim() : '';
      if (!plain(term).trim() && !plain(def).trim()) return;
      var hv = hi >= 0 ? plain(r[hi] || '') : '', m = /(\d+)/.exec(hv), pm = /^\s*h(\d+)\s*[·:\-–]\s*/i.exec(plain(term));
      if (!m && pm) { m = pm; term = term.replace(/^\s*H\d+\s*[·:\-–]\s*/i, ''); }
      var key = m ? 'h' + m[1] : fileKey || 'alle';
      if (!bySec[key]) { bySec[key] = { key: key, title: key === 'alle' ? 'Alle kaarten' : 'Hoofdstuk ' + key.slice(1), items: [] }; order.push(key); }
      var s = bySec[key];
      s.items.push({ nr: String(s.items.length + 1), q: '<b>' + clean(term) + '</b>', steps: [], ans: clean(def).replace(/\n/g, '<br>'), extra: plain(extra).trim() ? '<p class="pit"><b>Let op</b> ' + clean(extra).replace(/\n/g, '<br>') + '</p>' : '', ex: plain(exm).trim() ? clean(exm).replace(/\n/g, '<br>') : '', fc: 1 });
    });
    order.sort(function (a, b) { return (parseInt(a.slice(1), 10) || 999) - (parseInt(b.slice(1), 10) || 999); });
    if (!order.length) throw new Error('Ik vond geen kaarten in dit bestand.');
    return { name: file.name.replace(/\.(xlsx|xls|csv|ods)$/i, '').replace(/_/g, ' ').slice(0, 120), kind: 'fc', label: isFormula ? 'formules' : 'definities', secs: order.map(function (k) { return bySec[k]; }) };
  }
  // flashcards get their own chapters in the planning ("H2 definities"), so the app spreads them over the days
  function ensureChapters(p) {
    var c = coursesByName(p.course)[0], chs = g('chaptersOf'), nc = g('newChapter'), cm = g('commit'); if (!c || !chs || !nc) return;
    p.map = p.map || {};
    p.secs.forEach(function (s) {
      var title = (s.key === 'alle' ? 'Alle' : s.key.toUpperCase()) + ' ' + (p.label || 'definities'), have = chs(c.id).filter(function (ch) { return nrm(ch.title) === nrm(title); })[0];
      if (!have) nc(c.id, { title: title, unit: 'def', pages: s.items.length, kind: 'theorie', mpu: 1.5 });
      p.map[s.key] = title;
    });
    // put each 'Hn definities' right after the theory of Hn (before its exercises)
    try { if (cm) cm(); } catch (e) {}
    var all = chs(c.id), put = g('put');
    all.forEach(function (ch) { var t = nrm(ch.title); if (!/ (definities|formules)$/.test(t)) return; var key = t.split(' ')[0], base = all.filter(function (x) { var xt = nrm(x.title); return !/ (definities|formules)$/.test(xt) && xt.indexOf('grafiek') < 0 && new RegExp('^' + key + '(\\D|$)').test(xt); })[0]; if (base) ch.order = base.order + (/formules$/.test(t) ? 0.6 : 0.5); });
    all.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (ch, i) { ch.order = i; if (put) put('chapters', ch); });
    try { if (cm) cm(); } catch (e) {}
  }
  function count(p) { return p.secs.reduce(function (n, s) { return n + s.items.length; }, 0); }

  /* ---------- link to the chapters of a course ---------- */
  function coursesByName(name) { var lc = g('listCourses'); return lc ? lc().filter(function (c) { return nrm(c.name) === nrm(name); }) : []; }
  function chapterFor(course, pack, key) {
    var chs = g('chaptersOf'); if (!chs || !course) return null;
    if (pack.map && pack.map[key] != null) { var want = nrm(pack.map[key]); return want ? chs(course.id).filter(function (ch) { return nrm(ch.title) === want; })[0] || null : null; }
    var re = new RegExp('(^|[^a-z0-9])' + key + '([^0-9]|$)');
    return chs(course.id).filter(function (ch) {
      var t = nrm(ch.title);
      return pack.kind === 'fc' ? (t.indexOf(pack.label === 'formules' ? 'formule' : 'defin') >= 0 && re.test(t)) : pack.kind === 'graf' ? (t.indexOf('grafiek') >= 0 && re.test(t)) : re.test(t) && t.indexOf('grafiek') < 0;
    })[0] || null;
  }

  /* ---------- course page block ---------- */
  function courseHtml(c) {
    var mine = packs.filter(function (p) { return nrm(p.course) === nrm(c.name); }), dm = doneMap();
    var list = mine.map(function (p) {
      var rows = p.secs.map(function (s) {
        var d = s.items.filter(function (_, i) { return dm[p.id + ':' + s.key + ':' + i]; }).length, ch = chapterFor(c, p, s.key);
        var opts = (g('chaptersOf') ? g('chaptersOf')(c.id) : []).map(function (x) { return '<option' + (ch && ch.id === x.id ? ' selected' : '') + '>' + escH(x.title) + '</option>'; }).join('');
        return '<div class="up-link"><span class="small muted">hoort bij</span><select class="field" data-up-map="' + p.id + '" data-up-key="' + s.key + '"><option value="">— geen hoofdstuk —</option>' + opts + '</select></div><button class="up-row" data-up-open="' + p.id + '" data-up-sec="' + s.key + '"><span class="grow"><b>' + escH(s.title) + '</b><br><span class="small muted">' +
          d + '/' + s.items.length + ' gedaan</span></span><span class="up-bar"><i style="width:' + Math.round(100 * d / s.items.length) + '%"></i></span><span aria-hidden="true">›</span></button>';
      }).join('');
      return '<div class="stack"><div class="row" style="align-items:center"><b class="grow">' + (p.kind === 'graf' ? '📈 ' : '✏️ ') + escH(p.name) + '</b><span class="muted small">' + count(p) + (p.kind === 'graf' ? ' grafieken' : ' oefeningen') + '</span></div>' + rows +
        '<div class="row">' + (p.srv ? '<span class="tag good">🌐 online voor iedereen</span>' : '<button class="btn sm primary" data-up-pub="' + p.id + '">🌐 Zet online voor iedereen</button>') + '<button class="btn sm" data-up-share="' + p.id + '">Stuur naar vriend</button><button class="btn sm danger" data-up-del="' + p.id + '">Verwijder</button></div></div>';
    }).join('<hr style="border:0;border-top:1px solid var(--line)">');
    return '<section class="card section stack"><div class="section-head"><h2>Oefenen</h2><button class="btn sm" data-up-sendc="' + escH(c.name) + '">📤 Stuur heel dit vak</button></div>' +
      (list || '<p class="muted small">Laad een oefenbundel of grafiekenbundel (HTML-bestand). Je oefent dan per werkcollege of hoofdstuk, één oefening of grafiek tegelijk, met tussenstappen en antwoord.</p>') +
      '<label class="btn sm" style="justify-self:start">📚 Oefenbundel, grafieken of flashcards toevoegen<input type="file" accept=".html,.htm,text/html,.xlsx,.xls,.csv,.ods" multiple hidden data-up-file="' + escH(c.name) + '"></label></section>';
  }

  /* ---------- in the study screen: show the exact exercise or graph that is planned ---------- */
  // flashcards in the study screen: Anki-style, any order, a card only counts after 2× "ken ik" in a row
  var FQ = null;
  function fcQueue(p, s, ch, left) {
    var dm = doneMap(), key = ch.id + ':' + p.id;
    if (!FQ || FQ.key !== key) {
      var todo = []; s.items.forEach(function (_, i) { if (!dm[p.id + ':' + s.key + ':' + i]) todo.push(i); });
      FQ = { key: key, p: p, s: s, queue: todo.slice(0, Math.max(1, left || todo.length)), streak: {}, flip: false, last: -1 };
    }
    if (!FQ.queue.length) return '<div class="up-embed up-card fc fcq"><p class="fc-term">🎉 Alle kaarten voor vandaag gekend!</p></div>';
    var idx = FQ.queue[0], it = s.items[idx], st = FQ.streak[idx] || 0;
    return '<div class="up-embed up-card fc fcq"><p class="small muted">' + FQ.queue.length + ' kaart' + (FQ.queue.length === 1 ? '' : 'en') + ' te gaan · ' + (st ? '1× goed, nog 1× om te kennen' : 'nieuw of nog niet gekend') + '</p>' +
      '<div class="fc-term">' + mathify(it.q) + '</div>' +
      (FQ.flip ? '<div class="up-ans"><div class="up-res">' + mathify(it.ans) + '</div>' + (it.ex ? '<div class="fc-ex"><p class="up-lbl">Voorbeeld</p><div class="up-res">' + mathify(it.ex) + '</div></div>' : '') + (it.extra || '') + '</div><div class="fcq-btns"><button class="btn" data-fcq="no">Nog niet</button><button class="btn primary" data-fcq="yes">Ken ik ✓</button></div>'
        : '<div class="fcq-btns"><button class="btn primary" data-fcq="flip" style="grid-column:1/-1">Draai om</button></div>') + '</div>';
  }
  function fcAnswer(a) {
    if (!FQ) return;
    var dg = g('drawStudy');
    if (a === 'flip') { FQ.flip = true; if (dg) dg(); return; }
    var idx = FQ.queue.shift(); FQ.flip = false;
    if (a === 'yes') {
      FQ.streak[idx] = (FQ.streak[idx] || 0) + 1;
      if (FQ.streak[idx] >= 2) { setDone(FQ.p.id + ':' + FQ.s.key + ':' + idx, true); var A = g('ACT'); if (A && A['study-page']) { A['study-page'](); return; } }
      else FQ.queue.splice(Math.min(3, FQ.queue.length), 0, idx);
    } else { FQ.streak[idx] = 0; FQ.queue.splice(Math.min(2, FQ.queue.length), 0, idx); }
    if (dg) dg();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-fcq]'); if (b) fcAnswer(b.dataset.fcq); });

  function studyHtml(course, ch, n, to) {
    if (!course || !ch) return '';
    for (var i = 0; i < packs.length; i++) {
      var p = packs[i]; if (nrm(p.course) !== nrm(course.name)) continue;
      for (var j = 0; j < p.secs.length; j++) {
        var s = p.secs[j], hit = chapterFor(course, p, s.key); if (!hit || hit.id !== ch.id) continue;
        if (p.kind === 'fc') return fcQueue(p, s, ch, to ? to - n + 1 : 0);
        var it = s.items[n - 1]; if (!it) return '';
        if (it.fc) return '<div class="up-embed up-card fc"><div class="fc-term">' + mathify(it.q) + '</div><details><summary class="btn sm">Draai om</summary><div class="up-ans"><div class="up-res">' + mathify(it.ans) + '</div>' + (it.extra || '') + '</div></details><p class="small muted">Kende je het? Tik op ‘Kaart ' + n + ' klaar’. Nog niet? Lees het en probeer opnieuw.</p></div>';
        return '<div class="up-embed up-card"><div class="up-q"><span class="up-nr">' + escH(it.nr) + '</span><div>' + mathify(it.q) + '</div></div>' +
          (it.steps.length ? '<details><summary class="btn sm">' + (it.graf ? 'Zo teken je het' : 'Toon tussenstappen') + '</summary><ol class="up-steps">' + it.steps.map(function (h, k) { return '<li><span class="up-n">' + (k + 1) + '</span><div>' + mathify(h) + '</div></li>'; }).join('') + '</ol></details>' : '') +
          '<details><summary class="btn sm">' + (it.graf ? 'Toon de grafiek' : 'Toon antwoord') + '</summary><div class="up-ans"><div class="up-res">' + (it.graf ? it.ans : mathify(it.ans)) + '</div>' + (it.extra || '') + '</div></details></div>';
      }
    }
    return '';
  }

  /* ---------- Flashcards tab: the same cards of your courses, one place of truth ---------- */
  function flashHomeHtml() {
    var fc = packs.filter(function (p) { return p.kind === 'fc'; }); if (!fc.length) return '';
    var dm = doneMap(), byCourse = {};
    fc.forEach(function (p) { (byCourse[p.course] = byCourse[p.course] || []).push(p); });
    return Object.keys(byCourse).map(function (cn) {
      var rows = [];
      byCourse[cn].forEach(function (p) { p.secs.forEach(function (s) { rows.push({ p: p, s: s, k: parseInt(s.key.slice(1), 10) || 999 }); }); });
      rows.sort(function (a, b) { return a.k - b.k || (a.p.label === 'formules') - (b.p.label === 'formules'); });
      return '<p class="section-title">📚 ' + escH(cn) + ' · kaarten uit je vak</p><section class="uph">' + rows.map(function (r) {
        var d = r.s.items.filter(function (_, i) { return dm[r.p.id + ':' + r.s.key + ':' + i]; }).length;
        return '<button class="up-row" data-up-open="' + r.p.id + '" data-up-sec="' + r.s.key + '"><span class="grow"><b>' + escH(r.s.key.toUpperCase()) + ' ' + escH(r.p.label || 'kaarten') + '</b><br><span class="small muted">' + d + '/' + r.s.items.length + ' gekend</span></span><span class="up-bar"><i style="width:' + Math.round(100 * d / r.s.items.length) + '%"></i></span><span aria-hidden="true">›</span></button>';
      }).join('') + '</section>';
    }).join('');
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

  /* ---------- send a whole course (chapters, exam, settings); its online bundles and PDFs come along by course name ---------- */
  async function sendCourse(name) {
    var c = coursesByName(name)[0], chs = g('chaptersOf'); if (!c || !chs || !window.UniSend) return;
    var keepC = ['name', 'emoji', 'color', 'exam', 'examTime', 'examType', 'examPlace', 'difficulty', 'priority', 'minPerPage', 'minPerSlide', 'credits', 'prof', 'semester'], keepH = ['title', 'unit', 'pages', 'kind', 'difficulty', 'mpu', 'needSummary', 'srcPages', 'order'];
    var d = { course: {}, chapters: chs(c.id).map(function (h) { var o = {}; keepH.forEach(function (k) { if (h[k] != null && h[k] !== '') o[k] = h[k]; }); return o; }) };
    keepC.forEach(function (k) { if (c[k] != null && c[k] !== '') d.course[k] = c[k]; });
    var local = packs.filter(function (p) { return nrm(p.course) === nrm(c.name) && !p.srv; }).length;
    if (local && !confirm('Let op: ' + local + ' bundel(s) van dit vak staan nog niet online, die krijgt je vriend niet mee. Toch versturen?')) return;
    await UniSend('Vak: ' + c.name + ' (' + d.chapters.length + ' onderdelen)\n⟦UC:' + await gz(JSON.stringify(d)) + '⟧');
  }
  function importCourse() {
    if (location.hash !== '#importcourse') return;
    history.replaceState(null, '', location.pathname);
    var d; try { d = JSON.parse(localStorage.getItem('us-import-course') || 'null'); localStorage.removeItem('us-import-course'); } catch (e) {}
    var nc = g('newCourse'), nh = g('newChapter'), chs = g('chaptersOf'), cm = g('commit'), put = g('put'), vw = g('view');
    if (!d || !d.course || !nc) return;
    var name = String(d.course.name || 'Vak').slice(0, 120), c = coursesByName(name)[0], added = 0;
    if (!c) { var o = {}; Object.keys(d.course).forEach(function (k) { o[k] = typeof d.course[k] === 'string' ? d.course[k].slice(0, 160) : d.course[k]; }); o.name = name; c = nc(o); }
    else if (!c.exam && d.course.exam) { c.exam = d.course.exam; put('courses', c); }
    var have = {}; chs(c.id).forEach(function (h) { have[nrm(h.title)] = 1; });
    (d.chapters || []).slice(0, 300).forEach(function (h) {
      if (!h.title || have[nrm(h.title)]) return;
      nh(c.id, { title: String(h.title).slice(0, 120), unit: ['p', 'dia', 'oef', 'graf', 'def'].indexOf(h.unit) >= 0 ? h.unit : 'p', pages: Math.max(0, h.pages | 0), kind: h.kind === 'oefeningen' ? 'oefeningen' : 'theorie', difficulty: h.difficulty || 3, mpu: h.mpu || null, needSummary: !!h.needSummary, srcPages: h.srcPages | 0 }); added++;
    });
    try { cm(); } catch (e) {}
    if (vw) { vw.tab = 'courses'; vw.course = c.id; }
    rerender(); say(name + ' toegevoegd aan je vakken ✓ (' + added + ' onderdelen). Online bundels worden opgehaald…');
    setTimeout(function () { pull(); if (window.UniPdf) UniPdf.pull(); }, 500);
  }

  /* ---------- chat: show sent items and bundles ---------- */
  var cache = {}, whoOf = {};
  function chatHtml(m, mine, who, time) {
    var r = /⟦(UI|UP|UC):([^⟧]+)⟧/.exec(m.body || ''); if (!r) return null;
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
    if (c.type === 'UC') { var cc = d.course || {}; return '<b>' + (mine ? 'Je stuurde een vak' : '@' + escH(who) + ' stuurt je een vak') + '</b><p>📚 ' + escH(cc.name) + ' · ' + (d.chapters || []).length + ' onderdelen' + (cc.exam ? ' · examen ' + escH(cc.exam) : '') + '</p>' + (mine ? '' : '<p class="small">Met hoofdstukken, oefeningen, grafieken, flashcards en cursus die online staan. Je eigen planning wordt gemaakt.</p><button class="btn primary sm" data-up-takec="' + k + '">Voeg toe aan mijn vakken</button>'); }
    var n = (d.secs || []).reduce(function (a, s) { return a + (s.items || []).length; }, 0);
    return '<b>' + (mine ? 'Je stuurde een oefenpakket' : '@' + escH(who) + ' stuurt je een oefenpakket') + '</b><p>' + (d.kind === 'graf' ? '📈 ' : '✏️ ') + escH(d.name) + ' · ' + n + (d.kind === 'graf' ? ' grafieken' : ' oefeningen') + '</p>' +
      (mine ? '' : '<button class="btn primary sm" data-up-take="' + k + '">Zet in mijn app (vak ' + escH(d.course || '') + ')</button>');
  }
  function fill(k) { Array.prototype.forEach.call(document.querySelectorAll('[data-upm="' + k + '"]'), function (el) { el.innerHTML = inner(k, el.parentNode.classList.contains('mine'), whoOf[k] || ''); }); }
  async function take(k) {
    var d = cache[k] && cache[k].d; if (!d) return;
    var p = { id: 'p' + Date.now().toString(36), name: String(d.name || 'Oefenpakket').slice(0, 120), kind: d.kind === 'graf' ? 'graf' : 'oef', course: String(d.course || 'Wiskunde').slice(0, 120), at: Date.now(),
      secs: (d.secs || []).map(function (s) { return { key: String(s.key).slice(0, 20), title: String(s.title || '').slice(0, 160), items: (s.items || []).map(function (it) { return { nr: String(it.nr || '').slice(0, 20), sub: String(it.sub || '').slice(0, 160), title: it.title, graf: it.graf ? 1 : 0, q: clean(it.q), steps: (it.steps || []).map(clean), ans: clean(it.ans), extra: clean(it.extra || ''), ex: clean(it.ex || '') }; }) }; }) };
    await save(p);
    if (confirm('Toegevoegd aan je app bij het vak ' + p.course + '. Nu openen in Planning?')) location.href = 'planner.html#courses';
  }

  /* ---------- online: bundles for everyone who is signed in ---------- */
  function sbc() { return (g('Sync') && g('Sync').sb) || (g('Cloud') && g('Cloud').sb) || null; }
  async function me() { var s = sbc(); if (!s) return null; var r = await s.auth.getSession(); return r && r.data && r.data.session ? r.data.session.user : null; }
  function fromData(d) {
    return { name: String(d.name || 'Oefenpakket').slice(0, 120), kind: d.kind === 'graf' || d.kind === 'fc' ? d.kind : 'oef', label: d.label === 'formules' ? 'formules' : 'definities', course: String(d.course || 'Wiskunde').slice(0, 120),
      secs: (d.secs || []).map(function (s) { return { key: String(s.key).slice(0, 20), title: String(s.title || '').slice(0, 160), items: (s.items || []).map(function (it) { return { nr: String(it.nr || '').slice(0, 20), sub: String(it.sub || '').slice(0, 160), title: it.title, graf: it.graf ? 1 : 0, fc: it.fc ? 1 : 0, q: clean(it.q), steps: (it.steps || []).map(clean), ans: clean(it.ans), extra: clean(it.extra || ''), ex: clean(it.ex || '') }; }) }; }) };
  }
  async function publish(id) {
    var p = packs.filter(function (x) { return x.id === id; })[0], s = sbc(), u = await me();
    if (!p) return; if (!s || !u) { say('Log eerst in om online te zetten.'); return; }
    say('Online zetten…');
    var srv = p.srv || ('k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    var r = await s.from('study_packs').upsert({ id: srv, course: p.course, name: p.name, kind: p.kind, items: count(p), data: await gz(JSON.stringify({ name: p.name, kind: p.kind, label: p.label, course: p.course, secs: p.secs })), updated_at: new Date().toISOString() });
    if (r.error) { say('Online zetten lukte niet: ' + r.error.message); return; }
    p.srv = srv; p.owner = u.id; p.at = Date.now(); await save(p); say('Online ✓ Iedereen die ingelogd is ziet dit nu bij ' + p.course); rerender();
  }
  var pulling = false;
  async function pull() {
    if (pulling) return; pulling = true;
    try {
      var s = sbc(), u = await me(); if (!s || !u) return;
      var r = await s.from('study_packs').select('id,owner,course,name,kind,items,updated_at').neq('kind', 'pdf'); if (r.error || !r.data) return;
      var changed = false;
      for (var i = 0; i < r.data.length; i++) {
        var row = r.data[i], have = packs.filter(function (x) { return x.srv === row.id; })[0] || packs.filter(function (x) { return !x.srv && x.kind === row.kind && nrm(x.name) === nrm(row.name) && nrm(x.course) === nrm(row.course); })[0], t = Date.parse(row.updated_at) || 0;
        if (have && have.kind === row.kind && (have.at || 0) >= t) continue;
        if (have && have.owner === u.id && have.kind === row.kind) continue;
        var full = await s.from('study_packs').select('data').eq('id', row.id).single(); if (full.error) continue;
        var p = fromData(JSON.parse(await ungz(full.data.data))); if (p.kind === 'fc') ensureChapters(p);
        p.id = have ? have.id : 's-' + row.id; p.srv = row.id; p.owner = row.owner; p.at = t;
        await save(p); changed = true;
      }
      if (changed) rerender();
    } catch (e) { /* offline */ } finally { pulling = false; }
  }
  async function unpublish(p) { var s = sbc(); if (s && p.srv) await s.from('study_packs').delete().eq('id', p.srv); }
  function rerender() { var r = g('render'); if (typeof r === 'function') { var v = g('view'); if (/planner/.test(location.pathname) || (v && v.name === 'home')) r(); } }

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-up],[data-up-open],[data-up-share],[data-up-del],[data-up-take],[data-up-pub],[data-up-takec],[data-up-sendc]'); if (!b) return;
    if (b.dataset.upOpen) return open(b.dataset.upOpen, b.dataset.upSec);
    if (b.dataset.upShare) return sendPack(b.dataset.upShare);
    if (b.dataset.upPub) return publish(b.dataset.upPub);
    if (b.dataset.upSendc) return sendCourse(b.dataset.upSendc);
    if (b.dataset.upTakec) { var cd = cache[b.dataset.upTakec] && cache[b.dataset.upTakec].d; if (cd) { try { localStorage.setItem('us-import-course', JSON.stringify(cd)); } catch (e) {} location.href = 'planner.html#importcourse'; } return; }
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
    var el = e.target;
    if (el.dataset && el.dataset.upMap) { var mp = packs.filter(function (x) { return x.id === el.dataset.upMap; })[0]; if (mp) { mp.map = mp.map || {}; mp.map[el.dataset.upKey] = el.value; await save(mp); say(el.value ? 'Gekoppeld aan ' + el.value + ' ✓' : 'Niet meer gekoppeld'); rerender(); } return; }
    if (!el.dataset || el.dataset.upFile == null || !el.files[0]) return;
    var list = Array.prototype.slice.call(el.files);
    for (var fi = 0; fi < list.length; fi++) try {
      var f = list[fi], isSheet = /\.(xlsx|xls|csv|ods)$/i.test(f.name), p = isSheet ? await parseSheet(f) : parse(await f.text(), f.name.replace(/\.html?$/i, ''));
      p.id = 'p' + Date.now().toString(36) + fi; p.course = el.dataset.upFile; p.at = Date.now();
      if (p.kind === 'fc') ensureChapters(p);
      await save(p); say(count(p) + (p.kind === 'graf' ? ' grafieken' : p.kind === 'fc' ? ' kaarten (per hoofdstuk ingepland)' : ' oefeningen') + ' toegevoegd ✓');
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
  css.textContent += '.mmat{display:inline-grid;gap:.3em .9em;vertical-align:middle;padding:.35em .6em;margin:.3em .25em;border-left:1.8px solid currentColor;border-right:1.8px solid currentColor;text-align:center;line-height:1.4;background:linear-gradient(currentColor,currentColor) left top/.45em 1.8px no-repeat,linear-gradient(currentColor,currentColor) left bottom/.45em 1.8px no-repeat,linear-gradient(currentColor,currentColor) right top/.45em 1.8px no-repeat,linear-gradient(currentColor,currentColor) right bottom/.45em 1.8px no-repeat}.mmat.par{border-radius:.7em;background:none}.fc-ex{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--accent-soft,#e1e7fa)}' +
    '#study .fcq{min-height:46vh;max-height:64vh;display:flex;flex-direction:column;justify-content:safe center;gap:14px}.fcq>*{flex-shrink:0}.fcq-btns{position:sticky;bottom:-20px;padding:10px 0;background:var(--surface,#fff)}.fcq .fc-term{font-size:1.7rem}.fcq-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fcq-btns .btn{min-height:54px;font-size:1.05rem}#study .in:has(.fcq) .s-big,#study .in:has(.fcq) .s-page{display:none}' +
    '.uph{display:grid;gap:8px;margin:0 0 16px}.uph .up-row{display:flex!important;align-items:center;gap:10px;height:auto!important;min-height:58px;width:100%;text-align:left;white-space:normal;line-height:1.3}.uph .grow{flex:1;min-width:0}.uph .small{font-size:.82rem}.uph .muted{opacity:.7}' +
    '#study .up-card.fc{text-align:center}.fc-term{font-size:1.5rem;padding:14px 4px}' +
    '.up-link{display:flex;align-items:center;gap:8px;margin:6px 0 -2px}.up-link select{min-height:34px;padding:4px 8px;font-size:.85rem;flex:1}' +
    '#study .up-embed{max-height:52vh;overflow:auto;text-align:left;margin:10px auto 0;width:min(640px,100%);color:var(--ink,#111)}#study .up-embed details{margin-top:4px}#study .up-embed summary{list-style:none;cursor:pointer;display:inline-flex}' +
    '.meq{display:inline-block;padding-left:1.4em}.fc .up-res,.fc .pit{text-align:left}.up-res .math{line-height:2}' +
    '.mfrac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .12em;line-height:1.15}.mfrac>span:first-child{border-bottom:1px solid currentColor;padding:0 .15em}.mfrac>span{font-size:.92em;padding:0 .1em}' +
    '.math{font-family:"STIX Two Text","Cambria Math","Cambria","Latin Modern Roman","Times New Roman",serif;font-size:1.08em;letter-spacing:.005em}' +
    '.math sub,.math sup{font-size:.68em;line-height:0}.math sup{vertical-align:.55em}.math sub{vertical-align:-.3em}' +
    '.mop{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 .15em;line-height:1}.mop .msym{font-size:1.55em;line-height:1}.mop.lim .msym{font-size:1em;font-style:normal}' +
    '.mop .mup,.mop .mlo{font-size:.62em;line-height:1.15;white-space:nowrap}.up-q .math{font-size:1.06em}.up-steps .math{display:inline}';
  document.head.appendChild(css);
  if (!document.querySelector('link[data-stix]')) { var lf = document.createElement('link'); lf.rel = 'stylesheet'; lf.dataset.stix = 1; lf.href = 'https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap'; document.head.appendChild(lf); }

  window.UniPack = { flashHomeHtml: flashHomeHtml, studyHtml: studyHtml, load: load, courseHtml: courseHtml, chatHtml: chatHtml, open: open, get ready() { return ready; }, get packs() { return packs; } };
  load().then(function () { if (/planner/.test(location.pathname)) importCourse(); if (packs.length) rerender(); setTimeout(pull, 2000); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pull(); });
})();
