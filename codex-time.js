/* ============================================================================
   THE CODEX - Time Codex.
   The calendar's own proportions: every date dimension tallied over an
   adjustable era, no people involved. Reuses the site baseline when the
   era matches it, otherwise builds fresh (chunked, cached per range,
   last 8 ranges kept).
   ========================================================================== */

const TC_CACHE_KEY = 'codex_timecodex_cache_v4'; // v4: 13/4 splits further into 13 vs 13/4
const TC_MAX_SPAN_YEARS = 300;
const TC_SLICE_DAYS = 2000;

let tcData = null;      // { totalDays, dims }
let tcRangeLabel = '';
let tcOrder = 'share';
let tcBuilding = false;

function tcLoadCache() {
  try {
    const raw = localStorage.getItem(TC_CACHE_KEY);
    if (raw) { const c = JSON.parse(raw); if (c && typeof c === 'object') return c; }
  } catch (e) { /* fresh */ }
  return {};
}

function tcSaveCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length > 8) {
    keys.sort((a, b) => (cache[a].at || 0) - (cache[b].at || 0));
    keys.slice(0, keys.length - 8).forEach((k) => { delete cache[k]; });
  }
  try { localStorage.setItem(TC_CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* still usable in-memory */ }
}

function tcSetStatus(text, cls) {
  const el = document.getElementById('tcStatus');
  el.textContent = text || '';
  el.className = 'status-line' + (cls ? ` ${cls}` : '');
}

function tcBuild(startYear, endYear) {
  const key = `${startYear}_${endYear}`;

  if (startYear === CODEX_BASELINE_START_YEAR && endYear === CODEX_BASELINE_END_YEAR) {
    const cached = tcLoadCache()[key];
    // The site baseline doesn't carry decade buckets (it's a flat total),
    // so only reuse it here if THIS page already built its own richer copy.
    if (cached) { tcFinish(cached.data, startYear, endYear); return; }
  }
  const cache = tcLoadCache();
  if (cache[key]) { tcFinish(cache[key].data, startYear, endYear); return; }

  tcBuilding = true;
  document.getElementById('tcBuildBtn').disabled = true;
  const track = document.getElementById('tcTrack');
  const fill = document.getElementById('tcFill');
  track.hidden = false;
  tcSetStatus(`Scanning ${startYear}...`);
  document.getElementById('tcResults').innerHTML = codexSkeletonRowsHtml(6);

  const dims = {};
  const decadeDims = {};
  const decadeTotals = {};
  CODEX_DIMENSIONS.forEach((d) => { dims[d.id] = {}; decadeDims[d.id] = {}; });
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const totalDays = daysBetween(start, end) + 1;
  const cursor = new Date(start.getTime());
  let done = 0;

  let lastDecade = `${Math.floor(startYear / 10) * 10}s`;
  function slice() {
    const sliceEnd = Math.min(done + TC_SLICE_DAYS, totalDays);
    while (done < sliceEnd) {
      const y = cursor.getFullYear();
      const decade = `${Math.floor(y / 10) * 10}s`;
      lastDecade = decade;
      const dateStr = `${y}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
      const codes = codexComputeCodes(dateStr);
      decadeTotals[decade] = (decadeTotals[decade] || 0) + 1;
      CODEX_DIMENSIONS.forEach((dim) => {
        const k = dim.get(codes);
        if (k == null) return;
        dims[dim.id][k] = (dims[dim.id][k] || 0) + 1;
        if (!decadeDims[dim.id][decade]) decadeDims[dim.id][decade] = {};
        decadeDims[dim.id][decade][k] = (decadeDims[dim.id][decade][k] || 0) + 1;
      });
      if (codexCodesCache.size > 5000) codexCodesCache.clear();
      cursor.setDate(cursor.getDate() + 1);
      done++;
    }
    fill.style.width = Math.round((done / totalDays) * 100) + '%';
    tcSetStatus(`Scanning ${lastDecade}...`);
    if (done < totalDays) { setTimeout(slice, 0); return; }

    const decadeOrder = Object.keys(decadeTotals).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const data = { totalDays, dims, decadeDims, decadeTotals, decadeOrder };
    const freshCache = tcLoadCache();
    freshCache[key] = { data, at: Date.now() };
    tcSaveCache(freshCache);

    tcBuilding = false;
    document.getElementById('tcBuildBtn').disabled = false;
    track.hidden = true;
    tcFinish(data, startYear, endYear);
  }
  setTimeout(slice, 0);
}

function tcFinish(data, startYear, endYear) {
  tcData = data;
  tcRangeLabel = `${startYear}-${endYear}`;
  document.getElementById('tcRangeChip').textContent = `${tcRangeLabel} &middot; ${data.totalDays.toLocaleString()} days`.replace('&middot;', '·');
  tcSetStatus('', '');
  tcRender();
  tcRenderHeat();
}

/* ------------------------------------------------------------- render --- */

function tcRender() {
  const out = document.getElementById('tcResults');
  if (!tcData) { out.innerHTML = '<div class="status-line">Pick an era above and hit Show era.</div>'; return; }
  const dimId = document.getElementById('tcDim').value;
  const dim = codexDimension(dimId);
  const counts = tcData.dims[dimId] || {};
  const keys = Object.keys(counts);
  if (!keys.length) { out.innerHTML = '<div class="status-line">Nothing recorded for that dimension.</div>'; return; }

  const rows = keys.map((key) => ({ key, count: counts[key], pct: counts[key] / tcData.totalDays }));
  if (tcOrder === 'share') rows.sort((a, b) => b.count - a.count);
  else rows.sort((a, b) => dim.sortKey(a.key) - dim.sortKey(b.key) || String(a.key).localeCompare(String(b.key)));

  const maxPct = Math.max(...rows.map((r) => r.pct));
  const html = rows.map((r) => `<div class="bar-row">
    <div class="bar-key">${codexEscape(r.key)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round((r.pct / maxPct) * 100))}%"></div></div>
    <div class="bar-meta"><span>${(r.pct * 100).toFixed(1)}%</span><span class="normally">${r.count.toLocaleString()} days</span></div>
  </div>`).join('');

  const top = rows.reduce((a, b) => (b.count > a.count ? b : a));
  const verdict = codexVerdictCardHtml(codexEscape(top.key),
    `${dim.label} owns the most time in ${tcRangeLabel} &middot; ${(top.pct * 100).toFixed(1)}% (${top.count.toLocaleString()} days)`);

  out.innerHTML = codexTotalLineHtml(tcData.totalDays, `total days in ${tcRangeLabel}`) + verdict + `<div class="bar-rows">${html}</div>`;
}

/* ------------------------------------------------------- era heatmap --- */

function tcRenderHeat() {
  const out = document.getElementById('heatResults');
  if (!tcData) { out.innerHTML = ''; return; }
  const dimId = document.getElementById('heatDim').value;
  const dim = codexDimension(dimId);
  const decades = tcData.decadeOrder;

  const colKeys = new Set();
  decades.forEach((d) => {
    const bucket = tcData.decadeDims[dimId][d];
    if (bucket) Object.keys(bucket).forEach((k) => colKeys.add(k));
  });
  const cols = Array.from(colKeys).sort((a, b) => dim.sortKey(a) - dim.sortKey(b) || String(a).localeCompare(String(b)));
  if (!cols.length) { out.innerHTML = '<div class="status-line">No data for this dimension in this era.</div>'; return; }

  let maxPct = 0;
  const grid = decades.map((d) => cols.map((k) => {
    const count = (tcData.decadeDims[dimId][d] && tcData.decadeDims[dimId][d][k]) || 0;
    const pct = tcData.decadeTotals[d] ? count / tcData.decadeTotals[d] : 0;
    if (pct > maxPct) maxPct = pct;
    return pct;
  }));

  const header = `<tr><th></th>${cols.map((k) => `<th>${codexEscape(k)}</th>`).join('')}</tr>`;
  const rows = decades.map((d, ri) => {
    const cells = cols.map((k, ci) => {
      const pct = grid[ri][ci];
      const intensity = maxPct > 0 ? pct / maxPct : 0;
      const bg = `color-mix(in srgb, var(--gold) ${Math.round(intensity * 100)}%, var(--panel-2))`;
      const textCls = intensity > 0.4 ? 'color:#000;' : 'color:var(--muted);';
      return `<td><div class="heatmap-cell" style="background:${bg};${textCls}" data-tip="${codexEscape(k)} in ${d}: ${(pct * 100).toFixed(1)}%">${pct > 0 ? (pct * 100).toFixed(0) : ''}</div></td>`;
    }).join('');
    return `<tr><td class="heatmap-row-label">${d}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('heatStatus').textContent = `${decades.length} decades &middot; darkest = 0%, brightest = ${(maxPct * 100).toFixed(1)}%`.replace('&middot;', '·');
  out.innerHTML = `<table class="heatmap-table"><thead>${header}</thead><tbody>${rows}</tbody></table>`;
  codexWireTooltips(out);
}

/* --------------------------------------------------------------- wire --- */

document.getElementById('tcBuildBtn').addEventListener('click', () => {
  if (tcBuilding) return;
  const startYear = Number(document.getElementById('tcStartYear').value);
  const endYear = Number(document.getElementById('tcEndYear').value);
  if (!startYear || !endYear || startYear > endYear) { tcSetStatus('Start year must not be after end year.', 'err'); return; }
  if (startYear < 1583 || endYear > 2200) { tcSetStatus('Years must stay between 1583 and 2200.', 'err'); return; }
  if (endYear - startYear + 1 > TC_MAX_SPAN_YEARS) { tcSetStatus(`Era capped at ${TC_MAX_SPAN_YEARS} years.`, 'err'); return; }
  codexRemember('time_start', startYear);
  codexRemember('time_end', endYear);
  tcBuild(startYear, endYear);
});

document.getElementById('tcDim').addEventListener('change', () => { codexRemember('time_dim', document.getElementById('tcDim').value); tcRender(); });
document.querySelectorAll('.mode-btn[data-group="tcorder"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    tcOrder = btn.dataset.order;
    codexRemember('time_order', tcOrder);
    document.querySelectorAll('.mode-btn[data-group="tcorder"]').forEach((b) => b.classList.toggle('active', b === btn));
    tcRender();
  });
});
document.getElementById('heatDim').addEventListener('change', () => { codexRemember('time_heatDim', document.getElementById('heatDim').value); tcRenderHeat(); });

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('tab-props').hidden = btn.dataset.tab !== 'props';
    document.getElementById('tab-heat').hidden = btn.dataset.tab !== 'heat';
    if (btn.dataset.tab === 'heat') {
      tcRenderHeat();
      codexHint('heatmap', document.getElementById('tab-heat').querySelector('.box-label'), 'Rows are decades, columns are the picked dimension\'s values - brighter cell = a bigger share of that decade.');
    }
  });
});

tcOrder = codexRecall('time_order', 'share');
document.querySelectorAll('.mode-btn[data-group="tcorder"]').forEach((b) => b.classList.toggle('active', b.dataset.order === tcOrder));
document.getElementById('tcDim').innerHTML = codexDimensionOptionsHtml(codexRecall('time_dim', 'lp'));
document.getElementById('heatDim').innerHTML = codexDimensionOptionsHtml(codexRecall('time_heatDim', 'lp'));
document.getElementById('tcStartYear').value = codexRecall('time_start', CODEX_BASELINE_START_YEAR);
document.getElementById('tcEndYear').value = codexRecall('time_end', CODEX_BASELINE_END_YEAR);
tcRender();
tcBuild(Number(document.getElementById('tcStartYear').value), Number(document.getElementById('tcEndYear').value));
codexShellInit('time');

codexCloudInit(() => {});
