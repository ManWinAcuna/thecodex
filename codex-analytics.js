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

function codexRatioBadgeHtml(actualPct, expectedPct) {
  if (expectedPct == null) return '';
  if (expectedPct === 0) return '<span class="ratio-badge over">only here</span>';
  const ratio = actualPct / expectedPct;
  const cls = ratio >= 1.25 ? 'over' : (ratio <= 0.75 ? 'under' : '');
  return `<span class="ratio-badge ${cls}">${ratio.toFixed(2)}x</span>`;
}

/* The main leaderboard renderer. scoped/restItems are [{entry, field}].
   opts: { showField } - label chips with their field (all-fields scans). */
function codexLeaderboardHtml(scoped, dimId, mode, restItems, opts) {
  const counts = codexCountsFor(scoped, dimId);
  if (!counts.size) return '<div class="status-line">No entries with usable dates in this scope.</div>';
  const total = Array.from(counts.values()).reduce((n, arr) => n + arr.length, 0);
  const rows = Array.from(counts.entries()).sort((a, b) => b[1].length - a[1].length);
  const maxCount = rows[0][1].length;
  const showField = opts && opts.showField;

  const html = rows.map(([key, items]) => {
    const pct = items.length / total;
    const expected = codexExpectedPct(dimId, key, mode, restItems);
    const chips = items.map((it) =>
      `<span class="entry-chip" data-entry="${it.entry.id}">${codexEscape(it.entry.name)}${showField ? `<span class="chip-field">${codexEscape(it.field.name)}</span>` : ''}</span>`
    ).join('');
    return `<div class="bar-row" data-key="${codexEscape(key)}">
      <div class="bar-key">${codexEscape(key)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round((items.length / maxCount) * 100))}%"></div></div>
      <div class="bar-meta"><span>${items.length}</span><span>${(pct * 100).toFixed(1)}%</span>${mode === 'raw' ? '' : codexRatioBadgeHtml(pct, expected)}</div>
      <div class="bar-entries" hidden>${chips}</div>
    </div>`;
  }).join('');

  const note = mode === 'true' && !codexLoadBaseline()
    ? '<div class="status-line err">True baseline not built yet. Build it from the toolbar to unlock honest ratios.</div>'
    : '';
  return note + `<div class="bar-rows">${html}</div>`;
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
