/* =========================================================
   Uni Study — own icon set (20 icons, one style: round lines
   that take the colour of the text or the course).
   Drawn for Uni Study. Made by Luca Cicarelli
   ========================================================= */
(function () {
  'use strict';
  const dot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 1}" fill="currentColor" stroke="none"/>`;
  // name: [label, fallback emoji for plain text, drawing]
  const I = {
    logo: ['Uni Study', '🎓', '<path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z"/><path d="M7 9.6V13c0 1.2 2.2 2.3 5 2.3s5-1.1 5-2.3V9.6"/><path d="M21 7.5V12"/><path d="M4 20.5c2.6-1.2 5.5-1 8 .5 2.5-1.5 5.4-1.7 8-.5"/>'],
    plan: ['Planning', '📅', '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15.5 2 2 4-4"/>'],
    cards: ['Flashcards', '🗂️', '<path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1"/><rect x="3" y="8" width="15" height="12" rx="2"/><path d="M7 13h7M7 16.5h4"/>'],
    today: ['Vandaag', '🏠', '<circle cx="7" cy="7" r="2.6"/><path d="M7 1.6v1M7 11.4v1M1.6 7h1M11.4 7h1M3.2 3.2l.7.7M10.1 10.1l.7.7M3.2 10.8l.7-.7M10.1 3.9l.7-.7"/><path d="M15 5h6M15 9h6M4 16h17M4 20h11"/>'],
    timer: ['Timer', '⏱️', '<circle cx="12" cy="14" r="7"/><path d="M12 14v-3.5M10 3h4M12 3v4M18.4 6.6 20 5"/>'],
    stats: ['Statistieken', '📊', '<path d="M3 21h18"/><path d="M7 17v-4M12 17V9M17 17V5"/>'],
    palette: ['Personaliseren', '🎨', '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.7C22 6 17.5 3 12 3z"/>' + dot(7.5, 11.5, 1.1) + dot(10, 7.6, 1.1) + dot(14.6, 7.6, 1.1)],
    gear: ['Instellingen', '⚙️', '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1"/>'],
    summary: ['Samenvatting', '✍️', '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M9 8h6M9 12h3"/><path d="m13.2 20.5.6-3 6-6a1.7 1.7 0 0 1 2.4 2.4l-6 6-3 .6z"/>'],
    book: ['Studeren', '📖', '<path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z"/><path d="M12 6.5v13"/>'],
    repeat: ['Herhalen', '🔁', '<path d="M4 11V9a3 3 0 0 1 3-3h11"/><path d="m15 3 3 3-3 3"/><path d="M20 13v2a3 3 0 0 1-3 3H6"/><path d="m9 21-3-3 3-3"/>'],
    exam: ['Examen', '📝', '<path d="M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v4h4"/><path d="m7.5 17 2.3-6 2.3 6M8.4 15h2.8M14.5 13.5h3M16 12v3"/>'],
    known: ['Gekend', '🧠', '<path d="M12 5a3.5 3.5 0 0 0-6.5 1.5A3.5 3.5 0 0 0 4 12.5 3.5 3.5 0 0 0 7 18a3 3 0 0 0 5 .5V5z"/><path d="M12 5a3.5 3.5 0 0 1 6.5 1.5A3.5 3.5 0 0 1 20 12.5 3.5 3.5 0 0 1 17 18a3 3 0 0 1-5 .5"/><path d="m14 12 1.4 1.4 2.4-2.6"/>'],
    flame: ['Streak', '🔥', '<path d="M12 3c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 .2-3-.5-6 1-9z"/>'],
    friends: ['Vrienden', '👥', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.5c2.2.3 3.6 1.9 4 4.5"/>'],
    upload: ['Bestand', '📄', '<path d="M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v4h4"/><path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5"/>'],
    math: ['Wiskunde', '➗', '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18"/><path d="M6 7.5h3M7.5 6v3M15 7.5h3M6.4 15.4l2.2 2.2M8.6 15.4l-2.2 2.2M15 16.5h3"/>' + dot(16.5, 14.6, .7) + dot(16.5, 18.4, .7)],
    lang: ['Talen', '💬', '<path d="M4 4.5h16v11.5H10.5L5.5 20v-4H4z"/><path d="m7.3 13 2-5.2 2 5.2M8 11.4h2.6"/><circle cx="15" cy="11.4" r="1.6"/><path d="M16.6 9.8V13"/>'],
    flask: ['Wetenschappen', '🧪', '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.6 15h8.8"/>'],
    econ: ['Economie', '💶', '<circle cx="8" cy="8" r="5"/><path d="M9.6 6.3a2.3 2.3 0 1 0 0 3.4M5.6 7.4h2.6M5.6 8.7h2.6"/><path d="m3 20.5 5-3.5 4 2 8.5-7.5"/><path d="M17.5 11.5h3v3"/>'],
    file: ['Bestand', '', '<path d="M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h5"/>'],
    check: ['Gedaan', '', '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16 9.6"/>'],
    circle: ['Leeg', '', '<circle cx="12" cy="12" r="8"/>'],
    warn: ['Let op', '', '<path d="M12 4 2.8 19.5h18.4L12 4z"/><path d="M12 10v4.5"/>' + dot(12, 17, .9)],
    no: ['Niet', '', '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>'],
    link: ['Koppelen', '', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'],
    palm: ['Vrije dag', '', '<path d="M12 21c0-5 .6-8 2-11"/><path d="M14 10c-3-3-7-2-8 .5M14 10c0-3.5 3-5 6-4M14 10c3-1 6 1 6 4M14 10c-1-3.5-4-5.5-7.5-4.5"/><path d="M6 21h12"/>'],
    undo: ['Terug', '', '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'],
    arrowr: ['Verder', '', '<path d="M4 12h15M13 6l6 6-6 6"/>'],
    ext: ['Openen', '', '<path d="M8 16 16 8M9 8h7v7"/>'],
    plus: ['Toevoegen', '', '<path d="M12 5v14M5 12h14"/>'],
    robot: ['AI', '', '<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M12 8V4.5M9.5 16h5"/>' + dot(12, 3.6, 1.1) + dot(9, 12.5, 1.1) + dot(15, 12.5, 1.1)],
    trash: ['Verwijderen', '', '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'],
    lock: ['Privé', '', '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'],
    rocket: ['Raket', '', '<path d="M12 3c3 2 5 5.5 5 9l-2 3H9l-2-3c0-3.5 2-7 5-9z"/><circle cx="12" cy="10" r="1.7"/><path d="m9 15-2 4.5 3.2-1.2M15 15l2 4.5-3.2-1.2"/>'],
    star: ['Ster', '', '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/>'],
    trophy: ['Beker', '', '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>'],
    pencil: ['Bewerken', '', '<path d="m4 20 1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/>'],
    bolt: ['Snel', '', '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z"/>'],
    hourglass: ['Wachten', '', '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>'],
    clipboard: ['Kopiëren', '', '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9.5 11h5M9.5 15h5"/>'],
    cloud: ['Online', '', '<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1.5A4.5 4.5 0 0 1 17 18H7z"/>'],
    cup: ['Pauze', '', '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2.5M12 3v2.5"/>'],
    sun: ['Zon', '', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>'],
    moon: ['Nacht', '', '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>'],
    pin: ['Locatie', '', '<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2"/>'],
    person: ['Persoon', '', '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.8 3.7-5.8 7-5.8s6 2 7 5.8"/>'],
    folder: ['Map', '', '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>'],
    play: ['Start', '', '<path d="M8 5.5v13l10-6.5-10-6.5z"/>'],
    pause: ['Pauze', '', '<path d="M8.5 5v14M15.5 5v14"/>'],
    stop: ['Stop', '', '<rect x="6" y="6" width="12" height="12" rx="2"/>'],
    skip: ['Overslaan', '', '<path d="M6 5.5v13l9-6.5-9-6.5zM18 5v14"/>'],
    image: ['Foto', '', '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>'],
    target: ['Doel', '', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>' + dot(12, 12, 1.2)],
    bell: ['Bel', '', '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0"/>'],
    mute: ['Stil', '', '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0M4 4l16 16"/>'],
    music: ['Muziek', '', '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'],
    phone: ['Gsm', '', '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 9v6M20 9v6"/>'],
    save: ['Downloaden', '', '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>'],
    share: ['Delen', '', '<path d="M12 15V4M7.5 8 12 3.5 16.5 8M5 20h14"/>'],
    clock: ['Tijd', '', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    speaker: ['Geluid', '', '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'],
    globe: ['Aardrijkskunde', '', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>'],
    scales: ['Recht', '', '<path d="M12 4v16M7 20h10M5 7h14"/><path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0L5 7zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0L19 7z"/>'],
    leaf: ['Biologie', '', '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 14z"/><path d="m5 19 9-9"/>'],
    atom: ['Fysica', '', '<ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>' + dot(12, 12, 1.1)],
    laptop: ['Informatica', '', '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>'],
    column: ['Geschiedenis', '', '<path d="m4 9 8-5 8 5H4zM6 12v6M10 12v6M14 12v6M18 12v6M4 20.5h16"/>'],
    bulb: ['Filosofie', '', '<path d="M9 17h6M10 20.5h4M8.5 14a6 6 0 1 1 7 0c-.6.5-1 1.2-1 2v1h-5v-1c0-.8-.4-1.5-1-2z"/>'],
    mega: ['Marketing', '', '<path d="M4 10v4h3l8 4V6l-8 4H4z"/><path d="M18 9.5a4 4 0 0 1 0 5"/>'],
    chat: ['Communicatie', '', '<path d="M4 5h16v11H9l-5 4z"/>'],
    heart: ['Anatomie', '', '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>']
  };
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (name, cls) => I[name] ? `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${I[name][2]}</svg>` : '';
  const nameOf = v => { const m = /^i:([a-z]+)$/.exec(String(v || '')); return m && I[m[1]] ? m[1] : ''; };
  window.UniIcon = { list: Object.keys(I), label: n => I[n] ? I[n][0] : '', svg };
  window.icon = svg;
  // a course "emoji" can be a real emoji or one of our icons, stored as "i:name"
  window.emoHtml = v => { const n = nameOf(v); return n ? svg(n) : (v ? '<span class="emj">' + escH(v) + '</span>' : ''); };
  window.emoTxt = v => (nameOf(v) ? '' : String(v || ''));
  window.emo = o => window.emoHtml(o && o.emoji);
  window.emoT = o => window.emoTxt(o && o.emoji);
  const st = document.createElement('style');
  st.textContent = '.ic{width:1.2em;height:1.2em;vertical-align:-.22em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none;color:var(--ic,currentColor)}' +
    '.cc-emoji .ic,.em .ic,.exam-chip .em .ic,.group-head .em .ic{color:var(--cc,var(--accent))}.logo .ic{width:1.35em;height:1.35em}.tab i .ic{width:1.25em;height:1.25em}' +
    '.btn.primary .ic,.on .ic,.logo .ic,.mini-timer .ic,#toast .ic,#focus .ic,.citem.exam .ic,.tag .ic,.status .ic,.btn.danger .ic,[aria-pressed="true"] .ic,.st-reviewed .ic,.avatar .ic,.bubble .ic{color:currentColor}';
  (document.head || document.documentElement).appendChild(st);

  /* Every emoji the app itself shows is drawn as one of our icons. Emoji that people pick or type
     themselves (course emoji, the emoji picker, flashcard text, chat) are left alone. */
  const M = {};
  const map = (name, list) => list.split(' ').forEach(e => { M[e] = name; });
  map('logo', '🎓'); map('file', '📄'); map('summary', '📝 ✍'); map('book', '📚 📖 📘'); map('cards', '🗂'); map('stats', '📊 📈');
  map('warn', '⚠ 🥵'); map('check', '✅'); map('link', '🔗'); map('palm', '🌴'); map('undo', '↩ ↺ ↶'); map('arrowr', '➡ ↪'); map('robot', '🤖');
  map('gear', '⚙'); map('star', '✨ ⭐'); map('timer', '⏱ 🍅'); map('repeat', '🔁'); map('plan', '📆 📅 🗓'); map('trash', '🗑'); map('lock', '🔒');
  map('known', '🧠'); map('ext', '↗'); map('econ', '💶'); map('friends', '👥'); map('leaf', '🌱 🌷 🧬 🌸');
  map('bulb', '💡 🤔'); map('cup', '☕'); map('target', '🎯'); map('person', '👩‍🏫 👤'); map('hourglass', '🐢 ⏳'); 
  map('pencil', '✏'); map('bolt', '⚡'); map('clipboard', '📋'); map('sun', '☀ 🌤 🌅'); map('clock', '🕘 🕒'); map('cloud', '☁'); map('pin', '📍');
  map('no', '🙅'); map('plus', '➕'); map('folder', '📁 📂'); map('play', '▶'); map('pause', '⏸'); map('stop', '⏹'); map('skip', '⏭'); map('image', '🖼');
  map('bell', '🔔 ⏰'); map('moon', '🦉'); map('music', '🎵'); map('mute', '🔇'); map('phone', '📳 📲'); map('save', '💾 ⬇'); map('share', '📤 ⬆');
  map('palette', '🎨'); map('globe', '🌍'); map('speaker', '🔊'); map('circle', '⚪'); map('scales', '⚖'); map('column', '🏛'); map('flask', '🧪');
  map('atom', '⚛'); map('heart', '🫀'); map('laptop', '💻'); map('chat', '💬'); map('mega', '📣'); map('math', '➗');
  let RE;
  try { RE = new RegExp('\\p{Extended_Pictographic}\\uFE0F?(?:\\u200D\\p{Extended_Pictographic}\\uFE0F?)*', 'gu'); } catch (e) { RE = null; }
  const keyOf = m => m.replace(/️/g, '');
  const SKIP = '.emj,.badge,.emoji-grid,.flash,.bubble,.card-row,script,style,textarea,svg,[data-emoji-ok]';
  window.noEmoji = s => RE ? String(s).replace(RE, m => (M[keyOf(m)] ? '' : m)).replace(/ {2,}/g, ' ').trim() : String(s);
  function fixText(node) {
    const text = node.nodeValue, p = node.parentElement;
    if (!RE || !text || !p || text.length < 1 || !/[^\u0000-ÿ]/.test(text)) return;
    RE.lastIndex = 0;
    let m, last = 0, any = false; const parts = [];
    while ((m = RE.exec(text))) {
      const name = M[keyOf(m[0])]; if (!name) continue;
      any = true; parts.push(text.slice(last, m.index), { name }); last = m.index + m[0].length;
    }
    if (!any || p.closest(SKIP)) return;
    parts.push(text.slice(last));
    if (p.closest('option,title')) { node.nodeValue = parts.filter(x => typeof x === 'string').join('').replace(/ {2,}/g, ' ').replace(/^\s+/, ''); return; }
    const frag = document.createDocumentFragment(), tpl = document.createElement('template');
    for (const part of parts) {
      if (typeof part === 'string') { if (part) frag.appendChild(document.createTextNode(part)); }
      else { tpl.innerHTML = svg(part.name); frag.appendChild(tpl.content.firstChild); }
    }
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || root.tagName === 'svg') return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(fixText);
  }
  const fill = () => {
    document.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = svg(el.dataset.ic); el.removeAttribute('data-ic'); });
    walk(document.body);
    new MutationObserver(recs => { for (const r of recs) { if (r.type === 'characterData') fixText(r.target); else r.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
