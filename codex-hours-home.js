/* ============================================================================
   THE CODEX - Hour Studies home: category grid + all-categories own-hour
   death stat.
   ========================================================================== */

let db = codexLoadDB();

function renderHourFields() {
  const grid = document.getElementById('hourFieldsGrid');
  if (!db.hourFields.length) {
    grid.innerHTML = '<div class="status-line">No hour categories yet. Add one above.</div>';
    return;
  }
  grid.innerHTML = db.hourFields.map((f) => {
    const deaths = f.entries.filter((e) => e.deathDate && e.deathTime).length;
    return `<a class="field-tile" href="hour-field.html?id=${f.id}">
      <div class="field-tile-name">${codexEscape(f.name)}</div>
      <div class="field-tile-meta"><span>${f.entries.length} people</span><span class="field-kind-chip">${deaths} deaths</span></div>
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
});

function renderStat() {
  const out = document.getElementById('statResults');
  const items = codexAllHourEntries(db);
  out.innerHTML = codexOwnHourStatHtml(items, true);
  out.querySelectorAll('.entry-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const found = items.find((it) => it.entry.id === chip.dataset.entry);
      if (found) codexOpenHourDetail(found.entry, found.field);
    });
  });
}

codexWireCollapsible('statToggle', 'statBody', 'statChevron');
renderHourFields();
renderStat();

codexCloudInit(() => {
  db = codexLoadDB();
  renderHourFields();
  renderStat();
});
