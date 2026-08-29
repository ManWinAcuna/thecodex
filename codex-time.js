/* ============================================================================
   THE CODEX - Time Codex.
   The calendar's own proportions: every date dimension tallied over an
   adjustable era, no people involved. Reuses the site baseline when the
   era matches it, otherwise builds fresh (chunked, cached per range,
   last 8 ranges kept).
   ========================================================================== */

const TC_CACHE_KEY = 'codex_timecodex_cache_v3'; // v3: Life Path splits out 13/4
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
    const site = codexLoadBaseline();
    if (site) { tcFinish(site, startYear, endYear); return; }
  }
  const cache = tcLoadCache();
  if (cache[key]) { tcFinish(cache[key].data, startYear, endYear); return; }

  tcBuilding = true;
  document.getElementById('tcBuildBtn').disabled = true;
  const track = document.getElementById('tcTrack');
  const fill = document.getElementById('tcFill');
  track.hidden = false;
  tcSetStatus('Running the engines over every date in the era.');

  const dims = {};
  CODEX_DIMENSIONS.forEach((d) => { dims[d.id] = {}; });
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const totalDays = daysBetween(start, end) + 1;
  const cursor = new Date(start.getTime());
  let done = 0;

  function slice() {
    const sliceEnd = Math.min(done + TC_SLICE_DAYS, totalDays);
    while (done < sliceEnd) {
      const dateStr = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
      const codes = codexComputeCodes(dateStr);
      CODEX_DIMENSIONS.forEach((dim) => {
        const k = dim.get(codes);
        if (k == null) return;
        dims[dim.id][k] = (dims[dim.id][k] || 0) + 1;
      });
      if (codexCodesCache.size > 5000) codexCodesCache.clear();
      cursor.setDate(cursor.getDate() + 1);
      done++;
    }
    fill.style.width = Math.round((done / totalDays) * 100) + '%';
    if (done < totalDays) { setTimeout(slice, 0); return; }

    const data = { totalDays, dims };
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

/* --------------------------------------------------------------- wire --- */

document.getElementById('tcBuildBtn').addEventListener('click', () => {
  if (tcBuilding) return;
  const startYear = Number(document.getElementById('tcStartYear').value);
  const endYear = Number(document.getElementById('tcEndYear').value);
  if (!startYear || !endYear || startYear > endYear) { tcSetStatus('Start year must not be after end year.', 'err'); return; }
  if (startYear < 1583 || endYear > 2200) { tcSetStatus('Years must stay between 1583 and 2200.', 'err'); return; }
  if (endYear - startYear + 1 > TC_MAX_SPAN_YEARS) { tcSetStatus(`Era capped at ${TC_MAX_SPAN_YEARS} years.`, 'err'); return; }
  tcBuild(startYear, endYear);
});

document.getElementById('tcDim').addEventListener('change', tcRender);
document.querySelectorAll('.mode-btn[data-group="tcorder"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    tcOrder = btn.dataset.order;
    document.querySelectorAll('.mode-btn[data-group="tcorder"]').forEach((b) => b.classList.toggle('active', b === btn));
    tcRender();
  });
});

document.getElementById('tcDim').innerHTML = codexDimensionOptionsHtml('lp');
tcRender();
tcBuild(CODEX_BASELINE_START_YEAR, CODEX_BASELINE_END_YEAR);

codexCloudInit(() => {});
