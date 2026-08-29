/* ============================================================================
   THE CODEX - Hour Studies home: category grid + all-categories own-hour
   death stat.
   ========================================================================== */

let db = codexLoadDB();

function renderHourFields() {
  const grid = document.getElementById('hourFieldsGrid');
  if (!db.hourFields.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#9202;</div>
      <div class="empty-state-title">No hour categories yet</div>
      <div class="empty-state-sub">A category groups people by exact birth (and optional death) time - add one above, then mass-upload names with clock times to start studying which hours cluster.</div>
    </div>`;
    return;
  }
  grid.innerHTML = db.hourFields.map((f) => {
    const deaths = f.entries.filter((e) => e.deathDate && e.deathTime).length;
    return `<a class="data-card cx-reveal" href="hour-field.html?id=${f.id}">
      <div class="data-card-name">${codexEscape(f.name)}</div>
      <div class="data-card-meta"><span>${f.entries.length} people</span><span class="field-kind-chip">${deaths} deaths</span></div>
    </a>`;
  }).join('');
}

document.getElementById('addHourFieldBtn').addEventListener('click', () => {
  const input = document.getElementById('newHourFieldName');
  const name = input.value.trim();
  if (!name) return;
  if (db.hourFields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
    alert('A category with that name already exists.');
    return;
  }
  db.hourFields.push({ id: codexUid(), name, entries: [] });
  codexSaveDB(db);
  input.value = '';
  renderHourFields();
  renderStat();
  codexRenderSidebar('hours');
});

let hourDistMode = codexRecall('hoursHome_mode', 'exp');

function renderStat() {
  const out = document.getElementById('statResults');
  const items = codexAllHourEntries(db);
  out.innerHTML = codexDeathHourStudyHtml(items, true);
  codexWireHourBars(out, items);
}

function renderHourDist() {
  const out = document.getElementById('hourDistResults');
  const items = codexAllHourEntries(db);
  out.innerHTML = codexHourDistributionHtml(items, document.getElementById('hourDistDim').value, hourDistMode, true);
  codexWireHourBars(out, items);
}

document.getElementById('hourDistDim').addEventListener('change', () => { codexRemember('hoursHome_dim', document.getElementById('hourDistDim').value); renderHourDist(); });
document.querySelectorAll('.mode-btn[data-group="hdist"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    hourDistMode = btn.dataset.mode;
    codexRemember('hoursHome_mode', hourDistMode);
    document.querySelectorAll('.mode-btn[data-group="hdist"]').forEach((b) => b.classList.toggle('active', b === btn));
    renderHourDist();
  });
});

codexWireCollapsible('statToggle', 'statBody', 'statChevron');
codexWireCollapsible('distToggle', 'distBody', 'distChevron');
document.getElementById('hourDistDim').innerHTML = codexHourDimensionOptionsHtml(codexRecall('hoursHome_dim', 'deathHour'));
renderHourFields();
renderStat();
renderHourDist();
codexShellInit('hours');

codexCloudInit(() => {
  db = codexLoadDB();
  renderHourFields();
  renderStat();
  renderHourDist();
  codexRenderSidebar('hours');
});
