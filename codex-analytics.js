/* ============================================================================
   THE CODEX - the analytics layer.
   Leaderboards with baseline comparison, reverse lookup, cross-field
   comparison. Pure functions + HTML renderers shared by both pages.

   Baseline modes:
     'true'  - simulated engine run over every real date (codex-baseline.js)
     'db'    - the rest of the database (everything outside the scoped set)
     'raw'   - counts only, no comparison
   ========================================================================== */

function codexCountsFor(scoped, dimId) {
  const dim = codexDimension(dimId);
  const counts = new Map(); // key -> [{entry, field}]
  scoped.forEach((item) => {
    const key = dim.get(codexComputeCodes(item.entry.date));
    if (key == null) return;
    if (!counts.has(key)) counts.set(key, []);
    counts.get(key).push(item);
  });
  return counts;
}

/* Comparison share for a key: expected fraction under the chosen mode.
   `restItems` is the complement set for 'db' mode. Returns null when the
   mode has nothing to say (baseline unbuilt, empty rest, raw mode). */
function codexExpectedPct(dimId, key, mode, restItems) {
  if (mode === 'true') return codexBaselinePct(dimId, key);
  if (mode === 'db') {
    if (!restItems || !restItems.length) return null;
    const dim = codexDimension(dimId);
    let hit = 0; let total = 0;
    restItems.forEach((item) => {
      const k = dim.get(codexComputeCodes(item.entry.date));
      if (k == null) return;
      total++;
      if (k === key) hit++;
    });
    if (!total) return null;
    return hit / total;
  }
  return null;
}

/* ------------------------------------------- shared compare-bar pieces --- */
/* The comparison language across the whole site: the gold bar is your data,
   the faint ghost bar with the bright tick is what that value NORMALLY gets.
   Gold past the tick = above normal. HOT/COLD tags only appear when the gap
   is loud (1.5x above / 0.67x below); everything near normal stays quiet. */

function codexNormallyPct(expectedPct) {
  const v = expectedPct * 100;
  return v > 0 && v < 0.1 ? '~0%' : `${v.toFixed(v < 9.5 ? 1 : 0)}%`;
}

function codexHotColdTag(pct, expectedPct) {
  if (expectedPct == null) return '';
  if (expectedPct === 0) return pct > 0 ? '<span class="ratio-badge over">HOT</span>' : '';
  const ratio = pct / expectedPct;
  if (ratio >= 1.5) return `<span class="ratio-badge over">HOT ${ratio >= 9.5 ? Math.round(ratio) : ratio.toFixed(1)}x</span>`;
  if (ratio <= 0.67) return `<span class="ratio-badge under">COLD ${ratio.toFixed(1)}x</span>`;
  return '';
}

function codexCompareBarRowHtml(key, count, pct, expectedPct, scaleMax, chipsHtml, labelHtml) {
  const ghost = expectedPct != null
    ? `<div class="bar-ghost" style="width:${Math.max(1, Math.round((expectedPct / scaleMax) * 100))}%"></div>`
    : '';
  const normally = expectedPct != null ? `<span class="normally">normally ${codexNormallyPct(expectedPct)}</span>` : '';
  return `<div class="bar-row">
    <div class="bar-key">${key}</div>
    <div>${labelHtml || ''}<div class="bar-track">${ghost}<div class="bar-fill" style="width:${Math.max(2, Math.round((pct / scaleMax) * 100))}%"></div></div></div>
    <div class="bar-meta"><span>${count}</span><span>${(pct * 100).toFixed(1)}%</span>${normally}${codexHotColdTag(pct, expectedPct)}</div>
    <div class="bar-entries" hidden>${chipsHtml}</div>
  </div>`;
}

function codexVerdictCardHtml(value, caption) {
  return `<div class="verdict-card"><span class="verdict-num">${value}</span><span class="verdict-caption">${caption}</span></div>`;
}

/* The plain "how many am I looking at" line every distribution box leads
   with, ahead of the verdict card - the raw scope size, spelled out. */
function codexTotalLineHtml(n, noun) {
  return `<div class="scope-total"><strong>${n.toLocaleString()}</strong> ${noun}</div>`;
}

/* Numbered pages of 30, EMAX-style: 5-page window with first/last shortcuts.
   Caller renders into a container and wires .page-btn clicks. */
const CODEX_PAGE_SIZE = 30;
function codexPaginationHtml(totalPages, current) {
  if (totalPages <= 1) return '';
  const windowStart = Math.floor((current - 1) / 5) * 5 + 1;
  const windowEnd = Math.min(windowStart + 4, totalPages);
  let out = '<div class="pagination">';
  if (current > 1) out += `<button class="btn-link page-btn" data-page="${current - 1}">&lsaquo;</button>`;
  if (windowStart > 1) out += `<button class="btn-link page-btn" data-page="1">1</button><span class="page-ellipsis">&hellip;</span>`;
  for (let p = windowStart; p <= windowEnd; p++) out += `<button class="btn-link page-btn${p === current ? ' active' : ''}" data-page="${p}">${p}</button>`;
  if (windowEnd < totalPages) out += `<span class="page-ellipsis">&hellip;</span><button class="btn-link page-btn" data-page="${totalPages}">${totalPages}</button>`;
  return out + '</div>';
}

/* The main leaderboard renderer. scoped/restItems are [{entry, field}].
   opts: { showField } - label chips with their field (all-fields scans). */
function codexLeaderboardHtml(scoped, dimId, mode, restItems, opts) {
  const counts = codexCountsFor(scoped, dimId);
  if (!counts.size) return '<div class="status-line">No entries with usable dates in this scope.</div>';
  const total = Array.from(counts.values()).reduce((n, arr) => n + arr.length, 0);
  const rows = Array.from(counts.entries()).sort((a, b) => b[1].length - a[1].length);
  const showField = opts && opts.showField;
  const dim = codexDimension(dimId);

  const withExpected = rows.map(([key, items]) => ({
    key,
    items,
    pct: items.length / total,
    expectedPct: mode === 'raw' ? null : codexExpectedPct(dimId, key, mode, restItems),
  }));
  const scaleMax = Math.max(...withExpected.map((r) => Math.max(r.pct, r.expectedPct || 0)));

  const html = withExpected.map((r) => {
    const chips = r.items.map((it) =>
      `<span class="entry-chip" data-entry="${it.entry.id}">${codexEscape(it.entry.name)}${showField ? `<span class="chip-field">${codexEscape(it.field.name)}</span>` : ''}</span>`
    ).join('');
    return codexCompareBarRowHtml(codexEscape(r.key), r.items.length, r.pct, r.expectedPct, scaleMax, chips);
  }).join('');

  const top = withExpected[0];
  const verdict = codexVerdictCardHtml(codexEscape(top.key), `${dim.label} leader &middot; ${top.items.length} of ${total} (${(top.pct * 100).toFixed(0)}%)`);

  const note = mode === 'true' && !codexLoadBaseline()
    ? '<div class="status-line err">True baseline not built yet. Build it from the toolbar to unlock the normally markers.</div>'
    : '';
  return note + codexTotalLineHtml(total, 'entries with a usable date in this scope') + verdict + `<div class="bar-rows">${html}</div>`;
}

/* Wire expand-on-tap + entry chip popups inside a rendered leaderboard. */
function codexWireLeaderboard(container, resolveItem) {
  container.querySelectorAll('.bar-row').forEach((row) => {
    row.addEventListener('click', (ev) => {
      if (ev.target.closest('.entry-chip')) return;
      const list = row.querySelector('.bar-entries');
      if (list) { list.hidden = !list.hidden; row.classList.toggle('active', !list.hidden); }
    });
  });
  container.querySelectorAll('.entry-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const found = resolveItem(chip.dataset.entry);
      if (found) codexOpenDetail(found.entry, found.field);
    });
  });
}

/* ------------------------------------------------------ reverse lookup --- */

function codexReverseFilterValues(db, dimId) {
  const dim = codexDimension(dimId);
  const keys = new Set(codexBaselineKeys(dimId));
  codexAllEntries(db).forEach((item) => {
    const k = dim.get(codexComputeCodes(item.entry.date));
    if (k != null) keys.add(k);
  });
  return Array.from(keys).sort((a, b) => dim.sortKey(a) - dim.sortKey(b) || String(a).localeCompare(String(b)));
}

function codexReverseMatch(item, filters) {
  const codes = codexComputeCodes(item.entry.date);
  return Object.entries(filters).every(([dimId, want]) => {
    if (!want) return true;
    return codexDimension(dimId).get(codes) === want;
  });
}

/* -------------------------------------------------- cross-field table --- */

function codexCrossFieldHtml(db, fieldIds, dimId, mode) {
  const dim = codexDimension(dimId);
  const fields = fieldIds.map((id) => codexFindField(db, id)).filter(Boolean);
  if (fields.length < 2) return '<div class="status-line">Pick at least two fields.</div>';

  const perField = fields.map((f) => {
    const scoped = f.entries.map((e) => ({ entry: e, field: f }));
    const counts = codexCountsFor(scoped, dimId);
    const total = Array.from(counts.values()).reduce((n, arr) => n + arr.length, 0);
    return { field: f, counts, total };
  });

  const allKeys = new Set();
  perField.forEach((pf) => pf.counts.forEach((_, key) => allKeys.add(key)));
  const keys = Array.from(allKeys).sort((a, b) => dim.sortKey(a) - dim.sortKey(b) || String(a).localeCompare(String(b)));
  if (!keys.length) return '<div class="status-line">No data in the picked fields yet.</div>';

  const baselineCol = mode === 'true' && codexLoadBaseline();
  const header = `<tr><th>${dim.label}</th>${perField.map((pf) => `<th>${codexEscape(pf.field.name)}</th>`).join('')}${baselineCol ? '<th>Baseline</th>' : ''}</tr>`;

  const body = keys.map((key) => {
    const pcts = perField.map((pf) => {
      const items = pf.counts.get(key) || [];
      return pf.total ? items.length / pf.total : 0;
    });
    const best = Math.max(...pcts);
    const cells = perField.map((pf, i) => {
      const items = pf.counts.get(key) || [];
      const cls = pcts[i] > 0 && pcts[i] === best && best > 0 ? ' class="best"' : '';
      return `<td${cls}>${items.length ? `${(pcts[i] * 100).toFixed(1)}% (${items.length})` : 'Empty'}</td>`;
    }).join('');
    const basePct = baselineCol ? codexBaselinePct(dimId, key) : null;
    const baseCell = baselineCol ? `<td>${basePct != null ? (basePct * 100).toFixed(1) + '%' : 'n/a'}</td>` : '';
    return `<tr><td class="num">${codexEscape(key)}</td>${cells}${baseCell}</tr>`;
  }).join('');

  return `<div class="table-wrap"><table class="codex-table cross-table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
}
