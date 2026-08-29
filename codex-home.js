/* ============================================================================
   THE CODEX - home page.
   Fields grid, global search, Leaderboard Lab, Reverse Lookup, Cross-Field
   Compare, baseline build, backup, cloud slot.
   ========================================================================== */

let db = codexLoadDB();
codexApplySeedFields(db);

let labMode = codexRecall('fields_labMode', 'true');

function resolveItemById(entryId) {
  const all = codexAllEntries(db);
  return all.find((it) => it.entry.id === entryId) || null;
}

/* ------------------------------------------------------------- fields --- */

function renderFields() {
  const grid = document.getElementById('fieldsGrid');
  if (!db.fields.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#128209;</div>
      <div class="empty-state-title">No fields yet</div>
      <div class="empty-state-sub">A field is a study group - athletes, brands, whatever you want to decode. Add one above, then look up or import names into it.</div>
    </div>`;
    return;
  }
  grid.innerHTML = db.fields.map((f) => {
    const kind = CODEX_FIELD_KINDS[f.kind] || CODEX_FIELD_KINDS.custom;
    return `<a class="data-card cx-reveal" href="field.html?id=${f.id}">
      <div class="data-card-name">${codexEscape(f.name)}</div>
      <div class="data-card-meta"><span>${f.entries.length} entries</span><span class="field-kind-chip">${kind.label}</span></div>
    </a>`;
  }).join('');
}

document.getElementById('addFieldBtn').addEventListener('click', () => {
  const input = document.getElementById('newFieldName');
  const name = input.value.trim();
  if (!name) return;
  if (db.fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    alert('A field with that name already exists.');
    return;
  }
  db.fields.push({ id: codexUid(), name, kind: document.getElementById('newFieldKind').value, entries: [] });
  codexSaveDB(db);
  input.value = '';
  renderFields();
  renderScopeSelect();
  renderCrossFields();
  codexRenderSidebar('fields');
});

/* ------------------------------------------------------ global search --- */

function renderGlobalSearch() {
  const q = document.getElementById('globalSearch').value.trim().toLowerCase();
  const out = document.getElementById('globalSearchResults');
  if (!q) { out.innerHTML = ''; return; }
  const hits = codexAllEntries(db).filter((it) =>
    it.entry.name.toLowerCase().includes(q) || it.entry.date.includes(q)).slice(0, 60);
  if (!hits.length) { out.innerHTML = '<div class="status-line">No matches.</div>'; return; }
  out.innerHTML = hits.map((it) =>
    `<span class="entry-chip" data-entry="${it.entry.id}">${codexEscape(it.entry.name)}<span class="chip-field">${codexEscape(it.field.name)} &middot; ${codexEscape(it.entry.date)}</span></span>`).join('');
  out.querySelectorAll('.entry-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const found = resolveItemById(chip.dataset.entry);
      if (found) codexOpenDetail(found.entry, found.field);
    });
  });
}
document.getElementById('globalSearch').addEventListener('input', renderGlobalSearch);

/* ----------------------------------------------------------- baseline --- */

function refreshBaselineChip() {
  const chip = document.getElementById('baselineChip');
  const btn = document.getElementById('buildBaselineBtn');
  if (codexLoadBaseline()) {
    chip.textContent = `Baseline: ready (${CODEX_BASELINE_START_YEAR}-${CODEX_BASELINE_END_YEAR})`;
    btn.hidden = true;
  } else {
    chip.textContent = 'Baseline: not built';
    btn.hidden = false;
  }
}

document.getElementById('buildBaselineBtn').addEventListener('click', () => {
  const wrap = document.getElementById('baselineProgress');
  const fill = document.getElementById('baselineFill');
  const status = document.getElementById('baselineStatus');
  wrap.hidden = false;
  document.getElementById('buildBaselineBtn').disabled = true;
  status.textContent = 'Running the engines over every date in the range. One-time job.';
  codexBuildBaseline(
    (pct) => { fill.style.width = pct + '%'; },
    () => {
      wrap.hidden = true;
      refreshBaselineChip();
      renderLab();
      // Reverse Lookup's value dropdowns (Life Path's "13/4" among them) are
      // sourced from the baseline's own keys - without this they'd stay
      // frozen at whatever was available before the build ever ran, even
      // though the baseline (and its ratios) are now current.
      renderReverseFilters();
    }
  );
});

/* ----------------------------------------------------- leaderboard lab --- */

function renderScopeSelect() {
  const sel = document.getElementById('labScope');
  const prev = sel.value || codexRecall('fields_labScope', 'all');
  sel.innerHTML = '<option value="all">All fields</option>' +
    db.fields.map((f) => `<option value="${f.id}">${codexEscape(f.name)}</option>`).join('');
  if (prev && Array.from(sel.options).some((o) => o.value === prev)) sel.value = prev;
}

function renderLab() {
  const scopeId = document.getElementById('labScope').value;
  const dimId = document.getElementById('labDim').value;
  const out = document.getElementById('labResults');
  let scoped; let rest = [];
  if (scopeId === 'all' || !scopeId) {
    scoped = codexAllEntries(db);
  } else {
    const field = codexFindField(db, scopeId);
    if (!field) { out.innerHTML = ''; return; }
    scoped = field.entries.map((e) => ({ entry: e, field }));
    rest = codexAllEntries(db).filter((it) => it.field.id !== scopeId);
  }
  out.innerHTML = codexLeaderboardHtml(scoped, dimId, labMode, rest, { showField: scopeId === 'all' });
  codexWireLeaderboard(out, resolveItemById);
}

document.getElementById('labScope').addEventListener('change', () => { codexRemember('fields_labScope', document.getElementById('labScope').value); renderLab(); });
document.getElementById('labDim').addEventListener('change', () => { codexRemember('fields_labDim', document.getElementById('labDim').value); renderLab(); });
document.querySelectorAll('.mode-btn[data-group="lab"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    labMode = btn.dataset.mode;
    codexRemember('fields_labMode', labMode);
    document.querySelectorAll('.mode-btn[data-group="lab"]').forEach((b) => b.classList.toggle('active', b === btn));
    renderLab();
  });
});

/* ------------------------------------------------------ reverse lookup --- */

function renderReverseFilters() {
  const wrap = document.getElementById('rlFilters');
  wrap.innerHTML = CODEX_DIMENSIONS.map((dim) => {
    const values = codexReverseFilterValues(db, dim.id);
    return `<div class="rl-filter"><label>${dim.label}</label>
      <select data-dim="${dim.id}"><option value="">Any</option>${values.map((v) => `<option value="${codexEscape(v)}">${codexEscape(v)}</option>`).join('')}</select>
    </div>`;
  }).join('');
}

document.getElementById('rlSearchBtn').addEventListener('click', () => {
  const filters = {};
  document.querySelectorAll('#rlFilters select').forEach((sel) => {
    if (sel.value) filters[sel.dataset.dim] = sel.value;
  });
  const out = document.getElementById('rlResults');
  if (!Object.keys(filters).length) {
    out.innerHTML = '<div class="status-line">Set at least one filter.</div>';
    return;
  }
  const hits = codexAllEntries(db).filter((it) => codexReverseMatch(it, filters));
  if (!hits.length) { out.innerHTML = '<div class="status-line">No entry matches all of that.</div>'; return; }
  out.innerHTML = `<div class="status-line ok">${hits.length} match${hits.length === 1 ? '' : 'es'}</div>` +
    hits.map((it) => `<span class="entry-chip" data-entry="${it.entry.id}">${codexEscape(it.entry.name)}<span class="chip-field">${codexEscape(it.field.name)} &middot; ${codexEscape(it.entry.date)}</span></span>`).join('');
  out.querySelectorAll('.entry-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const found = resolveItemById(chip.dataset.entry);
      if (found) codexOpenDetail(found.entry, found.field);
    });
  });
});

document.getElementById('rlClearBtn').addEventListener('click', () => {
  document.querySelectorAll('#rlFilters select').forEach((sel) => { sel.value = ''; });
  document.getElementById('rlResults').innerHTML = '';
});

/* --------------------------------------------------------- cross-field --- */

function renderCrossFields() {
  const wrap = document.getElementById('crossFields');
  wrap.innerHTML = db.fields.map((f) =>
    `<label class="check-pill"><input type="checkbox" value="${f.id}">${codexEscape(f.name)}</label>`).join('');
  wrap.querySelectorAll('input').forEach((cb) => {
    cb.addEventListener('change', () => cb.closest('.check-pill').classList.toggle('on', cb.checked));
  });
}

document.getElementById('crossRunBtn').addEventListener('click', () => {
  const ids = Array.from(document.querySelectorAll('#crossFields input:checked')).map((cb) => cb.value);
  const dimId = document.getElementById('crossDim').value;
  document.getElementById('crossResults').innerHTML = codexCrossFieldHtml(db, ids, dimId, codexLoadBaseline() ? 'true' : 'raw');
});

/* ------------------------------------------------------ backup buttons --- */

document.getElementById('exportBtn').addEventListener('click', () => codexExportBackup(db));
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  if (file) codexImportBackup(file, (data) => { db = data; renderAll(); codexRenderSidebar('fields'); });
  ev.target.value = '';
});

/* ---------------------------------------------------------------- init --- */

function renderAll() {
  renderFields();
  renderScopeSelect();
  renderReverseFilters();
  renderCrossFields();
  renderLab();
  refreshBaselineChip();
}

codexWireCollapsible('labToggle', 'labBody', 'labChevron');
codexWireCollapsible('rlToggle', 'rlBody', 'rlChevron');
codexWireCollapsible('crossToggle', 'crossBody', 'crossChevron');

document.getElementById('labDim').innerHTML = codexDimensionOptionsHtml(codexRecall('fields_labDim', 'lp'));
document.getElementById('crossDim').innerHTML = codexDimensionOptionsHtml('lp');

renderAll();
codexShellInit('fields');

codexCloudInit(() => { db = codexLoadDB(); renderAll(); codexRenderSidebar('fields'); });
