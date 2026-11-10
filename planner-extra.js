'use strict';
/* =========================================================
   Uni Study — Planning (timer, stats, friends, look, settings,
   calendar export, events and start-up). Made by Luca Cicarelli
   ========================================================= */

/* ---------- little joys ---------- */
function confetti(colors, n = 40) {
  if (!cfg().confetti || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pal = (colors && colors.length ? colors : []).concat(['#F2B705', '#C92E68', '#2F55D4', '#1E8A4C', '#7B4BC9']);
  const box = document.createElement('div'); box.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = pal[i % pal.length];
    p.style.setProperty('--x', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    p.style.setProperty('--d', (1.1 + Math.random() * 1.1) + 's'); p.style.setProperty('--dl', (Math.random() * .25) + 's');
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2800);
}
function celebrate(c) {
  confetti(c ? [c.color] : [], 36);
  if (cfg().vibrate && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* ignore */ } }
}
let audioCtx;
function beep(kind) {
  const snd = cfg().sound; if (snd === 'geen') return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'break' ? [660, 520] : [520, 660, 880];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = snd === 'zacht' ? 'sine' : 'triangle'; o.frequency.value = f;
      const t = audioCtx.currentTime + i * .22, vol = snd === 'zacht' ? .08 : .2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .5);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + .55);
    });
  } catch (e) { /* no sound */ }
  if (cfg().vibrate && navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) { /* ignore */ } }
}

/* =========================================================
   Timer: pomodoro, stopwatch and countdown, linked to a course
   ========================================================= */
const Timer = {
  s: Object.assign({ mode: 'pomo', running: false, phase: 'focus', endAt: 0, remain: 0, startAt: 0, acc: 0, cycle: 0, course: '', chapter: '', key: '', label: '', countMin: 45, workAcc: 0, workStart: 0 }, lsGet(LS_TIMER, {}) || {}),
  save() { lsSet(LS_TIMER, this.s); },
  dur() { const p = cfg().pomo, s = this.s; return (s.mode === 'count' ? s.countMin : s.phase === 'short' ? p.short : s.phase === 'long' ? p.long : p.focus) * 60000; },
  isWork() { return this.s.mode !== 'pomo' || this.s.phase === 'focus'; },
  left() { const s = this.s; return s.running ? s.endAt - Date.now() : (s.remain || this.dur()); },
  elapsed() { const s = this.s; return s.acc + (s.running ? Date.now() - s.startAt : 0); },
  active() { const s = this.s; return s.running || s.remain > 0 || s.acc > 0; },
  start() {
    const s = this.s, now = Date.now();
    if (s.running) return;
    if (s.mode === 'stop') s.startAt = now; else s.endAt = now + (s.remain || this.dur());
    s.remain = 0; s.running = true; if (this.isWork()) s.workStart = now;
    this.save(); try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* ignore */ }
    if (window.Notification && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* ignore */ } }
  },
  pause(at = Date.now()) {
    const s = this.s; if (!s.running) return;
    if (s.mode === 'stop') s.acc += at - s.startAt; else s.remain = Math.max(1, s.endAt - at);
    if (this.isWork() && s.workStart) s.workAcc += Math.max(0, at - s.workStart);
    s.workStart = 0; s.running = false; this.save();
  },
  logWork(at = Date.now()) {
    const s = this.s, min = Math.round(s.workAcc / 6000) / 10; s.workAcc = 0;
    if (min < 1) return 0;
    addLog({ type: 'timer', key: s.key || 'timer|' + (s.course || 'vrij'), course: s.course, chapter: s.chapter, min, est: false, at, day: dkey(new Date(at)) });
    commit({ day: dkey(new Date(at)) }); return min;
  },
  reset() { this.pause(); const m = this.logWork(); Object.assign(this.s, { remain: 0, acc: 0, phase: 'focus', cycle: 0 }); this.save(); if (m) toast(`${fmtMin(m)} opgeslagen ⏱`); },
  finish() {
    const s = this.s, at = Math.min(Date.now(), s.endAt), p = cfg().pomo, wasWork = this.isWork(), stale = Date.now() - s.endAt > 90000;
    this.pause(at); s.remain = 0;
    const m = wasWork ? this.logWork(at) : 0;
    if (s.mode === 'pomo') {
      if (wasWork) { s.cycle++; s.phase = s.cycle % Math.max(1, p.every) === 0 ? 'long' : 'short'; } else s.phase = 'focus';
      const auto = !stale && (s.phase === 'focus' ? p.autoFocus : p.autoBreak);
      this.save(); if (auto) this.start();
    }
    this.save();
    if (!stale) {
      beep(wasWork ? 'done' : 'break');
      const msg = wasWork ? `Goed gewerkt! ${m ? fmtMin(m) + ' opgeslagen. ' : ''}${s.mode === 'pomo' ? 'Tijd voor pauze ☕' : ''}` : 'Pauze voorbij — terug aan de slag! 💪';
      toast(msg, 5000);
      try { if (document.hidden && window.Notification && Notification.permission === 'granted') new Notification('Uni Study', { body: msg, icon: 'icon-192.png' }); } catch (e) { /* ignore */ }
      if (wasWork) confetti([], 30);
    }
    if (document.getElementById('focus') && !this.s.running) closeFocus();
    render();
  },
  skip() { const s = this.s; if (s.mode !== 'pomo') return; s.endAt = Date.now(); if (!s.running) { s.running = true; if (this.isWork()) s.workStart = Date.now(); } this.finish(); },
  linkItem(it) {
    const ch = getChapter(it.chapter), t = itemText(it);
    if (this.s.running) this.reset();
    Object.assign(this.s, { course: it.course || '', chapter: it.chapter || '', key: it.key, label: (KIND[it.type].label + ': ' + (ch ? ch.title : t.title.replace(/<[^>]+>/g, ''))).slice(0, 80) });
    this.save();
  },
  fmt(ms) { const t = Math.max(0, Math.round(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`; },
  show() { return this.fmt(this.s.mode === 'stop' ? this.elapsed() : this.left()); },
  frac() { return this.s.mode === 'stop' ? (this.elapsed() % 3600000) / 3600000 : 1 - clamp(this.left() / this.dur(), 0, 1); },
  tick() {
    const s = this.s;
    if (s.running && s.mode !== 'stop' && Date.now() >= s.endAt) { this.finish(); return; }
    const txt = this.show();
    document.querySelectorAll('[data-ttime]').forEach(el => { el.textContent = txt; });
    const ringEl = document.getElementById('t-ring'); if (ringEl) ringEl.style.strokeDashoffset = String(TC * (1 - this.frac()));
    document.title = s.running ? `${txt} · Uni Study` : 'Uni Study — Planning';
  }
};
const TC = 2 * Math.PI * 120;
const PHASE = { focus: 'Focus', short: 'Korte pauze', long: 'Lange pauze' };
function timerLabel() { const s = Timer.s, c = getCourse(s.course); return s.label || (c ? emoT(c) + ' ' + c.name : 'Vrij studeren'); }
function miniTimer() {
  if (view.tab === 'timer' || !Timer.active()) return '';
  return `<div class="mini-timer"><b data-ttime>${Timer.show()}</b><span class="grow">${Timer.s.mode === 'pomo' ? PHASE[Timer.s.phase] + ' · ' : ''}${esc(timerLabel())}</span><button class="btn xs" data-act="timer-toggle">${Timer.s.running ? '⏸' : '▶'}</button><button class="btn xs" data-act="tab" data-tab="timer">Open</button></div>`;
}
function renderTimer() {
  const s = Timer.s, p = cfg().pomo, c = getCourse(s.course), T = todayKey();
  const sess = logsOn(T).filter(l => l.type === 'timer').sort((a, b) => b.at - a.at);
  const chs = c ? chaptersOf(c.id) : [];
  return `<div class="section-head"><h1>Timer</h1></div>
    <div class="timer-modes"><div class="seg" role="group" aria-label="Soort timer">${[['pomo', '🍅 Pomodoro'], ['count', '⏳ Aftellen'], ['stop', '⏱ Stopwatch']].map(([k, l]) => `<button class="${s.mode === k ? 'on' : ''}" data-act="timer-mode" data-v="${k}">${l}</button>`).join('')}</div></div>
    <section class="card timer-face" style="--tc:${esc(c ? c.color : 'var(--accent)')}">
      <div class="tring"><svg viewBox="0 0 270 270"><circle class="track" cx="135" cy="135" r="120" fill="none" stroke-width="14"/><circle class="val" id="t-ring" cx="135" cy="135" r="120" fill="none" stroke-width="14" stroke-dasharray="${TC.toFixed(1)}" stroke-dashoffset="${(TC * (1 - Timer.frac())).toFixed(1)}"/></svg>
        <div class="inner"><span class="tphase">${s.mode === 'pomo' ? PHASE[s.phase] : s.mode === 'count' ? 'Aftellen' : 'Stopwatch'}</span><span class="ttime" data-ttime>${Timer.show()}</span>
        ${s.mode === 'pomo' ? `<span class="tcycle" aria-label="${s.cycle % p.every} van ${p.every} rondes">${Array.from({ length: p.every }, (_, i) => `<i class="${i < (s.cycle % p.every || (s.phase === 'long' ? p.every : 0)) ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div></div>
      <p class="muted">${esc(timerLabel())}</p>
      <div class="timer-ctrl"><button class="btn primary go" data-act="timer-toggle">${s.running ? '⏸ Pauze' : (Timer.active() ? '▶ Verder' : '▶ Start')}</button>
        <button class="btn" data-act="timer-reset">${s.mode === 'stop' || Timer.isWork() ? '⏹ Stop & bewaar' : '↺ Reset'}</button>
        ${s.mode === 'pomo' ? '<button class="btn" data-act="timer-skip">⏭ Sla over</button>' : ''}
        <button class="btn" data-act="focus-open">🎯 Focusmodus</button></div>
    </section>
    <section class="card section form">
      <div class="fgrid"><label class="fld"><span>Voor welk vak?</span><select class="field" data-change="timer-course">${opt('', '— vrij studeren —', s.course)}${listCourses().map(x => opt(x.id, emoT(x) + ' ' + x.name, s.course)).join('')}</select></label>
      ${chs.length ? `<label class="fld"><span>Hoofdstuk</span><select class="field" data-change="timer-chapter">${opt('', '— geen —', s.chapter)}${chs.map(x => opt(x.id, x.title, s.chapter)).join('')}</select></label>` : ''}</div>
      ${s.mode === 'pomo' ? `<div class="stack"><span class="lbl">Ritme (focus / pauze)</span><div class="chips-pick">${[[25, 5, 15], [50, 10, 20], [90, 15, 30], [15, 3, 10]].map(([f, sh, lg]) => `<button data-act="pomo-preset" data-f="${f}" data-s="${sh}" data-l="${lg}" aria-pressed="${p.focus === f && p.short === sh}">${f} / ${sh}</button>`).join('')}<button data-act="settings" aria-pressed="false">Eigen ritme…</button></div></div>` : ''}
      ${s.mode === 'count' ? `<label class="fld"><span>Aantal minuten</span><input class="field" type="number" min="1" max="600" value="${s.countMin}" data-change="timer-count" inputmode="numeric" style="max-width:140px"></label>` : ''}
      <p class="help">De tijd die je met de timer studeert telt mee in je statistieken${c ? ' en in je tempo voor ' + esc(c.name) : ''}.</p>
    </section>
    <section class="card section stack"><h2>Vandaag</h2>
      ${sess.length ? `<p><b>${fmtMin(sum(sess, l => l.min))}</b> met de timer · ${plural(sess.length, 'sessie', 'sessies')}</p><div class="sessions">${sess.slice(0, 12).map(l => { const x = getCourse(l.course); return `<div class="sess" style="${cc(x)}"><i></i><span class="grow">${x ? (emo(x) + ' ' + esc(x.name)) : 'Vrij studeren'}</span><span class="muted num">${new Date(l.at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span><b class="num">${fmtMin(l.min)}</b><button class="icon-btn sm" data-act="sess-del" data-id="${l.id}" aria-label="Verwijder sessie">✕</button></div>`; }).join('')}</div>` : '<p class="muted small">Nog geen sessies vandaag. Start de timer en ga ervoor! 💪</p>'}
    </section>`;
}
let wakeLock = null;
function openFocus() {
  closeFocus();
  const d = document.createElement('div'); d.id = 'focus';
  d.innerHTML = `<span class="tphase" id="focus-phase"></span><div class="ttime" data-ttime>${Timer.show()}</div><p class="ftask">${esc(timerLabel())}</p><div class="timer-ctrl"><button class="btn go" data-act="timer-toggle" id="focus-toggle"></button><button class="btn" data-act="focus-close">✕ Sluiten</button></div>`;
  document.body.appendChild(d); syncFocus();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; }).catch(() => {}); } catch (e) { /* ignore */ }
  try { if (d.requestFullscreen) d.requestFullscreen().catch(() => {}); } catch (e) { /* ignore */ }
}
function syncFocus() {
  const b = document.getElementById('focus-toggle'); if (!b) return;
  b.textContent = Timer.s.running ? '⏸ Pauze' : '▶ Start';
  document.getElementById('focus-phase').textContent = Timer.s.mode === 'pomo' ? PHASE[Timer.s.phase] : 'Focus';
}
function closeFocus() {
  const d = document.getElementById('focus'); if (d) d.remove();
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { /* ignore */ }
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ignore */ }
}
Object.assign(ACT, {
  'timer-toggle'() { if (Timer.s.running) Timer.pause(); else Timer.start(); if (document.getElementById('focus')) { syncFocus(); Timer.tick(); } else render(); },
  'timer-reset'() { Timer.reset(); render(); },
  'timer-skip'() { Timer.skip(); },
  'timer-mode'(el) { if (Timer.active()) Timer.reset(); Timer.s.mode = el.dataset.v; Timer.s.phase = 'focus'; Timer.save(); render(); },
  'pomo-preset'(el) { Object.assign(cfg().pomo, { focus: int(el.dataset.f), short: int(el.dataset.s), long: int(el.dataset.l) }); touchSettings(); if (!Timer.s.running) Timer.s.remain = 0; Timer.save(); render(); },
  'focus-open'() { if (!Timer.s.running) Timer.start(); openFocus(); },
  'focus-close'() { closeFocus(); render(); },
  'sess-del'(el) { const l = state.logs[el.dataset.id]; drop('logs', el.dataset.id); commit({ day: l && l.day }); render(); }
});
Object.assign(CHANGE, {
  'timer-course'(el) { Object.assign(Timer.s, { course: el.value, chapter: '', key: '', label: '' }); Timer.save(); render(); },
  'timer-chapter'(el) { const ch = getChapter(el.value); Object.assign(Timer.s, { chapter: el.value, key: '', label: ch ? ch.title : '' }); Timer.save(); render(); },
  'timer-count'(el) { Timer.s.countMin = clamp(int(el.value, 45), 1, 600); if (!Timer.s.running) Timer.s.remain = 0; Timer.save(); render(); }
});

/* =========================================================
   Streaks, stats, badges
   ========================================================= */
const Streak = {
  active(d) { const t = dayTotals(d); return t.min >= 1 || t.tasks > 0; },
  current() { let d = todayKey(), n = 0; if (!this.active(d)) d = addDays(d, -1); while (this.active(d) && n < 3650) { n++; d = addDays(d, -1); } return n; },
  best() {
    return memo('beststreak', () => {
      const days = [...logIndex().byDay.keys()].filter(d => this.active(d)).sort(); let best = 0, run = 0, prev = '';
      for (const d of days) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; if (run > best) best = run; prev = d; }
      return best;
    });
  }
};
function totals() {
  return memo('totals', () => {
    const o = { min: 0, units: 0, days: 0, reviews: 0, timer: 0, byCourse: {}, early: false, late: false };
    for (const [d, ls] of logIndex().byDay) {
      if (Streak.active(d)) o.days++;
      for (const l of ls) {
        o.min += l.min || 0; if (l.type === 'study' || l.type === 'prep') o.units += Math.max(0, l.units || 0);
        if (l.type === 'review' || l.type === 'final') o.reviews++;
        if (l.type === 'timer') { o.timer++; const h = new Date(l.at).getHours(); if (h < 8) o.early = true; if (h >= 22) o.late = true; }
        if (l.course) o.byCourse[l.course] = (o.byCourse[l.course] || 0) + (l.min || 0);
      }
    }
    return o;
  });
}
function rangeTotals(from, to) { let min = 0, units = 0, tasks = 0; for (let d = from; d <= to; d = addDays(d, 1)) { const t = dayTotals(d); min += t.min; units += Math.max(0, t.units); tasks += t.tasks; } return { min, units, tasks }; }
function badgesList() {
  const t = totals(), st = Math.max(Streak.current(), Streak.best()), cs = listCourses(true);
  const known = Object.values(state.chapters).filter(ch => alive(ch) && isKnown(ch)).length;
  const cards = sum(cs, c => Flash.courseStats(c).kn);
  return [
    ['🌱', 'Eerste stap', 'Je eerste taak gedaan', t.days >= 1], ['🔥', '3 op een rij', '3 dagen na elkaar', st >= 3], ['⚡', 'Week-held', '7 dagen na elkaar', st >= 7],
    ['🏅', 'Onstopbaar', '30 dagen na elkaar', st >= 30], ['⏰', '10 uur', '10 uur gestudeerd', t.min >= 600], ['💎', '50 uur', '50 uur gestudeerd', t.min >= 3000],
    ['👑', '100 uur', '100 uur gestudeerd', t.min >= 6000], ['📄', '100 pagina\'s', '100 pagina\'s gedaan', t.units >= 100], ['📚', '1000 pagina\'s', '1000 pagina\'s gedaan', t.units >= 1000],
    ['🧠', 'Gekend!', 'Eerste hoofdstuk gekend', known >= 1], ['🎯', '10 hoofdstukken', '10 hoofdstukken gekend', known >= 10], ['🔁', 'Herhaler', '10 herhalingen gedaan', t.reviews >= 10],
    ['🍅', 'Pomodoro-pro', '25 timer-sessies', t.timer >= 25], ['🗂️', 'Kaartenkoning', '200 flashcards gekend', cards >= 200], ['🌅', 'Vroege vogel', 'Gestudeerd vóór 8u', t.early],
    ['🦉', 'Nachtuil', 'Gestudeerd na 22u', t.late], ['🎓', 'Geslaagd', 'Een examen gehaald', cs.some(c => c.grade != null && c.grade / (c.gradeMax || 20) >= .5)], ['🏆', 'Vak af', 'Een vak 100% gekend', cs.some(c => chaptersOf(c.id).length && courseProgress(c).pct >= 100)]
  ];
}
function renderStats() {
  const T = todayKey(), ws = mondayOf(T), tw = rangeTotals(ws, T), lw = rangeTotals(addDays(ws, -7), addDays(ws, -1)), t = totals();
  const days = Array.from({ length: 14 }, (_, i) => addDays(T, i - 13)), mins = days.map(d => dayTotals(d).min), max = Math.max(60, ...mins);
  const delta = tw.min - lw.min;
  const byC = Object.entries(t.byCourse).map(([id, m]) => [getCourse(id), m]).filter(x => x[0]).sort((a, b) => b[1] - a[1]), mc = Math.max(1, ...byC.map(x => x[1]));
  const graded = listCourses(true).filter(c => c.grade != null), badges = badgesList();
  const planned = sum(Array.from({ length: 7 }, (_, i) => (state.plans[addDays(T, -i)] || {}).t || 0));
  const doneP = rangeTotals(addDays(T, -6), T).min;
  return `<div class="section-head"><h1>Statistieken</h1></div>
    <div class="tiles">
      <div class="tile"><div class="tv">🔥 ${Streak.current()}</div><div class="tl">dagen na elkaar</div><div class="td muted">record: ${Streak.best()}</div></div>
      <div class="tile"><div class="tv">${fmtMin(tw.min)}</div><div class="tl">deze week</div><div class="td ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${fmtMin(Math.abs(delta))} t.o.v. vorige week</div></div>
      <div class="tile"><div class="tv">${fmtNum(tw.units)}</div><div class="tl">pagina's deze week</div><div class="td muted">vorige week: ${fmtNum(lw.units)}</div></div>
      <div class="tile"><div class="tv">${fmtMin(t.min)}</div><div class="tl">in totaal gestudeerd</div><div class="td muted">${fmtNum(t.units)} p. · ${plural(t.days, 'dag', 'dagen')}</div></div>
    </div>
    <section class="card section stack"><h2>Deze week</h2><div class="week-dots">${Array.from({ length: 7 }, (_, i) => { const d = addDays(ws, i), a = Streak.active(d), m = dayTotals(d).min; return `<span><i class="${a ? (m >= 30 ? 'ok' : 'half') : ''}">${a ? '✓' : (d > T ? '' : '·')}</i>${DAYS_SHORT[i]}</span>`; }).join('')}</div>
      ${planned ? `<p class="small muted">Laatste 7 dagen: <b>${fmtMin(doneP)}</b> gedaan van ${fmtMin(planned)} gepland (${Math.min(999, Math.round(doneP / planned * 100))}%).</p>` : ''}</section>
    <section class="card section stack"><h2>Minuten per dag</h2><p class="muted small">Laatste 14 dagen</p>
      <div class="chart"><span class="ymax">${fmtMin(max)}</span><div class="bars">${days.map((d, i) => `<button class="b${d === T ? ' today' : ''}${mins[i] ? '' : ' zero'}" data-act="bar" aria-label="${fmtDay(d, 'long')}: ${fmtMin(mins[i])}"><span class="tip">${fmtDay(d)} · ${fmtMin(mins[i])}</span><span class="bv" style="height:${mins[i] ? Math.max(3, mins[i] / max * 100) : 0}%"></span></button>`).join('')}</div>
      <div class="axis">${days.map((d, i) => `<span>${i % 2 || d === T ? parseDay(d).getDate() : ''}</span>`).join('')}</div></div></section>
    <section class="card section stack"><h2>Tijd per vak</h2>${byC.length ? `<div class="hbars">${byC.map(([c, m]) => `<div class="hb" style="${cc(c)}"><div class="lab"><b>${emo(c)} ${esc(c.name)}</b><span class="num muted">${fmtMin(m)}</span></div><div class="tr"><span style="width:${m / mc * 100}%"></span></div></div>`).join('')}</div>` : '<p class="muted small">Vink taken af of gebruik de timer, dan zie je hier waar je tijd naartoe gaat.</p>'}</section>
    <section class="card section stack"><h2>Voortgang per vak</h2>${listCourses().length ? `<div class="hbars">${listCourses().map(c => { const p = courseProgress(c); return `<div class="hb" style="${cc(c)}"><div class="lab"><b>${emo(c)} ${esc(c.name)}</b><span class="num muted">${p.pct}% · ${examTxt(c)}</span></div><div class="tr"><span style="width:${p.pct}%"></span></div></div>`; }).join('')}</div>` : '<p class="muted small">Nog geen vakken.</p>'}</section>
    ${friendsBoard()}
    <section class="card section stack"><h2>Badges <span class="muted small">${badges.filter(b => b[3]).length}/${badges.length}</span></h2><div class="badges">${badges.map(([e, n, d, ok]) => `<div class="badge${ok ? '' : ' locked'}"><span class="be">${e}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div></section>
    ${graded.length ? `<section class="card section stack"><h2>🎓 Resultaten</h2><table class="grades"><tr><th>Vak</th><th>SP</th><th style="text-align:right">Cijfer</th></tr>${graded.map(c => `<tr><td>${emo(c)} ${esc(c.name)}</td><td>${esc(c.credits || '–')}</td><td class="n"><b>${fmtGrade(c)}</b></td></tr>`).join('')}<tr><td><b>Gewogen gemiddelde</b></td><td></td><td class="n"><b>${avgGrade(graded)}</b></td></tr></table></section>` : ''}
    <section class="section row"><button class="btn sm" data-act="ics-all">📆 Alle examens naar mijn agenda (.ics)</button></section>`;
}
ACT.bar = el => { document.querySelectorAll('.bars .b.show').forEach(b => b !== el && b.classList.remove('show')); el.classList.toggle('show'); };

/* ---------- friends: who studied today / this week ---------- */
const Social = {
  rows: [], names: {}, at: 0,
  async load(force) {
    if (!Sync.user || !Sync.sb || (!force && Date.now() - this.at < 60000)) return false;
    try {
      const from = addDays(todayKey(), -6);
      const { data, error } = await withTimeout(Sync.sb.from('planner_days').select('user_id,day,minutes,pages,tasks').gte('day', from).neq('user_id', Sync.user.id), 10000);
      if (error) throw error;
      this.rows = data || []; this.at = Date.now();
      const ids = [...new Set(this.rows.map(r => r.user_id))].filter(id => !this.names[id]);
      if (ids.length) { const p = await Sync.sb.from('profiles').select('id,username').in('id', ids); (p.data || []).forEach(x => { this.names[x.id] = x.username; }); }
      return true;
    } catch (e) { return false; }
  },
  week() { const m = {}; for (const r of this.rows) { const o = m[r.user_id] || (m[r.user_id] = { id: r.user_id, min: 0, pages: 0, today: 0 }); o.min += r.minutes; o.pages += r.pages; if (r.day === todayKey()) o.today = r.minutes; } return Object.values(m); }
};
const hueOf = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const avatarHtml = n => `<span class="avatar" style="--h:${hueOf(n)}" aria-hidden="true">${esc(String(n || '?').slice(0, 1).toUpperCase())}</span>`;
function friendsCard() {
  const fr = Social.week().filter(f => f.today > 0).sort((a, b) => b.today - a.today);
  if (!fr.length) return '';
  return `<section class="card section stack"><h2>👥 Vrienden vandaag</h2><div class="friends">${fr.slice(0, 6).map(f => { const n = Social.names[f.id] || 'vriend'; return `<div class="friend">${avatarHtml(n)}<span class="grow">@${esc(n)}</span><b class="num">${fmtMin(f.today)}</b></div>`; }).join('')}</div></section>`;
}
function friendsBoard() {
  if (!Sync.user) return '';
  const me = { id: 'me', min: rangeTotals(addDays(todayKey(), -6), todayKey()).min, me: true };
  const all = [...Social.week(), me].sort((a, b) => b.min - a.min);
  if (all.length < 2) return `<section class="card section stack"><h2>👥 Vrienden</h2><p class="muted small">Voeg vrienden toe in Flashcards, dan zie je hier wie er deze week het meest studeerde.</p><a class="btn sm" href="flashcards.html" style="justify-self:start">Naar Flashcards</a></section>`;
  return `<section class="card section stack"><h2>👥 Deze week met vrienden</h2><div class="friends">${all.slice(0, 10).map((f, i) => { const n = f.me ? (Sync.me ? Sync.me.username : 'ik') : (Social.names[f.id] || 'vriend'); return `<div class="friend"><b class="num" style="width:22px">${['🥇', '🥈', '🥉'][i] || i + 1}</b>${avatarHtml(n)}<span class="grow">${f.me ? '<b>Jij</b>' : '@' + esc(n)}</span><b class="num">${fmtMin(f.min)}</b></div>`; }).join('')}</div><p class="help">Vrienden zien alleen hoeveel minuten en pagina's je per dag studeerde, niet wát.</p></section>`;
}

/* ---------- calendar export ---------- */
const icsDate = k => k.replace(/-/g, '');
function examTimes(c) {
  if (!c.examTime) return { allDay: true, a: icsDate(c.exam), b: icsDate(addDays(c.exam, 1)) };
  const [h, m] = c.examTime.split(':').map(Number), e = new Date(parseDay(c.exam)); e.setHours(h + 2, m);
  return { allDay: false, a: `${icsDate(c.exam)}T${pad2(h)}${pad2(m)}00`, b: `${icsDate(dkey(e))}T${pad2(e.getHours())}${pad2(e.getMinutes())}00` };
}
function gcalLink(c) {
  const t = examTimes(c);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(`Examen ${c.name}`) + `&dates=${t.a}/${t.b}` +
    '&details=' + encodeURIComponent([c.examType, c.prof && 'Prof: ' + c.prof].filter(Boolean).join('\n')) + '&location=' + encodeURIComponent(c.examPlace || '');
}
function downloadIcs(courses, _unused, filename) {
  const cs = courses.filter(c => c && validDay(c.exam));
  if (!cs.length) { toast('Geen examens met een datum gevonden.'); return; }
  const e = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ev = cs.map(c => { const t = examTimes(c); return ['BEGIN:VEVENT', `UID:exam-${c.id}@unistudy`, `DTSTAMP:${stamp}`, t.allDay ? `DTSTART;VALUE=DATE:${t.a}` : `DTSTART:${t.a}`, t.allDay ? `DTEND;VALUE=DATE:${t.b}` : `DTEND:${t.b}`, `SUMMARY:${e('Examen ' + c.name)}`, c.examPlace ? `LOCATION:${e(c.examPlace)}` : '', `DESCRIPTION:${e([c.examType, c.prof && 'Prof: ' + c.prof].filter(Boolean).join('\n'))}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Examen morgen', 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n'); });
  download(filename || 'examens.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uni Study//NL', ...ev, 'END:VCALENDAR'].join('\r\n'), 'text/calendar');
}
function download(name, text, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
ACT['ics-all'] = () => downloadIcs(listCourses().filter(c => c.exam >= todayKey()), false, 'examens.ics');

/* =========================================================
   Personalise: themes, own colours, fonts, corners, backgrounds
   ========================================================= */
function saveLook(look) { const l = UniLook.set(look); cfg().look = l; touchSettings(); return l; }
function themeOpt(k, look) {
  const t = k === 'eigen' ? UniLook.preview({ theme: 'eigen', custom: look.custom || {} }) : UniLook.THEMES[k];
  const v = t.v ? [t.v.bg, t.v.surface, t.v.accent, t.v.ink] : t.preview;
  return `<button class="theme-opt" data-act="theme" data-v="${k}" aria-pressed="${look.theme === k}"><span class="theme-prev" style="background:${v[0]}"><i style="left:8%;top:18%;width:54%;height:64%;background:${v[1]}"></i><i style="right:8%;top:18%;width:22%;height:28%;background:${v[2]}"></i><i style="left:14%;top:32%;width:30%;height:10%;background:${v[3]}"></i></span>${k === 'eigen' ? '🎨 Eigen' : esc(t.name)}</button>`;
}
SHEETS.look = () => {
  const look = UniLook.get(), cu = Object.assign({ accent: '#C92E68', bg: '#FFF0F5', surface: '#FFFFFF', ink: '#2B1B24' }, look.custom || {});
  const pick = (obj, key, act) => `<div class="chips-pick">${Object.entries(obj).map(([k, v]) => `<button data-act="${act}" data-v="${k}" aria-pressed="${look[key] === k}"${act === 'look-font' && v.body ? ` style="font-family:${esc(v.display)},sans-serif"` : ''}>${esc(v.name || v[0])}</button>`).join('')}</div>`;
  return sheetHead('🎨 Personaliseren') + `<div class="stack">
    <div class="stack"><span class="lbl">Thema</span><div class="themes">${Object.keys(UniLook.THEMES).map(k => themeOpt(k, look)).join('')}${themeOpt('eigen', Object.assign({}, look, { custom: cu }))}</div></div>
    <div class="card flat stack"><span class="lbl">🎨 Eigen thema — kies je kleuren</span>
      <div class="fgrid keep">${[['accent', 'Accentkleur'], ['bg', 'Achtergrond'], ['surface', 'Kaartjes'], ['ink', 'Tekst']].map(([k, l]) => `<label class="row"><input type="color" class="field" name="look-${k}" value="${esc(cu[k])}" data-input="look-color"><span class="small">${l}</span></label>`).join('')}</div>
      <p class="help">Verander een kleur en je eigen thema wordt meteen toegepast.</p></div>
    <div class="stack"><span class="lbl">Lettertype</span>${pick(UniLook.FONTS, 'font', 'look-font')}</div>
    <div class="stack"><span class="lbl">Hoekjes</span>${pick(UniLook.RADII, 'radius', 'look-radius')}</div>
    <div class="stack"><span class="lbl">Ruimte</span>${pick(UniLook.DENSITY, 'density', 'look-density')}</div>
    <div class="stack"><span class="lbl">Achtergrond</span>${pick(UniLook.BGS, 'bg', 'look-bg')}
      <label class="btn sm" style="justify-self:start">🖼️ Eigen foto kiezen<input type="file" accept="image/*" hidden data-change="look-photo"></label><p class="help">Je foto blijft op dit toestel.</p></div>
    <div class="stack"><span class="lbl">Vandaag-scherm</span><div class="chips-pick">${[['list', '☰ Lijst'], ['cards', '▦ Kaartjes'], ['timeline', '🕘 Tijdlijn']].map(([k, l]) => `<button data-act="look-layout" data-v="${k}" aria-pressed="${cfg().layout === k}">${l}</button>`).join('')}</div></div>
    <div class="stack"><span class="lbl">Geluid van de timer</span><div class="chips-pick">${[['bel', '🔔 Bel'], ['zacht', '🎵 Zacht'], ['geen', '🔇 Geen']].map(([k, l]) => `<button data-act="look-sound" data-v="${k}" aria-pressed="${cfg().sound === k}">${l}</button>`).join('')}</div></div>
    ${[['confetti', '🎉 Confetti bij afvinken', cfg().confetti], ['vibrate', '📳 Trillen (gsm)', cfg().vibrate], ['flash', '🗂️ Ook toepassen op Flashcards', look.flash !== false]].map(([k, l, on]) => `<div class="toggle-row"><b>${l}</b><span class="switch"><input type="checkbox" ${on ? 'checked' : ''} data-change="look-toggle" data-k="${k}" aria-label="${l}"><i></i></span></div>`).join('')}
    <button class="btn" data-act="look-reset">↺ Terug naar standaard</button></div>`;
};
const lookSet = (k) => el => { const l = UniLook.get(); l[k] = el.dataset.v; saveLook(l); redrawSheet(); };
Object.assign(ACT, {
  look() { openSheet('look'); }, settings() { openSheet('settings'); },
  theme(el) { const l = UniLook.get(); l.theme = el.dataset.v; if (l.theme === 'eigen' && !l.custom) l.custom = { accent: '#C92E68', bg: '#FFF0F5', surface: '#FFFFFF', ink: '#2B1B24' }; saveLook(l); if (sheet) redrawSheet(); else render(); },
  'look-font': lookSet('font'), 'look-radius': lookSet('radius'), 'look-density': lookSet('density'),
  'look-bg'(el) { if (el.dataset.v === 'foto' && !UniLook.photo()) { toast('Kies eerst een foto met de knop hieronder 🖼️'); return; } lookSet('bg')(el); },
  'look-layout'(el) { cfg().layout = el.dataset.v; touchSettings(); render(); redrawSheet(); },
  'look-sound'(el) { cfg().sound = el.dataset.v; touchSettings(); beep('done'); redrawSheet(); },
  'look-reset'() { saveLook(Object.assign({}, UniLook.DEFAULT)); redrawSheet(); toast('Terug naar het standaard uiterlijk'); }
});
INPUT['look-color'] = el => {
  const box = el.closest('.sheet'), l = UniLook.get(), cu = {};
  ['accent', 'bg', 'surface', 'ink'].forEach(k => { cu[k] = box.querySelector(`input[name="look-${k}"]`).value; });
  l.theme = 'eigen'; l.custom = cu; UniLook.set(l); cfg().look = l;
  clearTimeout(INPUT.t); INPUT.t = setTimeout(touchSettings, 600);
  box.querySelectorAll('.theme-opt').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'eigen'));
};
Object.assign(CHANGE, {
  'look-toggle'(el) { const k = el.dataset.k; if (k === 'flash') { const l = UniLook.get(); l.flash = el.checked; saveLook(l); } else { cfg()[k] = el.checked; touchSettings(); if (k === 'confetti' && el.checked) confetti([], 40); } },
  'look-photo'(el) {
    const file = el.files[0]; if (!file) return;
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, 1400 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      if (!UniLook.setPhoto(cv.toDataURL('image/jpeg', .72))) { toast('Deze foto is te groot om te bewaren. Kies een kleinere.'); return; }
      const l = UniLook.get(); l.bg = 'foto'; saveLook(l); redrawSheet(); toast('Achtergrond ingesteld 🖼️');
    };
    img.onerror = () => toast('Deze afbeelding kon ik niet openen.'); img.src = url; el.value = '';
  }
});

/* =========================================================
   Settings
   ========================================================= */
SHEETS.settings = () => {
  const s = cfg(), p = s.pomo, T = todayKey(), offs = s.offDays.filter(d => d >= T).sort();
  const n = (name, val, label, extra = '') => `<label class="fld"><span>${label}</span><input class="field" type="number" name="${name}" value="${val}" inputmode="decimal" ${extra}></label>`;
  return sheetHead('⚙️ Instellingen') + `<form class="form" data-form="settings">
    <label class="fld"><span>Je naam</span><input class="field" name="name" value="${esc(s.name)}" maxlength="30"></label>
    <div class="card flat stack"><span class="lbl">🕒 Hoeveel uur kan je studeren per dag?</span><div class="fgrid three keep" style="grid-template-columns:repeat(4,1fr)">${DAYS_SHORT.map((d, i) => `<label class="fld"><span>${d}</span><input class="field" type="number" name="cap${i}" min="0" max="16" step="0.5" value="${s.cap[i] / 60}" inputmode="decimal"></label>`).join('')}</div><p class="help">0 = die dag studeer je nooit. Losse vrije dagen zet je hieronder of in de kalender.</p>
      <div class="fgrid keep"><label class="fld"><span>Ik begin om</span><input class="field" type="time" name="startTime" value="${esc(s.startTime)}"></label>${n('breakMin', s.breakMin, 'Pauze tussen taken (min)', 'min="0" max="60"')}</div></div>
    <div class="card flat stack"><span class="lbl">🌴 Vrije dagen</span><div class="chips-pick">${offs.map(d => `<button type="button" data-act="off-del" data-day="${d}" aria-pressed="false">${fmtDay(d)} ✕</button>`).join('') || '<span class="muted small">Nog geen vrije dagen.</span>'}</div>
      <div class="row"><input class="field grow" type="date" id="off-from" min="${T}" aria-label="Van"><input class="field grow" type="date" id="off-to" min="${T}" aria-label="Tot en met (optioneel)"><button type="button" class="btn sm" data-act="off-add">+ Toevoegen</button></div><p class="help">Eén dag, of een periode (van – tot en met), bv. een vakantie.</p></div>
    <div class="card flat stack"><span class="lbl">📖 Tempo (standaard, per vak aan te passen)</span><div class="fgrid">${n('minPerPage', s.minPerPage, 'Minuten per pagina studeren', 'min="0.5" step="0.5"')}${n('minPerSlide', s.minPerSlide, 'Minuten per dia', 'min="0.5" step="0.5"')}${n('prepMinPerPage', s.prepMinPerPage, 'Minuten per pagina samenvatten', 'min="0.5" step="0.5"')}${n('summaryRatio', s.summaryRatio, 'Samenvatting = % van de cursus', 'min="5" max="100"')}</div></div>
    <div class="card flat stack"><span class="lbl">🔁 Herhalen</span><label class="fld"><span>Herhaalschema (dagen nadat je iets kent)</span><input class="field" name="reviewOffsets" value="${s.reviewOffsets.join(', ')}" placeholder="1, 3, 7, 14"><span class="help">Leeg = geen herhalingen</span></label>
      <div class="fgrid">${n('reviewPct', s.reviewPct, 'Een herhaling duurt … % van de studeertijd', 'min="0" max="100"')}${n('buffer', s.buffer, 'Buffer-dagen vóór elk examen', 'min="0" max="30"')}${n('finalPct', s.finalPct, 'Eindherhaling duurt … % van de studeertijd', 'min="0" max="100"')}${n('cardsSec', s.cardsSec, 'Seconden per flashcard', 'min="3" max="120"')}</div></div>
    <div class="card flat stack"><span class="lbl">🍅 Pomodoro</span><div class="fgrid">${n('pFocus', p.focus, 'Focus (min)', 'min="1" max="240"')}${n('pShort', p.short, 'Korte pauze (min)', 'min="1" max="60"')}${n('pLong', p.long, 'Lange pauze (min)', 'min="1" max="120"')}${n('pEvery', p.every, 'Lange pauze na … rondes', 'min="1" max="12"')}</div>
      <label class="check-row"><input type="checkbox" name="autoBreak" ${p.autoBreak ? 'checked' : ''}> Pauze start vanzelf</label><label class="check-row"><input type="checkbox" name="autoFocus" ${p.autoFocus ? 'checked' : ''}> Volgende focus start vanzelf</label></div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="sheet-close">Sluiten</button><button class="btn primary">Opslaan</button></div></form>
    <section class="section menu">
      <button data-act="look"><i>🎨</i><span>Personaliseren<small>Thema, kleuren, lettertype, achtergrond</small></span></button>
      ${Sync.user ? `<button data-act="logout"><i>👤</i><span>Uitloggen${Sync.me ? ' (@' + esc(Sync.me.username) + ')' : ''}<small>Ook uit Flashcards. Je planning blijft veilig in je account.</small></span></button>` : `<a href="flashcards.html#auth"><i>☁️</i><span>Inloggen of account maken<small>Je planning op al je toestellen</small></span></a>`}
      <button data-act="roster"><i>🎓</i><span>Examenroosters<small>Deel je examens met vrienden en bekijk die van hen</small></span></button>
      <button data-act="ics-all"><i>📆</i><span>Examens naar mijn agenda<small>Google, Apple of Outlook (.ics)</small></span></button>
      <button data-act="backup"><i>💾</i><span>Back-up downloaden</span></button>
      <label class="btn ghost" style="justify-content:flex-start"><i>📂</i>&nbsp; Back-up terugzetten<input type="file" accept=".json,application/json" hidden data-change="restore"></label>
      <button data-act="wipe"><i>🗑</i><span style="color:var(--again)">Alle planning wissen</span></button>
    </section>`;
};
Object.assign(ACT, {
  'off-add'() {
    const a = document.getElementById('off-from').value, b = document.getElementById('off-to').value || a;
    if (!validDay(a) || b < a) { toast('Kies een datum.'); return; }
    const set = new Set(cfg().offDays); for (let d = a, i = 0; d <= b && i < 120; d = addDays(d, 1), i++) set.add(d);
    cfg().offDays = [...set].filter(d => d >= addDays(todayKey(), -30)).sort(); touchSettings(); render(); redrawSheet();
  },
  'off-del'(el) { cfg().offDays = cfg().offDays.filter(d => d !== el.dataset.day); touchSettings(); render(); redrawSheet(); },
  async logout() { await Sync.signOut(); closeSheetIfOpen(); render(); toast('Uitgelogd. Je planning staat veilig in je account.'); },
  backup() { download(`uni-study-backup-${todayKey()}.json`, JSON.stringify({ app: 'uni-study-planner', v: 1, state }), 'application/json'); },
  wipe() {
    if (!confirm('Alle vakken, hoofdstukken, taken en statistieken wissen? Je flashcards blijven bestaan. Dit kan je niet ongedaan maken.')) return;
    for (const col of COLS) for (const id of Object.keys(state[col])) drop(col, id);
    commit(); view = { tab: 'today' }; closeSheetIfOpen(); render(); toast('Alles gewist');
  }
});
CHANGE.restore = async el => {
  try {
    const j = JSON.parse(await el.files[0].text()); if (!j || !j.state) throw new Error('bad');
    const inc = normalize(j.state), now = Date.now();
    for (const col of COLS) for (const it of Object.values(inc[col])) if (it) it.u = now;
    state = normalize(mergeState(state, inc)); commit(); closeSheetIfOpen(); render(); toast('Back-up teruggezet ✓');
  } catch (e) { toast('Dit is geen geldige Uni Study back-up.'); }
  el.value = '';
};
FORMS.settings = f => {
  const v = harvest(f), s = cfg(), g = (k, a, b, d) => clamp(num(v[k], d), a, b);
  s.name = (v.name || '').trim().slice(0, 30);
  s.cap = DAYS_SHORT.map((_, i) => Math.round(clamp(num(v['cap' + i], 0), 0, 16) * 60));
  s.startTime = v.startTime || '09:00'; s.breakMin = g('breakMin', 0, 60, 10);
  s.minPerPage = g('minPerPage', .5, 120, 8); s.minPerSlide = g('minPerSlide', .25, 60, 3); s.prepMinPerPage = g('prepMinPerPage', .5, 120, 10); s.summaryRatio = g('summaryRatio', 5, 100, 50);
  s.reviewOffsets = String(v.reviewOffsets || '').split(/[\s,;]+/).map(x => int(x)).filter(x => x > 0 && x <= 120);
  s.reviewPct = g('reviewPct', 0, 100, 25); s.buffer = Math.round(g('buffer', 0, 30, 3)); s.finalPct = g('finalPct', 0, 100, 40); s.cardsSec = g('cardsSec', 3, 120, 15);
  s.pomo = { focus: Math.round(g('pFocus', 1, 240, 25)), short: Math.round(g('pShort', 1, 60, 5)), long: Math.round(g('pLong', 1, 120, 15)), every: Math.round(g('pEvery', 1, 12, 4)), autoBreak: !!v.autoBreak, autoFocus: !!v.autoFocus };
  if (!Timer.s.running) { Timer.s.remain = 0; Timer.save(); }
  touchSettings(); closeSheet(); render(); toast('Instellingen opgeslagen ✓');
};

/* =========================================================
   Events
   ========================================================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'A') e.preventDefault();
  try { fn(el, e); } catch (err) { console.error(err); toast('Oei, dat lukte niet.'); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHANGE[el.dataset.change]) { try { CHANGE[el.dataset.change](el); } catch (err) { console.error(err); } } });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUT[el.dataset.input]) INPUT[el.dataset.input](el); });
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); try { FORMS[f.dataset.form](f); } catch (err) { console.error(err); toast('Opslaan lukte niet.'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (document.getElementById('focus')) { closeFocus(); render(); } else if (sheet) closeSheet(); } });
document.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('[data-task]'); if (t) e.dataTransfer.setData('text/plain', t.dataset.task); });
document.addEventListener('dragover', e => {
  const z = e.target.closest && (e.target.closest('.day[data-day]:not(.past)') || e.target.closest('#drop')); if (!z) return;
  e.preventDefault(); z.classList.add(z.id === 'drop' ? 'over' : 'drop');
});
document.addEventListener('dragleave', e => { const z = e.target.closest && (e.target.closest('.day[data-day]') || e.target.closest('#drop')); if (z && !z.contains(e.relatedTarget)) z.classList.remove('drop', 'over'); });
document.addEventListener('drop', e => {
  const up = e.target.closest && e.target.closest('#drop');
  if (up) { e.preventDefault(); up.classList.remove('over'); addUploadFiles([...e.dataTransfer.files]); return; }
  const z = e.target.closest && e.target.closest('.day[data-day]:not(.past)'); if (!z) return;
  e.preventDefault(); const t = getTask(e.dataTransfer.getData('text/plain')); if (!t) return;
  t.day = z.dataset.day; put('tasks', t); commit(); render(); toast(`Verplaatst naar ${fmtDay(t.day)}`);
});

/* =========================================================
   Start
   ========================================================= */
Hooks.sync = () => { const d = document.querySelector('.sync-dot'); if (d) d.className = 'sync-dot ' + Sync.status; };
Hooks.remote = () => {
  const l = cfg().look; if (l && JSON.stringify(l) !== JSON.stringify(UniLook.get())) UniLook.set(l);
  if (!sheet && !isTyping()) render();
};
async function refreshAll(force) {
  if (Sync.user) await Sync.pull();
  await Flash.refresh(force); snapDecks();
  await Social.load(force);
  if (!sheet && !isTyping() && !document.getElementById('focus')) render();
}
if (cfg().look) UniLook.set(cfg().look); else cfg().look = UniLook.get();
render();
setInterval(() => Timer.tick(), 500);
let shownDay = todayKey();
setInterval(() => { if (todayKey() !== shownDay) { shownDay = todayKey(); if (!sheet && !isTyping()) render(); } }, 30000);
Sync.init().then(() => refreshAll(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Timer.tick(); refreshAll(false); } else if (Sync.user) Sync.push(); });
window.addEventListener('storage', e => { if (e.key === FC.decks) { Flash.localAt = 0; Flash.ver++; if (!sheet && !isTyping()) render(); } });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

/* =========================================================
   Exam schedule: share it with friends, see theirs
   ========================================================= */
const LS_EXSIG = 'unistudy.examsig.v1';
const Roster = { rows: [], at: 0, loading: false };
function myExams() {
  const T = todayKey();
  return listCourses().filter(c => validDay(c.exam) && c.exam >= T).sort((a, b) => (a.exam + (a.examTime || '')) < (b.exam + (b.examTime || '')) ? -1 : 1)
    .map(c => ({ n: c.name.slice(0, 60), e: c.emoji, c: c.color, d: c.exam, t: c.examTime || '', k: c.examType || '', p: (c.examPlace || '').slice(0, 80) }));
}
async function pushExams() {
  if (!Sync.user || !Sync.sb) return;
  const share = !!cfg().shareExams, list = share ? myExams() : null, sig = Sync.user.id + JSON.stringify(list);
  if (lsGet(LS_EXSIG, '') === sig) return;
  try {
    const q = share ? Sync.sb.from('planner_exams').upsert({ user_id: Sync.user.id, exams: list, updated_at: new Date().toISOString() })
      : Sync.sb.from('planner_exams').delete().eq('user_id', Sync.user.id);
    const { error } = await q; if (!error) lsSet(LS_EXSIG, sig);
  } catch (e) { /* try again next sync */ }
}
async function loadRoster(force) {
  if (!Sync.user || !Sync.sb || Roster.loading || (!force && Date.now() - Roster.at < 60000)) return;
  Roster.loading = true;
  try {
    const { data, error } = await withTimeout(Sync.sb.from('planner_exams').select('user_id,exams,updated_at').neq('user_id', Sync.user.id), 10000);
    if (error) throw error;
    Roster.rows = (data || []).filter(r => Array.isArray(r.exams)); Roster.at = Date.now();
    const ids = Roster.rows.map(r => r.user_id).filter(id => !Social.names[id]);
    if (ids.length) { const p = await Sync.sb.from('profiles').select('id,username').in('id', ids); (p.data || []).forEach(x => { Social.names[x.id] = x.username; }); }
  } catch (e) { /* offline */ }
  Roster.loading = false;
  if (sheet && sheet.kind === 'roster') redrawSheet();
}
function examLine(x, mine) {
  const same = mine && mine.find(m => m.d === x.d);
  return `<div class="sess" style="--cc:${esc(x.c || 'var(--accent)')}"><i></i><span class="grow"><b>${emoHtml(x.e || '📝')} ${esc(x.n)}</b><br><span class="small muted">${fmtDay(x.d, 'long')}${x.t ? ' · ' + esc(x.t) : ''}${x.k ? ' · ' + esc(x.k) : ''}${x.p ? ' · 📍 ' + esc(x.p) : ''}${same ? ` · <span class="tag acc">zelfde dag als jouw ${esc(same.n)}</span>` : ''}</span></span><span class="tag">${relDay(x.d)}</span></div>`;
}
function rosterText() {
  const ex = myExams(); if (!ex.length) return '';
  return `📚 Mijn examenrooster${myName() ? ' (' + myName() + ')' : ''}:\n` + ex.map(x => `${emoTxt(x.e)} ${x.n} — ${fmtDay(x.d, 'long')}${x.t ? ' om ' + x.t : ''}${x.k ? ' (' + x.k + ')' : ''}${x.p ? ', ' + x.p : ''}`).join('\n') + '\n\nGemaakt met Uni Study 🎓 ' + location.origin + location.pathname.replace(/[^/]*$/, '');
}
SHEETS.roster = () => {
  const mine = myExams(), T = todayKey();
  const friends = Roster.rows.map(r => ({ name: Social.names[r.user_id] || 'vriend', ex: r.exams.filter(x => x && validDay(x.d) && x.d >= T).sort((a, b) => a.d < b.d ? -1 : 1) })).filter(f => f.ex.length).sort((a, b) => a.name.localeCompare(b.name));
  return sheetHead('🎓 Examenroosters') + `<div class="stack">
    <section class="card flat stack"><h3>Mijn examens</h3>
      ${mine.length ? `<div class="sessions">${mine.map(x => examLine(x)).join('')}</div>` : '<p class="muted small">Nog geen examens. Zet een examendatum bij je vakken.</p>'}
      ${Sync.user ? `<div class="toggle-row"><div><b>Deel met mijn vrienden</b><p class="help">Je vrienden zien je vakken met datum, uur, soort en locatie. Niets anders.</p></div><span class="switch"><input type="checkbox" ${cfg().shareExams ? 'checked' : ''} data-change="share-exams" aria-label="Deel mijn examenrooster met vrienden"><i></i></span></div>` : `<p class="help">Log in om je rooster met vrienden in de app te delen.</p><a class="btn sm" href="flashcards.html#auth" style="justify-self:start">Inloggen</a>`}
      ${mine.length ? `<div class="row"><button class="btn sm primary" data-act="roster-share">📤 Stuur als bericht</button><button class="btn sm" data-act="roster-copy">📋 Kopieer</button><button class="btn sm" data-act="ics-all">📆 Agenda (.ics)</button></div>` : ''}
    </section>
    <section class="stack"><h3>Van mijn vrienden</h3>
      ${!Sync.user ? '<p class="muted small">Log in om de roosters van je vrienden te zien.</p>' : Roster.loading && !Roster.at ? '<p class="muted small">Laden… ⏳</p>'
      : friends.length ? friends.map(f => `<div class="card flat stack"><div class="friend">${avatarHtml(f.name)}<b class="grow">@${esc(f.name)}</b><span class="muted small">${plural(f.ex.length, 'examen', 'examens')}</span></div><div class="sessions">${f.ex.map(x => examLine(x, mine)).join('')}</div></div>`).join('')
      : '<p class="muted small">Nog geen vrienden die hun rooster delen. Vraag hen om bij 🎓 Examenroosters "Deel met mijn vrienden" aan te zetten. Vrienden toevoegen doe je in Flashcards.</p>'}
    </section></div>`;
};
ACT.roster = () => { openSheet('roster'); loadRoster(true); };
ACT['roster-copy'] = async () => { toast(await copyText(rosterText()) ? 'Rooster gekopieerd 📋' : 'Kopiëren lukte niet.'); };
ACT['roster-share'] = async () => {
  const text = rosterText();
  try { if (navigator.share) { await navigator.share({ title: 'Mijn examenrooster', text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  toast(await copyText(text) ? 'Rooster gekopieerd — plak het in je chat 📋' : 'Delen lukte niet.');
};
CHANGE['share-exams'] = el => { cfg().shareExams = el.checked; touchSettings(); Sync.push(); toast(el.checked ? 'Je vrienden kunnen je examenrooster nu zien 👥' : 'Je examenrooster is niet meer gedeeld'); };
