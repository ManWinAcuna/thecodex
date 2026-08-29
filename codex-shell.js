/* ============================================================================
   THE CODEX - app shell: sidebar nav, global search, shortcuts, persistence,
   dimension colors, animal emoji. Included on every page after codex-core.js
   /codex-compute.js (needs CODEX_DIMENSIONS + codexAllEntries) and, where
   present, after codex-hours.js (needs CODEX_HOUR_DIMENSIONS). Call
   codexShellInit('<page-key>') once the page's own data (db) exists.
   ========================================================================== */

/* --------------------------------------------------------- persistence --- */
/* Single owner, single browser - safe to just remember everything under one
   namespaced key per box, restored on load. */
function codexRemember(key, val) {
  try { localStorage.setItem(`codex_ui_${key}`, JSON.stringify(val)); } catch (e) { /* ignore */ }
}
function codexRecall(key, fallback) {
  try {
    const raw = localStorage.getItem(`codex_ui_${key}`);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) { return fallback; }
}

/* -------------------------------------------------- dimension accents --- */
/* Reuses the exact hue values from the cockpit's own godlike.css energy
   table (html[data-energy="N"] --acc) - not new colors, the app's existing
   per-number palette, applied here to tell DIMENSIONS apart at a glance.
   lp keeps plain gold (the site's one constant/ceremonial accent); every
   other dimension either carries its own theme number's hue (imprints,
   Pure 13) or a fixed distinct hue chosen for dimensions with no single
   theme number of their own. */
const CODEX_HUE_TABLE = {
  1: '#e9edf4', 2: '#a9bedd', 3: '#ffb36b', 4: '#79b0a6', 5: '#ff8a3d',
  6: '#e0a184', 7: '#d24a5c', 8: '#f5c542', 9: '#9d84ff', 11: '#86e8ff',
  22: '#3fce9f', 28: '#ffd75e', 13: '#ff6242', 33: '#f0a8c8',
};
const CODEX_DIM_ACCENTS = {
  lp: 'var(--gold)',
  lpCompound: CODEX_HUE_TABLE[1],
  pure13: CODEX_HUE_TABLE[13],
  dayBorn: CODEX_HUE_TABLE[3],
  dayNum: CODEX_HUE_TABLE[5],
  combo: CODEX_HUE_TABLE[9],
  vietYear: CODEX_HUE_TABLE[22],
  vietMonth: CODEX_HUE_TABLE[4],
  vietDay: CODEX_HUE_TABLE[33],
  imprint1: CODEX_HUE_TABLE[1], imprint3: CODEX_HUE_TABLE[3], imprint4: CODEX_HUE_TABLE[4],
  imprint5: CODEX_HUE_TABLE[5], imprint6: CODEX_HUE_TABLE[6], imprint7: CODEX_HUE_TABLE[7],
  imprint8: CODEX_HUE_TABLE[8], imprint9: CODEX_HUE_TABLE[9], imprint11: CODEX_HUE_TABLE[11],
  imprint22: CODEX_HUE_TABLE[22], imprint28: CODEX_HUE_TABLE[28],
  // Hour Studies dimensions - no fixed theme number, assigned distinct hues.
  deathHour: CODEX_HUE_TABLE[7], deathShichen: CODEX_HUE_TABLE[13],
  deathPH: CODEX_HUE_TABLE[9], deathPHMil: CODEX_HUE_TABLE[11],
  deathRoot: CODEX_HUE_TABLE[6], birthHour: CODEX_HUE_TABLE[3],
  birthShichen: CODEX_HUE_TABLE[22], birthRoot: CODEX_HUE_TABLE[1],
};
function codexDimAccent(dimId) {
  return CODEX_DIM_ACCENTS[dimId] || 'var(--muted)';
}
function codexDimChipHtml(dimId, label) {
  return `<span class="dim-chip" style="--dim-accent:${codexDimAccent(dimId)}">${codexEscape(label)}</span>`;
}

/* ------------------------------------------------------------- animals --- */
/* Vietnamese zodiac as this app names it (Cat, not Rabbit). */
const CODEX_ANIMAL_EMOJI = {
  Rat: '\u{1F400}', Ox: '\u{1F402}', Tiger: '\u{1F405}', Cat: '\u{1F408}',
  Dragon: '\u{1F409}', Snake: '\u{1F40D}', Horse: '\u{1F40E}', Goat: '\u{1F410}',
  Monkey: '\u{1F412}', Rooster: '\u{1F413}', Dog: '\u{1F415}', Pig: '\u{1F416}',
};
function codexAnimalEmoji(name) {
  return CODEX_ANIMAL_EMOJI[name] || '';
}
function codexAnimalLabel(name) {
  const e = codexAnimalEmoji(name);
  return `${e ? e + ' ' : ''}${codexEscape(name)}`;
}

/* Dimensions whose values are one of the 12 animals - these get the radial
   wheel instead of (above) the plain bar list. Animals are cyclical by
   nature, so a wheel reads faster than a sorted list ever will. */
const CODEX_ANIMAL_DIM_IDS = ['vietYear', 'vietMonth', 'vietDay', 'birthShichen', 'deathShichen'];

function codexPolar(cx, cy, radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}

/* rows: [{key: animalName, count, pct}] - sparse is fine, missing animals
   render as an empty (0%) slice rather than being skipped, so the wheel
   always shows all 12 true positions. */
function codexAnimalWheelHtml(rows) {
  const byName = {};
  rows.forEach((r) => { byName[r.key] = r; });
  const cx = 120; const cy = 120; const R = 100; const r = 48;
  const maxPct = Math.max(0.001, ...VIETNAMESE_KEYS.map((name) => (byName[name] ? byName[name].pct : 0)));

  const segs = VIETNAMESE_KEYS.map((name, i) => {
    const row = byName[name];
    const pct = row ? row.pct : 0;
    const count = row ? row.count : 0;
    const startA = i * 30 - 90; const endA = startA + 30; const midA = startA + 15;
    const [x1o, y1o] = codexPolar(cx, cy, R, startA);
    const [x2o, y2o] = codexPolar(cx, cy, R, endA);
    const [x2i, y2i] = codexPolar(cx, cy, r, endA);
    const [x1i, y1i] = codexPolar(cx, cy, r, startA);
    const path = `M ${x1o.toFixed(1)},${y1o.toFixed(1)} A ${R},${R} 0 0 1 ${x2o.toFixed(1)},${y2o.toFixed(1)} L ${x2i.toFixed(1)},${y2i.toFixed(1)} A ${r},${r} 0 0 0 ${x1i.toFixed(1)},${y1i.toFixed(1)} Z`;
    const intensity = pct / maxPct;
    const fill = pct > 0 ? `color-mix(in srgb, var(--gold) ${Math.round(intensity * 100)}%, var(--panel-2))` : 'var(--panel-2)';
    const [lx, ly] = codexPolar(cx, cy, (R + r) / 2, midA);
    return { path, fill, lx, ly, name, pct, count };
  });

  const wedgesSvg = segs.map((s) => `<path d="${s.path}" fill="${s.fill}" stroke="var(--border)" stroke-width="1"><title>${codexEscape(s.name)}: ${s.count} (${(s.pct * 100).toFixed(1)}%)</title></path>`).join('');
  const labelsSvg = segs.map((s) => `<text x="${s.lx.toFixed(1)}" y="${s.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="16" style="pointer-events:none;">${codexAnimalEmoji(s.name)}</text>`).join('');
  const legend = segs.map((s) =>
    `<div class="awl-row"><span class="awl-swatch" style="background:${s.fill}"></span><span class="awl-name">${codexAnimalLabel(s.name)}</span><span class="awl-pct">${s.count} &middot; ${(s.pct * 100).toFixed(1)}%</span></div>`
  ).join('');

  return `<div class="animal-wheel-wrap">
    <svg width="240" height="240" viewBox="0 0 240 240">${wedgesSvg}${labelsSvg}</svg>
    <div class="animal-wheel-legend">${legend}</div>
  </div>`;
}

/* ------------------------------------------------------------- sidebar --- */
const CODEX_NAV_ITEMS = [
  { key: 'dashboard', href: 'index.html', icon: '♦', label: 'Dashboard' },
  { key: 'fields', href: 'fields.html', icon: '\u{1F5C2}', label: 'Fields' },
  { key: 'hours', href: 'hours.html', icon: '⏲', label: 'Hour Studies' },
  { key: 'time', href: 'time-codex.html', icon: '⌛', label: 'Time Codex' },
  { key: 'compare', href: 'compare.html', icon: '⚖', label: 'Compare' },
];

function codexBuildSidebarHtml(activeKey, db) {
  const fieldsHtml = (db && db.fields && db.fields.length)
    ? `<div class="sidebar-fields-list">${db.fields.map((f) =>
        `<a class="sidebar-link" href="field.html?id=${f.id}">${codexEscape(f.name)}</a>`).join('')}</div>`
    : '';
  const navHtml = CODEX_NAV_ITEMS.map((item) =>
    `<a class="sidebar-link${item.key === activeKey ? ' active' : ''}" href="${item.href}">
      <span class="sidebar-link-icon">${item.icon}</span><span class="sidebar-link-label">${item.label}</span>
    </a>`
  ).join('');

  return `
    <a class="sidebar-brand" href="index.html">
      <span class="sidebar-brand-mark">C</span><span class="sidebar-brand-name">The Codex</span>
    </a>
    <div class="sidebar-search" id="shellSearchTrigger">
      <span>&#128269;</span><span class="sidebar-search-label">Search</span>
      <kbd>Ctrl K</kbd>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    ${fieldsHtml ? `<div class="sidebar-section-label">Your Fields</div>${fieldsHtml}` : ''}
    <div class="sidebar-footer">
      <button class="sidebar-collapse-btn" id="shellCollapseBtn" type="button">
        <span id="shellCollapseIcon">&#8676;</span><span class="sidebar-link-label">Collapse</span>
      </button>
    </div>
  `;
}

function codexRenderSidebar(activeKey) {
  const db = (typeof codexLoadDB === 'function') ? codexLoadDB() : null;
  let aside = document.querySelector('.codex-sidebar');
  if (!aside) {
    aside = document.createElement('aside');
    aside.className = 'codex-sidebar';
    document.body.insertBefore(aside, document.body.firstChild);
  }
  aside.innerHTML = codexBuildSidebarHtml(activeKey, db);

  const collapsed = codexRecall('sidebarCollapsed', false);
  document.documentElement.classList.toggle('shell-collapsed', collapsed);
  document.getElementById('shellCollapseIcon').textContent = collapsed ? '↷' : '↶';

  document.getElementById('shellCollapseBtn').addEventListener('click', () => {
    const now = !document.documentElement.classList.contains('shell-collapsed');
    document.documentElement.classList.toggle('shell-collapsed', now);
    document.getElementById('shellCollapseIcon').textContent = now ? '↷' : '↶';
    codexRemember('sidebarCollapsed', now);
  });
  document.getElementById('shellSearchTrigger').addEventListener('click', codexOpenGlobalSearch);
}

/* -------------------------------------------------------- global search --- */
function codexBuildSearchIndex() {
  const db = (typeof codexLoadDB === 'function') ? codexLoadDB() : { fields: [], hourFields: [] };
  const items = [];
  db.fields.forEach((f) => {
    items.push({ kind: 'field', icon: '\u{1F5C2}', name: f.name, sub: `Field · ${f.entries.length} entries`, href: `field.html?id=${f.id}` });
    f.entries.forEach((e) => items.push({ kind: 'entry', icon: '•', name: e.name, sub: `${f.name} · ${e.date}`, href: `field.html?id=${f.id}#entry-${e.id}` }));
  });
  (db.hourFields || []).forEach((f) => {
    items.push({ kind: 'hourField', icon: '⏲', name: f.name, sub: `Hour category · ${f.entries.length} people`, href: `hour-field.html?id=${f.id}` });
    f.entries.forEach((e) => items.push({ kind: 'hourEntry', icon: '•', name: e.name, sub: `${f.name} · born ${e.birthTime}`, href: `hour-field.html?id=${f.id}#entry-${e.id}` }));
  });
  CODEX_NAV_ITEMS.forEach((n) => items.push({ kind: 'page', icon: n.icon, name: n.label, sub: 'Jump to page', href: n.href }));
  return items;
}

let codexSearchIndex = null;
let codexSearchSelIndex = 0;

function codexOpenGlobalSearch() {
  let overlay = document.getElementById('gsearchOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'gsearch-overlay';
    overlay.id = 'gsearchOverlay';
    overlay.innerHTML = `
      <div class="gsearch-box">
        <div class="gsearch-input-row">
          <input type="text" id="gsearchInput" placeholder="Search people, fields, categories, pages..." autocomplete="off">
          <span class="count-chip">Esc</span>
        </div>
        <div class="gsearch-results" id="gsearchResults"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) codexCloseGlobalSearch(); });
    document.getElementById('gsearchInput').addEventListener('input', codexRenderSearchResults);
    document.getElementById('gsearchInput').addEventListener('keydown', codexSearchKeyNav);
  }
  codexSearchIndex = codexBuildSearchIndex();
  overlay.classList.add('open');
  const input = document.getElementById('gsearchInput');
  input.value = '';
  input.focus();
  codexRenderSearchResults();
}

function codexCloseGlobalSearch() {
  const overlay = document.getElementById('gsearchOverlay');
  if (overlay) overlay.classList.remove('open');
}

function codexRenderSearchResults() {
  const q = document.getElementById('gsearchInput').value.trim().toLowerCase();
  const out = document.getElementById('gsearchResults');
  const hits = q
    ? codexSearchIndex.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 40)
    : codexSearchIndex.filter((it) => it.kind === 'page');
  codexSearchSelIndex = 0;
  if (!hits.length) { out.innerHTML = '<div class="gsearch-empty">Nothing matches. Try a different name.</div>'; return; }
  out.innerHTML = hits.map((it, i) =>
    `<div class="gsearch-row${i === 0 ? ' sel' : ''}" data-href="${codexEscape(it.href)}">
      <span class="gsearch-row-icon">${it.icon}</span>
      <div class="gsearch-row-main"><div class="gsearch-row-name">${codexEscape(it.name)}</div><div class="gsearch-row-sub">${codexEscape(it.sub)}</div></div>
    </div>`
  ).join('');
  out.querySelectorAll('.gsearch-row').forEach((row) => {
    row.addEventListener('click', () => { location.href = row.dataset.href; });
  });
}

function codexSearchKeyNav(ev) {
  const rows = Array.from(document.querySelectorAll('#gsearchResults .gsearch-row'));
  if (!rows.length) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    rows[codexSearchSelIndex].classList.remove('sel');
    codexSearchSelIndex = ev.key === 'ArrowDown'
      ? Math.min(codexSearchSelIndex + 1, rows.length - 1)
      : Math.max(codexSearchSelIndex - 1, 0);
    rows[codexSearchSelIndex].classList.add('sel');
    rows[codexSearchSelIndex].scrollIntoView({ block: 'nearest' });
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    const href = rows[codexSearchSelIndex].dataset.href;
    if (href) location.href = href;
  }
}

/* ----------------------------------------------------------- shortcuts --- */
function codexShellShortcuts() {
  document.addEventListener('keydown', (ev) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      codexOpenGlobalSearch();
      return;
    }
    if (ev.key === 'Escape') {
      const gsearch = document.getElementById('gsearchOverlay');
      if (gsearch && gsearch.classList.contains('open')) { codexCloseGlobalSearch(); return; }
      const openModal = document.querySelector('.modal-overlay.open');
      if (openModal) { openModal.classList.remove('open'); return; }
      return;
    }
    if (typing) return;
    if (ev.key === '/') {
      const box = document.querySelector('.quick-search');
      if (box) { ev.preventDefault(); box.focus(); }
      return;
    }
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      const active = document.querySelector('.page-btn.active');
      if (!active) return;
      const target = ev.key === 'ArrowRight' ? active.nextElementSibling : active.previousElementSibling;
      if (target && target.classList && target.classList.contains('page-btn')) { ev.preventDefault(); target.click(); }
    }
  });
}

/* ------------------------------------------------------------- hash jump */
/* If the URL carries #entry-<id> (from a global search hit), open that
   entry's detail popup once the page has rendered it. */
function codexHandleEntryHash(resolveFn) {
  const m = /^#entry-(.+)$/.exec(location.hash);
  if (!m) return;
  const found = resolveFn(m[1]);
  if (found) setTimeout(() => {
    if (found.entry.birthTime !== undefined) codexOpenHourDetail(found.entry, found.field);
    else codexOpenDetail(found.entry, found.field);
  }, 50);
}

/* ---------------------------------------------------------------- init --- */
function codexShellInit(activeKey) {
  document.documentElement.classList.add('shell-ready');
  codexRenderSidebar(activeKey);
  codexShellShortcuts();
}
