/* ============================================================================
   THE CODEX - one Hour Studies category: manual add, mass upload, own-hour
   death stat, sortable table with every computed hour value.
   ========================================================================== */

let db = codexLoadDB();
const hourFieldId = new URLSearchParams(location.search).get('id');
let field = codexFindHourField(db, hourFieldId);

if (!field) {
  document.querySelector('.page').innerHTML =
    '<div class="box"><div class="box-label">Category not found</div><a class="back-link" href="hours.html">&larr; Back to Hour Studies</a></div>';
  throw new Error('unknown hour category');
}

let sortCol = 'name';
let sortAsc = true;
let currentPage = 1;

document.title = `${field.name} - Hour Studies`;

function setAddStatus(text, cls) {
  const el = document.getElementById('addStatus');
  el.textContent = text || '';
  el.className = 'status-line' + (cls ? ` ${cls}` : '');
}

function hourFieldHasName(name) {
  const low = String(name || '').toLowerCase();
  return field.entries.some((e) => String(e.name || '').toLowerCase() === low);
}

/* Same guard philosophy as the main wing: nothing malformed ever enters. */
function addHourEntry(rec) {
  if (!rec || !rec.name || !/^\d{4}-\d{2}-\d{2}$/.test(rec.birthDate || '') || !/^\d{2}:\d{2}$/.test(rec.birthTime || '')) {
    throw new Error('malformed hour entry');
  }
  const hasDeath = !!(rec.deathDate && rec.deathTime);
  field.entries.push({
    id: codexUid(),
    name: rec.name,
    birthDate: rec.birthDate,
    birthTime: rec.birthTime,
    deathDate: hasDeath ? rec.deathDate : null,
    deathTime: hasDeath ? rec.deathTime : null,
  });
  codexSaveDB(db);
}

/* --------------------------------------------------------- manual add --- */

document.getElementById('hAddBtn').addEventListener('click', () => {
  const name = document.getElementById('hName').value.trim();
  const birthDate = document.getElementById('hBirthDate').value;
  const birthTime = document.getElementById('hBirthTime').value;
  const deathDate = document.getElementById('hDeathDate').value;
  const deathTime = document.getElementById('hDeathTime').value;
  if (!name || !birthDate || !birthTime) { setAddStatus('Name, birth date, and exact birth time are all required.', 'err'); return; }
  if ((deathDate && !deathTime) || (!deathDate && deathTime)) { setAddStatus('Death needs BOTH date and time, or leave both empty.', 'err'); return; }
  if (deathDate && `${deathDate} ${deathTime}` <= `${birthDate} ${birthTime}`) { setAddStatus('Death is not after birth.', 'err'); return; }
  if (hourFieldHasName(name)) { setAddStatus(`${name} is already in this category.`, 'err'); return; }
  addHourEntry({ name, birthDate, birthTime, deathDate: deathDate || null, deathTime: deathTime || null });
  setAddStatus(`Added ${name}.`, 'ok');
  codexToast(`Added ${name}`, { kind: 'success' });
  ['hName', 'hBirthDate', 'hBirthTime', 'hDeathDate', 'hDeathTime'].forEach((id) => { document.getElementById(id).value = ''; });
  renderEntries();
  renderStat();
  renderHourDist();
});

/* -------------------------------------------------------- mass upload --- */

document.getElementById('importRunBtn').addEventListener('click', () => {
  const lines = document.getElementById('importText').value.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return;
  const fails = [];
  let added = 0;
  lines.forEach((line) => {
    const rec = codexParseHourLine(line);
    if (rec.error) { fails.push(rec.error); return; }
    if (hourFieldHasName(rec.name)) { fails.push(`${rec.name}: already in category`); return; }
    addHourEntry(rec);
    added++;
  });
  document.getElementById('importStatus').textContent = `Done: ${added} added, ${fails.length} rejected.`;
  document.getElementById('importFails').innerHTML = fails.map((f) => `<li>${codexEscape(f)}</li>`).join('');
  codexToast(`Import done: ${added} added, ${fails.length} rejected`, { kind: fails.length ? 'info' : 'success', duration: 4500 });
  if (added) document.getElementById('importText').value = '';
  renderEntries();
  renderStat();
  renderHourDist();
});

/* ---------------------------------------------------------------- stat --- */

let hourDistMode = codexRecall('hourField_mode', 'exp');

function renderStat() {
  const out = document.getElementById('statResults');
  const items = field.entries.map((e) => ({ entry: e, field }));
  out.innerHTML = codexDeathHourStudyHtml(items, false);
  codexWireHourBars(out, items);
}

function renderHourDist() {
  const out = document.getElementById('hourDistResults');
  const items = field.entries.map((e) => ({ entry: e, field }));
  out.innerHTML = codexHourDistributionHtml(items, document.getElementById('hourDistDim').value, hourDistMode, false);
  codexWireHourBars(out, items);
}

document.getElementById('hourDistDim').addEventListener('change', () => { codexRemember('hourField_dim', document.getElementById('hourDistDim').value); renderHourDist(); });
document.querySelectorAll('.mode-btn[data-group="hdist"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    hourDistMode = btn.dataset.mode;
    codexRemember('hourField_mode', hourDistMode);
    document.querySelectorAll('.mode-btn[data-group="hdist"]').forEach((b) => b.classList.toggle('active', b === btn));
    renderHourDist();
  });
});

/* --------------------------------------------------------------- table --- */

const HOUR_COLS = [
  { id: 'name', label: 'Name', val: (e) => String(e.name).toLowerCase(), cell: (e) => codexEscape(e.name), cls: '' },
  { id: 'born', label: 'Born', val: (e) => e.birthDate, cell: (e) => codexEscape(e.birthDate), cls: 'dim-cell' },
  { id: 'btime', label: 'B.Time', val: (e) => e.birthTime, cell: (e) => codexEscape(e.birthTime), cls: 'dim-cell' },
  { id: 'root', label: 'Root', val: (e, c) => Number(c.root), cell: (e, c) => c.root, cls: 'num' },
  { id: 'mil', label: 'Mil', val: (e, c) => (c.rootMil == null ? -1 : Number(c.rootMil)), cell: (e, c) => (c.rootMil == null ? '' : c.rootMil), cls: 'num' },
  { id: 'banimal', label: 'B.Hr Animal', val: (e, c) => codexAnimalSortKey(c.birthAnimal), cell: (e, c) => codexAnimalLabel(c.birthAnimal), cls: 'dim-cell' },
  { id: 'died', label: 'Died', val: (e) => e.deathDate || '', cell: (e) => codexEscape(e.deathDate || ''), cls: 'dim-cell' },
  { id: 'dtime', label: 'D.Time', val: (e) => e.deathTime || '', cell: (e) => codexEscape(e.deathTime || ''), cls: 'dim-cell' },
  { id: 'dph', label: 'Death PH', val: (e, c) => (c.death ? Number(c.death.personalHour) : -1), cell: (e, c) => (c.death ? c.death.personalHour : ''), cls: 'num' },
  { id: 'dphm', label: 'PH Mil', val: (e, c) => (c.death && c.death.personalHourMil != null ? Number(c.death.personalHourMil) : -1), cell: (e, c) => (c.death && c.death.personalHourMil != null ? c.death.personalHourMil : ''), cls: 'num' },
  { id: 'droot', label: 'D.Root', val: (e, c) => (c.death ? Number(c.death.clockRoot) : -1), cell: (e, c) => (c.death ? c.death.clockRoot : ''), cls: 'num' },
  { id: 'danimal', label: 'D.Hr Animal', val: (e, c) => (c.death ? codexAnimalSortKey(c.death.animal) : 99), cell: (e, c) => (c.death ? codexAnimalLabel(c.death.animal) : ''), cls: 'dim-cell' },
  { id: 'own', label: 'Own', val: (e, c) => (c.death ? (c.death.ownExactHour ? 2 : (c.death.ownShichen ? 1 : 0)) : -1), cell: (e, c) => (c.death ? (c.death.ownExactHour ? '<span class="own-badge">EXACT</span>' : (c.death.ownShichen ? '<span class="own-badge">SHICHEN</span>' : '')) : ''), cls: '' },
];

function renderHead() {
  document.getElementById('entriesHead').innerHTML =
    HOUR_COLS.map((col) =>
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
  const col = HOUR_COLS.find((c) => c.id === sortCol) || HOUR_COLS[0];

  if (!field.entries.length) {
    document.getElementById('entryCount').textContent = '';
    document.getElementById('tablePager').innerHTML = '';
    document.getElementById('entriesBody').innerHTML = `<tr><td colspan="${HOUR_COLS.length + 1}">
      <div class="empty-state">
        <div class="empty-state-icon">&#9202;</div>
        <div class="empty-state-title">No one in ${codexEscape(field.name)} yet</div>
        <div class="empty-state-sub">Add a person's exact birth time (and death time, if known) above, or mass-upload a whole list.</div>
        <div class="empty-state-actions"><button class="btn" id="emptyAddBtn" type="button">Add Person</button></div>
      </div>
    </td></tr>`;
    const emptyBtn = document.getElementById('emptyAddBtn');
    if (emptyBtn) emptyBtn.addEventListener('click', () => {
      document.getElementById('addBody').hidden = false;
      document.getElementById('addChevron').classList.add('open');
      document.getElementById('hName').focus();
    });
    return;
  }

  let rows = field.entries.map((e) => ({ e, c: codexComputeHourCodes(e) }));
  if (q) {
    rows = rows.filter((r) =>
      r.e.name.toLowerCase().includes(q) || r.e.birthDate.includes(q) || (r.e.deathDate || '').includes(q));
  }
  rows.sort((a, b) => {
    const va = col.val(a.e, a.c); const vb = col.val(b.e, b.c);
    const cmp = (typeof va === 'number' && typeof vb === 'number') ? va - vb : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  document.getElementById('entryCount').textContent = `${rows.length} of ${field.entries.length}`;
  const totalPages = Math.max(1, Math.ceil(rows.length / CODEX_PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const visible = rows.slice((currentPage - 1) * CODEX_PAGE_SIZE, currentPage * CODEX_PAGE_SIZE);

  const pager = document.getElementById('tablePager');
  pager.innerHTML = codexPaginationHtml(totalPages, currentPage);
  pager.querySelectorAll('.page-btn').forEach((btn) => {
    btn.addEventListener('click', () => { currentPage = Number(btn.dataset.page); renderEntries(); });
  });

  document.getElementById('entriesBody').innerHTML = visible.map(({ e, c }) =>
    `<tr data-entry="${e.id}">${HOUR_COLS.map((tc) => `<td class="${tc.cls}">${tc.cell(e, c)}</td>`).join('')}<td><button class="row-del" data-del="${e.id}" title="Delete">&times;</button></td></tr>`
  ).join('');

  document.querySelectorAll('#entriesBody tr').forEach((tr) => {
    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('.row-del')) return;
      const entry = field.entries.find((e) => e.id === tr.dataset.entry);
      if (entry) codexOpenHourDetail(entry, field);
    });
  });
  document.querySelectorAll('.row-del').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const entry = field.entries.find((e) => e.id === btn.dataset.del);
      if (!entry) return;
      const idx = field.entries.indexOf(entry);
      field.entries.splice(idx, 1);
      codexSaveDB(db);
      renderEntries();
      renderStat();
      renderHourDist();
      codexToast(`Deleted ${entry.name}`, {
        kind: 'danger', duration: 6000, actionLabel: 'Undo',
        onAction: () => {
          field.entries.splice(idx, 0, entry);
          codexSaveDB(db);
          renderEntries();
          renderStat();
          renderHourDist();
        },
      });
    });
  });
}

document.getElementById('entrySearch').addEventListener('input', () => { currentPage = 1; renderEntries(); });

/* ---------------------------------------------------------------- tabs --- */

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('tab-data').hidden = btn.dataset.tab !== 'data';
    document.getElementById('tab-analyze').hidden = btn.dataset.tab !== 'analyze';
  });
});

/* ------------------------------------------------- rename / delete ------ */

document.getElementById('renameFieldBtn').addEventListener('click', async () => {
  const name = await codexPromptText('New category name:', field.name);
  if (!name) return;
  field.name = name;
  codexSaveDB(db);
  renderTitle();
  codexRenderSidebar('hours');
  codexToast('Category renamed.', { kind: 'success' });
});

document.getElementById('deleteFieldBtn').addEventListener('click', async () => {
  const ok = await codexConfirm(`Delete the whole ${field.name} category (${field.entries.length} people)? Export a backup first if unsure.`, { title: 'Delete category?', okLabel: 'Delete', danger: true });
  if (!ok) return;
  db.hourFields = db.hourFields.filter((f) => f.id !== field.id);
  codexSaveDB(db);
  location.href = 'hours.html';
});

/* ---------------------------------------------------------------- init --- */

function renderTitle() {
  document.getElementById('fieldTitleChip').textContent = `${field.name} (Hour Studies)`;
}

codexWireCollapsible('addToggle', 'addBody', 'addChevron');
codexWireCollapsible('importToggle', 'importBody', 'importChevron');
document.getElementById('hourDistDim').innerHTML = codexHourDimensionOptionsHtml(codexRecall('hourField_dim', 'deathHour'));
renderTitle();
renderEntries();
renderStat();
renderHourDist();
codexShellInit('hours');
codexHandleEntryHash((entryId) => {
  const entry = field.entries.find((e) => e.id === entryId);
  return entry ? { entry, field } : null;
});

codexCloudInit(() => {
  db = codexLoadDB();
  field = codexFindHourField(db, hourFieldId);
  if (!field) { location.href = 'hours.html'; return; }
  renderTitle();
  renderEntries();
  renderStat();
  renderHourDist();
  codexRenderSidebar('hours');
});
