'use strict';
/* =========================================================
   Uni Study — Planning, the simple layer: one "do this now"
   card, a step-by-step start, the Meer page, and the extras
   (little time, how did it go, week overview, exam mode,
   lessons, reminder, friends studying now).
   Made by Luca Cicarelli
   ========================================================= */

/* ---------- Today: one thing at a time ---------- */
function examFocus() {
  const T = todayKey();
  return listCourses().filter(c => validDay(c.exam) && diffDays(T, c.exam) >= 0 && diffDays(T, c.exam) <= 3).sort((a, b) => a.exam < b.exam ? -1 : 1)[0] || null;
}
function renderToday() {
  const T = todayKey();
  if (!listCourses().length && !Object.values(state.tasks).some(alive)) return renderWelcome();
  let items = sortItems(planDay(T).items.filter(i => i.type !== 'exam'));
  const focus = examFocus(), name = myName();
  const focusOn = focus && !view.examAll && items.some(i => i.course === focus.id);
  if (focusOn) items = items.filter(i => i.course === focus.id);
  const total = sum(items, i => i.min), done = sum(items, i => i.min * itemFrac(i));
  const nDone = items.filter(itemDone).length;
  const next = items.find(i => STUDY_TYPES.includes(i.type) && !itemDone(i));
  const rest = items.filter(i => i !== next);
  const alerts = todayAlerts(), shown = view.allAlerts ? alerts : alerts.slice(0, 1);
  let hero;
  if (next) {
    const c = getCourse(next.course), t = itemText(next);
    hero = `<section class="now" style="${cc(c)}"><span class="k">Nu doen</span>
        <div class="row" style="gap:12px;flex-wrap:nowrap"><span class="cc-emoji" style="background:var(--surface)">${c ? emo(c) : icon('book')}</span><div class="grow"><h2>${t.title}</h2><p class="muted">${c ? esc(c.name) + ' · ' : ''}${t.meta} · ±${fmtMin(next.min * (1 - itemFrac(next)))}</p></div></div>
        <button class="btn primary block" data-act="study-go" data-key="${esc(next.key)}">${icon('play')} Begin</button>
        <div class="row"><button class="btn sm grow" data-act="quick">${icon('timer')} Ik heb maar weinig tijd</button><button class="btn sm" data-act="item-menu" data-key="${esc(next.key)}">Andere opties</button></div>
      </section>`;
  } else if (items.length) {
    hero = `<section class="now"><span class="k">Vandaag</span><h2>Alles gedaan voor vandaag</h2><p class="muted">Goed bezig. Morgen staat het volgende stuk klaar.</p></section>`;
  } else {
    hero = `<section class="now"><span class="k">Vandaag</span><h2>${capOf(T) === 0 ? 'Vrije dag' : 'Niets gepland vandaag'}</h2><p class="muted">${capOf(T) === 0 ? 'Rust hoort er ook bij.' : 'Voeg een vak of hoofdstuk toe, dan maak ik je planning.'}</p></section>`;
  }
  return `
    <section class="hello"><h1>${greeting()}${name ? ', ' + esc(name) : ''}</h1><p>${fmtDay(T, 'long')}</p></section>
    ${focusOn ? `<div class="alert warn section" style="margin-top:0;margin-bottom:12px"><span class="ai">${icon('exam')}</span><div class="grow"><p><b>Examenmodus:</b> ${esc(focus.name)} is ${relDay(focus.exam)}. Je ziet nu alleen dit vak.</p><div class="row"><button class="btn xs" data-act="exam-all">Toon alle vakken</button></div></div></div>` : (focus && view.examAll ? `<p class="small" style="margin-bottom:10px"><button class="link-btn" data-act="exam-all">Terug naar examenmodus (${esc(focus.name)})</button></p>` : '')}
    ${hero}
    <div class="dayline"><span class="fact">${nDone}/${items.length} taken klaar</span>${total - done > 0 ? `<span class="fact">nog ${fmtMin(total - done)}</span>` : ''}<span class="fact">🔥 ${plural(Streak.current(), 'dag', 'dagen')}</span></div>
    ${nowCard()}
    ${alertsHtml(shown)}${alerts.length > 1 ? `<p class="small" style="margin-top:8px"><button class="link-btn" data-act="alerts-all">${view.allAlerts ? 'Minder meldingen' : `Nog ${alerts.length - 1} ${alerts.length === 2 ? 'melding' : 'meldingen'}`}</button></p>` : ''}
    ${wday(T) === 6 ? `<button class="btn block soft section" data-act="week">${icon('stats')} Bekijk je weekoverzicht</button>` : ''}
    ${rest.length ? `<section class="section"><div class="section-head"><h2>${next ? 'Daarna vandaag' : 'Vandaag'}</h2></div>${tasksHtml(rest)}</section>` : ''}
    <div class="add-row"><button class="btn" data-act="task-new">+ Eigen taak</button><button class="btn" data-act="course-new-simple">+ Vak</button></div>
    ${examChips()}
    ${friendsCard()}`;
}
function renderWelcome() {
  return `<section class="card welcome section">
      <span class="logo" style="width:64px;height:64px;font-size:2rem" aria-hidden="true">${icon('logo')}</span>
      <h1>Welkom bij Uni Study</h1>
      <p class="muted">Zeg welk vak je hebt en wanneer het examen is. Ik maak je planning en zeg je elke dag wat je moet doen.</p>
      <button class="btn primary block" style="min-height:58px;font-size:1.15rem" data-act="wizard">${icon('play')} Voeg je eerste vak toe</button>
      <p class="small muted">Duurt een halve minuut. Je kleuren en thema kies je later bij Meer.</p>
    </section>`;
}
Object.assign(ACT, {
  'exam-all'() { view.examAll = !view.examAll; render(); },
  'alerts-all'() { view.allAlerts = !view.allAlerts; render(); },
  'course-new-simple'() { openSheet('wizard', { step: 1, files: [] }); },
  wizard() { openSheet('wizard', { step: 1, files: [] }); },
  'course-new'() { openSheet('wizard', { step: 1, files: [] }); }
});

/* ---------- Meer ---------- */
function renderMore() {
  const row = (act, ic, title, sub, attrs = '') => `<button data-act="${act}" ${attrs}><i>${icon(ic)}</i><span>${title}<small>${sub}</small></span></button>`;
  return `<div class="section-head"><h1>Meer</h1></div><div class="menu">
    ${row('tab', 'plan', 'Kalender', 'Je week en maand, vrije dagen', 'data-tab="cal"')}
    ${row('tab', 'timer', 'Timer', 'Pomodoro, aftellen, stopwatch', 'data-tab="timer"')}
    ${row('tab', 'stats', 'Statistieken', 'Streak, uren, badges, cijfers', 'data-tab="stats"')}
    ${row('week', 'target', 'Weekoverzicht', 'Wat je deed en wat er komt')}
    ${row('roster', 'exam', 'Examenroosters', 'Deel je examens met vrienden')}
    ${row('lessons', 'clock', 'Lesrooster', 'Ik plan rond je lessen')}
    ${row('remind', 'bell', 'Dagelijkse herinnering', 'Een melding op het uur dat je kiest')}
    ${row('look', 'palette', 'Personaliseren', 'Thema, kleuren, icons, lettertype')}
    ${row('settings', 'gear', 'Instellingen', 'Studietijd per dag, tempo, herhalen, account')}
  </div>`;
}

/* ---------- Step-by-step: add a course ---------- */
SHEETS.wizard = () => {
  const s = sheet, steps = `<div class="wiz-steps">${[1, 2, 3].map(i => `<i class="${i <= s.step ? 'on' : ''}"></i>`).join('')}</div>`;
  const files = (s.files || []).filter(f => !f.err);
  if (s.step === 1) return sheetHead('Nieuw vak') + steps + `<form class="form" data-form="wiz">
      <p class="bigq">Welk vak?</p>
      <input class="field" name="name" value="${esc(s.name || '')}" required maxlength="60" placeholder="bv. Wiskunde" autofocus>
      <div class="suggest">${SUGGEST.slice(0, 10).map(([n, e]) => `<button type="button" class="sug" data-act="wiz-pick" data-name="${esc(n)}" data-emoji="${e}">${emoHtml(e)} ${esc(n)}</button>`).join('')}</div>
      <label class="btn block">${icon('upload')} Of upload je cursus, dan vul ik alles in<input type="file" hidden data-change="wiz-file" accept=".pdf,.pptx,.ppsx,.docx,.odt,.odp"></label>
      <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Volgende</button></div></form>`;
  if (s.step === 2) return sheetHead(esc(s.name)) + steps + `<form class="form" data-form="wiz">
      <p class="bigq">Wanneer is het examen?</p>
      <input class="field" type="date" name="exam" value="${esc(s.exam || '')}" min="${todayKey()}">
      <p class="help">Weet je het nog niet? Laat leeg, je kan het later invullen. Zonder datum kan ik nog niet plannen.</p>
      <div class="sheet-foot"><button type="button" class="btn" data-act="wiz-back">Terug</button><button class="btn primary">Volgende</button></div></form>`;
  const outline = files.length === 1 && files[0].outline && files[0].outline.length >= 2 ? files[0].outline.length : 0;
  return sheetHead(esc(s.name)) + steps + `<form class="form" data-form="wiz">
      <p class="bigq">Hoeveel moet je studeren?</p>
      ${files.length ? `<div class="alert good"><span class="ai">${icon('check')}</span><div class="grow"><p>${files.map(f => `<b>${esc(f.name)}</b>: ${f.pages} ${unitWord(f.unit, f.pages)}`).join('<br>')}${outline ? `<br>Ik vond ${outline} hoofdstukken in de inhoudstafel.` : ''}</p></div></div>
        <label class="fld"><span>Dit bestand is</span><select class="field" name="role">${opt('study', 'Mijn cursus, ik studeer er rechtstreeks uit', s.role || 'study')}${opt('course', 'Mijn cursus, ik moet nog een samenvatting maken', s.role)}${opt('summary', 'Mijn samenvatting', s.role)}</select></label>`
      : `<div class="fgrid keep"><label class="fld"><span>Aantal hoofdstukken</span><input class="field" type="number" name="n" min="1" max="60" value="${esc(s.n || '')}" placeholder="bv. 8" inputmode="numeric"></label>
        <label class="fld"><span>Pagina's per hoofdstuk (ongeveer)</span><input class="field" type="number" name="pages" min="1" value="${esc(s.pages || '')}" placeholder="bv. 20" inputmode="numeric"></label></div>
        <label class="check-row"><input type="checkbox" name="needSummary" ${s.needSummary ? 'checked' : ''}> Ik moet eerst nog samenvattingen maken</label>`}
      <label class="btn block">${icon('upload')} ${files.length ? 'Nog een bestand toevoegen' : "Of upload je cursus of slides, ik tel de pagina's"}<input type="file" multiple hidden data-change="wiz-file" accept=".pdf,.pptx,.ppsx,.docx,.odt,.odp"></label>
      ${s.busy ? '<p class="muted">Bezig met tellen…</p>' : ''}
      <p class="privacy"><span>${icon('lock')}</span><span>Bestanden worden alleen op je toestel gelezen om te tellen en nergens opgeslagen.</span></p>
      <div class="sheet-foot"><button type="button" class="btn" data-act="wiz-back">Terug</button><button class="btn primary">Maak mijn planning</button></div></form>`;
};
function wizKeep() { const f = document.querySelector('#sheet form[data-form="wiz"]'); if (f && sheet && sheet.kind === 'wizard') Object.assign(sheet, harvest(f)); }
ACT['wiz-pick'] = el => { wizKeep(); sheet.name = el.dataset.name; sheet.emoji = el.dataset.emoji; sheet.step = 2; redrawSheet(); };
ACT['wiz-back'] = () => { wizKeep(); sheet.step = Math.max(1, sheet.step - 1); redrawSheet(); };
CHANGE['wiz-file'] = async el => {
  const list = [...el.files]; if (!list.length) return;
  wizKeep(); sheet.busy = true; if (sheet.step === 3) redrawSheet(); else toast('Bestand lezen…');
  for (const file of list.slice(0, 20)) {
    try { sheet.files.push(await countFile(file)); } catch (e) { toast(e.userMsg || 'Dit bestand kon ik niet lezen.', 5000); }
  }
  sheet.busy = false;
  const ok = sheet.files.filter(f => !f.err);
  if (sheet.step === 1 && ok.length) { if (!String(sheet.name || '').trim()) sheet.name = ok[0].title.slice(0, 60); sheet.step = 2; }
  redrawSheet();
};
FORMS.wiz = f => {
  Object.assign(sheet, harvest(f));
  const s = sheet;
  if (s.step === 1) { if (!String(s.name || '').trim()) return; s.name = s.name.trim().slice(0, 60); s.step = 2; redrawSheet(); return; }
  if (s.step === 2) { s.exam = validDay(s.exam) ? s.exam : ''; s.step = 3; redrawSheet(); return; }
  const sug = SUGGEST.find(([n]) => norm(n) === norm(s.name));
  const c = newCourse({ name: s.name, emoji: s.emoji || (sug ? sug[1] : 'i:book'), exam: s.exam || '' });
  const files = (s.files || []).filter(x => !x.err);
  if (files.length) {
    const role = s.role || 'study';
    for (const file of files) {
      const unit = file.unit === 'dia' ? 'dia' : 'p', meta = { name: file.name.slice(0, 80), pages: file.pages, unit, at: Date.now() };
      const fields = pg => role === 'course' && unit === 'p' ? { needSummary: true, srcPages: pg, unit: 'p' } : { pages: pg, unit };
      if (file.outline && file.outline.length >= 2) for (const o of file.outline) newChapter(c.id, Object.assign({ title: o.title, files: [Object.assign({}, meta, { pages: o.pages })] }, fields(o.pages)));
      else newChapter(c.id, Object.assign({ title: file.title.slice(0, 90), files: [meta] }, fields(file.pages)));
    }
  } else {
    const n = clamp(int(s.n, 0), 0, 60), pg = Math.max(0, int(s.pages, 0));
    for (let i = 0; i < n; i++) newChapter(c.id, s.needSummary ? { title: `Hoofdstuk ${i + 1}`, needSummary: true, srcPages: pg } : { title: `Hoofdstuk ${i + 1}`, pages: pg });
  }
  commit(); sheet = null; drawSheet(); view = { tab: 'today' }; lsSet(LS_TAB, 'today'); render();
  openSheet('planready', { course: c.id });
};

/* ---------- "Klaar, dit is je plan" ---------- */
SHEETS.planready = () => {
  const c = getCourse(sheet.course); if (!c) return sheetHead('Klaar') + '';
  const p = courseProgress(c), r = buildPlan().info[c.id] || {}, T = todayKey();
  const today = planDay(T).items.filter(i => i.course === c.id && i.type !== 'exam');
  const wl = courseWeekLoad(c.id), exam = validDay(c.exam) ? c.exam : '';
  const lines = [];
  lines.push(`${plural(p.chs.length, 'hoofdstuk', 'hoofdstukken')}${p.sT ? `, ${fmtNum(p.sT)} pagina's om te studeren` : ''}${p.pT ? `, ${fmtNum(p.pT)} pagina's om samen te vatten` : ''}.`);
  if (exam) lines.push(`Examen op ${fmtDay(exam, 'long')} (${relDay(exam)}).`);
  if (!p.chs.length) lines.push('Voeg nog hoofdstukken toe bij Vakken, dan kan ik plannen.');
  else if (!exam) lines.push('Vul nog een examendatum in bij het vak, dan kan ik plannen.');
  else if (r.feasible === false) lines.push('Dit wordt krap. Geef jezelf meer studietijd per dag bij Meer, Instellingen.');
  else lines.push(`Dat is ongeveer ${fmtMin(wl.perDay)} per dag deze week${r.finish ? `. Je bent klaar met studeren op ${fmtDay(r.finish, 'dm')}, daarna herhaal je` : ''}.`);
  return sheetHead('Klaar, dit is je plan') + `<div class="stack">
    <section class="now" style="${cc(c)}"><div class="row" style="gap:12px;flex-wrap:nowrap"><span class="cc-emoji" style="background:var(--surface)">${emo(c)}</span><h2>${esc(c.name)}</h2></div>
      ${lines.map(l => `<p>${l}</p>`).join('')}</section>
    ${today.length ? `<div class="stack"><span class="lbl">Vandaag al te doen</span>${today.map(i => `<p>${KIND[i.type].icon} ${itemText(i).title} <span class="muted small">· ${itemText(i).meta}</span></p>`).join('')}</div>` : ''}
    <p class="help">Elke dag staat op het Vandaag-scherm wat je moet doen. Tik op Begin en vink af wat je gedaan hebt. Wat je niet afkrijgt, verdeel ik opnieuw.</p>
    <div class="sheet-foot"><button class="btn" data-act="wizard">Nog een vak</button><button class="btn primary" data-act="sheet-close">Naar Vandaag</button></div></div>`;
};
const uploadOld = FORMS.upload;
FORMS.upload = f => { const cid = sheet.course; uploadOld(f); if (getCourse(cid)) openSheet('planready', { course: cid }); };

/* ---------- "Ik heb maar weinig tijd" ---------- */
SHEETS.quick = () => sheetHead('Hoeveel tijd heb je?') + `<div class="stack"><p class="muted">Ik kies het belangrijkste eerst en zeg stop wanneer je tijd om is.</p>
  <div class="feel" style="grid-template-columns:repeat(2,1fr)">${[15, 30, 45, 60, 90, 120].map(m => `<button class="btn" style="min-height:56px" data-act="quick-go" data-m="${m}">${fmtMin(m)}</button>`).join('')}</div></div>`;
ACT.quick = () => openSheet('quick');
ACT['quick-go'] = el => { closeSheetIfOpen(); startStudyMode(''); if (document.getElementById('study')) { Study.budget = int(el.dataset.m) * 60000; drawStudy(); } };

/* ---------- Study screen extras: how did it go + flashcards of this chapter ---------- */
function studyExtras() {
  const it = findItem(Study.key), ch = it && getChapter(it.chapter), c = it && getCourse(it.course); if (!it || !c) return '';
  const ids = ch && (ch.decks || []).length ? ch.decks : Flash.courseDeckIds(c);
  const decks = ids.map(id => Flash.get(id)).filter(Boolean).slice(0, 2);
  const feel = ch && (it.type === 'study' || it.type === 'review') ? `<p class="s-sub" style="margin-top:6px">Hoe ging ${esc(ch.title)}?</p><div class="feel">${[['easy', 'Makkelijk'], ['ok', 'Oké'], ['hard', 'Moeilijk']].map(([k, l]) => `<button class="btn" data-act="study-feel" data-v="${k}" aria-pressed="${Study.felt === k}">${l}</button>`).join('')}</div>${Study.felt === 'hard' ? '<p class="s-sub small">Genoteerd. Dit hoofdstuk krijgt meer tijd bij het herhalen.</p>' : ''}` : '';
  const cards = decks.map(d => { const s = Flash.stats(d); return `<a class="btn block" href="${Flash.link(d.id)}">${icon('cards')} Oefen de kaartjes: ${esc(d.name)} <span class="muted small">(${s.due + s.newToday} klaar om te oefenen)</span></a>`; }).join('');
  return feel + cards;
}
ACT['study-feel'] = el => {
  const it = findItem(Study.key), ch = it && getChapter(it.chapter); if (!ch) return;
  const v = el.dataset.v;
  if (!Study.felt) Study.feltBase = ch.difficulty || 3;
  const base = Study.feltBase || 3;
  ch.difficulty = clamp(base + (v === 'hard' ? 1 : v === 'easy' ? -1 : 0), 1, 5); ch.feel = v;
  put('chapters', ch); commit(); Study.felt = v; drawStudy();
};
setInterval(() => {
  if (!document.getElementById('study')) return;
  if (Study.budget && Study.running && !Study.done && !Study.brk && studyMs() >= Study.budget) { Study.timeUp = true; studyBlockDone(); drawStudy(); }
}, 1000);

/* ---------- Week overview ---------- */
SHEETS.week = () => {
  const T = todayKey(), ws = mondayOf(T), tw = rangeTotals(ws, T), lw = rangeTotals(addDays(ws, -7), addDays(ws, -1));
  const next = Array.from({ length: 7 }, (_, i) => addDays(T, i + 1)), nextMin = sum(next, d => planDay(d).min);
  const exams = listCourses().filter(c => validDay(c.exam) && c.exam >= T && diffDays(T, c.exam) <= 14).sort((a, b) => a.exam < b.exam ? -1 : 1);
  const P = buildPlan();
  return sheetHead('Weekoverzicht') + `<div class="stack">
    <div class="tiles"><div class="tile"><div class="tv">${fmtMin(tw.min)}</div><div class="tl">gestudeerd deze week</div><div class="td muted">vorige week ${fmtMin(lw.min)}</div></div>
      <div class="tile"><div class="tv">${fmtNum(tw.units)}</div><div class="tl">pagina's deze week</div><div class="td muted">vorige week ${fmtNum(lw.units)}</div></div></div>
    <section class="card flat stack"><h3>Zit je op schema?</h3>${listCourses().map(c => { const p = courseProgress(c), r = P.info[c.id] || {};
      const st = !p.chs.length ? ['', 'nog geen hoofdstukken'] : r.reason === 'noexam' ? ['', 'geen examendatum'] : r.reason === 'past' ? ['', 'examen voorbij'] : p.pct >= 100 ? ['good', 'alles gekend'] : r.feasible === false ? ['late', 'wordt krap'] : (r.late || []).length ? ['hard', 'achter op schema'] : ['good', 'op schema'];
      return `<div class="hb" style="${cc(c)}"><div class="lab"><b>${emo(c)} ${esc(c.name)}</b><span class="tag ${st[0]}">${st[1]}</span></div><div class="tr"><span style="width:${p.pct}%"></span></div><span class="small muted">${p.pct}% klaar · ${examTxt(c)}</span></div>`; }).join('') || '<p class="muted small">Nog geen vakken.</p>'}</section>
    <section class="card flat stack"><h3>Volgende week</h3><p><b>${fmtMin(nextMin)}</b> gepland, dat is ongeveer ${fmtMin(nextMin / 7)} per dag.</p>
      ${exams.length ? `<p>Examens binnen 2 weken: ${exams.map(c => `<b>${esc(c.name)}</b> (${fmtDay(c.exam, 'dm')})`).join(', ')}.</p>` : '<p class="muted small">Geen examens in de komende twee weken.</p>'}</section>
  </div>`;
};
ACT.week = () => openSheet('week');

/* ---------- Lessons: plan around your classes ---------- */
SHEETS.lessons = () => {
  const L = cfg().lessons || [];
  return sheetHead('Lesrooster') + `<form class="form" data-form="lessons"><p class="muted">Vul in wanneer je les hebt. Op die dagen plan ik minder en pas daarna.</p>
    ${DAYS_SHORT.map((d, i) => `<div class="lesson-row"><b>${d}</b><input class="field" type="time" name="f${i}" value="${esc((L[i] || {}).from || '')}" aria-label="${DAYS_LONG[i]} les van"><input class="field" type="time" name="t${i}" value="${esc((L[i] || {}).to || '')}" aria-label="${DAYS_LONG[i]} les tot"></div>`).join('')}
    <p class="help">Links het begin, rechts het einde van je lessen. Leeg = geen les.</p>
    <div class="fgrid keep"><label class="fld"><span>Ik begin met studeren om</span><input class="field" type="time" name="startTime" value="${esc(cfg().startTime || '09:00')}"></label><label class="fld"><span>Ik stop ten laatste om</span><input class="field" type="time" name="endTime" value="${esc(cfg().endTime || '22:00')}"></label></div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">Opslaan</button></div></form>`;
};
ACT.lessons = () => openSheet('lessons');
FORMS.lessons = f => {
  const v = harvest(f);
  cfg().lessons = DAYS_SHORT.map((_, i) => ({ from: v['f' + i] || '', to: v['t' + i] || '' }));
  cfg().startTime = v.startTime || '09:00'; cfg().endTime = v.endTime || '22:00';
  touchSettings(); closeSheet(); render(); toast('Lesrooster opgeslagen. Je planning is aangepast.');
};

/* ---------- Daily reminder (through your own calendar app, so it also works when Uni Study is closed) ---------- */
SHEETS.remind = () => sheetHead('Dagelijkse herinnering') + `<form class="form" data-form="remind">
  <p class="muted">Kies een uur. Je krijgt een bestandje voor je agenda (Google, Apple of Outlook). Open het één keer, en je gsm herinnert je elke dag, ook als Uni Study dicht is.</p>
  <label class="fld"><span>Elke dag om</span><input class="field" type="time" name="time" value="${esc(cfg().remindTime || '17:00')}" required style="max-width:160px"></label>
  <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Annuleren</button><button class="btn primary">${icon('bell')} Zet in mijn agenda</button></div></form>`;
ACT.remind = () => openSheet('remind');
FORMS.remind = f => {
  const t = f.elements.time.value || '17:00'; cfg().remindTime = t; touchSettings();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', d = todayKey().replace(/-/g, ''), hm = t.replace(':', '') + '00';
  download('uni-study-herinnering.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uni Study//NL', 'BEGIN:VEVENT', 'UID:reminder@unistudy', `DTSTAMP:${stamp}`, `DTSTART:${d}T${hm}`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Uni Study: tijd om te studeren', `DESCRIPTION:Open Uni Study en bekijk wat je vandaag moet doen: ${location.origin}${location.pathname}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Tijd om te studeren', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
  closeSheet(); toast('Open het bestand om de herinnering in je agenda te zetten.', 5000);
};

/* ---------- Friends who are studying right now ---------- */
const Now = { rows: [], at: 0, ok: true, sent: 0 };
async function nowBeat(on) {
  if (!Sync.user || !Sync.sb || !Now.ok) return;
  if (on && Date.now() - Now.sent < 50000) return;
  Now.sent = on ? Date.now() : 0;
  try {
    const { error } = await Sync.sb.from('planner_now').upsert({ user_id: Sync.user.id, until: new Date(Date.now() + (on ? 180000 : -1000)).toISOString(), updated_at: new Date().toISOString() });
    if (error) Now.ok = false;
  } catch (e) { /* offline */ }
}
async function nowLoad() {
  if (!Sync.user || !Sync.sb || !Now.ok || Date.now() - Now.at < 45000) return;
  Now.at = Date.now();
  try {
    const { data, error } = await withTimeout(Sync.sb.from('planner_now').select('user_id,until').gt('until', new Date().toISOString()).neq('user_id', Sync.user.id), 8000);
    if (error) { Now.ok = false; return; }
    const before = Now.rows.length; Now.rows = data || [];
    const ids = Now.rows.map(r => r.user_id).filter(id => !Social.names[id]);
    if (ids.length) { const p = await Sync.sb.from('profiles').select('id,username').in('id', ids); (p.data || []).forEach(x => { Social.names[x.id] = x.username; }); }
    if ((before || Now.rows.length) && view.tab === 'today' && !sheet && !isTyping() && !document.getElementById('study')) render();
  } catch (e) { /* offline */ }
}
function nowCard() {
  const live = Now.rows.filter(r => new Date(r.until).getTime() > Date.now());
  if (!live.length) return '';
  return `<div class="alert good section"><span class="ai">${icon('friends')}</span><div class="grow"><p><b>Nu aan het studeren:</b> ${live.map(r => '@' + esc(Social.names[r.user_id] || 'vriend')).join(', ')}. Doe mee!</p></div></div>`;
}
let wasStudying = false;
setInterval(() => {
  const on = (!!document.getElementById('study') && Study.running) || Timer.s.running;
  if (on) nowBeat(true); else if (wasStudying) nowBeat(false);
  wasStudying = on;
  if (document.visibilityState === 'visible') nowLoad();
}, 15000);

render();
