'use strict';
/* =========================================================
   Uni Study — Planning: the scheduler. Made by Luca Cicarelli

   Per course the remaining work (summaries first, then studying)
   is spread so every chapter is known by its deadline, at the
   lowest even pace that makes it — weighted by how much time you
   have on each day. Known chapters come back as spaced reviews,
   the last days before the exam are for repeating everything,
   and linked flashcards get a daily block. It is recomputed from
   your real progress every day, so anything you did not get to
   is redistributed over the days that are left.
   ========================================================= */

const KIND = {
  prep: { icon: '✍️', label: 'Samenvatting maken' },
  study: { icon: '📖', label: 'Studeren' },
  review: { icon: '🔁', label: 'Herhalen' },
  final: { icon: '🎯', label: 'Alles herhalen' },
  cards: { icon: '🗂️', label: 'Flashcards' },
  task: { icon: '✅', label: 'Taak' },
  exam: { icon: '🎓', label: 'Examen' }
};
const KORDER = { exam: -1, review: 0, prep: 1, study: 2, final: 3, cards: 4, task: 5 };

const isOff = day => (cfg().offDays || []).includes(day);
const capOf = day => isOff(day) ? 0 : Math.max(0, int(cfg().cap[wday(day)], 0));
function capFor(c, day) {
  if ((c.skips || []).includes(day)) return 0;
  if (validDay(c.exam) && day >= c.exam) return 0;
  return capOf(day);
}

function buildPlan() { return memo('plan', () => computePlan(todayKey())); }

function computePlan(T) {
  const days = {}, info = {};
  const push = (d, it) => {
    const x = days[d] || (days[d] = { items: [], min: 0 });
    x.items.push(it);
    if (it.type !== 'exam') x.min += it.min || 0;
  };
  // What you already did today does not shrink today's plan: it is planned from the state at the start of the day
  const doneToday = {};
  for (const l of logsOn(T)) {
    if (!l.chapter || (l.type !== 'study' && l.type !== 'prep')) continue;
    const o = doneToday[l.chapter] || (doneToday[l.chapter] = { study: 0, prep: 0 });
    o[l.type] += l.units || 0;
  }
  let last = addDays(T, 13);
  for (const c of listCourses()) {
    const r = planCourse(c, T, doneToday, push);
    info[c.id] = r;
    if (r.last && r.last > last) last = r.last;
  }
  for (const t of Object.values(state.tasks)) {
    if (!alive(t) || !validDay(t.day)) continue;
    let d = t.day, late = false;
    if (!t.done && d < T) { d = T; late = true; }
    else if (t.done && d < T && t.doneDay === T) d = T;
    push(d, { type: 'task', id: t.id, course: t.course || '', key: 'task|' + t.id, min: num(t.min, 0), late, title: t.title, time: t.time || '' });
  }
  return { T, days, info, last };
}

function planCourse(c, T, doneToday, push) {
  const r = { need: 0, rate: 0, feasible: true, late: [], finish: '', last: '', deadline: '', reason: '', minsLeft: 0, leftover: 0, start: T, cardsPerDay: 0 };
  const pushC = (d, it) => { push(d, it); if (!r.last || d > r.last) r.last = d; };
  const exam = validDay(c.exam) ? c.exam : '';
  if (exam && exam < T) { r.reason = 'past'; return r; }
  if (exam) pushC(exam, { type: 'exam', course: c.id, key: 'exam|' + c.id, min: 0, time: c.examTime || '', place: c.examPlace || '', examType: c.examType || '' });
  const start = validDay(c.start) && c.start > T ? c.start : T;
  r.start = start;
  const buffer = courseBuffer(c);
  let deadline = '';
  if (exam) {
    deadline = addDays(exam, -1 - buffer);
    if (deadline < start) deadline = addDays(exam, -1) >= start ? addDays(exam, -1) : start;
  }
  r.deadline = deadline;
  const chs = chaptersOf(c.id);

  /* ---- the work that is left, in order ---- */
  const q = [];
  chs.forEach((ch, i) => {
    const dt = doneToday[ch.id] || { study: 0, prep: 0 };
    let due = validDay(ch.due) ? ch.due : deadline;
    if (exam && due && due >= exam) due = addDays(exam, -1);
    if (due && due < start) { r.late.push(ch.id); due = deadline && deadline > start ? (addDays(start, 2) < deadline ? addDays(start, 2) : deadline) : start; }
    const prepAt = Math.max(0, (ch.prepDone || 0) - dt.prep);
    const pLeft = ch.needSummary && (!ch.summaryMade || dt.prep > 0) ? Math.max(0, (ch.srcPages || 0) - prepAt) : 0;
    const total = studyTotal(ch);
    const doneAt = Math.max(0, (ch.done || 0) - dt.study);
    const sLeft = Math.max(0, total - doneAt);
    if (pLeft > 0) q.push({ type: 'prep', ch, left: pLeft, pos: prepAt, mpu: prepMpu(c), due, unit: 'p', i: i * 2 });
    if (sLeft > 0) q.push({ type: 'study', ch, left: sLeft, pos: doneAt, mpu: mpu(c, ch), due, unit: ch.unit === 'dia' ? 'dia' : 'p', i: i * 2 + 1 });
  });
  q.sort((a, b) => { const x = a.due || '9999', y = b.due || '9999'; return x < y ? -1 : x > y ? 1 : a.i - b.i; });
  r.minsLeft = sum(q, it => it.left * it.mpu);

  const hasDeadlines = q.some(it => it.due);
  const hasMode = (c.mode === 'pages' && num(c.minPages) > 0) || (c.mode === 'minutes' && num(c.minMinutes) > 0);
  if (q.length && !hasDeadlines && !hasMode) r.reason = 'noexam';

  /* ---- the even pace that meets every deadline ---- */
  let lambda = 0;
  if (q.length && hasDeadlines) {
    const lastDue = q.reduce((m, it) => (it.due && it.due > m ? it.due : m), start);
    const capCum = {};
    for (let d = start, a = 0, n = 0; d <= lastDue && n < 800; d = addDays(d, 1), n++) { a += capFor(c, d); capCum[d] = a; }
    let work = 0;
    for (const it of q) {
      work += it.left * it.mpu;
      if (!it.due) continue;
      const C = capCum[it.due] || 0;
      const need = C > 0 ? work / C : Infinity;
      if (need > lambda) lambda = need;
    }
  }
  if (!isFinite(lambda)) { r.feasible = false; r.noTime = true; lambda = 1.5; }
  r.need = lambda;
  if (lambda > 1.001) r.feasible = false;
  const rate = lambda * (c.priority === 'hoog' ? 1.2 : 1);
  r.rate = rate;

  /* ---- walk through the days ---- */
  const known = {};
  if (q.length && (hasDeadlines || hasMode)) {
    const modeMin = it => c.mode === 'pages' ? num(c.minPages) * it.mpu : c.mode === 'minutes' ? num(c.minMinutes) : 0;
    const limit = exam ? addDays(exam, -1) : addDays(start, 365);
    let qi = 0, carry = 0, d = start, n = 0;
    const syncReal = () => {
      // you did more than planned today: the coming days start from where you really are
      for (const it of q) {
        const ch = it.ch;
        if (it.type === 'prep') { if (ch.summaryMade) it.left = 0; else if ((ch.prepDone || 0) > it.pos) { it.pos = ch.prepDone; it.left = Math.max(0, (ch.srcPages || 0) - it.pos); } }
        else if ((ch.done || 0) > it.pos) { it.pos = ch.done; it.left = Math.max(0, studyTotal(ch) - it.pos); }
        if (it.left <= 0 && it.type === 'study' && !known[ch.id]) known[ch.id] = T;
      }
    };
    while (n++ < 800 && d <= limit) {
      while (qi < q.length && q[qi].left <= 0) qi++;
      if (qi >= q.length) break;
      const cap = capFor(c, d);
      if (cap > 0) {
        let budget = rate * cap + carry;
        const mm = modeMin(q[qi]);
        if (mm > budget) budget = mm;
        while (qi < q.length && budget > 0) {
          const it = q[qi];
          if (it.left <= 0) { qi++; continue; }
          if (c.mode !== 'task' && budget < it.mpu * .35) break;
          let u = c.mode === 'task' ? it.left : Math.min(it.left, Math.max(1, Math.round(budget / it.mpu)));
          if (c.mode !== 'task' && it.left - u > 0 && it.left - u <= 2) u = it.left; // no tiny leftovers
          const from = it.pos + 1, to = it.pos + u;
          it.pos += u; it.left -= u; budget -= u * it.mpu;
          const behind = !!(it.due && d > it.due);
          if (behind && !r.late.includes(it.ch.id)) r.late.push(it.ch.id);
          pushC(d, { type: it.type, course: c.id, chapter: it.ch.id, from, to, units: u, unit: it.unit, min: u * it.mpu, key: `${d}|${it.type}|${it.ch.id}`, behind });
          if (it.left <= 0) { if (it.type === 'study') known[it.ch.id] = d; r.finish = d; qi++; }
        }
        carry = Math.min(budget, cap * 2);
      }
      if (d === T) syncReal();
      d = addDays(d, 1);
    }
    const leftover = sum(q, it => Math.max(0, it.left) * it.mpu);
    if (leftover > 1) { r.feasible = false; r.leftover = leftover; }
  }

  /* ---- spaced reviews of known chapters ---- */
  const offs = reviewOffsets(c);
  const rp = num(cfg().reviewPct, 25) / 100;
  if (offs.length && rp > 0) for (const ch of chs) {
    const kd = isKnown(ch) && ch.knownDay ? ch.knownDay : known[ch.id];
    if (!kd) continue;
    const tot = studyTotal(ch);
    const m = Math.max(10, Math.round(Math.max(1, tot) * mpu(c, ch) * rp));
    const revs = ch.reviews || {};
    const mk = (i, late) => ({ type: 'review', course: c.id, chapter: ch.id, idx: i, n: offs.length, units: 0, unit: ch.unit === 'dia' ? 'dia' : 'p', from: 1, to: tot, min: m, key: `rev|${ch.id}|${i}`, late: !!late });
    let overdue = -1, onToday = false;
    offs.forEach((off, i) => {
      if (revs[i]) { if (revs[i] === T) { pushC(T, mk(i)); onToday = true; } return; }
      let rd = addDays(kd, off), g = 0;
      while (capFor(c, rd) === 0 && g++ < 10 && (!exam || rd < exam)) rd = addDays(rd, 1);
      if (exam && rd >= exam) return;
      if (rd < T) { overdue = i; return; }
      if (rd === T) onToday = true;
      pushC(rd, mk(i));
    });
    if (overdue >= 0 && !onToday) pushC(T, mk(overdue, true));
  }

  /* ---- the last days before the exam: repeat everything ---- */
  const fp = num(cfg().finalPct, 40) / 100;
  if (exam && fp > 0 && buffer > 0) {
    const bdays = [];
    for (let d = addDays(deadline, 1), n = 0; d < exam && n < 60; d = addDays(d, 1), n++) if (d >= T && capFor(c, d) > 0) bdays.push(d);
    const per = chs.filter(ch => studyTotal(ch) > 0).map(ch => ({ ch, m: studyTotal(ch) * mpu(c, ch) * fp }));
    const total = sum(per, p => p.m), capSum = sum(bdays, d => capFor(c, d));
    if (bdays.length && total > 0 && capSum > 0) {
      let a = 0; const spans = per.map(p => { const s = { ch: p.ch, from: a, to: a + p.m }; a += p.m; return s; });
      let acc = 0;
      bdays.forEach((d, di) => {
        const ds = acc, de = di === bdays.length - 1 ? total : acc + total * capFor(c, d) / capSum; acc = de;
        const inDay = spans.filter(s => Math.min(s.to, de) - Math.max(s.from, ds) > .5);
        if (!inDay.length) return;
        pushC(d, { type: 'final', course: c.id, chapters: inDay.map(s => s.ch.id), min: de - ds, key: `fin|${c.id}|${d}`, lastDay: di === bdays.length - 1 });
      });
    }
  }

  /* ---- flashcards linked to this course ---- */
  const fs = Flash.courseStats(c);
  if (fs.decks && fs.total && (!exam || T < exam)) {
    const sec = num(cfg().cardsSec, 15);
    const daysLeft = exam ? Math.max(1, diffDays(T, exam) - 1 - Math.min(buffer, 2)) : 0;
    const perDay = fs.nw ? (exam ? Math.ceil(fs.nw / daysLeft) : fs.newToday) : 0;
    r.cardsPerDay = perDay;
    const nNew = Math.min(fs.nw, perDay);
    if (fs.due + nNew > 0) pushC(T, { type: 'cards', course: c.id, key: `cards|${c.id}|${T}`, due: fs.due, nNew, min: Math.max(5, (fs.due + nNew * 3) * sec / 60) });
    if (exam) for (let d = addDays(T, 1), k = 0; d < exam && k < 90; d = addDays(d, 1), k++) {
      if (capFor(c, d) > 0) pushC(d, { type: 'cards', course: c.id, key: `cards|${c.id}|${d}`, due: 0, nNew: Math.min(perDay, fs.nw), min: Math.max(5, Math.min(45, (perDay * 3 + 10) * sec / 60)), future: true });
    }
  }
  return r;
}

/* ---------- reading the plan ---------- */
function sortItems(items) {
  const ex = it => { const c = getCourse(it.course); return c && validDay(c.exam) ? c.exam : '9999'; };
  const ord = it => { const c = getCourse(it.course); return c ? (c.order ?? 0) : 999; };
  return items.slice().sort((a, b) => {
    const x = ex(a), y = ex(b);
    if (x !== y) return x < y ? -1 : 1;
    if (ord(a) !== ord(b)) return ord(a) - ord(b);
    if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
    return KORDER[a.type] - KORDER[b.type];
  });
}
const itemUnitsDone = it => sum(logsFor(it.key), l => l.units);
function itemPos(it) {
  const ch = getChapter(it.chapter); if (!ch) return 0;
  if (it.type === 'prep') return ch.summaryMade ? Infinity : (ch.prepDone || 0);
  return ch.done || 0;
}
function itemDone(it) {
  if (it.type === 'task') { const t = getTask(it.id); return !!(t && t.done); }
  if (it.type === 'review') { const ch = getChapter(it.chapter); return !!(ch && ch.reviews && ch.reviews[it.idx]); }
  if (it.type === 'exam') return false;
  if (it.type === 'study' || it.type === 'prep') return itemUnitsDone(it) >= it.units || itemPos(it) >= it.to;
  return logsFor(it.key).length > 0;
}
function itemFrac(it) {
  if (itemDone(it)) return 1;
  if (it.type !== 'study' && it.type !== 'prep') return 0;
  const byLog = itemUnitsDone(it) / (it.units || 1);
  const byPos = (itemPos(it) - (it.from - 1)) / (it.units || 1);
  return clamp(Math.max(byLog, byPos), 0, 1);
}
function planDay(d) { return (buildPlan().days[d]) || { items: [], min: 0 }; }

/* remember what was planned today (for "you fell behind yesterday" and plan-vs-done stats) */
function snapshotPlan() {
  const T = todayKey();
  const m = {};
  for (const it of planDay(T).items) if (it.course && ['study', 'prep', 'review', 'final'].includes(it.type)) m[it.course] = Math.round((m[it.course] || 0) + it.min);
  const prev = state.plans[T];
  if (prev && JSON.stringify(prev.m) === JSON.stringify(m)) return;
  state.plans[T] = { id: T, u: Date.now(), m, t: sum(Object.values(m)) };
  const cut = addDays(T, -120);
  for (const k of Object.keys(state.plans)) if (k < cut) delete state.plans[k];
  saveLocal(); Sync.schedule();
}
function backlog() {
  const Y = addDays(todayKey(), -1), p = state.plans[Y];
  if (!p || !p.m) return [];
  const done = {};
  for (const l of logsOn(Y)) if (l.course) done[l.course] = (done[l.course] || 0) + (l.min || 0);
  return Object.entries(p.m).map(([cid, m]) => ({ c: getCourse(cid), left: m - (done[cid] || 0), planned: m }))
    .filter(x => x.c && !x.c.archived && x.left >= 15 && x.left > x.planned * .25);
}
/* minutes per day you need for a course over the next week */
function courseWeekLoad(cid) {
  const T = todayKey(); let m = 0, days = 0;
  for (let i = 0; i < 7; i++) { const d = addDays(T, i); const its = planDay(d).items.filter(x => x.course === cid && x.type !== 'exam'); if (its.length) days++; m += sum(its, x => x.min); }
  return { total: m, perDay: m / 7, days };
}
