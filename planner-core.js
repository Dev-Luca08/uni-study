'use strict';
/* =========================================================
   Uni Study — Planning (core): data, sync with your account,
   the link with Flashcards and page counting of your files.
   Made by Luca Cicarelli
   ========================================================= */

const LS_STATE = 'unistudy.planner.v1';
const LS_OWNER = 'unistudy.planner.owner.v1';
const LS_TIMER = 'unistudy.timer.v1';
const FC = { decks: 'tarjeta.decks.v1', shared: 'tarjeta.shared.v1', folders: 'tarjeta.folders.v1' };
const SUPA_URL = 'https://lbbrjaiowqzmgdxkkyhv.supabase.co';
const SUPA_KEY = 'sb_publishable_CvSmtVjupgSQ56MaKe_iTA_j1_kUvTq';
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';
const LIB = {
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
};

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, def = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : def; };
const int = (v, def = 0) => Math.round(num(v, def));
const pad2 = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dkey(d); };
const diffDays = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
const wday = k => (parseDay(k).getDay() + 6) % 7; // 0 = maandag
const todayKey = () => dkey();
const validDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '');
const mondayOf = k => addDays(k, -wday(k));
const flashDayNum = k => { const d = parseDay(k); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtNum = n => Number(n || 0).toLocaleString('nl-BE');
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);

const DAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
function fmtDay(k, style = 'short') {
  if (!validDay(k)) return '';
  const d = parseDay(k);
  if (style === 'long') return `${DAYS_LONG[wday(k)]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (style === 'dm') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (style === 'full') return `${DAYS_LONG[wday(k)]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${DAYS_SHORT[wday(k)]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function relDay(k) {
  const n = diffDays(todayKey(), k);
  if (n === 0) return 'vandaag'; if (n === 1) return 'morgen'; if (n === -1) return 'gisteren';
  if (n > 1) return `over ${n} dagen`;
  return `${-n} dagen geleden`;
}
function fmtMin(m) {
  m = Math.max(0, Math.round(m || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}u${pad2(r)}` : `${h}u`;
}
const unitWord = (unit, n) => unit === 'dia' ? (n === 1 ? 'dia' : "dia's") : (n === 1 ? 'pagina' : "pagina's");
const unitShort = unit => unit === 'dia' ? 'dia' : 'p.';
function rangeText(unit, from, to) {
  if (unit === 'dia') return from === to ? `dia ${from}` : `dia ${from}–${to}`;
  return from === to ? `p. ${from}` : `p. ${from}–${to}`;
}

function lsGet(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

let toastT;
function toast(msg, ms = 3200) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}

const scriptPromises = {};
function loadScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve();
  return scriptPromises[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res();
    s.onerror = () => { delete scriptPromises[src]; rej(new Error('nolib')); };
    (document.head || document.documentElement).appendChild(s);
  });
}
class UserError extends Error { constructor(msg) { super(msg); this.userMsg = msg; } }

/* =========================================================
   State: one document with courses, chapters, tasks and logs.
   Every item carries `u` (last change) so two devices can merge.
   ========================================================= */
const COLORS = ['#2F55D4', '#C92E68', '#1E8A4C', '#C77D00', '#7B4BC9', '#0E8C96', '#D2601A', '#C2352B', '#0B7A93', '#6E8B12', '#8C6CE0', '#12A37A', '#8B5A2B', '#E0457B', '#5B6675', '#D9A400'];
const DEFAULT_SETTINGS = {
  name: '', cap: [180, 180, 180, 180, 180, 120, 60], startTime: '09:00', breakMin: 10,
  minPerPage: 8, minPerSlide: 3, prepMinPerPage: 10, summaryRatio: 50,
  buffer: 3, reviewOffsets: [1, 3, 7, 14], reviewPct: 25, finalPct: 40, cardsSec: 15,
  offDays: [], layout: 'list', confetti: true, sound: 'bel', vibrate: true,
  pomo: { focus: 25, short: 5, long: 15, every: 4, autoBreak: true, autoFocus: false },
  look: null, onboarded: false, u: 0
};
const COLS = ['courses', 'chapters', 'tasks', 'logs', 'plans', 'deckSnaps'];
const clone = o => JSON.parse(JSON.stringify(o));
function newState() { return { v: 1, settings: clone(DEFAULT_SETTINGS), courses: {}, chapters: {}, tasks: {}, logs: {}, plans: {}, deckSnaps: {} }; }
function normalize(s) {
  const out = newState();
  if (!s || typeof s !== 'object') return out;
  for (const c of COLS) if (s[c] && typeof s[c] === 'object' && !Array.isArray(s[c])) out[c] = s[c];
  const st = s.settings && typeof s.settings === 'object' ? s.settings : {};
  out.settings = Object.assign(out.settings, st);
  out.settings.pomo = Object.assign({}, DEFAULT_SETTINGS.pomo, st.pomo || {});
  if (!Array.isArray(out.settings.cap) || out.settings.cap.length !== 7) out.settings.cap = DEFAULT_SETTINGS.cap.slice();
  if (!Array.isArray(out.settings.offDays)) out.settings.offDays = [];
  if (!Array.isArray(out.settings.reviewOffsets)) out.settings.reviewOffsets = DEFAULT_SETTINGS.reviewOffsets.slice();
  return out;
}
function mergeState(a, b) {
  const out = { v: 1, settings: (((b.settings || {}).u || 0) > ((a.settings || {}).u || 0)) ? b.settings : a.settings };
  for (const c of COLS) {
    const x = Object.assign({}, a[c] || {});
    for (const [id, it] of Object.entries(b[c] || {})) {
      const cur = x[id];
      if (!it) continue;
      if (!cur || (it.u || 0) > (cur.u || 0)) x[id] = it;
    }
    out[c] = x;
  }
  return out;
}
function hasNewer(a, b) {
  if (((a.settings || {}).u || 0) > ((b.settings || {}).u || 0)) return true;
  for (const c of COLS) {
    const bb = b[c] || {};
    for (const [id, it] of Object.entries(a[c] || {})) { const o = bb[id]; if (it && (!o || (it.u || 0) > (o.u || 0))) return true; }
  }
  return false;
}

let state = normalize(lsGet(LS_STATE, null));
let rev = 1;
const cfg = () => state.settings;
const Hooks = { sync() {}, remote() {} };

function saveLocal() { if (!lsSet(LS_STATE, state)) toast('Opslaan op dit toestel lukte niet (opslag vol?).'); }
function commit(opts = {}) { rev++; saveLocal(); if (opts.day) Sync.markDay(opts.day); Sync.schedule(); }
function touchSettings() { state.settings.u = Date.now(); commit(); }
function put(col, obj) { obj.u = Date.now(); state[col][obj.id] = obj; return obj; }
function drop(col, id) { state[col][id] = { id, u: Date.now(), del: true }; }
const alive = o => !!o && !o.del;

/* tiny memo, cleared whenever data changes or the day turns */
const Memo = { key: '', map: new Map() };
function memo(k, fn) {
  const key = rev + '|' + todayKey() + '|' + Flash.ver;
  if (Memo.key !== key) { Memo.key = key; Memo.map.clear(); }
  if (!Memo.map.has(k)) Memo.map.set(k, fn());
  return Memo.map.get(k);
}

/* ---------- courses & chapters ---------- */
function listCourses(all) {
  return Object.values(state.courses).filter(c => alive(c) && (all || !c.archived))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.created || 0) - (b.created || 0));
}
const getCourse = id => { const c = state.courses[id]; return alive(c) ? c : null; };
const getChapter = id => { const c = state.chapters[id]; return alive(c) ? c : null; };
const getTask = id => { const t = state.tasks[id]; return alive(t) ? t : null; };
function chaptersOf(cid) {
  return memo('ch:' + cid, () => Object.values(state.chapters).filter(ch => alive(ch) && ch.course === cid)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.created || 0) - (b.created || 0)));
}
function newCourse(p = {}) {
  const n = listCourses(true).length;
  return put('courses', Object.assign({
    id: uid(), name: 'Nieuw vak', emoji: 'i:book', color: COLORS[n % COLORS.length], prof: '', credits: '', semester: '',
    difficulty: 3, priority: 'normaal', exam: '', examTime: '', examType: '', examPlace: '',
    start: '', buffer: null, mode: 'auto', minPages: 0, minMinutes: 0, minPerPage: null, minPerSlide: null, prepMinPerPage: null,
    reviewOffsets: null, useMeasured: true, decks: [], notes: '', archived: false, grade: null, gradeMax: 20, skips: [],
    order: n, created: Date.now()
  }, p));
}
function newChapter(cid, p = {}) {
  const n = Object.values(state.chapters).filter(ch => alive(ch) && ch.course === cid).length;
  return put('chapters', Object.assign({
    id: uid(), course: cid, title: `Hoofdstuk ${n + 1}`, order: n, unit: 'p', pages: 0, kind: 'theorie', difficulty: 3,
    needSummary: false, srcPages: 0, prepDone: 0, summaryMade: false, done: 0, started: false, due: '', knownDay: '',
    reviews: {}, notes: '', hard: [], decks: [], files: [], created: Date.now()
  }, p));
}

/* ---------- progress ---------- */
const DIFF_MUL = [1, .8, .9, 1, 1.15, 1.3];
const STATUS = {
  todo: ['Niet begonnen', '⚪'], summary: ['Samenvatting maken', '✍️'], study: ['Studeren', '📖'],
  known: ['Gekend', '🧠'], reviewed: ['Herhaald', '🔁']
};
function studyTotal(ch) {
  if (ch.needSummary && !ch.summaryMade && !(ch.pages > 0)) return Math.max(0, Math.round((ch.srcPages || 0) * cfg().summaryRatio / 100));
  return Math.max(0, ch.pages || 0);
}
const studyLeft = ch => Math.max(0, studyTotal(ch) - (ch.done || 0));
const prepTotal = ch => ch.needSummary ? Math.max(0, ch.srcPages || 0) : 0;
const prepLeft = ch => ch.needSummary && !ch.summaryMade ? Math.max(0, (ch.srcPages || 0) - (ch.prepDone || 0)) : 0;
function isKnown(ch) {
  const t = studyTotal(ch);
  if (ch.needSummary && !ch.summaryMade) return false;
  return t > 0 ? (ch.done || 0) >= t : !!ch.knownDay;
}
function chStatus(ch) {
  if (isKnown(ch)) return Object.keys(ch.reviews || {}).length ? 'reviewed' : 'known';
  if (ch.needSummary && !ch.summaryMade) return 'summary';
  if ((ch.done || 0) > 0 || ch.started) return 'study';
  return 'todo';
}
function setStatus(ch, st) {
  const T = todayKey();
  if (st === 'todo') Object.assign(ch, { done: 0, prepDone: 0, summaryMade: false, needSummary: false, started: false, knownDay: '', reviews: {} });
  else if (st === 'summary') Object.assign(ch, { needSummary: true, summaryMade: false, done: 0, started: false, knownDay: '', reviews: {}, srcPages: ch.srcPages || ch.pages || 0 });
  else if (st === 'study') {
    if (ch.needSummary) { ch.summaryMade = true; ch.prepDone = ch.srcPages || 0; }
    if ((ch.done || 0) >= studyTotal(ch)) ch.done = 0;
    Object.assign(ch, { started: true, knownDay: '', reviews: {} });
  } else if (st === 'known' || st === 'reviewed') {
    if (ch.needSummary) { ch.summaryMade = true; ch.prepDone = ch.srcPages || 0; }
    ch.done = studyTotal(ch); ch.started = true; ch.knownDay = ch.knownDay || T;
    if (st === 'reviewed') { if (!Object.keys(ch.reviews || {}).length) ch.reviews = { m: T }; } else ch.reviews = {};
  }
  put('chapters', ch);
}
/* add (or with a negative number: take back) progress on a chapter */
function applyProgress(ch, type, units, day = todayKey()) {
  let finishedSummary = false;
  if (type === 'prep') {
    const before = !!ch.summaryMade;
    ch.prepDone = clamp((ch.prepDone || 0) + units, 0, ch.srcPages || 0);
    if (ch.needSummary && (ch.srcPages || 0) > 0) ch.summaryMade = ch.prepDone >= ch.srcPages;
    finishedSummary = !before && ch.summaryMade;
  } else if (type === 'study') {
    const tot = studyTotal(ch);
    ch.done = clamp((ch.done || 0) + units, 0, tot > 0 ? tot : (ch.done || 0) + Math.max(0, units));
    if (units > 0) ch.started = true;
  }
  const known = isKnown(ch);
  if (known && !ch.knownDay) ch.knownDay = day;
  else if (!known && studyTotal(ch) > 0) ch.knownDay = '';
  put('chapters', ch);
  return { finishedSummary, known };
}

/* ---------- speed: minutes per page ---------- */
function measured(cid) {
  // your real speed: minutes on the timer for a task, against the pages you ticked off for it
  return memo('ms:' + cid, () => {
    const by = {};
    for (const l of Object.values(state.logs)) {
      if (!alive(l) || l.course !== cid || !l.key) continue;
      const o = by[l.key] || (by[l.key] = { m: 0, u: 0 });
      if (l.type === 'timer') o.m += l.min || 0;
      else if (l.type === 'study' && l.unit !== 'dia') { o.u += l.units || 0; if (l.est === false) o.m += l.min || 0; }
    }
    let m = 0, u = 0, n = 0;
    for (const o of Object.values(by)) if (o.m >= 5 && o.u > 0) { m += o.m; u += o.u; n++; }
    return n >= 3 && u >= 10 ? { mpu: clamp(m / u, .5, 60), n, units: u } : null;
  });
}
function mpu(c, ch) {
  let v = ch.unit === 'dia' ? (c.minPerSlide ?? cfg().minPerSlide) : (c.minPerPage ?? cfg().minPerPage);
  if (ch.unit !== 'dia' && c.useMeasured !== false) { const ms = measured(c.id); if (ms) v = ms.mpu; }
  return Math.max(.5, num(v, 8) * (DIFF_MUL[ch.difficulty || 3] || 1) * (ch.kind === 'oefeningen' ? 1.2 : 1));
}
const prepMpu = c => Math.max(.5, num(c.prepMinPerPage ?? cfg().prepMinPerPage, 10));
const courseBuffer = c => Math.max(0, int(c.buffer ?? cfg().buffer, 3));
const reviewOffsets = c => (Array.isArray(c.reviewOffsets) ? c.reviewOffsets : cfg().reviewOffsets).map(x => int(x)).filter(x => x > 0).sort((a, b) => a - b);

function courseProgress(c) {
  return memo('cp:' + c.id, () => {
    const chs = chaptersOf(c.id);
    let sT = 0, sD = 0, pT = 0, pD = 0, mins = 0, minsLeft = 0, revDone = 0, revTotal = 0;
    const counts = { todo: 0, summary: 0, study: 0, known: 0, reviewed: 0 };
    const offs = reviewOffsets(c).length;
    for (const ch of chs) {
      const st = studyTotal(ch), m = mpu(c, ch), pm = prepMpu(c), pt = prepTotal(ch);
      sT += st; sD += Math.min(ch.done || 0, st);
      pT += pt; pD += ch.summaryMade ? pt : Math.min(ch.prepDone || 0, pt);
      mins += st * m + pt * pm;
      minsLeft += studyLeft(ch) * m + prepLeft(ch) * pm;
      counts[chStatus(ch)]++;
      revTotal += offs; revDone += Math.min(offs, Object.keys(ch.reviews || {}).length);
    }
    const pct = mins > 0 ? Math.round((1 - minsLeft / mins) * 100) : (chs.length && chs.every(isKnown) ? 100 : 0);
    return { chs, sT, sD, pT, pD, mins, minsLeft, pct, counts, revDone, revTotal };
  });
}

/* ---------- logs (what you did, per day) ---------- */
function addLog(p) {
  return put('logs', Object.assign({ id: uid(), day: todayKey(), at: Date.now(), course: '', chapter: '', type: 'study', key: '', units: 0, unit: 'p', min: 0, est: false }, p));
}
function logIndex() {
  return memo('logs', () => {
    const byDay = new Map(), byKey = new Map();
    for (const l of Object.values(state.logs)) {
      if (!alive(l)) continue;
      (byDay.get(l.day) || byDay.set(l.day, []).get(l.day)).push(l);
      if (l.key) (byKey.get(l.key) || byKey.set(l.key, []).get(l.key)).push(l);
    }
    return { byDay, byKey };
  });
}
const logsOn = day => logIndex().byDay.get(day) || [];
const logsFor = key => logIndex().byKey.get(key) || [];
function dayTotals(day) {
  const ls = logsOn(day);
  const keys = new Set(ls.filter(l => l.type !== 'timer' || l.units > 0).map(l => l.key || l.id));
  return {
    min: sum(ls, l => l.min), units: sum(ls.filter(l => l.type === 'study' || l.type === 'prep'), l => l.units),
    tasks: keys.size, logs: ls
  };
}

/* =========================================================
   Sync with your Uni Study account (same login as Flashcards)
   ========================================================= */
const Sync = {
  sb: null, user: null, me: null, status: 'local', ready: false, missing: false,
  timer: null, busy: false, again: false, dirtyDays: new Set(),

  async init() {
    try { await loadScript(SUPA_JS, 'supabase'); } catch (e) { this.status = 'offline'; this.ready = true; Hooks.sync(); return; }
    try {
      this.sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      const { data } = await withTimeout(this.sb.auth.getSession(), 8000);
      if (data && data.session) await this.start(data.session.user);
    } catch (e) { this.status = 'offline'; }
    this.ready = true; Hooks.sync();
  },
  async start(user) {
    this.user = user;
    const prev = lsGet(LS_OWNER, null);
    if (prev && prev !== user.id) { state = newState(); saveLocal(); rev++; }
    lsSet(LS_OWNER, user.id);
    try {
      const { data } = await this.sb.from('profiles').select('id,username,display_name').eq('id', user.id).maybeSingle();
      this.me = data || null;
    } catch (e) { /* offline */ }
    await this.pull();
  },
  async pull() {
    if (!this.user || !this.sb) return false;
    this.status = 'syncing'; Hooks.sync();
    let changed = false;
    try {
      const { data, error } = await withTimeout(this.sb.from('planner_data').select('data').eq('user_id', this.user.id).maybeSingle(), 12000);
      if (error) throw error;
      const remote = data && data.data ? normalize(data.data) : null;
      if (remote && hasNewer(remote, state)) { state = normalize(mergeState(state, remote)); rev++; saveLocal(); changed = true; }
      if (!remote || hasNewer(state, remote)) {
        await this.write();
        this.markToday();
        await this.pushDays();
      }
      this.status = 'cloud'; this.missing = false;
    } catch (e) { this.fail(e); }
    Hooks.sync();
    if (changed) Hooks.remote();
    return changed;
  },
  async write() {
    const { error } = await this.sb.from('planner_data').upsert({ user_id: this.user.id, data: state, updated_at: Date.now() });
    if (error) throw error;
  },
  markDay(day) { if (validDay(day)) this.dirtyDays.add(day); },
  markToday() { this.dirtyDays.add(todayKey()); },
  schedule() {
    if (!this.user || !this.sb) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 1500);
  },
  async push() {
    if (!this.user || !this.sb) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; clearTimeout(this.timer);
    this.status = 'syncing'; Hooks.sync();
    let changed = false;
    try {
      // read, merge, write: changes from your other devices are never lost
      const { data, error } = await this.sb.from('planner_data').select('data').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      if (data && data.data) { const remote = normalize(data.data); if (hasNewer(remote, state)) { state = normalize(mergeState(state, remote)); rev++; saveLocal(); changed = true; } }
      await this.write();
      await this.pushDays();
      this.status = 'cloud'; this.missing = false;
    } catch (e) { this.fail(e); }
    finally {
      this.busy = false; Hooks.sync();
      if (changed) Hooks.remote();
      if (this.again) { this.again = false; this.schedule(); }
    }
  },
  async pushDays() {
    const days = [...this.dirtyDays]; this.dirtyDays.clear();
    for (const d of days) {
      const t = dayTotals(d);
      const { error } = await this.sb.from('planner_days').upsert({
        user_id: this.user.id, day: d, minutes: clamp(Math.round(t.min), 0, 1440), pages: clamp(Math.round(t.units), 0, 5000),
        tasks: clamp(t.tasks, 0, 500), updated_at: new Date().toISOString()
      });
      if (error) { days.forEach(x => this.dirtyDays.add(x)); throw error; }
    }
    if (typeof pushExams === 'function') await pushExams();
  },
  fail(e) {
    console.warn('Uni Study sync', e);
    const msg = String((e && (e.message || e.code)) || '') + ' ' + String((e && e.code) || '');
    this.missing = /planner_|relation|schema cache|PGRST20|42P01/i.test(msg);
    this.status = 'error';
  },
  async signOut() {
    try { await this.sb.auth.signOut(); } catch (e) { /* offline */ }
    this.user = null; this.me = null; this.status = 'local';
  }
};
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }

/* =========================================================
   Flashcards: read your sets (same device storage + account)
   ========================================================= */
const Flash = {
  ver: 0, cloud: null, fetchedAt: 0, localAt: 0, local: [],
  localDecks() {
    if (Date.now() - this.localAt > 4000) {
      const own = lsGet(FC.decks, []); const shared = (lsGet(FC.shared, null) || {}).decks || [];
      this.local = [...(Array.isArray(own) ? own : []), ...(Array.isArray(shared) ? shared : [])].filter(d => d && d.id && Array.isArray(d.cards));
      this.localAt = Date.now();
    }
    return this.local;
  },
  decks() {
    return memo('decks', () => {
      const map = new Map();
      for (const d of this.localDecks()) map.set(d.id, d);
      if (this.cloud) for (const d of this.cloud) { const l = map.get(d.id); if (!l || (d.updated || 0) >= (l.updated || 0)) map.set(d.id, d); }
      return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
  },
  get(id) { return this.decks().find(d => d.id === id) || null; },
  async refresh(force) {
    this.localAt = 0;
    if (!Sync.user || !Sync.sb) { this.ver++; return; }
    if (!force && Date.now() - this.fetchedAt < 20000) return;
    try {
      const { data, error } = await withTimeout(Sync.sb.from('decks').select('id,data,updated_at').eq('owner', Sync.user.id).eq('deleted', false), 12000);
      if (error) throw error;
      this.cloud = (data || []).map(r => r.data).filter(d => d && Array.isArray(d.cards));
      this.fetchedAt = Date.now();
    } catch (e) { /* offline: local copy is fine */ }
    this.ver++;
  },
  stats(d) {
    const t = flashDayNum(todayKey());
    let nw = 0, lr = 0, kn = 0, due = 0;
    for (const c of d.cards) {
      if (c.st === 'new') nw++;
      else if (c.st === 'learn') lr++;
      else { kn++; if ((c.due || 0) <= t) due++; }
    }
    const lim = (d.opt && d.opt.newLimit) || 0;
    return { total: d.cards.length, nw, lr, kn, due: due + lr, newToday: lim ? Math.min(nw, lim) : nw, newLimit: lim, pct: d.cards.length ? Math.round(kn / d.cards.length * 100) : 0 };
  },
  folderName(id) { const f = ((lsGet(FC.folders, null) || {}).list || []).find(f => f.id === id); return f ? f.name : ''; },
  courseDeckIds(c) { return [...new Set([...(c.decks || []), ...chaptersOf(c.id).flatMap(ch => ch.decks || [])])]; },
  courseDecks(c) { return this.courseDeckIds(c).map(id => this.get(id)).filter(Boolean); },
  courseStats(c) {
    return memo('fs:' + c.id, () => {
      const ds = this.courseDecks(c);
      const o = { decks: ds.length, total: 0, kn: 0, nw: 0, lr: 0, due: 0, newToday: 0, minLimit: Infinity };
      for (const d of ds) { const s = this.stats(d); o.total += s.total; o.kn += s.kn; o.nw += s.nw; o.lr += s.lr; o.due += s.due; o.newToday += s.newToday; if (s.newLimit) o.minLimit = Math.min(o.minLimit, s.newLimit); }
      o.pct = o.total ? Math.round(o.kn / o.total * 100) : 0;
      return o;
    });
  },
  suggest(c) {
    const name = norm(c.name); if (name.length < 3) return [];
    const linked = new Set(this.courseDeckIds(c));
    return this.decks().filter(d => {
      if (linked.has(d.id)) return false;
      const dn = norm(d.name), fn = norm(this.folderName(d.folder));
      return dn.includes(name) || fn.includes(name) || (fn && name.includes(fn) && fn.length >= 4);
    }).slice(0, 6);
  },
  link: id => 'flashcards.html#study=' + encodeURIComponent(id)
};
/* remember how many cards you knew each day, for progress messages */
function snapDecks() {
  const T = todayKey(); let changed = false;
  for (const c of listCourses()) for (const d of Flash.courseDecks(c)) {
    const s = Flash.stats(d);
    const snap = state.deckSnaps[d.id] || { id: d.id, d: {} };
    if (snap.d[T] !== s.kn) {
      snap.d = Object.assign({}, snap.d, { [T]: s.kn });
      const keys = Object.keys(snap.d).sort(); while (keys.length > 90) delete snap.d[keys.shift()];
      put('deckSnaps', snap); changed = true;
    }
  }
  if (changed) { saveLocal(); Sync.schedule(); }
}
function knownOn(deckId, day) {
  const s = state.deckSnaps[deckId]; if (!s || !s.d) return null;
  let best = null;
  for (const [k, v] of Object.entries(s.d)) if (k <= day && (!best || k > best[0])) best = [k, v];
  return best ? best[1] : null;
}

/* =========================================================
   Files: count pages/slides on this device. Nothing is uploaded
   or stored — only the number of pages is kept.
   ========================================================= */
async function countFile(file) {
  const name = file.name || 'bestand';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const title = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const res = { name, title, ext, pages: 0, unit: 'p', estimated: false, outline: [], role: '' };
  const kind = /samenvatting|summary|\bsv\b|synthese/i.test(name) ? 'summary' : '';
  try {
    if (ext === 'pdf' || file.type === 'application/pdf') {
      await loadScript(LIB.pdf, 'pdfjsLib');
      await loadScript(LIB.pdfWorker, 'pdfjsWorker').catch(() => {});
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (!lib) throw new Error('nolib');
      lib.GlobalWorkerOptions.workerSrc = LIB.pdfWorker;
      const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise;
      res.pages = pdf.numPages;
      try {
        const ol = await pdf.getOutline();
        if (ol && ol.length >= 2) {
          const items = [];
          for (const it of ol.slice(0, 80)) {
            let dest = it.dest;
            if (typeof dest === 'string') dest = await pdf.getDestination(dest);
            if (!Array.isArray(dest) || dest[0] == null) continue;
            const idx = typeof dest[0] === 'number' ? dest[0] : await pdf.getPageIndex(dest[0]);
            const t = String(it.title || '').replace(/\s+/g, ' ').trim();
            if (t) items.push({ title: t.slice(0, 90), from: idx + 1 });
          }
          items.sort((a, b) => a.from - b.from);
          const uniq = items.filter((x, i) => !i || x.from !== items[i - 1].from);
          uniq.forEach((x, i) => { x.to = i + 1 < uniq.length ? Math.max(x.from, uniq[i + 1].from - 1) : res.pages; x.pages = x.to - x.from + 1; });
          res.outline = uniq.filter(x => x.pages > 0);
        }
      } catch (e) { /* no table of contents */ }
      try { pdf.destroy(); } catch (e) { /* ignore */ }
      res.role = kind || 'course';
    } else if (['pptx', 'ppsx', 'potx', 'pptm'].includes(ext)) {
      const zip = await openZip(file);
      res.pages = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
      res.unit = 'dia'; res.role = 'slides';
    } else if (['docx', 'docm', 'dotx'].includes(ext)) {
      const zip = await openZip(file);
      const app = zip.file('docProps/app.xml');
      if (app) { const m = /<Pages>(\d+)<\/Pages>/.exec(await app.async('string')); if (m) res.pages = +m[1]; }
      const docF = zip.file('word/document.xml');
      const xml = docF ? await docF.async('string') : '';
      let words = 0; const secs = []; let cur = null;
      for (const p of xml.split('</w:p>')) {
        const text = (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
        const w = text ? text.split(/\s+/).length : 0;
        const style = (/<w:pStyle w:val="([^"]+)"/.exec(p) || [])[1] || '';
        const h1 = /^(heading|kop)1$/i.test(style.replace(/[\s_-]/g, '')) || /<w:outlineLvl w:val="0"\/>/.test(p);
        if (h1 && text) { cur = { title: decodeXml(text).slice(0, 90), words: 0 }; secs.push(cur); }
        else if (cur) cur.words += w;
        words += w;
      }
      if (!res.pages) { res.pages = Math.max(1, Math.round(words / 450)); res.estimated = true; }
      const sw = sum(secs, s => s.words);
      if (secs.length >= 2 && sw > 0) res.outline = secs.map(s => ({ title: s.title, pages: Math.max(1, Math.round(res.pages * s.words / sw)) }));
      res.role = kind || 'summary';
    } else if (ext === 'odt') {
      const zip = await openZip(file);
      const meta = zip.file('meta.xml');
      if (meta) { const m = /meta:page-count="(\d+)"/.exec(await meta.async('string')); if (m) res.pages = +m[1]; }
      if (!res.pages) { const c = zip.file('content.xml'); const t = c ? (await c.async('string')).replace(/<[^>]+>/g, ' ') : ''; res.pages = Math.max(1, Math.round(t.split(/\s+/).filter(Boolean).length / 450)); res.estimated = true; }
      res.role = kind || 'summary';
    } else if (ext === 'odp') {
      const zip = await openZip(file);
      const c = zip.file('content.xml');
      res.pages = c ? ((await c.async('string')).match(/<draw:page[\s>]/g) || []).length : 0;
      res.unit = 'dia'; res.role = 'slides';
    } else if (['txt', 'md', 'rtf'].includes(ext)) {
      const t = await file.text();
      res.pages = Math.max(1, Math.round(t.replace(/[{}\\]/g, ' ').split(/\s+/).filter(Boolean).length / 450)); res.estimated = true;
      res.role = kind || 'summary';
    } else if ((file.type || '').startsWith('image/')) {
      res.pages = 1; res.role = kind || 'course';
    } else if (['ppt', 'pps'].includes(ext)) {
      throw new UserError(`${name}: een oude PowerPoint (.ppt) kan ik niet lezen. Bewaar hem als .pptx of PDF, of vul het aantal dia's zelf in.`);
    } else if (ext === 'doc') {
      throw new UserError(`${name}: een oud Word-bestand (.doc) kan ik niet lezen. Bewaar het als .docx of PDF, of vul het aantal pagina's zelf in.`);
    } else if (['key', 'pages', 'numbers'].includes(ext)) {
      throw new UserError(`${name}: exporteer dit bestand eerst als PDF (Bestand → Exporteer naar → PDF).`);
    } else {
      throw new UserError(`${name}: dit soort bestand ken ik niet. Gebruik PDF, PowerPoint (.pptx) of Word (.docx).`);
    }
  } catch (e) {
    if (e instanceof UserError) throw e;
    console.warn('countFile', e);
    throw new UserError(`${name}: dit bestand kon ik niet openen. Is het beveiligd of beschadigd? Vul het aantal ${res.unit === 'dia' ? "dia's" : "pagina's"} dan zelf in.`);
  }
  if (!res.pages) throw new UserError(`${name}: ik vond geen pagina's in dit bestand.`);
  return res;
}
async function openZip(file) {
  await loadScript(LIB.jszip, 'JSZip');
  return window.JSZip.loadAsync(await file.arrayBuffer());
}
function decodeXml(s) { return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"); }
