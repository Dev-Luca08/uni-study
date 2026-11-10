'use strict';
/* =========================================================
   Uni Study — Planning (screens: today, calendar, courses,
   chapters, uploads, AI prompt). Made by Luca Cicarelli
   ========================================================= */

const app = document.getElementById('app');
const LS_TAB = 'unistudy.tab.v1';
let view = { tab: lsGet(LS_TAB, 'today') || 'today' };
if (!['today', 'cal', 'courses', 'timer', 'stats'].includes(view.tab)) view.tab = 'today';
let sheet = null;
const ACT = {}, CHANGE = {}, FORMS = {}, INPUT = {}, SHEETS = {};

const cc = c => `--cc:${esc((c && c.color) || 'var(--accent)')}`;
const EMOJIS = ['📘', '📗', '📕', '📙', '📓', '📒', '📐', '➗', '🧮', '📊', '📈', '💶', '💰', '🏦', '⚖️', '📜', '🏛️', '🧠', '👥', '🧬', '🧪', '⚛️', '🔬', '🩺', '🫀', '💊', '🏥', '🌍', '🗺️', '💻', '🖥️', '🤖', '📝', '✍️', '🗣️', '💬', '📣', '🇬🇧', '🇫🇷', '🇩🇪', '🇪🇸', '🇳🇱', '🎨', '🎭', '🎵', '📷', '🏗️', '⚙️', '🔧', '🚀', '🌱', '🐾', '🧘', '⚽', '🛒', '🤔', '💡', '⭐', '🔥', '💜', '💗', '🌸', '🍀', '☕', '🎓', '🦄', '🌈', '🍓'];
const SUGGEST = [['Wiskunde', '➗'], ['Statistiek', '📊'], ['Economie', '💶'], ['Boekhouden', '📒'], ['Recht', '⚖️'], ['Psychologie', '🧠'], ['Sociologie', '👥'], ['Biologie', '🧬'], ['Chemie', '🧪'], ['Fysica', '⚛️'], ['Informatica', '💻'], ['Geschiedenis', '🏛️'], ['Filosofie', '🤔'], ['Engels', '🇬🇧'], ['Frans', '🇫🇷'], ['Nederlands', '📝'], ['Marketing', '📣'], ['Communicatie', '💬'], ['Anatomie', '🫀'], ['Aardrijkskunde', '🌍']];
const EXAM_TYPES = ['', 'Schriftelijk', 'Mondeling', 'Schriftelijk + mondeling', 'Open boek', 'Online / pc-examen', 'Meerkeuze', 'Project / paper', 'Permanente evaluatie'];
const SEMESTERS = ['', '1e semester', '2e semester', 'Jaarvak', 'Tweede zit'];
const KINDS = { theorie: 'Theorie', oefeningen: 'Oefeningen', beide: 'Theorie + oefeningen' };

/* ---------- small pieces ---------- */
function examTxt(c) {
  if (!validDay(c.exam)) return 'geen examendatum';
  const n = diffDays(todayKey(), c.exam);
  if (n < 0) return `examen was ${fmtDay(c.exam, 'dm')}`;
  return `examen ${fmtDay(c.exam, 'dm')} · ${n === 0 ? 'vandaag! 🍀' : n === 1 ? 'morgen' : 'over ' + n + ' d'}`;
}
function ring(pct) {
  const r = 36, C = 2 * Math.PI * r;
  return `<div class="ring" role="img" aria-label="${pct}% gedaan"><svg viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="${r}" fill="none" stroke-width="9"/><circle class="val" cx="42" cy="42" r="${r}" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}"/></svg><b>${pct}%</b></div>`;
}
const avgCap = () => sum(cfg().cap) / 7;
const myName = () => cfg().name || (Sync.me && (Sync.me.display_name || Sync.me.username)) || '';
function greeting() { const h = new Date().getHours(); return h < 6 ? 'Goeienacht' : h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeieavond'; }
const sheetHead = title => `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-act="sheet-close" aria-label="Sluiten">✕</button></div>`;
const isTyping = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
const stars = (name, val) => `<div class="stars" role="radiogroup" aria-label="Moeilijkheid">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= val ? 'on' : ''}" data-act="star" data-name="${name}" data-v="${i}" role="radio" aria-checked="${i === val}" aria-label="${i} van 5">★</button>`).join('')}<input type="hidden" name="${name}" value="${val}"></div>`;
const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(label)}</option>`;
const swRow = (name, val) => `<div class="swatches" role="group" aria-label="Kleur">${COLORS.map(col => `<button type="button" class="swatch" style="--sw:${col}" data-act="pick-color" data-name="${name}" data-v="${col}" aria-pressed="${col.toLowerCase() === String(val).toLowerCase()}" aria-label="Kleur ${col}"></button>`).join('')}<input type="color" class="field" name="${name}" value="${esc(val)}" data-input="color-live" aria-label="Eigen kleur"></div>`;

/* =========================================================
   Frame
   ========================================================= */
function header() {
  const st = Sync.status;
  const tip = { local: 'Opgeslagen op dit toestel', offline: 'Offline — opgeslagen op dit toestel', syncing: 'Bezig met synchroniseren…', cloud: 'Gesynchroniseerd met je account', error: Sync.missing ? 'Online opslaan wordt nog ingesteld — alles staat veilig op dit toestel' : 'Synchroniseren lukte niet, ik probeer het opnieuw' }[st] || '';
  const who = Sync.me ? '@' + Sync.me.username : (Sync.user ? 'ingelogd' : 'op dit toestel');
  return `<header class="top">
      <div class="brand"><span class="logo" aria-hidden="true">${icon('logo')}</span><div><b>Uni Study</b><small>Planning · ${esc(who)}</small></div></div>
      <div class="top-actions"><span class="sync-dot ${st}" title="${esc(tip)}" role="img" aria-label="${esc(tip)}"></span>
        <button class="icon-btn" data-act="look" aria-label="Personaliseren" title="Personaliseren">${icon('palette')}</button>
        <button class="icon-btn" data-act="settings" aria-label="Instellingen" title="Instellingen">${icon('gear')}</button></div>
    </header>
    <nav class="app-switch" aria-label="Kies onderdeel" style="grid-template-columns:auto 1fr 1fr"><a href="index.html" aria-label="Menu" style="padding:0 12px">${icon('logo')}</a><span class="on" aria-current="page">${icon('plan')} Planning</span><a href="flashcards.html">${icon('cards')} Flashcards</a></nav>
    ${miniTimer()}`;
}
const TABS = [['today', 'today', 'Vandaag'], ['cal', 'plan', 'Kalender'], ['courses', 'book', 'Vakken'], ['timer', 'timer', 'Timer'], ['stats', 'stats', 'Stats']];
function tabsBar() {
  return `<nav class="tabs" aria-label="Onderdelen"><div class="tabs-in">${TABS.map(([k, i, l]) =>
    `<button class="tab${view.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}"${view.tab === k ? ' aria-current="page"' : ''}><i aria-hidden="true">${icon(i)}</i>${l}${k === 'timer' && Timer.s.running ? '<span class="pulse" aria-label="timer loopt"></span>' : ''}</button>`).join('')}</div></nav>`;
}
function render() {
  const t = view.tab;
  let main;
  try {
    if (t === 'cal') main = renderCal();
    else if (t === 'courses') main = view.course && getCourse(view.course) ? renderCourse(getCourse(view.course)) : renderCourses();
    else if (t === 'timer') main = renderTimer();
    else if (t === 'stats') main = renderStats();
    else main = renderToday();
  } catch (e) {
    console.error(e);
    main = `<div class="card stack"><p>Oei, er ging iets mis bij het tonen van dit scherm.</p><button class="btn sm" data-act="tab" data-tab="today">Terug naar vandaag</button></div>`;
  }
  app.innerHTML = header() + `<main id="main">${main}</main><footer class="footer">Made by <b>Luca Cicarelli</b> · Uni Study</footer>` + tabsBar();
  if (t === 'today') setTimeout(snapshotPlan, 0);
}
function openSheet(kind, data = {}) { sheet = Object.assign({ kind }, data); drawSheet(); const s = document.querySelector('#sheet .sheet'); if (s) s.scrollTop = 0; }
function closeSheet() {
  const back = sheet && sheet.back;
  sheet = back || null; drawSheet();
}
function drawSheet(keepScroll) {
  const host = document.getElementById('sheet');
  if (!sheet) { host.hidden = true; host.innerHTML = ''; document.body.classList.remove('sheet-open'); return; }
  const fn = SHEETS[sheet.kind];
  if (!fn) { sheet = null; return drawSheet(); }
  const old = host.querySelector('.sheet'); const top = old ? old.scrollTop : 0;
  let inner;
  try { inner = fn(); } catch (e) { console.error(e); inner = sheetHead('Oeps') + '<p>Er ging iets mis.</p>'; }
  host.innerHTML = `<div class="sheet-backdrop" data-act="sheet-close"></div><section class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip" aria-hidden="true"></div>${inner}</section>`;
  host.hidden = false; document.body.classList.add('sheet-open');
  if (keepScroll) host.querySelector('.sheet').scrollTop = top;
}
const redrawSheet = () => drawSheet(true);
function harvest(form) {
  const o = {};
  if (!form) return o;
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  }
  return o;
}

/* =========================================================
   Today
   ========================================================= */
function renderToday() {
  const T = todayKey();
  const courses = listCourses();
  if (!courses.length && !Object.values(state.tasks).some(alive)) return renderWelcome();
  const day = planDay(T);
  const items = sortItems(day.items.filter(i => i.type !== 'exam'));
  const total = sum(items, i => i.min), done = sum(items, i => i.min * itemFrac(i));
  const pct = total ? Math.round(done / total * 100) : (items.length ? 100 : 0);
  const units = sum(items.filter(i => i.type === 'study' || i.type === 'prep'), i => i.units);
  const nCourses = new Set(items.map(i => i.course).filter(Boolean)).size;
  const allDone = items.length > 0 && items.every(itemDone);
  const streak = Streak.current();
  const name = myName();
  const headline = !items.length ? (capOf(T) === 0 ? 'Vrije dag 🌴' : 'Niets gepland vandaag') : allDone ? 'Alles gedaan voor vandaag! 🎉' : `Nog ${fmtMin(total - done)} te gaan`;
  const L = cfg().layout;
  return `
    <section class="hello"><h1>${greeting()}${name ? ', ' + esc(name) : ''} ${allDone ? '🥳' : ['☀️', '📚', '✨', '💪', '🌷', '🚀', '🍀'][wday(T)]}</h1><p>${fmtDay(T, 'long')}</p></section>
    <section class="card summary">${ring(pct)}<div class="summary-text"><strong>${headline}</strong>
      <div class="facts">${nCourses ? `<span class="fact">📚 ${plural(nCourses, 'vak', 'vakken')}</span>` : ''}${total ? `<span class="fact">⏱ ${fmtMin(total)}</span>` : ''}${units ? `<span class="fact">📄 ${fmtNum(units)} p.</span>` : ''}<span class="fact">${icon('flame')} ${plural(streak, 'dag', 'dagen')}</span></div></div></section>
    ${examChips()}
    ${listCourses().some(c => validDay(c.exam) && c.exam >= T) ? '<button class="link-btn small" data-act="roster">🎓 Examenrooster delen met vrienden →</button>' : ''}
    ${alertsHtml(todayAlerts())}
    <section class="section">
      <div class="section-head"><h2>Vandaag te doen</h2>
        <div class="seg" role="group" aria-label="Weergave">${[['list', '☰', 'Lijst'], ['cards', '▦', 'Kaartjes'], ['timeline', '🕘', 'Tijdlijn']].map(([k, i, l]) => `<button class="${L === k ? 'on' : ''}" data-act="layout" data-v="${k}" aria-label="${l}" title="${l}">${i}</button>`).join('')}</div></div>
      ${tasksHtml(items)}
      <div class="add-row"><button class="btn" data-act="task-new">+ Eigen taak</button><button class="btn" data-act="tab" data-tab="timer">⏱ Timer starten</button></div>
    </section>
    ${friendsCard()}`;
}

function renderWelcome() {
  const added = new Set(listCourses(true).map(c => norm(c.name)));
  const look = UniLook.get();
  return `<section class="card welcome section">
      <div class="wave">👋</div>
      <h1>Welkom bij Uni Study</h1>
      <p class="muted">Je slimme studieplanner: voeg je vakken en hoofdstukken toe, kies wanneer je ze moet kennen, en ik verdeel alles eerlijk over je dagen — met samenvattingen, herhalingen en je flashcards erbij.</p>
      <label class="fld"><span>Hoe mag ik je noemen?</span><input class="field" name="name" value="${esc(cfg().name)}" placeholder="bv. Sarah" data-change="set-name" autocomplete="given-name"></label>
      <div class="stack"><span class="lbl">Kies je look</span><div class="themes">${['klassiek', 'blossom', 'pastel', 'oceaan', 'bos', 'middernacht'].map(k => themeOpt(k, look)).join('')}</div>
        <button class="link-btn small" data-act="look" style="justify-self:start">Meer thema's, lettertypes en achtergronden →</button></div>
      <div class="stack"><span class="lbl">Voeg je vakken toe</span>
        <div class="suggest">${SUGGEST.map(([n, e]) => `<button class="sug${added.has(norm(n)) ? ' added' : ''}" data-act="sug-add" data-name="${esc(n)}" data-emoji="${e}">${e} ${esc(n)}${added.has(norm(n)) ? ' ✓' : ''}</button>`).join('')}</div>
        <button class="btn primary" data-act="course-new">+ Eigen vak toevoegen</button></div>
      <div class="how">
        <div><b>1. Vakken 📚</b>Met examendatum, prof en kleur.</div>
        <div><b>2. Hoofdstukken 📄</b>Upload je PDF/PowerPoint: ik tel de pagina's.</div>
        <div><b>3. Plannen 🗓️</b>Elke dag zie je wat je moet doen.</div>
        <div><b>4. Herhalen 🔁</b>Met herhaal-momenten en je flashcards.</div>
      </div>
    </section>`;
}

function examChips() {
  const T = todayKey();
  const cs = listCourses().filter(c => validDay(c.exam) && c.exam >= T).sort((a, b) => a.exam < b.exam ? -1 : 1);
  if (!cs.length) return '';
  return `<div class="chips-scroll section" role="list" aria-label="Examens">${cs.map(c => {
    const n = diffDays(T, c.exam);
    return `<button class="exam-chip${n <= 7 ? ' soon' : ''}" style="${cc(c)}" data-act="open-course" data-id="${c.id}" role="listitem"><span class="em">${emo(c)}</span><span><b>${esc(c.name)}</b><small>${n === 0 ? 'vandaag! 🍀' : n === 1 ? 'morgen' : 'over ' + n + ' dagen'} · ${fmtDay(c.exam, 'dm')}${c.examTime ? ' ' + esc(c.examTime) : ''}</small></span></button>`;
  }).join('')}</div>`;
}

function todayAlerts() {
  const T = todayKey(), P = buildPlan(), a = [];
  if (!Sync.user && Sync.ready && Sync.sb && !lsGet('unistudy.hideLogin.v1', false))
    a.push(['', '☁️', 'Log in om je planning op al je toestellen te hebben — met hetzelfde account als Flashcards.', `<a class="btn xs primary" href="flashcards.html#auth">Inloggen</a> <button class="btn xs ghost" data-act="hide-login">Later</button>`]);
  if (capOf(T) === 0) a.push(['good', '🌴', isOff(T) ? 'Vandaag is een vrije dag. Rust hoort er ook bij! 😌' : 'Vandaag heb je geen studietijd ingesteld.', isOff(T) ? `<button class="btn xs" data-act="toggle-off" data-day="${T}">Toch studeren vandaag</button>` : `<button class="btn xs" data-act="settings">Beschikbaarheid aanpassen</button>`]);
  for (const b of backlog()) a.push(['warn', '↪️', `Gisteren bleef er ±${fmtMin(b.left)} ${emo(b.c)} ${esc(b.c.name)} liggen. Geen paniek: ik heb het verdeeld over de komende dagen.`]);
  for (const c of listCourses()) {
    const r = P.info[c.id] || {}, chs = chaptersOf(c.id), nm = `${emo(c)} ${esc(c.name)}`;
    if (r.reason === 'past') {
      if (c.grade == null) a.push(['', '🎓', `Hoe ging je examen ${nm}? Vul je resultaat in en archiveer het vak.`, `<button class="btn xs primary" data-act="grade" data-id="${c.id}">Resultaat invullen</button>`]);
      continue;
    }
    if (!chs.length) { a.push(['', '📚', `${nm} heeft nog geen hoofdstukken. Voeg ze toe of upload je bestanden, dan plan ik het in.`, `<button class="btn xs primary" data-act="open-course" data-id="${c.id}">Hoofdstukken toevoegen</button>`]); continue; }
    if (r.reason === 'noexam') { a.push(['', '📅', `Kies een examendatum voor ${nm} (of een minimum per dag), dan plan ik het in.`, `<button class="btn xs primary" data-act="course-edit" data-id="${c.id}">Datum kiezen</button>`]); continue; }
    if (!chs.some(ch => studyTotal(ch) > 0 || prepTotal(ch) > 0)) { a.push(['', '📄', `Hoeveel pagina's heeft ${nm}? Vul ze in per hoofdstuk of upload je PDF/PowerPoint.`, `<button class="btn xs primary" data-act="open-course" data-id="${c.id}">Pagina's invullen</button>`]); continue; }
    if (!r.feasible && r.minsLeft > 0) {
      const per = r.noTime ? 0 : r.need * avgCap();
      a.push(['bad', '⚠️', r.noTime ? `${nm}: er is geen studietijd meer vóór de deadline. Zet minder buffer-dagen, een latere "kennen tegen"-datum of meer tijd per dag.` : `${nm} wordt krap: je hebt ±${fmtMin(per)} per dag nodig. Geef meer tijd per dag, neem minder buffer-dagen of begin vroeger.`, `<button class="btn xs" data-act="settings">Beschikbaarheid</button> <button class="btn xs" data-act="open-course" data-id="${c.id}">Vak bekijken</button>`]);
    }
    for (const ch of chs) if (ch.needSummary && ch.summaryMade && !(ch.pages > 0))
      a.push(['good', '✍️', `Samenvatting van ${esc(ch.title)} (${esc(c.name)}) is klaar! Hoeveel pagina's is ze?`, `<button class="btn xs primary" data-act="summary-pages" data-id="${ch.id}">Pagina's invullen</button>`]);
  }
  const d = planDay(T);
  if (capOf(T) > 0 && d.min > capOf(T) * 1.15) a.push(['warn', '🥵', `Drukke dag: ${fmtMin(d.min)} gepland voor ${fmtMin(capOf(T))} studietijd. Lukt het niet? Tik op ⋯ bij een taak → "niet vandaag".`]);
  return a;
}
function alertsHtml(a) {
  if (!a.length) return '';
  return `<section class="alerts section">${a.map(([k, i, t, b]) => `<div class="alert ${k}"><span class="ai" aria-hidden="true">${i}</span><div class="grow"><p>${t}</p>${b ? `<div class="row">${b}</div>` : ''}</div></div>`).join('')}</section>`;
}

/* ---------- task rows ---------- */
function itemText(it) {
  const c = getCourse(it.course), ch = getChapter(it.chapter);
  const chT = ch ? esc(ch.title) : 'Hoofdstuk';
  const dk = c ? Flash.courseDecks(c).length : 0;
  switch (it.type) {
    case 'study': return { title: chT, meta: `${rangeText(it.unit, it.from, it.to)} · ${it.units} ${unitShort(it.unit)}${it.behind ? ' · <span class="tag late">achter op schema</span>' : ''}` };
    case 'prep': return { title: `Samenvatting ${chT}`, meta: `cursus ${rangeText('p', it.from, it.to)} · ${it.units} p. samenvatten` };
    case 'review': return { title: `Herhaal ${chT}`, meta: `herhaling ${it.idx + 1}/${it.n}${it.to ? ` · ${it.to} ${unitShort(it.unit)}` : ''}${dk ? ' · + flashcards' : ''}${ch && (ch.hard || []).some(h => !h.ok) ? ' · <span class="tag hard">⚠️ moeilijke stukken</span>' : ''}` };
    case 'final': {
      const names = (it.chapters || []).map(id => getChapter(id)).filter(Boolean).map(x => x.title);
      return { title: `Alles herhalen: ${esc(names.length > 3 ? names.slice(0, 2).join(', ') + ' … ' + names[names.length - 1] : names.join(', '))}`, meta: `eindherhaling${it.lastDay ? ' · laatste dag: alles nog eens overlopen + flashcards' : ''}` };
    }
    case 'cards': return { title: 'Flashcards oefenen', meta: it.future ? `±${it.nNew} nieuwe kaarten + herhalen` : `${it.due} te herhalen · ${it.nNew} nieuw` };
    case 'task': { const t = getTask(it.id); return { title: esc(t ? t.title : 'Taak'), meta: `${c ? (emo(c) + ' ' + esc(c.name)) : 'eigen taak'}${t && t.time ? ' · ' + esc(t.time) : ''}` }; }
    case 'exam': return { title: `Examen ${c ? esc(c.name) : ''}`, meta: [it.time, it.examType, it.place].filter(Boolean).map(esc).join(' · ') };
  }
  return { title: '', meta: '' };
}
function itemHtml(it, opts = {}) {
  const c = getCourse(it.course);
  const done = itemDone(it), frac = itemFrac(it);
  const t = itemText(it);
  const late = it.late ? '<span class="tag late">te laat</span>' : '';
  const decks = it.type === 'cards' && c ? Flash.courseDecks(c) : [];
  const action = it.type === 'cards' && decks.length === 1 ? `<a class="btn xs primary" href="${Flash.link(decks[0].id)}">Oefen</a>`
    : it.type === 'cards' && decks.length ? `<button class="btn xs primary" data-act="item-menu" data-key="${esc(it.key)}">Oefen</button>`
    : (!done && it.type !== 'task' ? `<button class="icon-btn sm" data-act="item-timer" data-key="${esc(it.key)}" aria-label="Start timer" title="Start timer">⏱</button>` : '');
  return `<div class="item${done ? ' done' : ''}" style="${cc(c)}">
      ${opts.time ? `<span class="when">${opts.time}</span>` : ''}
      <button class="check${!done && frac > 0 ? ' part' : ''}" style="--p:${Math.round(frac * 100)}%" data-act="tick" data-key="${esc(it.key)}" aria-pressed="${done}" aria-label="${done ? 'Gedaan — tik om terug te zetten' : 'Afvinken'}">✓</button>
      <button class="item-main" data-act="item-menu" data-key="${esc(it.key)}">
        <div class="item-title">${KIND[it.type].icon} ${t.title}</div>
        <div class="item-meta">${t.meta}${it.min ? ` · ±${fmtMin(it.min)}` : ''} ${late}</div>
      </button>
      ${action}
      <button class="icon-btn sm" data-act="item-menu" data-key="${esc(it.key)}" aria-label="Meer opties">⋯</button>
    </div>`;
}
function groupsOf(items) {
  const map = new Map();
  for (const it of items) { const k = it.course || ''; if (!map.has(k)) map.set(k, []); map.get(k).push(it); }
  return [...map.entries()].map(([cid, its]) => ({ c: getCourse(cid), items: its }));
}
function tasksHtml(items) {
  if (!items.length) return `<div class="card empty"><div class="big">🌤️</div><p class="muted">Niets gepland voor vandaag. ${listCourses().length ? 'Zin om toch iets te doen? Start een timer of herhaal je flashcards.' : ''}</p></div>`;
  const L = cfg().layout;
  if (L === 'timeline') return timelineHtml(items);
  return `<div class="${L === 'cards' ? 'layout-cards' : 'groups'}">${groupsOf(items).map(g => {
    const tot = sum(g.items, i => i.min), dn = sum(g.items, i => i.min * itemFrac(i));
    const pct = tot ? Math.round(dn / tot * 100) : (g.items.every(itemDone) ? 100 : 0);
    const head = g.c
      ? `<div class="group-head"><span class="em">${emo(g.c)}</span><div class="grow"><b>${esc(g.c.name)}</b><small>${examTxt(g.c)}</small></div><div class="bar-mini" role="img" aria-label="${pct}% gedaan"><span style="width:${pct}%"></span></div></div>`
      : `<div class="group-head"><span class="em">✅</span><div class="grow"><b>Eigen taken</b></div></div>`;
    return `<section class="group" style="${g.c ? cc(g.c) : '--cc:var(--accent)'}">${head}<div class="items">${g.items.map(i => itemHtml(i)).join('')}</div></section>`;
  }).join('')}</div>`;
}
function timelineHtml(items) {
  const [h, m] = String(cfg().startTime || '09:00').split(':').map(Number);
  let cur = (h || 9) * 60 + (m || 0);
  const br = int(cfg().breakMin, 10);
  const fmt = x => `${pad2(Math.floor(x / 60) % 24)}:${pad2(Math.round(x % 60))}`;
  const ordered = items.slice().sort((a, b) => {
    const ta = a.type === 'task' && a.time ? a.time : '', tb = b.type === 'task' && b.time ? b.time : '';
    if (ta && tb) return ta < tb ? -1 : 1;
    return 0;
  });
  let out = '';
  ordered.forEach((it, i) => {
    if (it.type === 'task' && it.time) { const [a, b] = it.time.split(':').map(Number); const t = a * 60 + b; if (t > cur) cur = t; }
    out += itemHtml(it, { time: fmt(cur) });
    cur += Math.max(5, Math.round(it.min || 15));
    if (i < ordered.length - 1 && br) { out += `<p class="break">☕ ${br} min pauze</p>`; cur += br; }
  });
  return `<div class="timeline">${out}<p class="help">Klaar rond ${fmt(cur)}. Starttijd en pauzes pas je aan in ⚙️ Instellingen.</p></div>`;
}

/* ---------- ticking things off ---------- */
function findItem(key, day) { return planDay(day || todayKey()).items.find(i => i.key === key) || null; }
function estMin(it, units) {
  const base = it.units ? it.min * (units / it.units) : it.min;
  const timed = sum(logsFor(it.key).filter(l => l.type === 'timer' && l.day === todayKey()), l => l.min);
  return Math.max(0, Math.round((base - timed) * 10) / 10);
}
function clearItemLogs(it, day) {
  let units = 0;
  for (const l of logsFor(it.key).filter(l => l.day === day)) {
    if (l.type === 'timer' && !l.units) continue;
    units += l.units || 0;
    if (l.type === 'timer' || (l.est === false && l.min > 0)) { l.units = 0; l.type = 'timer'; put('logs', l); }
    else drop('logs', l.id);
  }
  return units;
}
function toggleItem(it) {
  const T = todayKey();
  const was = itemDone(it);
  const c = getCourse(it.course), ch = getChapter(it.chapter);
  let after = null;
  if (it.type === 'task') {
    const t = getTask(it.id); if (!t) return;
    t.done = !t.done; t.doneDay = t.done ? T : ''; put('tasks', t);
    if (t.done) addLog({ type: 'task', key: it.key, course: t.course || '', min: num(t.min, 0), est: true });
    else clearItemLogs(it, T);
  } else if (it.type === 'review') {
    if (!ch) return;
    const r = Object.assign({}, ch.reviews || {});
    if (r[it.idx]) { delete r[it.idx]; clearItemLogs(it, T); }
    else { r[it.idx] = T; for (let j = 0; j < it.idx; j++) if (!r[j]) r[j] = T; addLog({ type: 'review', key: it.key, course: it.course, chapter: ch.id, min: estMin(it, 0), est: true }); }
    ch.reviews = r; put('chapters', ch);
  } else if (it.type === 'study' || it.type === 'prep') {
    if (!ch) return;
    if (was) {
      const u = clearItemLogs(it, T);
      if (u) applyProgress(ch, it.type, -u, T);
      else { const pos = itemPos(it); if (pos !== Infinity && pos > it.from - 1) applyProgress(ch, it.type, (it.from - 1) - pos, T); }
    } else {
      const pos = itemPos(it);
      const add = Math.max(0, it.to - Math.max(pos, it.from - 1));
      if (add > 0) {
        addLog({ type: it.type, key: it.key, course: it.course, chapter: ch.id, units: add, unit: it.unit, min: estMin(it, add), est: true });
        const res = applyProgress(ch, it.type, add, T);
        if (res.finishedSummary) after = () => openSheet('summary-pages', { id: ch.id, fresh: true });
        else if (res.known && it.type === 'study') after = () => toast(`🧠 ${ch.title} gekend! Ik heb de herhalingen ingepland.`);
      }
    }
  } else if (it.type === 'final' || it.type === 'cards') {
    if (was) clearItemLogs(it, T);
    else addLog({ type: it.type, key: it.key, course: it.course, min: estMin(it, 0), est: true });
  } else return;
  commit({ day: T });
  const now = itemDone(it);
  if (now && !was) celebrate(c);
  render();
  if (now && !was) {
    const its = planDay(T).items.filter(i => i.type !== 'exam');
    if (its.length > 1 && its.every(itemDone)) { setTimeout(() => { confetti([], 120); toast('Alles gedaan voor vandaag! 🎉 Trots op je!', 4500); }, 250); }
  }
  if (after) after();
}
function setPartial(it, n) {
  const T = todayKey(), ch = getChapter(it.chapter); if (!ch) return;
  n = clamp(int(n), 0, it.units);
  const before = clearItemLogs(it, T);
  if (before) applyProgress(ch, it.type, -before, T);
  if (n > 0) {
    addLog({ type: it.type, key: it.key, course: it.course, chapter: ch.id, units: n, unit: it.unit, min: estMin(it, n), est: true });
    const res = applyProgress(ch, it.type, n, T);
    if (res.finishedSummary) { commit({ day: T }); render(); openSheet('summary-pages', { id: ch.id, fresh: true }); return; }
  }
  commit({ day: T });
  closeSheet(); render();
  toast(n >= it.units ? 'Helemaal gedaan ✓' : `${n} van ${it.units} ${unitWord(it.unit, it.units)} opgeslagen`);
}

/* =========================================================
   Calendar
   ========================================================= */
function renderCal() {
  const T = todayKey(), mode = view.calMode || 'week', anchor = view.anchor || T;
  return `<div class="section-head"><h1>Kalender</h1>
      <div class="seg" role="group" aria-label="Weergave"><button class="${mode === 'week' ? 'on' : ''}" data-act="cal-mode" data-v="week">Week</button><button class="${mode === 'month' ? 'on' : ''}" data-act="cal-mode" data-v="month">Maand</button></div></div>
    <button class="btn block soft" data-act="roster">🎓 Examenroosters — het mijne delen en dat van vrienden bekijken</button>
    ${mode === 'month' ? monthHtml(anchor) : weekHtml(anchor)}
    <div class="legend">${listCourses().map(c => `<span style="${cc(c)}"><i></i>${emo(c)} ${esc(c.name)}</span>`).join('')}</div>
    <p class="help section">Tip: tik op een taak voor opties. Eigen taken kan je op een computer naar een andere dag slepen.</p>`;
}
function weekHtml(anchor) {
  const ws = mondayOf(anchor), we = addDays(ws, 6), T = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  return `<div class="cal-nav section"><button class="icon-btn" data-act="cal-move" data-v="-7" aria-label="Vorige week">‹</button><h2>${fmtDay(ws, 'dm')} – ${fmtDay(we, 'dm')}</h2><button class="icon-btn" data-act="cal-move" data-v="7" aria-label="Volgende week">›</button>${ws > T || we < T ? `<button class="btn xs" data-act="cal-today">Vandaag</button>` : ''}</div>
    <div class="week">${days.map(dayCardHtml).join('')}</div>`;
}
function chipLabel(it) {
  const c = getCourse(it.course), ch = getChapter(it.chapter), e = c ? emo(c) + ' ' : '';
  switch (it.type) {
    case 'study': return `${e}${ch ? esc(ch.title) : ''} · ${rangeText(it.unit, it.from, it.to)}`;
    case 'prep': return `${e}✍️ ${ch ? esc(ch.title) : ''}`;
    case 'review': return `${e}🔁 ${ch ? esc(ch.title) : ''}`;
    case 'final': return `${e}🎯 alles herhalen`;
    case 'cards': return `${e}🗂️ flashcards`;
    case 'task': { const t = getTask(it.id); return `✅ ${esc(t ? t.title : '')}`; }
    case 'exam': return `🎓 ${c ? esc(c.name) : ''}${it.time ? ' ' + esc(it.time) : ''}`;
  }
  return '';
}
function dayCardHtml(d) {
  const T = todayKey(), past = d < T, cap = capOf(d), off = isOff(d) || cap === 0;
  let chips = '', load = 0;
  if (past) {
    const by = {};
    for (const l of logsOn(d)) { const k = l.course || ''; const o = by[k] || (by[k] = { min: 0, units: 0 }); o.min += l.min || 0; if (l.type === 'study' || l.type === 'prep') o.units += l.units || 0; load += l.min || 0; }
    chips = Object.entries(by).map(([cid, o]) => { const c = getCourse(cid); return `<span class="citem done-day" style="${cc(c)}"><span>${c ? (emo(c) + ' ' + esc(c.name)) : '✅ taken'}</span><small>${fmtMin(o.min)}${o.units ? ' · ' + o.units + ' p.' : ''}</small></span>`; }).join('');
    const exam = planDay(d).items.find(i => i.type === 'exam');
    if (exam) chips = `<span class="citem exam" style="${cc(getCourse(exam.course))}">${chipLabel(exam)}</span>` + chips;
  } else {
    const day = planDay(d); load = day.min;
    chips = sortItems(day.items).map(it => {
      const c = getCourse(it.course), done = itemDone(it);
      const drag = it.type === 'task' ? ` draggable="true" data-task="${it.id}"` : '';
      return `<button class="citem${done ? ' done' : ''}${it.type === 'exam' ? ' exam' : ''}" style="${cc(c)}" data-act="cal-item" data-key="${esc(it.key)}" data-day="${d}"${drag}><span>${chipLabel(it)}</span>${it.min ? `<small>${fmtMin(it.min)}</small>` : ''}</button>`;
    }).join('');
  }
  const over = !past && cap > 0 && load > cap * 1.15;
  const weekdayCap = int(cfg().cap[wday(d)], 0);
  return `<section class="day${d === T ? ' today' : ''}${off ? ' off' : ''}${past ? ' past' : ''}" data-day="${d}">
      <div class="day-head"><b>${fmtDay(d)}</b>${d === T ? '<span class="tag acc">vandaag</span>' : ''}${isOff(d) ? '<span class="tag">🌴 vrij</span>' : ''}
        <span class="load">${past ? (load ? fmtMin(load) + ' gestudeerd' : '') : (cap ? `${fmtMin(load)} / ${fmtMin(cap)}` : (load ? fmtMin(load) : ''))}</span></div>
      ${!past && cap ? `<div class="loadbar${over ? ' over' : ''}" role="img" aria-label="${Math.round(load / cap * 100)}% van je tijd"><span style="width:${Math.min(100, load / cap * 100)}%"></span></div>` : ''}
      <div class="day-items">${chips || `<span class="muted small">${past ? '—' : 'Niets gepland'}</span>`}</div>
      ${!past ? `<div class="row"><button class="btn xs ghost" data-act="task-new" data-day="${d}">+ taak</button>${weekdayCap > 0 ? `<button class="btn xs ghost" data-act="toggle-off" data-day="${d}">${isOff(d) ? '↩️ Toch studeren' : '🌴 Vrije dag'}</button>` : ''}</div>` : ''}
    </section>`;
}
function monthHtml(anchor) {
  const a = parseDay(anchor), T = todayKey();
  const first = dkey(new Date(a.getFullYear(), a.getMonth(), 1));
  const start = mondayOf(first);
  let cells = DAYS_SHORT.map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), pd = parseDay(d);
    const other = pd.getMonth() !== a.getMonth();
    let dots = '', ex = '', load = 0;
    if (d >= T) {
      const day = planDay(d);
      const cs = [...new Set(day.items.filter(x => x.type !== 'exam').map(x => x.course))].map(getCourse).filter(Boolean).slice(0, 6);
      dots = cs.map(c => `<i style="${cc(c)}"></i>`).join('');
      const e = day.items.find(x => x.type === 'exam'); if (e) { const c = getCourse(e.course); ex = `<span class="ex" title="Examen ${esc(c ? c.name : '')}">🎓</span>`; }
      load = capOf(d) ? Math.min(1, day.min / capOf(d)) : 0;
    } else {
      load = Math.min(1, sum(logsOn(d), l => l.min) / Math.max(60, avgCap()));
      const e = planDay(d).items.find(x => x.type === 'exam'); if (e) ex = '<span class="ex">🎓</span>';
    }
    if (i >= 35 && other && d > addDays(first, 31)) break;
    cells += `<button class="mcell${other ? ' other' : ''}${d === T ? ' today' : ''}${isOff(d) ? ' off' : ''}" style="--load:${load.toFixed(2)}" data-act="cal-day" data-day="${d}" aria-label="${fmtDay(d, 'long')}"><span class="row between"><b>${pd.getDate()}</b>${ex}</span><span class="dots">${dots}</span></button>`;
  }
  const prev = dkey(new Date(a.getFullYear(), a.getMonth() - 1, 1)), next = dkey(new Date(a.getFullYear(), a.getMonth() + 1, 1));
  return `<div class="cal-nav section"><button class="icon-btn" data-act="cal-goto" data-day="${prev}" aria-label="Vorige maand">‹</button><h2>${MONTHS[a.getMonth()]} ${a.getFullYear()}</h2><button class="icon-btn" data-act="cal-goto" data-day="${next}" aria-label="Volgende maand">›</button></div>
    <div class="month">${cells}</div>`;
}

/* =========================================================
   Courses
   ========================================================= */
function renderCourses() {
  const cs = listCourses(), arch = listCourses(true).filter(c => c.archived);
  const added = new Set(listCourses(true).map(c => norm(c.name)));
  const sugg = SUGGEST.filter(([n]) => !added.has(norm(n)));
  const graded = arch.filter(c => c.grade != null);
  return `<div class="section-head"><h1>Vakken</h1><button class="btn primary sm" data-act="course-new">+ Vak</button></div>
    ${cs.length < 12 && sugg.length ? `<section class="card stack"><p class="kicker">Snel toevoegen</p><div class="suggest">${sugg.slice(0, 14).map(([n, e]) => `<button class="sug" data-act="sug-add" data-name="${esc(n)}" data-emoji="${e}">${e} ${esc(n)}</button>`).join('')}</div><p class="help" style="margin:0">Tik om toe te voegen. Naam, emoji, kleur, prof en examen pas je daarna aan.</p></section>` : ''}
    <div class="courses section">${cs.map(courseCard).join('') || `<div class="card empty"><div class="big">📚</div><p class="muted">Nog geen vakken. Voeg er hierboven een toe!</p></div>`}</div>
    ${arch.length ? `<details class="more section"><summary>Archief (${arch.length})${graded.length ? ' · gemiddelde ' + avgGrade(graded) : ''}</summary><div class="courses section">${arch.map(courseCard).join('')}</div></details>` : ''}`;
}
function fmtGrade(c) { return `${String(c.grade).replace('.', ',')}/${c.gradeMax || 20}`; }
function avgGrade(cs) {
  let w = 0, s = 0;
  for (const c of cs) { const cr = num(c.credits, 0) || 1; s += (num(c.grade) / (num(c.gradeMax, 20) || 20)) * 20 * cr; w += cr; }
  return w ? (s / w).toFixed(1).replace('.', ',') + '/20' : '–';
}
function courseCard(c) {
  const p = courseProgress(c), r = buildPlan().info[c.id] || {}, fs = Flash.courseStats(c);
  const known = p.counts.known + p.counts.reviewed, n = p.chs.length;
  const tag = c.archived ? (c.grade != null ? `<span class="tag good">🎓 ${fmtGrade(c)}</span>` : '<span class="tag">archief</span>')
    : r.reason === 'past' ? '<span class="tag">examen voorbij</span>'
    : !n ? '<span class="tag">nog geen hoofdstukken</span>'
    : r.reason === 'noexam' ? '<span class="tag">geen examendatum</span>'
    : p.pct >= 100 ? '<span class="tag good">✓ alles gekend</span>'
    : r.feasible === false ? '<span class="tag late">⚠ krap</span>'
    : r.late && r.late.length ? '<span class="tag hard">achter op schema</span>' : '<span class="tag good">op schema</span>';
  const sub = [c.prof && '👩‍🏫 ' + esc(c.prof), c.credits && esc(c.credits) + ' sp', examTxt(c)].filter(Boolean).join(' · ');
  return `<button class="course-card" style="${cc(c)}" data-act="open-course" data-id="${c.id}">
      <div class="cc-top"><span class="cc-emoji" aria-hidden="true">${emo(c)}</span><div class="grow"><div class="cc-name">${esc(c.name)}</div><div class="cc-sub">${sub}</div></div><b class="num">${p.pct}%</b></div>
      <div class="cc-body"><div class="pbar" role="img" aria-label="${p.pct}% klaar"><span class="k" style="width:${p.pct}%"></span></div>
        <div class="counts">${tag}<span><b>${known}</b>/${n} gekend</span>${p.counts.summary ? `<span>✍️ <b>${p.counts.summary}</b> samenvatten</span>` : ''}${p.counts.study ? `<span>📖 <b>${p.counts.study}</b> bezig</span>` : ''}${fs.decks ? `<span>🗂️ <b>${fs.pct}%</b> kaarten</span>` : ''}</div></div>
    </button>`;
}

function renderCourse(c) {
  const p = courseProgress(c), r = buildPlan().info[c.id] || {}, T = todayKey();
  const wl = courseWeekLoad(c.id);
  const exam = validDay(c.exam) ? c.exam : '';
  const nDays = exam ? diffDays(T, exam) : null;
  const ms = measured(c.id);
  const diffStars = '★'.repeat(c.difficulty || 3) + '☆'.repeat(5 - (c.difficulty || 3));
  const chips = [
    c.prof && `👩‍🏫 ${esc(c.prof)}`, c.credits && `🎓 ${esc(c.credits)} studiepunten`, c.semester && `🗓️ ${esc(c.semester)}`,
    `<span title="Moeilijkheid">${diffStars}</span>`, c.priority === 'hoog' ? '🔥 hoge prioriteit' : c.priority === 'laag' ? '🐢 lage prioriteit' : '',
    exam && `📝 ${fmtDay(exam, 'long')}${c.examTime ? ' ' + esc(c.examTime) : ''}`, c.examType && esc(c.examType), c.examPlace && `📍 ${esc(c.examPlace)}`
  ].filter(Boolean).map(x => `<span class="fact">${x}</span>`).join('');
  let state1 = '';
  if (r.reason === 'past') state1 = `<div class="alert"><span class="ai">🎓</span><div class="grow"><p>Het examen is voorbij${c.grade != null ? ` — resultaat: <b>${fmtGrade(c)}</b>` : ''}.</p><div class="row"><button class="btn xs primary" data-act="grade" data-id="${c.id}">${c.grade != null ? 'Resultaat aanpassen' : 'Resultaat invullen'}</button></div></div></div>`;
  else if (!p.chs.length) state1 = `<div class="alert"><span class="ai">📚</span><div class="grow"><p>Voeg hieronder je hoofdstukken toe of upload je bestanden.</p></div></div>`;
  else if (r.reason === 'noexam') state1 = `<div class="alert"><span class="ai">📅</span><div class="grow"><p>Kies een examendatum (of een minimum per dag bij Planning-instellingen) zodat ik dit vak kan inplannen.</p><div class="row"><button class="btn xs primary" data-act="course-edit" data-id="${c.id}">Examendatum kiezen</button></div></div></div>`;
  else if (p.pct >= 100) state1 = `<div class="alert good"><span class="ai">🏆</span><div class="grow"><p>Alles gekend! Nu nog herhalen tot het examen.</p></div></div>`;
  else if (!r.feasible) state1 = `<div class="alert bad"><span class="ai">⚠️</span><div class="grow"><p>${r.noTime ? 'Er is geen studietijd meer vóór de deadline.' : `Krap: je hebt ±${fmtMin(r.need * avgCap())} per dag nodig voor dit vak.`} Geef meer tijd per dag, minder buffer-dagen of een latere "kennen tegen"-datum.</p></div></div>`;
  else if (r.finish) state1 = `<div class="alert good"><span class="ai">✅</span><div class="grow"><p>Op schema: klaar met studeren op <b>${fmtDay(r.finish, 'long')}</b>${exam ? `, daarna ${plural(Math.max(0, diffDays(r.finish, exam) - 1), 'dag', 'dagen')} om te herhalen` : ''}. Deze week ±${fmtMin(wl.perDay)} per dag.</p></div></div>`;
  return `
    <div class="top" style="padding-top:0"><button class="btn sm ghost" data-act="courses-back">← Vakken</button><span class="grow"></span><button class="btn sm" data-act="course-edit" data-id="${c.id}">✏️ Bewerken</button></div>
    <section class="course-hero" style="${cc(c)}">
      <div class="ttl"><span class="cc-emoji" aria-hidden="true">${emo(c)}</span><div class="grow"><h1>${esc(c.name)}</h1><p class="muted small">${examTxt(c)}</p></div><div class="big-pct num">${p.pct}%</div></div>
      <div class="pbar" role="img" aria-label="${p.pct}% klaar"><span class="k" style="width:${p.pct}%"></span></div>
      <div class="info-chips">${chips}</div>
      ${exam && exam >= T ? `<div class="row"><a class="btn xs" href="${esc(gcalLink(c))}" target="_blank" rel="noopener">📆 Google Agenda</a><button class="btn xs" data-act="ics-course" data-id="${c.id}">📆 Apple/Outlook (.ics)</button></div>` : ''}
    </section>
    <section class="section stack">
      ${state1}
      <div class="kv">
        <div><small>Gestudeerd</small><b>${fmtNum(p.sD)} / ${fmtNum(p.sT)}</b> p.</div>
        ${p.pT ? `<div><small>Samengevat</small><b>${fmtNum(p.pD)} / ${fmtNum(p.pT)}</b> p.</div>` : ''}
        <div><small>Herhalingen</small><b>${p.revDone} / ${p.revTotal}</b></div>
        <div><small>Nog te doen</small><b>${fmtMin(p.minsLeft)}</b></div>
        ${exam && nDays >= 0 ? `<div><small>Examen over</small><b>${plural(nDays, 'dag', 'dagen')}</b></div>` : ''}
        <div><small>Jouw tempo</small><b>${ms ? (Math.round(ms.mpu * 10) / 10).toString().replace('.', ',') + ' min/p' : (c.minPerPage ?? cfg().minPerPage) + ' min/p'}</b>${ms ? ' <span class="tag good">gemeten</span>' : ''}</div>
      </div>
    </section>
    <section class="card section">
      <div class="section-head"><h2>Hoofdstukken</h2><span class="muted small">${p.chs.length}</span></div>
      <div class="chapters">${p.chs.map((ch, i) => chapterRow(c, ch, i, p.chs.length)).join('') || '<p class="muted small">Nog geen hoofdstukken.</p>'}</div>
      <div class="row section"><button class="btn sm primary" data-act="chapter-new" data-course="${c.id}">+ Hoofdstuk</button><button class="btn sm" data-act="upload" data-course="${c.id}">📄 Bestanden uploaden</button><button class="btn sm" data-act="bulk" data-course="${c.id}">⚡ Meerdere tegelijk</button></div>
    </section>
    ${courseFlashHtml(c)}
    ${coursePlanForm(c)}
    <section class="card section stack"><h2>📝 Notities</h2><textarea class="field" data-change="course-notes" data-id="${c.id}" placeholder="Tips van de prof, examenvragen van vorig jaar, wat je zeker moet kennen …">${esc(c.notes || '')}</textarea></section>
    <section class="section row">${c.archived ? `<button class="btn sm" data-act="unarchive" data-id="${c.id}">↩️ Uit archief halen</button>` : `<button class="btn sm" data-act="grade" data-id="${c.id}">🎓 Resultaat / archiveren</button>`}<button class="btn sm danger" data-act="course-del" data-id="${c.id}">🗑 Vak verwijderen</button></section>`;
}
function chapterRow(c, ch, i, n) {
  const st = chStatus(ch), tot = studyTotal(ch);
  const est = ch.needSummary && !ch.summaryMade && !(ch.pages > 0);
  const pct = st === 'summary' ? (prepTotal(ch) ? (ch.prepDone || 0) / prepTotal(ch) * 100 : 0) : tot ? Math.min(100, (ch.done || 0) / tot * 100) : (isKnown(ch) ? 100 : 0);
  const openHard = (ch.hard || []).filter(h => !h.ok).length;
  const meta = [
    st === 'summary' ? `samenvatten: ${ch.prepDone || 0}/${ch.srcPages || 0} p.` : '',
    tot ? `${ch.done ? `${Math.min(ch.done, tot)}/` : ''}${fmtNum(tot)} ${unitShort(ch.unit)}${est ? ' (geschat)' : ''}` : (prepTotal(ch) ? '' : `<span class="tag hard">aantal ${ch.unit === 'dia' ? "dia's" : "pagina's"}?</span>`),
    ch.kind !== 'theorie' ? KINDS[ch.kind] : '',
    validDay(ch.due) ? `kennen tegen ${fmtDay(ch.due, 'dm')}` : '',
    openHard ? `⚠️ ${openHard}` : '', (ch.decks || []).length ? '🗂️' : '', ch.notes ? '📝' : ''
  ].filter(Boolean).join(' · ');
  return `<div class="chapter" style="${cc(c)}">
      <div class="order-btns"><button class="icon-btn" data-act="ch-move" data-id="${ch.id}" data-v="-1" ${i === 0 ? 'disabled' : ''} aria-label="Omhoog">▲</button><button class="icon-btn" data-act="ch-move" data-id="${ch.id}" data-v="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Omlaag">▼</button></div>
      <button class="main" data-act="chapter" data-id="${ch.id}"><div class="row"><span class="t">${esc(ch.title)}</span><span class="status st-${st}">${STATUS[st][1]} ${STATUS[st][0]}</span></div><div class="m">${meta}</div><div class="mini"><span style="width:${pct}%"></span></div></button>
    </div>`;
}
function courseFlashHtml(c) {
  const ds = Flash.courseDecks(c), fs = Flash.courseStats(c), sugg = Flash.suggest(c);
  const rows = ds.map(d => {
    const s = Flash.stats(d);
    return `<div class="deck-row"><div class="grow"><b>${esc(d.name)}</b><span class="small muted">${s.kn}/${s.total} gekend · ${s.due} te herhalen</span><div class="dbar"><span class="k" style="width:${s.total ? s.kn / s.total * 100 : 0}%"></span><span class="l" style="width:${s.total ? s.lr / s.total * 100 : 0}%"></span></div></div><a class="btn xs primary" href="${Flash.link(d.id)}">Oefen</a><button class="icon-btn sm" data-act="deck-unlink" data-course="${c.id}" data-deck="${esc(d.id)}" aria-label="Ontkoppelen" title="Ontkoppelen">✕</button></div>`;
  }).join('');
  return `<section class="card section stack">
      <div class="section-head" style="margin:0"><h2>🗂️ Flashcards</h2>${fs.decks ? `<span class="tag ${fs.pct >= 80 ? 'good' : 'acc'}">${fs.pct}% gekend</span>` : ''}</div>
      ${rows ? `<div class="decks">${rows}</div>` : '<p class="muted small">Nog geen flashcards gekoppeld. Koppel een set, of laat AI er een maken van je samenvatting.</p>'}
      ${deckAdvice(c)}
      ${sugg.length ? `<div class="alert"><span class="ai">💡</span><div class="grow"><p>Deze sets lijken bij ${esc(c.name)} te horen:</p><div class="row">${sugg.map(d => `<button class="btn xs" data-act="deck-link" data-course="${c.id}" data-deck="${esc(d.id)}">+ ${esc(d.name)}</button>`).join('')}</div></div></div>` : ''}
      <div class="row"><button class="btn sm primary" data-act="prompt" data-course="${c.id}">🤖 Flashcards maken met AI</button><button class="btn sm" data-act="deck-pick" data-course="${c.id}">🔗 Set koppelen</button><a class="btn sm" href="flashcards.html#new">+ Nieuwe set</a></div>
    </section>`;
}
function deckAdvice(c) {
  const fs = Flash.courseStats(c);
  if (!fs.decks || !fs.total) return '';
  const T = todayKey(), r = buildPlan().info[c.id] || {}, lines = [];
  const exam = validDay(c.exam) && c.exam >= T ? c.exam : '';
  const left = fs.total - fs.kn;
  if (fs.pct >= 95) lines.push(['🏆', `Je kent ${fs.pct}% van je kaarten — top! Blijf dagelijks even herhalen, dan zit het er vast in.`]);
  else if (fs.pct >= 70) lines.push(['💪', `Al ${fs.pct}% gekend, nog ${plural(left, 'kaart', 'kaarten')} te gaan. Bijna!`]);
  else if (fs.pct >= 30) lines.push(['📈', `${fs.pct}% gekend — goed op weg! Nog ${plural(left, 'kaart', 'kaarten')}.`]);
  else lines.push(['🌱', `${fs.kn} van ${fs.total} kaarten gekend. Elke dag een beetje doet wonderen.`]);
  if (fs.due) lines.push(['🔁', `Vandaag ${plural(fs.due, 'kaart', 'kaarten')} om te herhalen.`]);
  if (exam && fs.nw && r.cardsPerDay) {
    lines.push(['🎯', `Leer ±${r.cardsPerDay} nieuwe kaarten per dag om alles te kennen vóór je examen (${fmtDay(exam, 'dm')}).`]);
    if (fs.minLimit !== Infinity && fs.minLimit < r.cardsPerDay) lines.push(['⚙️', `Tip: zet in Flashcards bij je set "nieuwe kaarten per dag" op minstens ${r.cardsPerDay} (nu ${fs.minLimit}).`]);
  }
  let now = 0, then = 0, has = false, oldest = T;
  for (const id of Flash.courseDeckIds(c)) {
    const d = Flash.get(id); if (!d) continue;
    const k = knownOn(id, addDays(T, -7));
    const snap = state.deckSnaps[id];
    if (snap && snap.d) { const ks = Object.keys(snap.d).sort(); if (ks[0] && ks[0] < oldest) oldest = ks[0]; }
    if (k != null) { has = true; now += Flash.stats(d).kn; then += k; }
  }
  if (has && now > then) lines.push(['🚀', `+${now - then} kaarten gekend sinds vorige week. Lekker bezig!`]);
  else if (has && now <= then && diffDays(oldest, T) >= 6 && left > 0) lines.push(['😉', 'Deze week geen nieuwe kaarten bijgeleerd — even inhalen?']);
  return `<div class="advice">${lines.map(([i, t]) => `<p><span aria-hidden="true">${i}</span><span>${t}</span></p>`).join('')}</div>`;
}
function coursePlanForm(c) {
  const ms = measured(c.id);
  const g = cfg();
  return `<details class="card section more"${view.planOpen ? ' open' : ''}>
      <summary>⚙️ Planning-instellingen voor dit vak</summary>
      <form class="form section" data-form="course-plan" data-id="${c.id}">
        <div class="fgrid">
          <label class="fld"><span>Beginnen op</span><input class="field" type="date" name="start" value="${esc(c.start || '')}"><span class="help">Leeg = vandaag</span></label>
          <label class="fld"><span>Buffer vóór examen (dagen)</span><input class="field" type="number" min="0" max="30" name="buffer" value="${c.buffer ?? ''}" placeholder="${g.buffer}" inputmode="numeric"><span class="help">Alleen herhalen, niets nieuws</span></label>
        </div>
        <label class="fld"><span>Hoe wil je plannen?</span><select class="field" name="mode" data-change="mode-show">
          ${opt('auto', 'Slim: verdeeld volgens de deadlines', c.mode)}${opt('pages', "Minstens X pagina's per dag", c.mode)}${opt('minutes', 'Minstens X minuten per dag', c.mode)}${opt('task', 'Vaste taken: telkens hele hoofdstukken', c.mode)}</select></label>
        <div class="fgrid" data-mode-fields>
          <label class="fld" ${c.mode === 'pages' ? '' : 'hidden'} data-for="pages"><span>Minstens pagina's per dag</span><input class="field" type="number" min="0" name="minPages" value="${c.minPages || ''}" inputmode="numeric"></label>
          <label class="fld" ${c.mode === 'minutes' ? '' : 'hidden'} data-for="minutes"><span>Minstens minuten per dag</span><input class="field" type="number" min="0" step="5" name="minMinutes" value="${c.minMinutes || ''}" inputmode="numeric"></label>
        </div>
        <div class="fgrid three">
          <label class="fld"><span>Min per pagina</span><input class="field" type="number" min="1" step="0.5" name="minPerPage" value="${c.minPerPage ?? ''}" placeholder="${g.minPerPage}" inputmode="decimal"></label>
          <label class="fld"><span>Min per dia</span><input class="field" type="number" min="0.5" step="0.5" name="minPerSlide" value="${c.minPerSlide ?? ''}" placeholder="${g.minPerSlide}" inputmode="decimal"></label>
          <label class="fld"><span>Samenvatten min/p</span><input class="field" type="number" min="1" step="0.5" name="prepMinPerPage" value="${c.prepMinPerPage ?? ''}" placeholder="${g.prepMinPerPage}" inputmode="decimal"></label>
        </div>
        <label class="check-row"><input type="checkbox" name="useMeasured" ${c.useMeasured !== false ? 'checked' : ''}> Gebruik mijn echte tempo als de app dat gemeten heeft${ms ? ` (nu ${(Math.round(ms.mpu * 10) / 10).toString().replace('.', ',')} min/p)` : ''}</label>
        <label class="fld"><span>Herhaalschema (dagen na "gekend")</span><input class="field" name="reviewOffsets" value="${Array.isArray(c.reviewOffsets) ? c.reviewOffsets.join(', ') : ''}" placeholder="${g.reviewOffsets.join(', ')} (standaard)"><span class="help">bv. 1, 3, 7, 14 — leeg = standaard uit Instellingen, "0" = geen herhalingen</span></label>
        ${(c.skips || []).filter(d => d >= todayKey()).length ? `<div class="stack"><span class="lbl">Dagen zonder dit vak</span><div class="chips-pick">${(c.skips || []).filter(d => d >= todayKey()).sort().map(d => `<button type="button" data-act="unskip" data-id="${c.id}" data-day="${d}" aria-pressed="false">${fmtDay(d)} ✕</button>`).join('')}</div></div>` : ''}
        <button class="btn primary">Opslaan</button>
      </form>
    </details>`;
}

/* ---------- AI prompt for flashcards ---------- */
function aiPrompt(c, ch) {
  const what = ch ? `het hoofdstuk "${ch.title}" van het vak "${c.name}"` : `het vak "${c.name}"`;
  return `Je bent een expert in het maken van flashcards voor universitaire examens.

In bijlage zit mijn samenvatting van ${what}. Zet ALLE leerstof uit dit document om naar flashcards. Er mag NIETS ontbreken: elke definitie, elk begrip, elke opsomming, formule, stelling, regel, methode, voorbeeld, jaartal, naam, oorzaak en gevolg, voor- en nadeel, elk verschil of elke vergelijking, elk stappenplan en de inhoud van elk schema, elke tabel en elke figuur moet in minstens één kaart terechtkomen.

REGELS VOOR DE KAARTEN
1. Eén kaart = één duidelijk afgebakend weetje. Splits lange stukken op in meerdere kaarten.
2. Vraag: kort en ondubbelzinnig, zodat er maar één juist antwoord is (bv. "Wat is …?", "Noem de 4 kenmerken van …", "Wat is het verschil tussen … en …?", "Waarom …?", "Hoe verloopt …?").
3. Antwoord: volledig maar beknopt, met de vaktermen en begrippen letterlijk zoals in mijn samenvatting. Opsommingen als genummerde lijst in één cel, elk punt op een nieuwe regel.
4. Formules: schrijf ze uit in tekst (bv. x^2, √x, Σ, ≤) en leg kort uit wat elk symbool betekent.
5. Schema's, tabellen en figuren: zet ze om in vragen (bv. één kaart per rij, per stap of per onderdeel).
6. Taal: dezelfde taal als mijn samenvatting.
7. Geen dubbele kaarten en niets toevoegen wat niet in mijn samenvatting staat.

WERKWIJZE
- Werk mijn samenvatting van begin tot einde af, sectie per sectie, in dezelfde volgorde.
- Controleer jezelf op het einde: overloop elke titel, tussentitel en alinea van mijn samenvatting en kijk of er kaarten voor bestaan. Voeg toe wat ontbreekt.
- Is de samenvatting te lang voor één antwoord? Maak het bestand dan in delen en vraag "Zal ik verdergaan met deel 2?". Ga NOOIT samenvatten of inkorten om tijd te winnen.

UITVOER
Maak één Excel-bestand (.xlsx) om te downloaden met precies 3 kolommen en deze kopjes in rij 1:
Vraag | Antwoord | Extra
- Vraag = de voorkant van de kaart
- Antwoord = de achterkant van de kaart
- Extra = (mag leeg) een voorbeeld, ezelsbruggetje of de titel van de sectie waar het in mijn samenvatting staat
Geen lege rijen, geen samengevoegde cellen, maar één tabblad.
Kun je geen bestand maken? Geef dan exact dezelfde tabel als tekst, met een TAB tussen de kolommen en één kaart per regel, zodat ik alles kan kopiëren en plakken.

Geef na het bestand een korte telling: hoeveel kaarten per sectie, en bevestig dat je elke sectie van mijn samenvatting gecontroleerd hebt.`;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (er) { ok = false; }
    ta.remove(); return ok;
  }
}

/* =========================================================
   Sheets (bottom panels)
   ========================================================= */
SHEETS.item = () => {
  const T = todayKey(), day = sheet.day || T;
  const it = findItem(sheet.key, day);
  if (!it) return sheetHead('Taak') + '<p class="muted">Deze taak staat niet meer in de planning.</p>';
  const c = getCourse(it.course), ch = getChapter(it.chapter), isToday = day === T, done = itemDone(it), t = itemText(it);
  let h = sheetHead(`${KIND[it.type].icon} ${t.title}`) + `<p class="muted">${c ? (emo(c) + ' ' + esc(c.name)) + ' · ' : ''}${t.meta}${it.min ? ' · ±' + fmtMin(it.min) : ''}${!isToday ? ' · ' + fmtDay(day, 'long') : ''}</p>`;
  h += '<div class="menu section">';
  if (it.type === 'exam') {
    if (c) h += `<a href="${esc(gcalLink(c))}" target="_blank" rel="noopener"><i>📆</i><span>Zet in Google Agenda</span></a><button data-act="ics-course" data-id="${c.id}"><i>📆</i><span>Download voor Apple/Outlook (.ics)</span></button><button data-act="open-course" data-id="${c.id}"><i>${emo(c)}</i><span>Open ${esc(c.name)}</span></button>`;
    return h + '</div>';
  }
  if (isToday || it.type === 'task' || it.type === 'review') h += `<button data-act="item-tick"><i>${done ? '↩️' : '✅'}</i><span>${done ? 'Toch nog niet gedaan' : 'Helemaal gedaan'}</span></button>`;
  if (isToday && (it.type === 'study' || it.type === 'prep')) {
    h += `<form class="card flat form" data-form="item-partial"><label class="fld"><span>Gedeeltelijk gedaan? Hoeveel ${unitWord(it.unit, 2)} van de ${it.units}?</span>
      <div class="row"><input class="field grow" type="number" name="n" min="0" max="${it.units}" value="${Math.min(it.units, itemUnitsDone(it))}" inputmode="numeric" style="max-width:140px"><button class="btn primary sm">Opslaan</button></div></label></form>`;
  }
  if (isToday && it.type !== 'task' && it.type !== 'cards') h += `<button data-act="item-timer"><i>⏱</i><span>Start de timer hiervoor<small>De tijd telt mee in je statistieken${ch ? ' en je tempo' : ''}</small></span></button>`;
  if (c && (it.type === 'cards' || it.type === 'review')) for (const d of Flash.courseDecks(c)) { const s = Flash.stats(d); h += `<a href="${Flash.link(d.id)}"><i>🗂️</i><span>Oefen ${esc(d.name)}<small>${s.due} te herhalen · ${s.nw} nieuw · ${s.pct}% gekend</small></span></a>`; }
  if (ch) h += `<button data-act="chapter" data-id="${ch.id}"><i>📖</i><span>Open ${esc(ch.title)}<small>Pagina's, status, moeilijke stukken, notities</small></span></button>`;
  if (c && it.type !== 'task' && day >= T && !(c.skips || []).includes(day)) h += `<button data-act="skip-day"><i>🙅</i><span>${isToday ? 'Vandaag' : fmtDay(day)} niet voor ${esc(c.name)}<small>Ik verdeel het over je andere dagen</small></span></button>`;
  if (it.type === 'task') h += `<button data-act="task-edit" data-id="${it.id}"><i>✏️</i><span>Bewerken / verplaatsen</span></button><button data-act="task-tomorrow" data-id="${it.id}"><i>➡️</i><span>Naar morgen</span></button><button data-act="task-del" data-id="${it.id}"><i>🗑</i><span>Verwijderen</span></button>`;
  return h + '</div>';
};

SHEETS.course = () => {
  const c = sheet.id ? getCourse(sheet.id) : null;
  const d = sheet.draft || c || { name: '', emoji: sheet.emoji || '📘', color: COLORS[listCourses(true).length % COLORS.length], difficulty: 3, priority: 'normaal' };
  return sheetHead(c ? 'Vak bewerken' : 'Nieuw vak') + `
    <form class="form" data-form="course">
      <div class="row" style="gap:12px"><span class="cc-emoji" id="emoji-prev" style="--cc:${esc(d.color)};width:58px;height:58px;font-size:2rem">${emo(d)}</span>
        <label class="fld grow"><span>Naam van het vak</span><input class="field" name="name" value="${esc(d.name)}" required maxlength="60" placeholder="bv. Wiskunde 1" autofocus></label></div>
      <div class="fld"><span class="lbl">Icoon of emoji</span><div class="emoji-grid" style="max-height:none">${UniIcon.list.map(n => `<button type="button" data-act="pick-emoji" data-v="i:${n}" aria-pressed="${d.emoji === 'i:' + n}" aria-label="${UniIcon.label(n)}" title="${UniIcon.label(n)}">${icon(n)}</button>`).join('')}</div><div class="emoji-grid">${EMOJIS.map(e => `<button type="button" data-act="pick-emoji" data-v="${e}" aria-pressed="${e === d.emoji}">${e}</button>`).join('')}</div>
        <label class="row small muted">Of typ je eigen emoji: <input class="field" value="${/^i:/.test(d.emoji) ? '' : esc(d.emoji)}" maxlength="8" style="width:80px" data-input="emoji-live" aria-label="Eigen emoji"><input type="hidden" name="emoji" value="${esc(d.emoji)}"></label></div>
      <div class="fld"><span class="lbl">Kleur</span>${swRow('color', d.color)}</div>
      <div class="fgrid">
        <label class="fld"><span>Prof</span><input class="field" name="prof" value="${esc(d.prof || '')}" maxlength="60" placeholder="bv. Prof. Peeters"></label>
        <label class="fld"><span>Studiepunten</span><input class="field" type="number" name="credits" value="${esc(d.credits || '')}" min="0" max="60" inputmode="numeric"></label>
        <label class="fld"><span>Semester</span><select class="field" name="semester">${SEMESTERS.map(s => opt(s, s || '—', d.semester || '')).join('')}</select></label>
        <div class="fld"><span>Prioriteit</span><div class="seg" role="radiogroup">${['laag', 'normaal', 'hoog'].map(p => `<label><input type="radio" name="priority" value="${p}" ${(d.priority || 'normaal') === p ? 'checked' : ''}><span>${p === 'laag' ? '🐢 laag' : p === 'hoog' ? '🔥 hoog' : 'normaal'}</span></label>`).join('')}</div></div>
      </div>
      <div class="fld"><span>Moeilijkheid</span>${stars('difficulty', d.difficulty || 3)}</div>
      <div class="card flat stack"><span class="lbl">📝 Examen</span>
        <div class="fgrid keep"><label class="fld"><span>Datum</span><input class="field" type="date" name="exam" value="${esc(d.exam || '')}"></label><label class="fld"><span>Uur</span><input class="field" type="time" name="examTime" value="${esc(d.examTime || '')}"></label></div>
        <div class="fgrid"><label class="fld"><span>Soort examen</span><select class="field" name="examType">${EXAM_TYPES.map(s => opt(s, s || '—', d.examType || '')).join('')}</select></label>
        <label class="fld"><span>Locatie</span><input class="field" name="examPlace" value="${esc(d.examPlace || '')}" maxlength="80" placeholder="bv. Aula A"></label></div>
      </div>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">${c ? 'Opslaan' : 'Vak toevoegen'}</button></div>
    </form>`;
};

SHEETS.chapter = () => {
  const ch = getChapter(sheet.id); if (!ch) return sheetHead('Hoofdstuk') + '<p>Niet gevonden.</p>';
  const c = getCourse(ch.course), st = chStatus(ch), tot = studyTotal(ch);
  const offs = c ? reviewOffsets(c) : [];
  const revList = ch.knownDay && offs.length ? `<div class="stack"><span class="lbl">🔁 Herhalingen</span><div class="list-edit">${offs.map((o, i) => { const dd = addDays(ch.knownDay, o); const dn = (ch.reviews || {})[i]; return `<div class="le${dn ? ' ok' : ''}"><span>Herhaling ${i + 1}: ${fmtDay(dd)} ${dn ? `· gedaan ${fmtDay(dn, 'dm')}` : ''}</span><button type="button" class="btn xs" data-act="rev-toggle" data-id="${ch.id}" data-i="${i}">${dn ? '↩️' : '✓'}</button></div>`; }).join('')}</div></div>` : '';
  const decks = (ch.decks || []).map(id => Flash.get(id)).filter(Boolean);
  return sheetHead('📖 ' + esc(ch.title)) + `
    <form class="form" data-form="chapter" id="ch-form">
      <label class="fld"><span>Titel</span><input class="field" name="title" value="${esc(ch.title)}" maxlength="90" required></label>
      <div class="fgrid">
        <label class="fld"><span>Status</span><select class="field" name="status">${Object.entries(STATUS).map(([k, [l, i]]) => opt(k, i + ' ' + l, st)).join('')}</select></label>
        <label class="fld"><span>Kennen tegen</span><input class="field" type="date" name="due" value="${esc(ch.due || '')}"><span class="help">Leeg = ${c && validDay(c.exam) ? 'automatisch vóór het examen' : 'geen deadline'}</span></label>
        <label class="fld"><span>Soort</span><select class="field" name="kind">${Object.entries(KINDS).map(([k, l]) => opt(k, l, ch.kind)).join('')}</select></label>
        <div class="fld"><span>Studeer je uit</span><div class="seg" role="radiogroup">${[['p', "📄 pagina's"], ['dia', "📊 dia's"]].map(([v, l]) => `<label><input type="radio" name="unit" value="${v}" ${ch.unit === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      </div>
      <div class="fld"><span>Moeilijkheid</span>${stars('difficulty', ch.difficulty || 3)}</div>
      <div class="toggle-row card flat"><div><b>Moet je eerst nog een samenvatting maken?</b><p class="help">Dan plan ik eerst tijd in om samen te vatten, en daarna om te studeren.</p></div><span class="switch"><input type="checkbox" name="needSummary" ${ch.needSummary ? 'checked' : ''} data-change="need-summary" aria-label="Samenvatting nodig"><i></i></span></div>
      <div class="fgrid" data-sum="yes" ${ch.needSummary ? '' : 'hidden'}>
        <label class="fld"><span>Pagina's cursus om samen te vatten</span><input class="field" type="number" min="0" name="srcPages" value="${ch.srcPages || ''}" inputmode="numeric"></label>
        <label class="fld"><span>Al samengevat</span><input class="field" type="number" min="0" name="prepDone" value="${ch.prepDone || 0}" inputmode="numeric"></label>
        <label class="fld"><span>Pagina's samenvatting</span><input class="field" type="number" min="0" name="sumPages" value="${ch.pages || ''}" placeholder="nog niet bekend" inputmode="numeric"><span class="help">Leeg = ik schat ±${cfg().summaryRatio}% van de cursus</span></label>
      </div>
      <div class="fgrid" data-sum="no">
        <label class="fld" data-sum-hide ${ch.needSummary ? 'hidden' : ''}><span>Aantal ${ch.unit === 'dia' ? "dia's" : "pagina's"}</span><input class="field" type="number" min="0" name="pages" value="${ch.pages || ''}" inputmode="numeric"></label>
        <label class="fld"><span>Al gestudeerd</span><input class="field" type="number" min="0" name="done" value="${ch.done || 0}" inputmode="numeric"><span class="help">van ${tot || '?'} — "ik ben op pagina …"</span></label>
      </div>
      <label class="btn sm" style="justify-self:start">📄 Tel de pagina's van een bestand<input type="file" hidden data-change="ch-file" accept=".pdf,.pptx,.ppsx,.docx,.odt,.odp,.txt,.md,image/*"></label>
      <p class="privacy"><span>🔒</span><span>Je bestand wordt alleen op dit toestel gelezen om de pagina's te tellen en daarna meteen vergeten. Er wordt niets geüpload of opgeslagen.</span></p>
      <div class="sheet-foot"><button type="button" class="btn danger" data-act="chapter-del" data-id="${ch.id}">🗑</button><button class="btn primary">Opslaan</button></div>
    </form>
    <section class="section stack">
      ${revList}
      <div class="stack"><span class="lbl">⚠️ Moeilijke stukken</span>
        <div class="list-edit" id="hard-list">${hardList(ch)}</div>
        <form class="row" data-form="hard-add"><input class="field grow" name="t" placeholder="bv. p. 12 — formule van Bayes" maxlength="140"><button class="btn sm">+ Toevoegen</button></form></div>
      <div class="stack"><span class="lbl">🗂️ Flashcards van dit hoofdstuk</span>
        ${decks.length ? `<div class="decks">${decks.map(d => { const s = Flash.stats(d); return `<div class="deck-row"><div class="grow"><b>${esc(d.name)}</b><span class="small muted">${s.kn}/${s.total} gekend</span></div><a class="btn xs primary" href="${Flash.link(d.id)}">Oefen</a></div>`; }).join('')}</div>` : '<p class="muted small">Nog niets gekoppeld.</p>'}
        <div class="row"><button class="btn sm primary" data-act="prompt" data-course="${ch.course}" data-chapter="${ch.id}">🤖 AI-prompt voor dit hoofdstuk</button><button class="btn sm" data-act="deck-pick" data-course="${ch.course}" data-chapter="${ch.id}">🔗 Set koppelen</button></div></div>
      <label class="fld"><span class="lbl">📝 Notities</span><textarea class="field" data-change="ch-notes" data-id="${ch.id}" placeholder="Wat moet je zeker onthouden?">${esc(ch.notes || '')}</textarea></label>
      ${(ch.files || []).length ? `<p class="help">Getelde bestanden: ${ch.files.map(f => `${esc(f.name)} (${f.pages} ${unitShort(f.unit)})`).join(', ')}</p>` : ''}
    </section>`;
};
function hardList(ch) {
  return (ch.hard || []).map(h => `<div class="le${h.ok ? ' ok' : ''}"><span>${esc(h.text)}</span><button type="button" class="btn xs" data-act="hard-ok" data-id="${ch.id}" data-h="${h.id}" aria-label="${h.ok ? 'Toch nog moeilijk' : 'Ik snap het nu'}">${h.ok ? '↩️' : '✓'}</button><button type="button" class="icon-btn sm" data-act="hard-del" data-id="${ch.id}" data-h="${h.id}" aria-label="Verwijderen">✕</button></div>`).join('') || '<p class="muted small">Nog niets. Noteer hier wat je moeilijk vindt, dan krijg je het te zien bij je herhalingen.</p>';
}

SHEETS.bulk = () => {
  const c = getCourse(sheet.course);
  return sheetHead('⚡ Meerdere hoofdstukken') + `
    <div class="seg section" role="group"><button class="${sheet.mode !== 'list' ? 'on' : ''}" data-act="bulk-mode" data-v="count">Aantal</button><button class="${sheet.mode === 'list' ? 'on' : ''}" data-act="bulk-mode" data-v="list">Lijst plakken</button></div>
    <form class="form section" data-form="bulk">
      ${sheet.mode === 'list' ? `<label class="fld"><span>Eén hoofdstuk per regel, met het aantal pagina's erachter</span><textarea class="field" name="list" rows="8" placeholder="H1 Inleiding ; 24&#10;H2 Afgeleiden ; 31&#10;H3 Integralen ; 18"></textarea><span class="help">Je kan de inhoudstafel van je cursus kopiëren en plakken. Het laatste getal op elke regel zijn de pagina's.</span></label>` : `
      <div class="fgrid">
        <label class="fld"><span>Aantal hoofdstukken</span><input class="field" type="number" name="n" min="1" max="60" value="8" inputmode="numeric"></label>
        <label class="fld"><span>Pagina's per hoofdstuk (±)</span><input class="field" type="number" name="pages" min="0" value="20" inputmode="numeric"></label>
        <label class="fld"><span>Naam</span><input class="field" name="prefix" value="Hoofdstuk" maxlength="40"></label>
        <label class="fld"><span>Begin bij nummer</span><input class="field" type="number" name="startNum" value="${chaptersOf(c.id).length + 1}" min="0" inputmode="numeric"></label>
      </div>`}
      <div class="fgrid">
        <div class="fld"><span>Studeer je uit</span><div class="seg">${[['p', "📄 pagina's"], ['dia', "📊 dia's"]].map(([v, l], i) => `<label><input type="radio" name="unit" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        <label class="check-row"><input type="checkbox" name="needSummary"> Samenvatting moet ik nog maken</label>
      </div>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Toevoegen</button></div>
    </form>`;
};

SHEETS.upload = () => {
  const c = getCourse(sheet.course); const files = sheet.files || [];
  const chs = chaptersOf(c.id);
  const ROLES = [['summary', '📝 Samenvatting — hieruit studeer ik'], ['course', '📚 Cursus — samenvatting moet ik nog maken'], ['study', '📚 Cursus — ik studeer er rechtstreeks uit'], ['slides', "📊 Slides / PowerPoint"]];
  const rows = files.map((f, i) => f.err ? `<div class="alert bad"><span class="ai">⚠️</span><div class="grow"><p>${esc(f.err)}</p></div></div>` : `
    <div class="frow card flat" style="grid-template-columns:1fr">
      <span class="fname">${esc(f.name)} · ${f.pages} ${unitWord(f.unit, f.pages)}${f.estimated ? ' (geschat)' : ''}</span>
      <div class="row"><input class="field grow" name="t-${i}" value="${esc(f.title)}" aria-label="Titel"><input class="field" type="number" name="p-${i}" value="${f.pages}" style="width:90px" aria-label="Aantal" inputmode="numeric"></div>
      <select class="field" name="r-${i}">${ROLES.map(([v, l]) => opt(v, l, f.role === 'slides' ? 'slides' : f.role)).join('')}</select>
      ${f.outline && f.outline.length >= 2 ? `<label class="check-row small"><input type="checkbox" name="s-${i}" ${sheet.split !== false ? 'checked' : ''}> Splits in ${f.outline.length} hoofdstukken volgens de inhoudstafel (${esc(f.outline.slice(0, 3).map(o => o.title).join(', '))}${f.outline.length > 3 ? ' …' : ''})</label>` : ''}
    </div>`).join('');
  return sheetHead('📄 Bestanden — ' + esc(c.name)) + `
    <form class="form" data-form="upload">
      <label class="drop" id="drop"><span style="font-size:2rem">📄</span><b>Kies of sleep je bestanden</b><span class="muted small">PDF, PowerPoint (.pptx), Word (.docx) … meerdere tegelijk mag</span>
        <input type="file" multiple hidden data-change="upload-files" accept=".pdf,.pptx,.ppsx,.potx,.docx,.odt,.odp,.txt,.md,image/*"></label>
      <p class="privacy"><span>🔒</span><span>Je bestanden blijven op je toestel: ik lees ze enkel om de pagina's en de inhoudstafel te tellen en vergeet ze daarna meteen. Er wordt <b>niets</b> geüpload of opgeslagen — alleen het aantal pagina's.</span></p>
      ${sheet.busy ? '<p class="muted">Bezig met tellen… ⏳</p>' : ''}
      ${rows ? `<div class="files">${rows}</div>
        ${files.filter(f => !f.err).length === 1 && chs.length ? `<label class="fld"><span>Waar komt dit bij?</span><select class="field" name="target">${opt('', '➕ Nieuw(e) hoofdstuk(ken)', '')}${chs.map(ch => opt(ch.id, '↪︎ Bij ' + ch.title, '')).join('')}</select></label>` : ''}
        <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Toevoegen aan ${esc(c.name)}</button></div>` : ''}
    </form>`;
};

SHEETS.prompt = () => {
  const c = getCourse(sheet.course); const ch = sheet.chapter ? getChapter(sheet.chapter) : null;
  const text = aiPrompt(c, ch);
  return sheetHead('🤖 Flashcards maken met AI') + `
    <div class="stack">
      <label class="fld"><span>Voor</span><select class="field" data-change="prompt-chapter">${opt('', 'Het hele vak ' + c.name, sheet.chapter || '')}${chaptersOf(c.id).map(x => opt(x.id, x.title, sheet.chapter || '')).join('')}</select></label>
      <ol class="steps">
        <li><span>Tik op <b>Kopieer prompt</b> hieronder.</span></li>
        <li><span>Open ChatGPT, Claude of Gemini, <b>upload je samenvatting</b> (PDF/Word) en plak de prompt.</span></li>
        <li><span>Download het <b>Excel-bestand</b> dat je terugkrijgt.</span></li>
        <li><span>Ga naar <b>Flashcards → + Nieuwe set</b> en upload het Excel-bestand (of plak de tabel).</span></li>
        <li><span>Kom terug en koppel de set hier aan ${esc(c.name)} — dan zie je hoeveel kaarten je al kent en krijg je advies.</span></li>
      </ol>
      <div class="prompt-box"><textarea readonly id="prompt-text" aria-label="Prompt">${esc(text)}</textarea></div>
      <button class="btn primary block copy-btn" data-act="copy-prompt">📋 Kopieer prompt</button>
      <div class="row"><a class="btn sm" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT ↗</a><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude ↗</a><a class="btn sm" href="https://gemini.google.com/" target="_blank" rel="noopener">Gemini ↗</a></div>
      <div class="row"><a class="btn sm primary" href="flashcards.html#new">🗂️ Naar Flashcards: nieuwe set</a><button class="btn sm" data-act="deck-pick" data-course="${c.id}" ${ch ? `data-chapter="${ch.id}"` : ''}>🔗 Set koppelen</button></div>
      <p class="help">Tip: maak liefst één set per hoofdstuk en koppel die aan dat hoofdstuk. Dan zie je per hoofdstuk hoe goed je het kent.</p>
    </div>`;
};

SHEETS.decks = () => {
  const c = getCourse(sheet.course), ch = sheet.chapter ? getChapter(sheet.chapter) : null;
  const linked = new Set(ch ? (ch.decks || []) : (c.decks || []));
  const ds = Flash.decks();
  return sheetHead(`🔗 Sets koppelen aan ${esc(ch ? ch.title : c.name)}`) + (ds.length ? `
    <form class="form" data-form="decks"><div class="list-edit">${ds.map(d => { const s = Flash.stats(d); const f = Flash.folderName(d.folder); return `<label class="le check-row"><input type="checkbox" name="d" value="${esc(d.id)}" ${linked.has(d.id) ? 'checked' : ''}><span>${esc(d.name)}<small class="muted"> · ${s.total} kaarten${f ? ' · 📁 ' + esc(f) : ''}${d.ro ? ' · gedeeld' : ''}</small></span></label>`; }).join('')}</div>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Opslaan</button></div></form>`
    : `<div class="card empty"><div class="big">🗂️</div><p class="muted">Je hebt nog geen flashcards op dit toestel${Sync.user ? ' of in je account' : ''}.</p><a class="btn primary" href="flashcards.html#new">Maak een set in Flashcards</a></div>`);
};

SHEETS.task = () => {
  const t = sheet.id ? getTask(sheet.id) : null;
  const d = t || { title: '', day: sheet.day || todayKey(), course: sheet.course || '', min: 30, time: '', note: '' };
  return sheetHead(t ? 'Taak bewerken' : 'Nieuwe taak') + `
    <form class="form" data-form="task">
      <label class="fld"><span>Wat moet je doen?</span><input class="field" name="title" value="${esc(d.title)}" required maxlength="120" placeholder="bv. Oefeningenreeks 3 maken" autofocus></label>
      <div class="fgrid">
        <label class="fld"><span>Dag</span><input class="field" type="date" name="day" value="${esc(d.day)}" required></label>
        <label class="fld"><span>Uur (optioneel)</span><input class="field" type="time" name="time" value="${esc(d.time || '')}"></label>
        <label class="fld"><span>Vak</span><select class="field" name="course">${opt('', '— geen —', d.course)}${listCourses().map(c => opt(c.id, emoT(c) + ' ' + c.name, d.course)).join('')}</select></label>
        <label class="fld"><span>Hoe lang? (min)</span><input class="field" type="number" name="min" min="0" step="5" value="${esc(d.min ?? 30)}" inputmode="numeric"></label>
      </div>
      <label class="fld"><span>Notitie</span><textarea class="field" name="note" rows="3">${esc(d.note || '')}</textarea></label>
      <div class="sheet-foot">${t ? `<button type="button" class="btn danger" data-act="task-del" data-id="${t.id}">🗑</button>` : '<button type="button" class="btn" data-act="sheet-close">Annuleren</button>'}<button class="btn primary">${t ? 'Opslaan' : 'Toevoegen'}</button></div>
    </form>`;
};

SHEETS['summary-pages'] = () => {
  const ch = getChapter(sheet.id); if (!ch) return sheetHead('Samenvatting') + '<p>Niet gevonden.</p>';
  return sheetHead(sheet.fresh ? '✍️ Samenvatting klaar! 🎉' : '✍️ Samenvatting') + `
    <form class="form" data-form="summary-pages">
      <p>Knap werk! Hoeveel pagina's is je samenvatting van <b>${esc(ch.title)}</b> geworden? Dan plan ik precies genoeg tijd in om ze te studeren.</p>
      <label class="fld"><span>Pagina's samenvatting</span><input class="field" type="number" min="1" name="pages" value="${ch.pages || ''}" placeholder="bv. ${Math.max(1, Math.round((ch.srcPages || 10) * cfg().summaryRatio / 100))}" inputmode="numeric" autofocus></label>
      <label class="btn sm" style="justify-self:start">📄 Of tel ze uit je bestand<input type="file" hidden data-change="sum-file" accept=".pdf,.docx,.odt,.pptx,.txt,.md"></label>
      <p class="privacy"><span>🔒</span><span>Je bestand wordt alleen gelezen om te tellen, niet opgeslagen.</span></p>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Later</button><button class="btn primary">Opslaan</button></div>
    </form>`;
};

SHEETS.grade = () => {
  const c = getCourse(sheet.id); if (!c) return '';
  return sheetHead(`🎓 Resultaat ${esc(c.name)}`) + `
    <form class="form" data-form="grade">
      <div class="fgrid keep"><label class="fld"><span>Cijfer</span><input class="field" type="number" step="0.5" min="0" name="grade" value="${c.grade ?? ''}" inputmode="decimal" autofocus></label>
        <label class="fld"><span>Op</span><input class="field" type="number" min="1" name="gradeMax" value="${c.gradeMax || 20}" inputmode="numeric"></label></div>
      <label class="check-row"><input type="checkbox" name="archive" ${c.archived || (validDay(c.exam) && c.exam < todayKey()) ? 'checked' : ''}> Vak archiveren (verdwijnt uit je planning)</label>
      <p class="help">Je cijfers en je gewogen gemiddelde (volgens studiepunten) zie je bij 📊 Stats.</p>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Opslaan</button></div>
    </form>`;
};

/* =========================================================
   Actions
   ========================================================= */
Object.assign(ACT, {
  tab(el) { view = { tab: el.dataset.tab, calMode: view.calMode, anchor: view.tab === 'cal' ? view.anchor : undefined }; lsSet(LS_TAB, view.tab); closeSheetIfOpen(); render(); scrollTo(0, 0); if (view.tab === 'stats' || view.tab === 'today') Social.load().then(ch => { if (ch && !sheet && (view.tab === 'stats' || view.tab === 'today')) render(); }); },
  'sheet-close'() { closeSheet(); },
  layout(el) { cfg().layout = el.dataset.v; touchSettings(); render(); },
  'hide-login'() { lsSet('unistudy.hideLogin.v1', true); render(); },
  tick(el) { const it = findItem(el.dataset.key, el.dataset.day); if (it) toggleItem(it); },
  'item-menu'(el) { openSheet('item', { key: el.dataset.key, day: el.dataset.day || todayKey() }); },
  'cal-item'(el) { openSheet('item', { key: el.dataset.key, day: el.dataset.day }); },
  'item-tick'() { const it = findItem(sheet.key, sheet.day); closeSheet(); if (it) toggleItem(it); },
  'item-timer'(el) {
    const key = el.dataset.key || (sheet && sheet.key); const it = findItem(key, todayKey()); if (!it) return;
    closeSheetIfOpen(); Timer.linkItem(it); view = { tab: 'timer' }; lsSet(LS_TAB, 'timer'); render(); scrollTo(0, 0);
  },
  'skip-day'() {
    const it = findItem(sheet.key, sheet.day); if (!it) return;
    const c = getCourse(it.course); if (!c) return;
    c.skips = [...new Set([...(c.skips || []).filter(d => d >= todayKey()), sheet.day])]; put('courses', c); commit();
    closeSheet(); render(); toast(`Oké! ${c.name} is verdeeld over je andere dagen.`);
  },
  unskip(el) { const c = getCourse(el.dataset.id); c.skips = (c.skips || []).filter(d => d !== el.dataset.day); put('courses', c); commit(); render(); },
  'toggle-off'(el) {
    const d = el.dataset.day, s = cfg();
    s.offDays = s.offDays.includes(d) ? s.offDays.filter(x => x !== d) : [...s.offDays, d].sort();
    touchSettings(); render(); toast(s.offDays.includes(d) ? `🌴 ${fmtDay(d)} is een vrije dag — ik plan eromheen.` : `${fmtDay(d)} is weer een studiedag.`);
  },
  'cal-mode'(el) { view.calMode = el.dataset.v; render(); },
  'cal-move'(el) { view.anchor = addDays(view.anchor || todayKey(), int(el.dataset.v)); render(); },
  'cal-today'() { view.anchor = todayKey(); render(); },
  'cal-goto'(el) { view.anchor = el.dataset.day; render(); },
  'cal-day'(el) { view.anchor = el.dataset.day; view.calMode = 'week'; render(); },

  'sug-add'(el) {
    const name = el.dataset.name, e = el.dataset.emoji;
    if (listCourses(true).some(c => norm(c.name) === norm(name))) { toast(`${name} staat er al in.`); return; }
    const c = newCourse({ name, emoji: e }); commit(); render(); toast(`${e} ${name} toegevoegd! Tik erop om examen en hoofdstukken in te vullen.`);
    void c;
  },
  'course-new'() { openSheet('course', {}); },
  'course-edit'(el) { openSheet('course', { id: el.dataset.id }); },
  'open-course'(el) { closeSheetIfOpen(); view = { tab: 'courses', course: el.dataset.id }; lsSet(LS_TAB, 'courses'); render(); scrollTo(0, 0); },
  'courses-back'() { view = { tab: 'courses' }; render(); scrollTo(0, 0); },
  'pick-emoji'(el) {
    const f = el.closest('form'); f.elements.emoji.value = el.dataset.v;
    f.querySelectorAll('[data-act="pick-emoji"]').forEach(b => b.setAttribute('aria-pressed', b === el));
    const p = document.getElementById('emoji-prev'); if (p) p.innerHTML = emoHtml(el.dataset.v);
  },
  'pick-color'(el) {
    const f = el.closest('form, .sheet'); const inp = f.querySelector(`input[type="color"][name="${el.dataset.name}"]`);
    if (inp) inp.value = el.dataset.v;
    f.querySelectorAll(`[data-act="pick-color"][data-name="${el.dataset.name}"]`).forEach(b => b.setAttribute('aria-pressed', b === el));
    const p = document.getElementById('emoji-prev'); if (p) p.style.setProperty('--cc', el.dataset.v);
    if (el.dataset.name.startsWith('look-')) INPUT['look-color'](inp);
  },
  star(el) {
    const box = el.closest('.stars'); const v = int(el.dataset.v);
    box.querySelector('input').value = v;
    box.querySelectorAll('button').forEach(b => { const on = int(b.dataset.v) <= v; b.classList.toggle('on', on); b.setAttribute('aria-checked', int(b.dataset.v) === v); });
  },
  'course-del'(el) {
    const c = getCourse(el.dataset.id); if (!c) return;
    if (!confirm(`${c.name} en alle hoofdstukken verwijderen? Je flashcards blijven bestaan.`)) return;
    for (const ch of chaptersOf(c.id)) drop('chapters', ch.id);
    drop('courses', c.id); commit(); view = { tab: 'courses' }; render(); toast('Vak verwijderd');
  },
  unarchive(el) { const c = getCourse(el.dataset.id); c.archived = false; put('courses', c); commit(); render(); },
  grade(el) { openSheet('grade', { id: el.dataset.id }); },

  'chapter-new'(el) { const ch = newChapter(el.dataset.course, { unit: 'p' }); commit(); render(); openSheet('chapter', { id: ch.id, isNew: true }); },
  chapter(el) { openSheet('chapter', { id: el.dataset.id }); },
  'chapter-del'(el) {
    const ch = getChapter(el.dataset.id); if (!ch) return;
    if (!confirm(`${ch.title} verwijderen?`)) return;
    drop('chapters', ch.id); commit(); sheet = null; drawSheet(); render(); toast('Hoofdstuk verwijderd');
  },
  'ch-move'(el) {
    const ch = getChapter(el.dataset.id), list = chaptersOf(ch.course).slice(), i = list.indexOf(ch), j = i + int(el.dataset.v);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((x, k) => { if (x.order !== k) { x.order = k; put('chapters', x); } });
    commit(); render();
  },
  'rev-toggle'(el) {
    keepChapterForm();
    const ch = getChapter(el.dataset.id), i = el.dataset.i; const r = Object.assign({}, ch.reviews || {});
    if (r[i]) delete r[i]; else r[i] = todayKey();
    ch.reviews = r; put('chapters', ch); commit({ day: todayKey() }); render(); redrawSheet();
  },
  'hard-ok'(el) { const ch = getChapter(el.dataset.id); ch.hard = (ch.hard || []).map(h => h.id === el.dataset.h ? Object.assign({}, h, { ok: !h.ok }) : h); put('chapters', ch); commit(); document.getElementById('hard-list').innerHTML = hardList(ch); },
  'hard-del'(el) { const ch = getChapter(el.dataset.id); ch.hard = (ch.hard || []).filter(h => h.id !== el.dataset.h); put('chapters', ch); commit(); document.getElementById('hard-list').innerHTML = hardList(ch); },
  'summary-pages'(el) { openSheet('summary-pages', { id: el.dataset.id }); },

  bulk(el) { openSheet('bulk', { course: el.dataset.course, mode: 'count' }); },
  'bulk-mode'(el) { sheet.mode = el.dataset.v; redrawSheet(); },
  upload(el) { openSheet('upload', { course: el.dataset.course, files: [] }); },

  prompt(el) { keepChapterForm(); openSheet('prompt', { course: el.dataset.course, chapter: el.dataset.chapter || '', back: backOf() }); },
  async 'copy-prompt'(el) {
    const ok = await copyText(document.getElementById('prompt-text').value);
    if (ok) { el.textContent = '✅ Gekopieerd! Plak hem nu in je AI'; el.classList.add('copied'); setTimeout(() => { el.textContent = '📋 Kopieer prompt'; el.classList.remove('copied'); }, 2600); }
    else { const ta = document.getElementById('prompt-text'); ta.focus(); ta.select(); toast('Selecteer de tekst en kopieer hem zelf (Ctrl/⌘+C).'); }
  },
  'deck-pick'(el) { keepChapterForm(); openSheet('decks', { course: el.dataset.course, chapter: el.dataset.chapter || '', back: backOf() }); },
  'deck-link'(el) { const c = getCourse(el.dataset.course); c.decks = [...new Set([...(c.decks || []), el.dataset.deck])]; put('courses', c); commit(); snapDecks(); render(); toast('Set gekoppeld 🔗'); },
  'deck-unlink'(el) {
    const c = getCourse(el.dataset.course), id = el.dataset.deck;
    c.decks = (c.decks || []).filter(x => x !== id); put('courses', c);
    for (const ch of chaptersOf(c.id)) if ((ch.decks || []).includes(id)) { ch.decks = ch.decks.filter(x => x !== id); put('chapters', ch); }
    commit(); render();
  },

  'task-new'(el) { openSheet('task', { day: el.dataset.day || todayKey(), course: view.course || '' }); },
  'task-edit'(el) { openSheet('task', { id: el.dataset.id }); },
  'task-tomorrow'(el) { const t = getTask(el.dataset.id); t.day = addDays(todayKey(), 1); t.done = false; put('tasks', t); commit(); closeSheet(); render(); toast('Verplaatst naar morgen ➡️'); },
  'task-del'(el) { drop('tasks', el.dataset.id); commit(); sheet = null; drawSheet(); render(); toast('Taak verwijderd'); },
  'ics-course'(el) { const c = getCourse(el.dataset.id); downloadIcs([c], false, `examen-${norm(c.name).replace(/[^a-z0-9]+/g, '-')}.ics`); }
});
function closeSheetIfOpen() { if (sheet) { sheet = null; drawSheet(); } }
function backOf() { return sheet && sheet.kind === 'chapter' ? { kind: 'chapter', id: sheet.id } : null; }
/* save what was typed in the chapter form before leaving it for another panel */
function keepChapterForm(then) {
  const f = document.getElementById('ch-form');
  if (f && sheet && sheet.kind === 'chapter') saveChapterForm(f, true);
  if (then) then();
}

/* ---------- live inputs ---------- */
Object.assign(INPUT, {
  'emoji-live'(el) { const v = el.value.trim(); if (!v) return; el.closest('form').elements.emoji.value = v; const p = document.getElementById('emoji-prev'); if (p) p.textContent = v; },
  'color-live'(el) {
    const p = document.getElementById('emoji-prev'); if (p && el.name === 'color') p.style.setProperty('--cc', el.value);
    el.closest('.swatches').querySelectorAll('[data-act="pick-color"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v.toLowerCase() === el.value.toLowerCase()));
    if (el.name.startsWith('look-')) INPUT['look-color'](el);
  }
});
Object.assign(CHANGE, {
  'set-name'(el) { cfg().name = el.value.trim().slice(0, 30); touchSettings(); },
  'course-notes'(el) { const c = getCourse(el.dataset.id); c.notes = el.value.slice(0, 5000); put('courses', c); commit(); toast('Notities opgeslagen'); },
  'ch-notes'(el) { const ch = getChapter(el.dataset.id); ch.notes = el.value.slice(0, 5000); put('chapters', ch); commit(); },
  'mode-show'(el) { const f = el.closest('form'); f.querySelectorAll('[data-for]').forEach(x => { x.hidden = x.dataset.for !== el.value; }); },
  'need-summary'(el) {
    const f = el.closest('form');
    f.querySelector('[data-sum="yes"]').hidden = !el.checked;
    const h = f.querySelector('[data-sum-hide]'); if (h) h.hidden = el.checked;
    if (el.checked && !num(f.elements.srcPages.value)) f.elements.srcPages.value = f.elements.pages.value || '';
  },
  async 'ch-file'(el) {
    const file = el.files[0]; if (!file) return;
    const f = el.closest('form'); toast('Pagina\'s tellen… ⏳');
    try {
      const r = await countFile(file);
      if (r.unit === 'dia') f.querySelector('input[name="unit"][value="dia"]').checked = true;
      if (f.elements.needSummary.checked && r.role !== 'summary') f.elements.srcPages.value = r.pages;
      else if (f.elements.needSummary.checked) f.elements.sumPages.value = r.pages;
      else f.elements.pages.value = r.pages;
      const ch = getChapter(sheet.id);
      ch.files = [...(ch.files || []), { name: r.name.slice(0, 80), pages: r.pages, unit: r.unit, at: Date.now() }].slice(-10); put('chapters', ch);
      toast(`${r.pages} ${unitWord(r.unit, r.pages)} geteld${r.estimated ? ' (geschat)' : ''} ✓ — vergeet niet op Opslaan te tikken`);
    } catch (e) { toast(e.userMsg || 'Tellen lukte niet.', 5000); }
    el.value = '';
  },
  async 'sum-file'(el) {
    const file = el.files[0]; if (!file) return;
    try { const r = await countFile(file); el.closest('form').elements.pages.value = r.pages; toast(`${r.pages} pagina's geteld ✓`); }
    catch (e) { toast(e.userMsg || 'Tellen lukte niet.', 5000); }
    el.value = '';
  },
  async 'upload-files'(el) { await addUploadFiles([...el.files]); el.value = ''; },
  'prompt-chapter'(el) { sheet.chapter = el.value; redrawSheet(); }
});
async function addUploadFiles(list) {
  if (!list.length || !sheet || sheet.kind !== 'upload') return;
  const form = document.querySelector('#sheet form[data-form="upload"]');
  const vals = harvest(form);
  (sheet.files || []).forEach((f, i) => { if (f.err) return; if (vals['t-' + i] != null) f.title = vals['t-' + i]; if (vals['p-' + i] != null) f.pages = int(vals['p-' + i], f.pages); if (vals['r-' + i]) f.role = vals['r-' + i]; });
  sheet.busy = true; redrawSheet();
  for (const file of list.slice(0, 30)) {
    try { sheet.files.push(await countFile(file)); }
    catch (e) { sheet.files.push({ name: file.name, err: e.userMsg || `${file.name}: tellen lukte niet.` }); }
  }
  sheet.busy = false; redrawSheet();
}

/* ---------- forms ---------- */
function saveChapterForm(f, silent) {
  const ch = getChapter(sheet.id); if (!ch) return;
  const v = harvest(f);
  const prevStatus = chStatus(ch);
  ch.title = (v.title || ch.title).trim().slice(0, 90) || ch.title;
  ch.kind = v.kind || 'theorie';
  ch.unit = v.unit === 'dia' ? 'dia' : 'p';
  ch.difficulty = clamp(int(v.difficulty, 3), 1, 5);
  ch.due = validDay(v.due) ? v.due : '';
  ch.needSummary = !!v.needSummary;
  if (ch.needSummary) {
    ch.srcPages = Math.max(0, int(v.srcPages));
    ch.prepDone = clamp(int(v.prepDone), 0, ch.srcPages);
    ch.pages = Math.max(0, int(v.sumPages));
    ch.summaryMade = ch.srcPages > 0 && ch.prepDone >= ch.srcPages;
  } else {
    ch.pages = Math.max(0, int(v.pages));
  }
  const tot = studyTotal(ch);
  const newDone = clamp(int(v.done), 0, tot || int(v.done));
  const delta = newDone - (ch.done || 0);
  if (delta) {
    ch.done = newDone; if (newDone > 0) ch.started = true;
    addLog({ type: 'study', key: 'manual|' + ch.id, course: ch.course, chapter: ch.id, units: delta, unit: ch.unit, min: Math.max(0, delta) * mpu(getCourse(ch.course), ch), est: true });
  }
  const known = isKnown(ch);
  if (known && !ch.knownDay) ch.knownDay = todayKey(); else if (!known && tot > 0) ch.knownDay = '';
  put('chapters', ch);
  if (v.status && v.status !== prevStatus && v.status !== chStatus(ch)) setStatus(ch, v.status);
  commit({ day: todayKey() });
  if (!silent) { closeSheet(); render(); toast('Hoofdstuk opgeslagen ✓'); }
  else render();
}
Object.assign(FORMS, {
  course(f) {
    const v = harvest(f);
    const name = (v.name || '').trim().slice(0, 60); if (!name) return;
    const data = {
      name, emoji: (v.emoji || '📘').trim().slice(0, 12) || '📘', color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : COLORS[0],
      prof: (v.prof || '').trim().slice(0, 60), credits: v.credits ? String(clamp(num(v.credits), 0, 60)) : '', semester: v.semester || '',
      priority: v.priority || 'normaal', difficulty: clamp(int(v.difficulty, 3), 1, 5),
      exam: validDay(v.exam) ? v.exam : '', examTime: v.examTime || '', examType: v.examType || '', examPlace: (v.examPlace || '').trim().slice(0, 80)
    };
    let c;
    if (sheet.id) { c = Object.assign(getCourse(sheet.id), data); put('courses', c); }
    else c = newCourse(data);
    if (data.exam && data.exam >= todayKey() && c.archived && c.grade == null) c.archived = false;
    commit(); closeSheet();
    if (!sheet) { view = { tab: 'courses', course: c.id }; lsSet(LS_TAB, 'courses'); }
    render(); scrollTo(0, 0); toast(`${emoT(c)} ${c.name} opgeslagen ✓`);
  },
  'course-plan'(f) {
    const c = getCourse(f.dataset.id), v = harvest(f);
    c.start = validDay(v.start) ? v.start : '';
    c.buffer = v.buffer === '' ? null : clamp(int(v.buffer), 0, 30);
    c.mode = ['auto', 'pages', 'minutes', 'task'].includes(v.mode) ? v.mode : 'auto';
    c.minPages = Math.max(0, int(v.minPages)); c.minMinutes = Math.max(0, int(v.minMinutes));
    c.minPerPage = v.minPerPage === '' ? null : clamp(num(v.minPerPage), .5, 120);
    c.minPerSlide = v.minPerSlide === '' ? null : clamp(num(v.minPerSlide), .25, 60);
    c.prepMinPerPage = v.prepMinPerPage === '' ? null : clamp(num(v.prepMinPerPage), .5, 120);
    c.useMeasured = !!v.useMeasured;
    const ro = String(v.reviewOffsets || '').trim();
    c.reviewOffsets = ro === '' ? null : ro.split(/[\s,;]+/).map(x => int(x)).filter(x => x >= 0 && x <= 120);
    if (Array.isArray(c.reviewOffsets)) c.reviewOffsets = c.reviewOffsets.filter(x => x > 0);
    put('courses', c); commit(); view.planOpen = true; render(); toast('Planning aangepast ✓');
  },
  chapter(f) { saveChapterForm(f); },
  'hard-add'(f) {
    const t = (f.elements.t.value || '').trim(); if (!t) return;
    const ch = getChapter(sheet.id); ch.hard = [...(ch.hard || []), { id: uid(), text: t.slice(0, 140), ok: false }]; put('chapters', ch); commit();
    f.elements.t.value = ''; document.getElementById('hard-list').innerHTML = hardList(ch);
  },
  bulk(f) {
    const c = getCourse(sheet.course), v = harvest(f), unit = v.unit === 'dia' ? 'dia' : 'p', ns = !!v.needSummary;
    const mk = (title, pages) => newChapter(c.id, ns ? { title, unit, needSummary: true, srcPages: pages } : { title, unit, pages });
    let n = 0;
    if (sheet.mode === 'list') {
      for (const line of String(v.list || '').split(/\n/)) {
        const s = line.trim(); if (!s) continue;
        const m = /^(.*?)[\s;:,\-–—|\t]*\(?(\d+)\s*(p|pag|pagina's|paginas|blz|dia's|dias|slides)?\.?\)?\s*$/i.exec(s);
        const title = (m && m[1].trim() ? m[1] : s).replace(/[\s;:,\-–—|]+$/, '').trim().slice(0, 90);
        mk(title || `Hoofdstuk ${n + 1}`, m ? int(m[2]) : 0); n++;
      }
    } else {
      const cnt = clamp(int(v.n, 1), 1, 60), pg = Math.max(0, int(v.pages)), st = int(v.startNum, 1), pre = (v.prefix || 'Hoofdstuk').trim();
      for (let i = 0; i < cnt; i++) { mk(`${pre} ${st + i}`, pg); n++; }
    }
    commit(); closeSheet(); render(); toast(`${plural(n, 'hoofdstuk', 'hoofdstukken')} toegevoegd ✓`);
  },
  upload(f) {
    const c = getCourse(sheet.course), v = harvest(f);
    let n = 0;
    const target = v.target ? getChapter(v.target) : null;
    (sheet.files || []).forEach((file, i) => {
      if (file.err) return;
      const title = (v['t-' + i] || file.title || file.name).trim().slice(0, 90);
      const pages = Math.max(0, int(v['p-' + i], file.pages));
      const role = v['r-' + i] || file.role || 'study';
      const unit = role === 'slides' ? 'dia' : 'p';
      const meta = { name: file.name.slice(0, 80), pages, unit, at: Date.now() };
      const fields = pg => role === 'course' ? { needSummary: true, srcPages: pg, unit: 'p' } : { pages: pg, unit, needSummary: false };
      if (target) {
        if (role === 'summary' && target.needSummary) { target.pages = pages; target.summaryMade = true; target.prepDone = target.srcPages || 0; }
        else Object.assign(target, fields(pages));
        target.files = [...(target.files || []), meta].slice(-10); put('chapters', target); n++;
      } else if (v['s-' + i] && file.outline && file.outline.length >= 2) {
        for (const o of file.outline) { newChapter(c.id, Object.assign({ title: o.title, files: [Object.assign({}, meta, { pages: o.pages })] }, fields(o.pages))); n++; }
      } else { newChapter(c.id, Object.assign({ title, files: [meta] }, fields(pages))); n++; }
    });
    commit(); sheet = null; drawSheet(); render();
    toast(n ? `${plural(n, 'hoofdstuk', 'hoofdstukken')} ${target ? 'bijgewerkt' : 'toegevoegd'} ✓ — de bestanden zelf zijn niet bewaard 🔒` : 'Niets toegevoegd');
  },
  decks(f) {
    const ids = [...f.querySelectorAll('input[name="d"]:checked')].map(x => x.value);
    if (sheet.chapter) { const ch = getChapter(sheet.chapter); ch.decks = ids; put('chapters', ch); const c = getCourse(ch.course); c.decks = [...new Set([...(c.decks || []), ...ids])]; put('courses', c); }
    else { const c = getCourse(sheet.course); c.decks = ids; put('courses', c); }
    commit(); snapDecks(); closeSheet(); render(); toast('Flashcards gekoppeld 🔗');
  },
  task(f) {
    const v = harvest(f); const title = (v.title || '').trim().slice(0, 120); if (!title) return;
    const editing = !!sheet.id;
    const data = { title, day: validDay(v.day) ? v.day : todayKey(), time: v.time || '', course: v.course || '', min: Math.max(0, int(v.min)), note: (v.note || '').slice(0, 1000) };
    if (sheet.id) { const t = Object.assign(getTask(sheet.id), data); put('tasks', t); }
    else put('tasks', Object.assign({ id: uid(), done: false, doneDay: '', created: Date.now() }, data));
    commit(); sheet = null; drawSheet(); render(); toast(editing ? 'Taak opgeslagen ✓' : `Taak gepland op ${fmtDay(data.day)} ✓`);
  },
  'summary-pages'(f) {
    const ch = getChapter(sheet.id), n = int(f.elements.pages.value);
    if (n > 0) { ch.pages = n; if (ch.needSummary) { ch.summaryMade = true; ch.prepDone = ch.srcPages || ch.prepDone; } put('chapters', ch); commit(); }
    closeSheet(); render(); if (n > 0) toast(`Top! ${n} pagina's om te studeren ingepland 📖`);
  },
  grade(f) {
    const c = getCourse(sheet.id), v = harvest(f);
    c.grade = v.grade === '' ? null : clamp(num(v.grade), 0, 1000); c.gradeMax = Math.max(1, int(v.gradeMax, 20));
    c.archived = !!v.archive; put('courses', c); commit(); closeSheet();
    if (c.archived && view.course === c.id) view = { tab: 'courses' };
    render();
    if (c.grade != null && c.grade / c.gradeMax >= .5) { confetti([c.color], 100); toast(`Proficiat! 🎉 ${fmtGrade(c)} voor ${c.name}`); }
    else toast('Opgeslagen');
  },
  'item-partial'(f) { const it = findItem(sheet.key, sheet.day); if (it) setPartial(it, f.elements.n.value); }
});
