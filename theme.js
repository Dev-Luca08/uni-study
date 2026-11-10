/* =========================================================
   Uni Study — shared look & feel for Planning and Flashcards:
   themes, own colours, fonts, corners and backgrounds.
   Made by Luca Cicarelli
   ========================================================= */
(function () {
  'use strict';
  const LS_LOOK = 'unistudy.look.v1';
  const LS_PHOTO = 'unistudy.bgphoto.v1';
  const root = document.documentElement;

  const T = (name, mode, bg, surface, s2, ink, muted, line, accent, accentInk, soft) =>
    ({ name, mode, v: { bg, surface, 'surface-2': s2, ink, muted, line, accent, 'accent-ink': accentInk, 'accent-soft': soft } });

  const THEMES = {
    klassiek: { name: 'Klassiek', mode: 'auto', v: null, preview: ['#E8ECF1', '#FFFFFF', '#1F3FB5', '#16202B'] },
    donker: T('Donker', 'dark', '#0F1318', '#1A2029', '#222A35', '#E6EBF1', '#9AA6B4', '#2F3947', '#93A7FF', '#0D1330', '#232C4B'),
    blossom: T('Blossom', 'light', '#FFF0F5', '#FFFFFF', '#FFE6EF', '#3A1E2B', '#85566A', '#F3CADA', '#C92E68', '#FFFFFF', '#FFD9E6'),
    pastel: T('Pastel', 'light', '#F5F0FF', '#FFFFFF', '#EEE7FF', '#2E2A3D', '#6B6585', '#DFD5F5', '#7350D0', '#FFFFFF', '#E9E0FF'),
    oceaan: T('Oceaan', 'light', '#E5F3F7', '#FFFFFF', '#DCEEF3', '#0F2A33', '#4A6872', '#C2DEE6', '#0A7088', '#FFFFFF', '#CFEAF1'),
    bos: T('Bos', 'light', '#EDF2E8', '#FFFFFF', '#E3EBDC', '#1D2B1C', '#566854', '#CDDAC4', '#2D7339', '#FFFFFF', '#D8EAD3'),
    sunset: T('Sunset', 'light', '#FFF3EA', '#FFFFFF', '#FFE8D8', '#3A2116', '#865B48', '#F4D0BA', '#B8461A', '#FFFFFF', '#FFDFCC'),
    mint: T('Mint', 'light', '#E9FAF3', '#FFFFFF', '#DCF5EA', '#10302A', '#4B7569', '#C2E9DA', '#0B7A5B', '#FFFFFF', '#CFF1E3'),
    koffie: T('Koffie', 'light', '#F4ECE2', '#FFFDF9', '#EEE3D5', '#2E2118', '#76604F', '#E0CFBC', '#8A5528', '#FFFFFF', '#F0DFCB'),
    minimal: T('Minimalistisch', 'light', '#FAFAFA', '#FFFFFF', '#F2F2F2', '#111111', '#636363', '#E2E2E2', '#111111', '#FFFFFF', '#EBEBEB'),
    middernacht: T('Middernacht', 'dark', '#0B1020', '#141B2E', '#1C2540', '#E7ECFF', '#9AA5C8', '#2A3557', '#7C9BFF', '#0B1020', '#1F2A4D'),
    aubergine: T('Aubergine', 'dark', '#1A1020', '#251830', '#2F2040', '#F5E9F5', '#B9A3BF', '#3D2B4D', '#FF7EB6', '#2A0F1E', '#3A2040')
  };

  const FONTS = {
    atkinson: { name: 'Atkinson', body: '"Atkinson Hyperlegible"', display: '"Bricolage Grotesque"', css: 'family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800' },
    nunito: { name: 'Nunito', body: '"Nunito"', display: '"Nunito"', css: 'family=Nunito:wght@400;700;800' },
    poppins: { name: 'Poppins', body: '"Poppins"', display: '"Poppins"', css: 'family=Poppins:wght@400;600;700' },
    quicksand: { name: 'Quicksand', body: '"Quicksand"', display: '"Quicksand"', css: 'family=Quicksand:wght@400;600;700' },
    fredoka: { name: 'Fredoka', body: '"Fredoka"', display: '"Fredoka"', css: 'family=Fredoka:wght@400;500;600' },
    dmsans: { name: 'DM Sans', body: '"DM Sans"', display: '"DM Serif Display"', css: 'family=DM+Sans:wght@400;700&family=DM+Serif+Display' },
    elegant: { name: 'Elegant', body: '"Source Sans 3"', display: '"Playfair Display"', css: 'family=Source+Sans+3:wght@400;700&family=Playfair+Display:wght@600;800' },
    lora: { name: 'Lora', body: '"Lora"', display: '"Lora"', css: 'family=Lora:wght@400;700' },
    space: { name: 'Space Grotesk', body: '"Space Grotesk"', display: '"Space Grotesk"', css: 'family=Space+Grotesk:wght@400;700' },
    hand: { name: 'Handgeschreven', body: '"Patrick Hand"', display: '"Caveat"', css: 'family=Patrick+Hand&family=Caveat:wght@600;700' },
    comic: { name: 'Comic', body: '"Comic Neue"', display: '"Comic Neue"', css: 'family=Comic+Neue:wght@400;700' },
    system: { name: 'Systeem', body: 'system-ui', display: 'system-ui', css: null }
  };

  const RADII = { scherp: ['Scherp', 6], normaal: ['Normaal', 14], rond: ['Rond', 20], extra: ['Extra rond', 28] };
  const DENSITY = { compact: ['Compact', .78], normaal: ['Normaal', 1], ruim: ['Ruim', 1.25] };

  const svgPattern = (a, b) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><text x='6' y='26' font-size='15' opacity='.22'>${a}</text><text x='52' y='72' font-size='12' opacity='.17'>${b}</text></svg>`)}")`;
  const BGS = {
    geen: { name: 'Geen', img: 'none' },
    verloop: { name: 'Verloop', img: 'radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%), radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 50%)', size: 'auto' },
    stippen: { name: 'Stippen', img: 'radial-gradient(color-mix(in srgb, var(--ink) 16%, transparent) 1.2px, transparent 1.6px)', size: '18px 18px' },
    ruitjes: { name: 'Ruitjes', img: 'linear-gradient(color-mix(in srgb, var(--accent) 11%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--accent) 11%, transparent) 1px, transparent 1px)', size: '22px 22px' },
    lijntjes: { name: 'Gelijnd', img: 'linear-gradient(transparent 27px, color-mix(in srgb, var(--accent) 15%, transparent) 28px)', size: '100% 28px' },
    sterren: { name: 'Sterretjes', img: svgPattern('✨', '⭐'), size: '90px 90px' },
    hartjes: { name: 'Hartjes', img: svgPattern('💗', '💕'), size: '90px 90px' },
    bloemen: { name: 'Bloemen', img: svgPattern('🌸', '🌼'), size: '90px 90px' },
    foto: { name: 'Eigen foto', img: null }
  };

  const DEFAULT = { theme: 'klassiek', custom: null, font: 'atkinson', radius: 'normaal', density: 'normaal', bg: 'geen', flash: true, iconColor: '' };
  const VARS = ['bg', 'surface', 'surface-2', 'ink', 'muted', 'line', 'accent', 'accent-ink', 'accent-soft'];

  function read(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function write(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function lum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0;
    const n = parseInt(m[1], 16);
    const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
    return .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2];
  }

  function customVars(c) {
    const accent = c.accent || '#C92E68', bg = c.bg || '#FFF0F5', surface = c.surface || '#FFFFFF', ink = c.ink || '#2B1B24';
    return {
      bg, surface, ink, accent,
      'surface-2': `color-mix(in srgb, ${ink} 6%, ${surface})`,
      line: `color-mix(in srgb, ${ink} 17%, ${surface})`,
      muted: `color-mix(in srgb, ${ink} 64%, ${surface})`,
      'accent-ink': lum(accent) > .42 ? '#111111' : '#FFFFFF',
      'accent-soft': `color-mix(in srgb, ${accent} 17%, ${surface})`
    };
  }

  function themeOf(look) {
    if (look.theme === 'eigen' && look.custom) return { mode: look.custom.mode || (lum(look.custom.bg) < .2 ? 'dark' : 'light'), v: customVars(look.custom) };
    return THEMES[look.theme] || THEMES.klassiek;
  }

  let fontLink = null;
  function loadFont(f) {
    if (!f || !f.css) return;
    const href = 'https://fonts.googleapis.com/css2?' + f.css + '&display=swap';
    if (document.querySelector(`link[data-uni-font][href="${href}"]`)) return;
    if (!fontLink) { fontLink = document.createElement('link'); fontLink.rel = 'stylesheet'; fontLink.dataset.uniFont = '1'; (document.head || root).appendChild(fontLink); }
    fontLink.href = href;
  }

  function styleEl() {
    let el = document.getElementById('uni-look');
    if (!el) { el = document.createElement('style'); el.id = 'uni-look'; (document.head || root).appendChild(el); }
    return el;
  }

  function apply(look, opts) {
    look = Object.assign({}, DEFAULT, look || {});
    const isFlash = !!(opts && opts.flash);
    // Clear what an earlier theme set
    VARS.forEach(k => root.style.removeProperty('--' + k));
    ['--font-body', '--font-display', '--r', '--density', '--ic'].forEach(k => root.style.removeProperty(k));
    if (isFlash && look.flash === false) { root.removeAttribute('data-theme'); styleEl().textContent = ''; return look; }

    const th = themeOf(look);
    if (th.mode === 'dark' || th.mode === 'light') root.setAttribute('data-theme', th.mode); else root.removeAttribute('data-theme');
    if (th.v) for (const k of VARS) if (th.v[k]) root.style.setProperty('--' + k, th.v[k]);

    const f = FONTS[look.font] || FONTS.atkinson;
    if (look.font !== 'atkinson') {
      loadFont(f);
      root.style.setProperty('--font-body', `${f.body}, "Segoe UI", system-ui, sans-serif`);
      root.style.setProperty('--font-display', `${f.display}, "Segoe UI", system-ui, sans-serif`);
    }
    if (look.iconColor === 'accent') root.style.setProperty('--ic', 'var(--accent)');
    else if (/^#[0-9a-f]{6}$/i.test(look.iconColor || '')) root.style.setProperty('--ic', look.iconColor);
    const r = RADII[look.radius] || RADII.normaal;
    root.style.setProperty('--r', r[1] + 'px');
    root.style.setProperty('--density', String((DENSITY[look.density] || DENSITY.normaal)[1]));

    let css = '';
    const bg = BGS[look.bg] || BGS.geen;
    if (look.bg === 'foto') {
      const photo = read(LS_PHOTO, null);
      if (photo) css = `body{background-color:var(--bg);background-image:linear-gradient(color-mix(in srgb, var(--bg) 72%, transparent), color-mix(in srgb, var(--bg) 72%, transparent)), url("${photo}");background-size:cover;background-position:center;background-attachment:fixed;}`;
    } else if (bg.img && bg.img !== 'none') {
      css = `body{background-color:var(--bg);background-image:${bg.img};background-size:${bg.size || 'auto'};background-attachment:fixed;}`;
    }
    styleEl().textContent = css;

    // Status bar colour on phones
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th.v ? (th.v.bg.startsWith('#') ? th.v.bg : '#1F3FB5') : (matchMedia('(prefers-color-scheme: dark)').matches ? '#0F1318' : '#E8ECF1'));
    return look;
  }

  const UniLook = {
    THEMES, FONTS, RADII, DENSITY, BGS, DEFAULT,
    get() { return Object.assign({}, DEFAULT, read(LS_LOOK, {}) || {}); },
    set(look, opts) { const l = Object.assign({}, DEFAULT, look || {}); write(LS_LOOK, l); apply(l, opts); return l; },
    apply,
    preview(look) { return themeOf(Object.assign({}, DEFAULT, look)); },
    photo() { return read(LS_PHOTO, null); },
    setPhoto(dataUrl) { return write(LS_PHOTO, dataUrl); },
    lum
  };
  window.UniLook = UniLook;
  apply(UniLook.get(), { flash: !!window.UNI_FLASH_PAGE });
})();
