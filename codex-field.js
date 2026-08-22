/* ============================================================================
   THE CODEX - field page.
   Add via Wikidata lookup (candidate picker), manual add, bulk import,
   seed preload, distribution with baseline toggle, sortable entry table.
   ========================================================================== */

let db = codexLoadDB();
const fieldId = new URLSearchParams(location.search).get('id');
let field = codexFindField(db, fieldId);

if (!field) {
  document.querySelector('.page').innerHTML =
    '<div class="box"><div class="box-label">Field not found</div><a class="back-link" href="index.html">&larr; Back to The Codex</a></div>';
  throw new Error('unknown field');
}

const kindInfo = CODEX_FIELD_KINDS[field.kind] || CODEX_FIELD_KINDS.custom;
const propPairs = CODEX_KIND_PROPS[field.kind] || CODEX_KIND_PROPS.custom;

let distMode = 'true';
let sortCol = 'name';
let sortAsc = true;
let showAll = false;
const RENDER_CAP = 300;

document.title = `${field.name} - The Codex`;

/* ------------------------------------------------------------ helpers --- */

function setAddStatus(text, cls) {
  const el = document.getElementById('addStatus');
  el.textContent = text || '';
  el.className = 'status-line' + (cls ? ` ${cls}` : '');
}

function fieldHasName(name) {
  const low = String(name || '').toLowerCase();
  return field.entries.some((e) => String(e.name || '').toLowerCase() === low);
}

/* Guard: a record without a real name AND a real date never enters the
   database - one malformed entry would otherwise poison every later
   duplicate check and table sort. */
function addEntryRecord(rec) {
  if (!rec || !rec.name || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date || '')) {
    throw new Error('malformed entry');
  }
  field.entries.push({
    id: codexUid(),
    name: rec.name,
    date: rec.date,
    dateKind: rec.kind || kindInfo.dateLabel.toLowerCase(),
    wikiTitle: rec.title || null,
    qid: rec.qid || null,
  });
  codexSaveDB(db);
}

/* ------------------------------------------------------------- lookup --- */

document.getElementById('lookupBtn').addEventListener('click', runLookup);
document.getElementById('lookupName').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') runLookup(); });

async function runLookup() {
  const name = document.getElementById('lookupName').value.trim();
  const list = document.getElementById('candidateList');
  if (!name) return;
  list.innerHTML = '';
  setAddStatus('Searching Wikidata...');
  try {
    const candidates = await codexSearchCandidates(name);
    if (!candidates.length) { setAddStatus('Nothing found under that name.', 'err'); return; }
    setAddStatus('Pick the right one:');
    list.innerHTML = candidates.map((c, i) =>
      `<div class="candidate-row" data-i="${i}"><div>${codexEscape(c.label)}</div><div class="candidate-desc">${codexEscape(c.description) || 'No description'}</div></div>`).join('');
    list.querySelectorAll('.candidate-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const c = candidates[Number(row.dataset.i)];
        setAddStatus(`Resolving date for ${c.label}...`);
        list.innerHTML = '';
        const resolved = await codexResolveQid(c.qid, propPairs);
        if (!resolved) { setAddStatus(`No day-precision date on Wikidata for ${c.label}. Add manually if you know the real date.`, 'err'); return; }
        if (fieldHasName(c.label)) { setAddStatus(`${c.label} is already in this field.`, 'err'); return; }
        addEntryRecord({ name: c.label, date: resolved.date, kind: resolved.kind, title: resolved.title, qid: c.qid });
        setAddStatus(`Added ${c.label} (${resolved.kind} ${resolved.date}).`, 'ok');
        document.getElementById('lookupName').value = '';
        renderEntries();
        renderDist();
      });
    });
  } catch (e) {
    setAddStatus('Lookup failed. Network?', 'err');
  }
}

/* --------------------------------------------------------- manual add --- */

document.getElementById('manualAddBtn').addEventListener('click', () => {
  const name = document.getElementById('manualName').value.trim();
  const date = document.getElementById('manualDate').value;
  if (!name || !date) { setAddStatus('Manual add needs both a name and a full date.', 'err'); return; }
  if (fieldHasName(name)) { setAddStatus(`${name} is already in this field.`, 'err'); return; }
  addEntryRecord({ name, date, kind: 'manual' });
  setAddStatus(`Added ${name} (${date}).`, 'ok');
  document.getElementById('manualName').value = '';
  document.getElementById('manualDate').value = '';
  renderEntries();
  renderDist();
});

/* -------------------------------------------------------- bulk import --- */

async function runBatch(names, statusEl, trackEl, fillEl, failsEl) {
  const fails = [];
  let done = 0; let added = 0;
  trackEl.hidden = false;
  failsEl.innerHTML = '';
  for (const item of names) {
    const label = item.name;
    try {
      if (item.date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) { fails.push(`${label}: bad date format`); }
        else if (fieldHasName(label)) { fails.push(`${label}: already in field`); }
        else { addEntryRecord({ name: label, date: item.date, kind: 'manual' }); added++; }
      } else if (fieldHasName(label)) {
        fails.push(`${label}: already in field`);
      } else {
        const hit = await codexLookupByName(label, propPairs);
        if (!hit) fails.push(`${label}: no day-precision date found`);
        else if (fieldHasName(hit.name)) fails.push(`${label}: already in field`);
        else { addEntryRecord(hit); added++; }
      }
    } catch (e) {
      fails.push(`${label}: lookup error`);
    }
    done++;
    fillEl.style.width = Math.round((done / names.length) * 100) + '%';
    statusEl.textContent = `${done}/${names.length} processed, ${added} added, ${fails.length} missed`;
    if (done % 10 === 0) { renderEntries(); }
  }
  trackEl.hidden = true;
  statusEl.textContent = `Done: ${added} added, ${fails.length} missed.`;
  failsEl.innerHTML = fails.map((f) => `<li>${codexEscape(f)}</li>`).join('');
  renderEntries();
  renderDist();
}

document.getElementById('importRunBtn').addEventListener('click', () => {
  const lines = document.getElementById('importText').value.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return;
  const names = lines.map((line) => {
    const parts = line.split('|').map((p) => p.trim());
    return { name: parts[0], date: parts[1] || null };
  });
  document.getElementById('importRunBtn').disabled = true;
  runBatch(names,
    document.getElementById('importStatus'),
    document.getElementById('importTrack'),
    document.getElementById('importFill'),
    document.getElementById('importFails')
  ).finally(() => { document.getElementById('importRunBtn').disabled = false; });
});

/* ------------------------------------------------------- seed preload --- */

const seed = codexSeedForField(field);
if (seed) {
  const remaining = seed.list.filter((n) => !fieldHasName(n));
  if (remaining.length) {
    document.getElementById('seedBox').hidden = false;
    document.getElementById('seedSub').textContent =
      `${remaining.length} of ${seed.list.length} names from the built-in ${seed.name} list are not in this field yet. Dates resolve live from Wikidata.`;
    document.getElementById('seedBtn').addEventListener('click', () => {
      document.getElementById('seedBtn').disabled = true;
      runBatch(remaining.map((n) => ({ name: n, date: null })),
        document.getElementById('seedStatus'),
        document.getElementById('seedTrack'),
        document.getElementById('seedFill'),
        document.getElementById('seedFails')
      ).finally(() => { document.getElementById('seedBox').hidden = true; });
    });
  }
}

/* ------------------------------------------------------- distribution --- */

function renderDist() {
  const dimId = document.getElementById('distDim').value;
  const out = document.getElementById('distResults');
  const scoped = field.entries.map((e) => ({ entry: e, field }));
  const rest = codexAllEntries(db).filter((it) => it.field.id !== field.id);
  out.innerHTML = codexLeaderboardHtml(scoped, dimId, distMode, rest, { showField: false });
  codexWireLeaderboard(out, (entryId) => {
    const entry = field.entries.find((e) => e.id === entryId);
    return entry ? { entry, field } : null;
  });
}

document.getElementById('distDim').addEventListener('change', renderDist);
document.querySelectorAll('.mode-btn[data-group="dist"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    distMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn[data-group="dist"]').forEach((b) => b.classList.toggle('active', b === btn));
    renderDist();
  });
});

/* -------------------------------------------------------- entry table --- */

const TABLE_COLS = [
  { id: 'name', label: 'Name', val: (e) => e.name.toLowerCase(), cell: (e) => codexEscape(e.name), cls: '' },
  { id: 'date', label: kindInfo.dateLabel, val: (e) => e.date, cell: (e) => codexEscape(e.date), cls: 'dim-cell' },
  { id: 'lp', label: 'LP', val: (e, c) => c.lpNum, cell: (e, c) => codexEscape(c.lp), cls: 'num' },
  { id: 'lpc', label: 'LP&Sigma;', val: (e, c) => c.lpCompound, cell: (e, c) => c.lpCompound, cls: 'num' },
  { id: 'day', label: 'Day', val: (e, c) => c.dayBorn, cell: (e, c) => c.dayBorn, cls: 'num' },
  { id: 'daynum', label: 'Day#', val: (e, c) => c.dayNum, cell: (e, c) => c.dayNum, cls: 'num' },
  { id: 'combo', label: 'Combo', val: (e, c) => c.combo, cell: (e, c) => c.combo, cls: 'num' },
  { id: 'vy', label: 'Year', val: (e, c) => codexAnimalSortKey(c.vietYear), cell: (e, c) => codexEscape(c.vietYear), cls: 'dim-cell' },
  { id: 'vm', label: 'Month', val: (e, c) => codexAnimalSortKey(c.vietMonth), cell: (e, c) => codexEscape(c.vietMonth), cls: 'dim-cell' },
  { id: 'vd', label: 'Day An.', val: (e, c) => codexAnimalSortKey(c.vietDay), cell: (e, c) => codexEscape(c.vietDay), cls: 'dim-cell' },
];

function renderHead() {
  document.getElementById('entriesHead').innerHTML =
    TABLE_COLS.map((col) =>
      `<th data-col="${col.id}" class="${col.id === sortCol ? 'sorted' : ''}">${col.label}${col.id === sortCol ? (sortAsc ? ' &#9650;' : ' &#9660;') : ''}</th>`
    ).join('') + '<th></th>';
  document.querySelectorAll('#entriesHead th[data-col]').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) sortAsc = !sortAsc;
      else { sortCol = col; sortAsc = true; }
      renderEntries();
    });
  });
}

function renderEntries() {
  renderHead();
  const q = document.getElementById('entrySearch').value.trim().toLowerCase();
  const col = TABLE_COLS.find((c) => c.id === sortCol) || TABLE_COLS[0];
  let rows = field.entries.map((e) => ({ e, c: codexComputeCodes(e.date) }));
  if (q) rows = rows.filter((r) => r.e.name.toLowerCase().includes(q) || r.e.date.includes(q));
  rows.sort((a, b) => {
    const va = col.val(a.e, a.c); const vb = col.val(b.e, b.c);
    const cmp = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  document.getElementById('entryCount').textContent = `${rows.length} of ${field.entries.length}`;
  const capped = !showAll && rows.length > RENDER_CAP;
  const visible = capped ? rows.slice(0, RENDER_CAP) : rows;
  document.getElementById('showAllBtn').hidden = !capped;

  document.getElementById('entriesBody').innerHTML = visible.map(({ e, c }) =>
    `<tr data-entry="${e.id}">${TABLE_COLS.map((tc) => `<td class="${tc.cls}">${tc.cell(e, c)}</td>`).join('')}<td><button class="row-del" data-del="${e.id}" title="Delete">&times;</button></td></tr>`
  ).join('');

  document.querySelectorAll('#entriesBody tr').forEach((tr) => {
    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('.row-del')) return;
      const entry = field.entries.find((e) => e.id === tr.dataset.entry);
      if (entry) codexOpenDetail(entry, field);
    });
  });
  document.querySelectorAll('.row-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = field.entries.find((e) => e.id === btn.dataset.del);
      if (!entry) return;
      if (!confirm(`Delete ${entry.name} from ${field.name}?`)) return;
      field.entries = field.entries.filter((e) => e.id !== entry.id);
      codexSaveDB(db);
      renderEntries();
      renderDist();
    });
  });
}

document.getElementById('entrySearch').addEventListener('input', renderEntries);
document.getElementById('showAllBtn').addEventListener('click', () => { showAll = true; renderEntries(); });

/* ------------------------------------------------- rename / delete ------ */

document.getElementById('renameFieldBtn').addEventListener('click', () => {
  const name = prompt('New field name:', field.name);
  if (!name || !name.trim()) return;
  field.name = name.trim();
  codexSaveDB(db);
  renderTitle();
});

document.getElementById('deleteFieldBtn').addEventListener('click', () => {
  if (!confirm(`Delete the whole ${field.name} field (${field.entries.length} entries)? This cannot be undone here. Export a backup first if unsure.`)) return;
  db.fields = db.fields.filter((f) => f.id !== field.id);
  codexSaveDB(db);
  location.href = 'index.html';
});

/* ---------------------------------------------------------------- init --- */

function renderTitle() {
  document.getElementById('fieldTitleChip').textContent = `${field.name} (${kindInfo.label})`;
}

codexWireCollapsible('importToggle', 'importBody', 'importChevron');
codexWireCollapsible('distToggle', 'distBody', 'distChevron');
document.getElementById('distDim').innerHTML = codexDimensionOptionsHtml('lp');

renderTitle();
renderEntries();
renderDist();

codexCloudInit(() => {
  db = codexLoadDB();
  field = codexFindField(db, fieldId);
  if (!field) { location.href = 'index.html'; return; }
  renderTitle();
  renderEntries();
  renderDist();
});
