/* ============================================================================
   THE CODEX - app shell: sidebar nav, global search, shortcuts, persistence,
   dimension colors, animal emoji. Included on every page after codex-core.js
   /codex-compute.js (needs CODEX_DIMENSIONS + codexAllEntries) and, where
   present, after codex-hours.js (needs CODEX_HOUR_DIMENSIONS). Call
   codexShellInit('<page-key>') once the page's own data (db) exists.
   ========================================================================== */

/* -------------------------------------------------------- number format --- */
/* Large counts (day totals especially) get abbreviated in tight spaces -
   stat tiles, chips, bar meta. Anything under 10,000 stays exact (nothing
   in this app is dense enough below that to need shortening); the exact
   figure is always still available via toLocaleString() at the point of
   use where precision actually matters (tooltips, detail views). */
function codexAbbrevNum(n) {
  if (n < 10000) return n.toLocaleString();
  if (n < 1000000) return (n / 1000).toFixed(n < 100000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

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

  const wedgesSvg = segs.map((s) => `<path d="${s.path}" fill="${s.fill}" stroke="var(--border)" stroke-width="1" data-tip="${codexEscape(s.name)}: ${s.count} (${(s.pct * 100).toFixed(1)}%)"></path>`).join('');
  const labelsSvg = segs.map((s) => `<text x="${s.lx.toFixed(1)}" y="${s.ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="16" style="pointer-events:none;">${codexAnimalEmoji(s.name)}</text>`).join('');
  const legend = segs.map((s) =>
    `<div class="awl-row" data-tip="${codexEscape(s.name)}: ${s.count} (${(s.pct * 100).toFixed(1)}%)"><span class="awl-swatch" style="background:${s.fill}"></span><span class="awl-name">${codexAnimalLabel(s.name)}</span><span class="awl-pct">${s.count} &middot; ${(s.pct * 100).toFixed(1)}%</span></div>`
  ).join('');

  return `<div class="animal-wheel-wrap">
    <svg width="240" height="240" viewBox="0 0 240 240">${wedgesSvg}${labelsSvg}</svg>
    <div class="animal-wheel-legend">${legend}</div>
  </div>`;
}

/* ------------------------------------------------------------- sidebar --- */
/* One icon language, app-wide: plain emoji, chosen so no two nav items
   read as the same concept (Hour Studies is a clock face, Time Codex is
   an hourglass - close cousins but visually distinct at a glance). */
const CODEX_NAV_ITEMS = [
  { key: 'dashboard', href: 'index.html', icon: '\u{1F3E0}', label: 'Dashboard' },
  { key: 'fields', href: 'fields.html', icon: '\u{1F5C2}️', label: 'Fields' },
  { key: 'hours', href: 'hours.html', icon: '\u{1F550}', label: 'Hour Studies' },
  { key: 'time', href: 'time-codex.html', icon: '⌛', label: 'Time Codex' },
  { key: 'compare', href: 'compare.html', icon: '⚖️', label: 'Compare' },
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
  codexHint('search', document.getElementById('shellSearchTrigger'), 'Tip: Ctrl+K searches every person, field, and category instantly, from anywhere.');
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

/* -------------------------------------------------------------- toasts --- */
/* codexToast(message, opts): opts = { kind: 'success'|'danger'|'info',
   duration: ms (0 = stays until dismissed), actionLabel, onAction }.
   Returns the toast element so a caller can dismiss it early (used by the
   undo flow). Stacks bottom-right, newest on top. */
function codexToastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

function codexToast(message, opts) {
  const o = opts || {};
  const kind = o.kind || 'info';
  const host = codexToastHost();
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `
    <span class="toast-msg">${codexEscape(message)}</span>
    ${o.actionLabel ? `<button class="toast-action" type="button">${codexEscape(o.actionLabel)}</button>` : ''}
    <button class="toast-close" type="button" aria-label="Dismiss">&times;</button>
  `;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));

  const dismiss = () => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('.toast-close').addEventListener('click', dismiss);
  if (o.actionLabel) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      if (o.onAction) o.onAction();
      dismiss();
    });
  }
  const duration = o.duration != null ? o.duration : 3200;
  if (duration > 0) setTimeout(dismiss, duration);
  el._dismiss = dismiss;
  return el;
}

/* ------------------------------------------------------- confirm modal --- */
/* Promise-based replacements for window.confirm/window.prompt, styled to
   match instead of popping a plain OS dialog. Only one at a time - a
   second call while one is open queues behind it via the returned promise
   chain naturally (each call awaits the DOM being clear). */
function codexConfirmHost() {
  let host = document.getElementById('confirmOverlay');
  if (!host) {
    host = document.createElement('div');
    host.className = 'modal-overlay confirm-overlay';
    host.id = 'confirmOverlay';
    host.innerHTML = `
      <div class="modal-box confirm-box">
        <div class="confirm-title" id="confirmTitle"></div>
        <div class="confirm-body" id="confirmBody"></div>
        <input type="text" id="confirmInput" hidden>
        <div class="confirm-actions">
          <button class="btn-link" id="confirmCancel" type="button">Cancel</button>
          <button class="btn" id="confirmOk" type="button">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(host);
    host.addEventListener('click', (ev) => { if (ev.target === host) host.querySelector('#confirmCancel').click(); });
  }
  return host;
}

function codexConfirm(message, opts) {
  const o = opts || {};
  return new Promise((resolve) => {
    const host = codexConfirmHost();
    host.querySelector('#confirmTitle').textContent = o.title || 'Are you sure?';
    host.querySelector('#confirmBody').textContent = message;
    host.querySelector('#confirmInput').hidden = true;
    const okBtn = host.querySelector('#confirmOk');
    okBtn.textContent = o.okLabel || 'Confirm';
    okBtn.className = o.danger ? 'btn btn-danger-solid' : 'btn';
    host.classList.add('open');

    const cleanup = (result) => {
      host.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const cancelBtn = host.querySelector('#confirmCancel');
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    setTimeout(() => okBtn.focus(), 30);
  });
}

function codexPromptText(message, defaultValue) {
  return new Promise((resolve) => {
    const host = codexConfirmHost();
    host.querySelector('#confirmTitle').textContent = message;
    host.querySelector('#confirmBody').textContent = '';
    const input = host.querySelector('#confirmInput');
    input.hidden = false;
    input.value = defaultValue || '';
    const okBtn = host.querySelector('#confirmOk');
    okBtn.textContent = 'Save';
    okBtn.className = 'btn';
    host.classList.add('open');

    const cleanup = (result) => {
      host.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onOk = () => cleanup(input.value.trim() || null);
    const onCancel = () => cleanup(null);
    const onKey = (ev) => { if (ev.key === 'Enter') onOk(); };
    const cancelBtn = host.querySelector('#confirmCancel');
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

/* ------------------------------------------------------------ tooltip --- */
/* Hover-follows-cursor tooltip for chart elements (animal wheel wedges,
   heatmap cells) instead of the browser's plain title="" box. Call once
   per container; delegates to any descendant with data-tip. */
function codexWireTooltips(container) {
  let tip = document.getElementById('cxTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'cxTooltip';
    tip.className = 'cx-tooltip';
    document.body.appendChild(tip);
  }
  container.querySelectorAll('[data-tip]').forEach((el) => {
    el.addEventListener('mouseenter', () => { tip.textContent = el.dataset.tip; tip.classList.add('show'); });
    el.addEventListener('mousemove', (ev) => {
      tip.style.left = `${ev.clientX + 14}px`;
      tip.style.top = `${ev.clientY + 14}px`;
    });
    el.addEventListener('mouseleave', () => tip.classList.remove('show'));
  });
}

/* ------------------------------------------------------------ hints --- */
/* One-time dismissible callout near a feature, shown once ever (per id,
   per browser) then never again. Not a tour - just a single pointer at
   something easy to miss (Ctrl+K, the animal wheel, the heatmap tab). */
function codexHint(id, targetEl, message) {
  if (!targetEl || codexRecall(`hint_seen_${id}`, false)) return;
  const rect = targetEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'cx-hint';
  el.style.top = `${rect.bottom + window.scrollY + 10}px`;
  el.style.left = `${Math.max(10, rect.left + window.scrollX - 10)}px`;
  el.innerHTML = `<button class="cx-hint-close" type="button" aria-label="Dismiss">&times;</button>${codexEscape(message)}`;
  document.body.appendChild(el);
  const dismiss = () => { codexRemember(`hint_seen_${id}`, true); el.remove(); };
  el.querySelector('.cx-hint-close').addEventListener('click', dismiss);
  setTimeout(dismiss, 9000);
}

/* --------------------------------------------------------- skeletons --- */
function codexSkeletonRowsHtml(n) {
  return `<div class="bar-rows">${Array.from({ length: n || 5 }, () =>
    '<div class="bar-row skeleton-row"><div class="skeleton skeleton-key"></div><div class="skeleton skeleton-track"></div><div class="skeleton skeleton-meta"></div></div>'
  ).join('')}</div>`;
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
      const confirmOverlay = document.getElementById('confirmOverlay');
      if (confirmOverlay && confirmOverlay.classList.contains('open')) { confirmOverlay.querySelector('#confirmCancel').click(); return; }
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
