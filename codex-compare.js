/* ============================================================================
   THE CODEX - Compare view.
   2-4 slots (fields, OR hour-study categories - two modes, since they carry
   different dimension sets) side by side on one dimension, every column
   scaled against the same maximum so bar length is honestly comparable.
   Scope note: v1 compares fields-to-fields or category-to-category, not
   mixed with Time Codex eras - kept out to ship a correct, simple v1.
   ========================================================================== */

const db = codexLoadDB();
let cmpMode = codexRecall('cmp_mode', 'fields');
let cmpSlots = codexRecall('cmp_slots_' + cmpMode, [null, null]);

function cmpSourceList() {
  return cmpMode === 'fields' ? db.fields : (db.hourFields || []);
}
function cmpDimensions() {
  return cmpMode === 'fields' ? CODEX_DIMENSIONS : CODEX_HOUR_DIMENSIONS;
}

function cmpCountsFor(item, dimId) {
  const counts = new Map();
  if (cmpMode === 'fields') {
    const dim = codexDimension(dimId);
    item.entries.forEach((e) => {
      const k = dim.get(codexComputeCodes(e.date));
      if (k == null) return;
      if (!counts.has(k)) counts.set(k, []);
      counts.get(k).push(e);
    });
  } else {
    const dim = CODEX_HOUR_DIMENSIONS.find((d) => d.id === dimId) || CODEX_HOUR_DIMENSIONS[0];
    item.entries.forEach((e) => {
      const codes = codexComputeHourCodes(e);
      const k = dim.get(e, codes);
      if (k == null) return;
      if (!counts.has(k)) counts.set(k, []);
      counts.get(k).push(e);
    });
  }
  return counts;
}

/* --------------------------------------------------------------- slots --- */

function renderSlots() {
  const list = cmpSourceList();
  const wrap = document.getElementById('cmpSlots');
  wrap.innerHTML = cmpSlots.map((val, i) => `
    <div class="compare-slot">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="box-sub" style="margin:0;">Slot ${i + 1}</span>
        ${cmpSlots.length > 2 ? `<button class="row-del" data-remove="${i}" title="Remove">&times;</button>` : ''}
      </div>
      <select data-slot="${i}">
        <option value="">Pick one...</option>
        ${list.map((it) => `<option value="${it.id}"${it.id === val ? ' selected' : ''}>${codexEscape(it.name)} (${it.entries.length})</option>`).join('')}
      </select>
    </div>
  `).join('');
  wrap.querySelectorAll('select[data-slot]').forEach((sel) => {
    sel.addEventListener('change', () => {
      cmpSlots[Number(sel.dataset.slot)] = sel.value || null;
      codexRemember('cmp_slots_' + cmpMode, cmpSlots);
      renderCompare();
    });
  });
  wrap.querySelectorAll('.row-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      cmpSlots.splice(Number(btn.dataset.remove), 1);
      codexRemember('cmp_slots_' + cmpMode, cmpSlots);
      renderSlots();
      renderCompare();
    });
  });
  document.getElementById('cmpAddSlot').hidden = cmpSlots.length >= 4;
}

document.getElementById('cmpAddSlot').addEventListener('click', () => {
  if (cmpSlots.length >= 4) return;
  cmpSlots.push(null);
  codexRemember('cmp_slots_' + cmpMode, cmpSlots);
  renderSlots();
});

document.querySelectorAll('.mode-btn[data-group="cmpmode"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    cmpMode = btn.dataset.mode;
    codexRemember('cmp_mode', cmpMode);
    cmpSlots = codexRecall('cmp_slots_' + cmpMode, [null, null]);
    document.querySelectorAll('.mode-btn[data-group="cmpmode"]').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('cmpDim').innerHTML = cmpDimensions().map((d) =>
      `<option value="${d.id}">${d.label}</option>`).join('');
    renderSlots();
    renderCompare();
  });
});

/* -------------------------------------------------------------- render --- */

function renderCompare() {
  const out = document.getElementById('cmpResults');
  const list = cmpSourceList();
  const dimId = document.getElementById('cmpDim').value;
  const active = cmpSlots
    .map((id) => list.find((it) => it.id === id))
    .filter(Boolean);

  if (!list.length) {
    out.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#9878;</div>
      <div class="empty-state-title">Nothing to compare yet</div>
      <div class="empty-state-sub">${cmpMode === 'fields' ? 'Add a couple of fields on the Fields page first.' : 'Add a couple of hour categories on Hour Studies first.'}</div>
    </div>`;
    return;
  }
  if (active.length < 2) {
    out.innerHTML = '<div class="empty-state"><div class="empty-state-sub">Pick at least two slots above.</div></div>';
    return;
  }

  const cols = active.map((item) => {
    const counts = cmpCountsFor(item, dimId);
    const total = Array.from(counts.values()).reduce((n, arr) => n + arr.length, 0);
    const rows = Array.from(counts.entries())
      .map(([key, items]) => ({ key, items, pct: total ? items.length / total : 0 }))
      .sort((a, b) => b.pct - a.pct);
    return { name: item.name, total, rows };
  });

  const globalMax = Math.max(0.001, ...cols.flatMap((c) => c.rows.map((r) => r.pct)));

  out.innerHTML = cols.map((col) => {
    if (!col.total) {
      return `<div class="compare-col"><div class="compare-col-title">${codexEscape(col.name)}</div><div class="status-line">No usable data for this dimension.</div></div>`;
    }
    const rows = col.rows.map((r) => `
      <div class="bar-row">
        <div class="bar-key">${codexEscape(r.key)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round((r.pct / globalMax) * 100))}%"></div></div>
        <div class="bar-meta"><span>${r.items.length}</span><span>${(r.pct * 100).toFixed(1)}%</span></div>
      </div>
    `).join('');
    return `<div class="compare-col cx-reveal">
      <div class="compare-col-title">${codexEscape(col.name)} <span class="count-chip">${col.total}</span></div>
      <div class="bar-rows">${rows}</div>
    </div>`;
  }).join('');
}

document.getElementById('cmpDim').addEventListener('change', () => { codexRemember('cmp_dim_' + cmpMode, document.getElementById('cmpDim').value); renderCompare(); });

/* ---------------------------------------------------------------- init --- */

document.getElementById('cmpDim').innerHTML = cmpDimensions().map((d) =>
  `<option value="${d.id}">${d.label}</option>`).join('');
const savedDim = codexRecall('cmp_dim_' + cmpMode, cmpMode === 'fields' ? 'lp' : 'deathHour');
if (Array.from(document.getElementById('cmpDim').options).some((o) => o.value === savedDim)) document.getElementById('cmpDim').value = savedDim;

renderSlots();
renderCompare();
codexShellInit('compare');

codexCloudInit(() => { location.reload(); });
