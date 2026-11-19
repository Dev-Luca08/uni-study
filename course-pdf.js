/* Uni Study — cursus-PDF per hoofdstuk (made by Luca Cicarelli)
   Load the course PDF once; each theory chapter gets its start page (guessed from the table of contents,
   you can change it). When you press Begin, the study screen shows exactly the planned page.
   Online: put it in the app for everyone who is signed in. */
(function () {
  var files = [], imgs = {}, docs = {};
  function g(n) { try { return (0, eval)(n); } catch (e) { return undefined; } }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nrm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function say(t) { var f = g('toast'); if (typeof f === 'function') f(t, 3500); }
  function rerender() { var r = g('render'); if (typeof r === 'function' && /planner/.test(location.pathname)) r(); }

  /* ---------- storage ---------- */
  function db() { return new Promise(function (res, rej) { var r = indexedDB.open('unistudy-pdf', 1); r.onupgradeneeded = function () { r.result.createObjectStore('pdfs', { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('pdfs', mode), out = fn(t.objectStore('pdfs')); t.oncomplete = function () { res(out && out.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  function load() { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { files = a || []; }).catch(function () {}); }
  function save(f) { return tx('readwrite', function (s) { s.put(f); }).then(load); }
  function remove(id) { delete docs[id]; return tx('readwrite', function (s) { s.delete(id); }).then(load); }

  /* ---------- pdf.js ---------- */
  async function lib() {
    var ls = g('loadScript'), L = g('LIB'); if (!ls || !L) throw new Error('PDF lezen lukt hier niet.');
    await ls(L.pdf, 'pdfjsLib'); var pl = window.pdfjsLib || window['pdfjs-dist/build/pdf']; pl.GlobalWorkerOptions.workerSrc = L.pdfWorker; return pl;
  }
  async function open(f) {
    if (!docs[f.id]) docs[f.id] = lib().then(async function (pl) { return pl.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()), isEvalSupported: false }).promise; });
    return docs[f.id];
  }
  async function outline(pdf) {
    var out = [];
    try {
      var walk = async function (list, depth) {
        for (var i = 0; i < (list || []).length && out.length < 200; i++) {
          var it = list[i], dest = it.dest; if (typeof dest === 'string') dest = await pdf.getDestination(dest);
          if (Array.isArray(dest) && dest[0] != null) { var idx = typeof dest[0] === 'number' ? dest[0] : await pdf.getPageIndex(dest[0]); out.push({ title: String(it.title || '').replace(/\s+/g, ' ').trim().slice(0, 100), from: idx + 1, depth: depth }); }
          if (depth < 1 && it.items && it.items.length) await walk(it.items, depth + 1);
        }
      };
      await walk(await pdf.getOutline(), 0);
    } catch (e) {}
    return out;
  }

  /* ---------- which page starts which chapter ---------- */
  function theory(c) { var chs = g('chaptersOf'); return chs ? chs(c.id).filter(function (ch) { return (!ch.unit || ch.unit === 'p') && ch.kind !== 'oefeningen'; }) : []; }
  function guess(f, ch) {
    var t = nrm(ch.title), m = /\bh(?:oofdstuk)?\s*(\d+)\b/.exec(t) || /^(\d+)\b/.exec(t), n = m ? m[1] : null;
    var words = t.replace(/\bh\d+\b|\d+/g, '').split(/[^a-z]+/).filter(function (w) { return w.length > 3; });
    var best = null, score = 0;
    (f.outline || []).forEach(function (o) {
      var ot = nrm(o.title), s = 0;
      if (n && (new RegExp('^(hoofdstuk|chapter|deel|h)?\\s*' + n + '(\\D|$)').test(ot))) s += o.depth ? 3 : 5;
      words.forEach(function (w) { if (ot.indexOf(w) >= 0) s += 2; });
      if (s > score) { score = s; best = o; }
    });
    return score >= 4 ? best.from : null;
  }
  function startOf(f, ch) { var v = f.map && f.map[nrm(ch.title)]; return v != null ? v : guess(f, ch); }
  function fileFor(c, ch) {
    for (var i = 0; i < files.length; i++) { var f = files[i]; if (nrm(f.course) !== nrm(c.name)) continue; var s = startOf(f, ch); if (s) return { f: f, start: s }; }
    return null;
  }

  /* ---------- course page block ---------- */
  function courseHtml(c) {
    var mine = files.filter(function (f) { return nrm(f.course) === nrm(c.name); }), th = theory(c);
    var list = mine.map(function (f) {
      var rows = th.map(function (ch) {
        var s = startOf(f, ch), set = f.map && f.map[nrm(ch.title)] != null;
        return '<label class="pdf-row"><span class="grow">' + escH(ch.title) + '</span><span class="small muted">' + (s && !set ? 'geraden · ' : '') + 'begint op p.</span><input class="field" type="number" min="1" max="' + f.pages + '" inputmode="numeric" value="' + (s || '') + '" placeholder="?" data-pdf-map="' + f.id + '" data-pdf-ch="' + escH(nrm(ch.title)) + '"></label>';
      }).join('') || '<p class="muted small">Voeg eerst theorie-hoofdstukken toe (in pagina\'s).</p>';
      return '<div class="stack"><div class="row" style="align-items:center"><b class="grow">📄 ' + escH(f.name) + '</b><span class="muted small">' + f.pages + ' p.</span></div>' + rows +
        '<p class="help">Tip: het paginanummer van de PDF zelf (zoals je PDF-lezer het toont), niet het nummer onderaan in het boek.</p>' +
        '<div class="row">' + (f.srv ? '<span class="tag good">🌐 online voor iedereen</span>' : '<button class="btn sm primary" data-pdf-pub="' + f.id + '">🌐 Zet online voor iedereen</button>') + '<button class="btn sm danger" data-pdf-del="' + f.id + '">Verwijder</button></div></div>';
    }).join('<hr style="border:0;border-top:1px solid var(--line)">');
    return '<section class="card section stack"><div class="section-head"><h2>Cursus (PDF)</h2></div>' +
      (list || '<p class="muted small">Laad je cursus-PDF. Bij Begin toont de app dan precies de pagina die gepland staat.</p>') +
      '<label class="btn sm" style="justify-self:start">📄 Cursus-PDF toevoegen<input type="file" accept="application/pdf,.pdf" hidden data-pdf-file="' + escH(c.name) + '"></label></section>';
  }

  /* ---------- study screen ---------- */
  function studyHtml(c, ch, page) {
    if (!c || !ch) return '';
    var hit = fileFor(c, ch); if (!hit) return '';
    var p = hit.start + page - 1, key = hit.f.id + ':' + p;
    if (p > hit.f.pages) return '';
    if (!imgs[key]) render(hit.f, p, key);
    return '<div class="pdf-view" data-pdf-key="' + key + '">' + (imgs[key] && imgs[key] !== 1 ? '<img alt="Pagina ' + p + '" src="' + imgs[key] + '">' : '<p class="small muted">Pagina laden…</p>') + '<p class="small muted">PDF-pagina ' + p + '</p></div>';
  }
  async function render(f, p, key) {
    imgs[key] = 1;
    try {
      var pdf = await open(f), pg = await pdf.getPage(p), w = Math.min(1400, Math.max(700, (window.innerWidth || 800) * (window.devicePixelRatio || 1)));
      var vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: w / vp0.width }), cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      imgs[key] = cv.toDataURL('image/jpeg', .85);
      var keys = Object.keys(imgs); if (keys.length > 12) delete imgs[keys[0]];
    } catch (e) { imgs[key] = ''; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-pdf-key="' + key + '"]'), function (el) { el.innerHTML = imgs[key] ? '<img alt="Pagina ' + p + '" src="' + imgs[key] + '"><p class="small muted">PDF-pagina ' + p + '</p>' : '<p class="small muted">Deze pagina kon ik niet tonen.</p>'; });
    // get the next page ready too
    var next = f.id + ':' + (p + 1); if (!imgs[next] && p < f.pages) setTimeout(function () { render(f, p + 1, next); }, 300);
  }

  /* ---------- online ---------- */
  function sbc() { return (g('Sync') && g('Sync').sb) || (g('Cloud') && g('Cloud').sb) || null; }
  async function me() { var s = sbc(); if (!s) return null; var r = await s.auth.getSession(); return r && r.data && r.data.session ? r.data.session.user : null; }
  async function publish(id) {
    var f = files.filter(function (x) { return x.id === id; })[0], s = sbc(), u = await me(); if (!f) return;
    if (!s || !u) { say('Log eerst in om online te zetten.'); return; }
    say('PDF uploaden… even geduld');
    var srv = f.srv || ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), path = u.id + '/' + srv + '.pdf';
    var up = await s.storage.from('course-pdfs').upload(path, f.blob, { contentType: 'application/pdf', upsert: true });
    if (up.error) { say('Uploaden lukte niet: ' + up.error.message); return; }
    var r = await s.from('study_packs').upsert({ id: srv, course: f.course, name: f.name, kind: 'pdf', items: f.pages, data: JSON.stringify({ path: path, pages: f.pages, outline: f.outline, map: f.map || {} }), updated_at: new Date().toISOString() });
    if (r.error) { say('Online zetten lukte niet: ' + r.error.message); return; }
    f.srv = srv; f.owner = u.id; f.path = path; f.at = Date.now(); await save(f); say('Online ✓ Iedereen die ingelogd is krijgt deze cursus bij ' + f.course); rerender();
  }
  async function pushMap(f) { var s = sbc(), u = await me(); if (!s || !u || !f.srv || f.owner !== u.id) return; await s.from('study_packs').update({ data: JSON.stringify({ path: f.path, pages: f.pages, outline: f.outline, map: f.map || {} }), updated_at: new Date().toISOString() }).eq('id', f.srv); f.at = Date.now(); await save(f); }
  var pulling = false;
  async function pull() {
    if (pulling) return; pulling = true;
    try {
      var s = sbc(), u = await me(); if (!s || !u) return;
      var r = await s.from('study_packs').select('id,owner,course,name,items,updated_at,data').eq('kind', 'pdf'); if (r.error || !r.data) return;
      var changed = false;
      for (var i = 0; i < r.data.length; i++) {
        var row = r.data[i], have = files.filter(function (x) { return x.srv === row.id; })[0], t = Date.parse(row.updated_at) || 0, d = JSON.parse(row.data || '{}');
        if (have && (have.at || 0) >= t) continue;
        if (have && have.owner === u.id) continue;
        var blob = have ? have.blob : null;
        if (!blob) { var dl = await s.storage.from('course-pdfs').download(d.path); if (dl.error) continue; blob = dl.data; }
        await save({ id: have ? have.id : 's-' + row.id, srv: row.id, owner: row.owner, at: t, course: row.course, name: row.name, pages: d.pages || row.items, outline: d.outline || [], map: d.map || {}, path: d.path, blob: blob });
        changed = true;
      }
      if (changed) rerender();
    } catch (e) { /* offline */ } finally { pulling = false; }
  }

  /* ---------- events ---------- */
  document.addEventListener('change', async function (e) {
    var el = e.target; if (!el.dataset) return;
    if (el.dataset.pdfMap) {
      var f = files.filter(function (x) { return x.id === el.dataset.pdfMap; })[0]; if (!f) return;
      f.map = f.map || {}; var v = parseInt(el.value, 10); if (v > 0 && v <= f.pages) f.map[el.dataset.pdfCh] = v; else delete f.map[el.dataset.pdfCh];
      await save(f); pushMap(f); say('Opgeslagen ✓'); return;
    }
    if (el.dataset.pdfFile != null && el.files[0]) {
      var file = el.files[0]; say('PDF lezen…');
      try {
        var tmp = { id: 'f' + Date.now().toString(36), course: el.dataset.pdfFile, name: file.name.replace(/\.pdf$/i, '').slice(0, 120), blob: file, at: Date.now(), map: {} };
        var pdf = await open(tmp); tmp.pages = pdf.numPages; tmp.outline = await outline(pdf);
        await save(tmp); docs[tmp.id] = docs[tmp.id];
        var c = (g('listCourses') ? g('listCourses')() : []).filter(function (x) { return nrm(x.name) === nrm(tmp.course); })[0];
        var found = c ? theory(c).filter(function (ch) { return guess(tmp, ch); }).length : 0;
        say(tmp.pages + ' pagina\'s ✓ ' + (found ? found + ' hoofdstukken gevonden in de inhoudstafel' : 'Vul bij elk hoofdstuk de startpagina in'));
        rerender();
      } catch (err) { say('Deze PDF kon ik niet openen.'); }
      el.value = '';
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pdf-pub],[data-pdf-del]'); if (!b) return;
    if (b.dataset.pdfPub) return publish(b.dataset.pdfPub);
    var f = files.filter(function (x) { return x.id === b.dataset.pdfDel; })[0] || {};
    me().then(async function (u) {
      var mineOnline = f.srv && u && f.owner === u.id;
      if (!confirm(mineOnline ? 'Deze PDF ook online verwijderen, voor iedereen?' : 'Deze PDF van dit toestel verwijderen?')) return;
      if (mineOnline) { var s = sbc(); try { await s.storage.from('course-pdfs').remove([f.path]); await s.from('study_packs').delete().eq('id', f.srv); } catch (x) {} }
      await remove(f.id); rerender();
    });
  });

  var css = document.createElement('style');
  css.textContent = '.pdf-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#ddd)}.pdf-row input{width:74px;min-height:36px;padding:4px 8px;text-align:center}' +
    '#study .pdf-view{margin:10px auto 0;width:min(760px,100%);max-height:56vh;overflow:auto;border-radius:14px;background:#fff;border:1px solid var(--line,#ddd);text-align:center}#study .pdf-view img{display:block;width:100%;height:auto}#study .pdf-view p{margin:6px;color:#667}';
  document.head.appendChild(css);
  window.UniPdf = { courseHtml: courseHtml, studyHtml: studyHtml, load: load, pull: pull };
  load().then(function () { if (files.length) rerender(); setTimeout(pull, 2500); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pull(); });
})();
