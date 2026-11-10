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
    econ: ['Economie', '💶', '<circle cx="8" cy="8" r="5"/><path d="M9.6 6.3a2.3 2.3 0 1 0 0 3.4M5.6 7.4h2.6M5.6 8.7h2.6"/><path d="m3 20.5 5-3.5 4 2 8.5-7.5"/><path d="M17.5 11.5h3v3"/>']
  };
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (name, cls) => I[name] ? `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${I[name][2]}</svg>` : '';
  const nameOf = v => { const m = /^i:([a-z]+)$/.exec(String(v || '')); return m && I[m[1]] ? m[1] : ''; };
  window.UniIcon = { list: Object.keys(I), label: n => I[n] ? I[n][0] : '', svg };
  window.icon = svg;
  // a course "emoji" can be a real emoji or one of our icons, stored as "i:name"
  window.emoHtml = v => { const n = nameOf(v); return n ? svg(n) : escH(v || ''); };
  window.emoTxt = v => { const n = nameOf(v); return n ? I[n][1] : String(v || ''); };
  window.emo = o => window.emoHtml(o && o.emoji);
  window.emoT = o => window.emoTxt(o && o.emoji);
  const st = document.createElement('style');
  st.textContent = '.ic{width:1.2em;height:1.2em;vertical-align:-.22em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.cc-emoji .ic,.em .ic,.exam-chip .ic{color:var(--cc,var(--accent))}.logo .ic{width:1.35em;height:1.35em}.tab i .ic{width:1.25em;height:1.25em}';
  (document.head || document.documentElement).appendChild(st);
  const fill = () => document.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = svg(el.dataset.ic); el.removeAttribute('data-ic'); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
