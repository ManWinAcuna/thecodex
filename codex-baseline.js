/* ============================================================================
   THE CODEX - the true baseline.
   Life Paths (and every other code) are NOT uniformly distributed across
   real calendar dates, so raw counts lie. This runs the real engines over
   EVERY date in a fixed range (1900-01-01 .. 2009-12-31, ~40k days) and
   tallies how often each value of each dimension actually occurs. That is
   the honest "expected" distribution a field's numbers get compared
   against. Computed once, cached in localStorage, versioned by range +
   dimension registry.
   ========================================================================== */

const CODEX_BASELINE_START_YEAR = 1900;
const CODEX_BASELINE_END_YEAR = 2009;
// v4: bumped when the Life Path dimension started splitting out "13/4" as
// its own bucket (previously lumped into plain "4") - a baseline cached
// before that split would answer wrong ghost/normal% for both buckets.
const CODEX_BASELINE_KEY = `codex_baseline_v4_${CODEX_BASELINE_START_YEAR}_${CODEX_BASELINE_END_YEAR}`;

let codexBaseline = null; // { totalDays, dims: { dimId: { key: count } } }

function codexLoadBaseline() {
  if (codexBaseline) return codexBaseline;
  try {
    const raw = localStorage.getItem(CODEX_BASELINE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.totalDays && data.dims) { codexBaseline = data; return data; }
    }
  } catch (e) { /* rebuild */ }
  return null;
}

/* Chunked build so the page never freezes: ~120 days per slice, yielding to
   the event loop between slices. onProgress(pct), onDone(baseline). */
function codexBuildBaseline(onProgress, onDone) {
  const dims = {};
  CODEX_DIMENSIONS.forEach((d) => { dims[d.id] = {}; });
  const start = new Date(CODEX_BASELINE_START_YEAR, 0, 1);
  const end = new Date(CODEX_BASELINE_END_YEAR, 11, 31);
  const totalDays = daysBetween(start, end) + 1;
  let done = 0;
  const cursor = new Date(start.getTime());

  function slice() {
    const sliceEnd = Math.min(done + 120, totalDays);
    while (done < sliceEnd) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const dd = cursor.getDate();
      const dateStr = `${y}-${pad2(m)}-${pad2(dd)}`;
      const codes = codexComputeCodes(dateStr);
      CODEX_DIMENSIONS.forEach((dim) => {
        const key = dim.get(codes);
        if (key == null) return;
        dims[dim.id][key] = (dims[dim.id][key] || 0) + 1;
      });
      cursor.setDate(cursor.getDate() + 1);
      done++;
    }
    // The per-date cache would balloon to 40k entries during a build -
    // keep it from eating memory for dates nothing will ask about again.
    if (codexCodesCache.size > 5000) codexCodesCache.clear();
    if (onProgress) onProgress(Math.round((done / totalDays) * 100));
    if (done < totalDays) { setTimeout(slice, 0); return; }
    codexBaseline = { totalDays, dims };
    try { localStorage.setItem(CODEX_BASELINE_KEY, JSON.stringify(codexBaseline)); } catch (e) { /* still usable in-memory */ }
    if (onDone) onDone(codexBaseline);
  }
  setTimeout(slice, 0);
}

/* Expected share of `key` within `dimId` under the true baseline, 0..1.
   null when the baseline is not built yet. */
function codexBaselinePct(dimId, key) {
  const base = codexLoadBaseline();
  if (!base) return null;
  const count = (base.dims[dimId] && base.dims[dimId][key]) || 0;
  return count / base.totalDays;
}

function codexBaselineKeys(dimId) {
  const base = codexLoadBaseline();
  if (!base || !base.dims[dimId]) return [];
  return Object.keys(base.dims[dimId]);
}
