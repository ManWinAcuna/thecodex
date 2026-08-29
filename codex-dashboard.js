/* ============================================================================
   THE CODEX - Dashboard: headline hot stat, quick stats, quick links.
   Read-only overview, no editing here.
   ========================================================================== */

const db = codexLoadDB();

/* Scans every field x dimension for the single loudest value sitting
   >=1.5x its normal share (true baseline if built, else rest-of-DB),
   skipping tiny samples (<3 entries) so noise doesn't dominate. Only the
   hero headline needs this now, so limit is normally 1. */
function codexComputeGlobalHot(limit) {
  const baselineReady = !!codexLoadBaseline();
  const out = [];
  db.fields.forEach((f) => {
    if (f.entries.length < 3) return;
    const scoped = f.entries.map((e) => ({ entry: e, field: f }));
    const rest = codexAllEntries(db).filter((it) => it.field.id !== f.id);
    CODEX_DIMENSIONS.forEach((dim) => {
      const counts = codexCountsFor(scoped, dim.id);
      const total = Array.from(counts.values()).reduce((n, arr) => n + arr.length, 0);
      if (total < 3) return;
      let best = null;
      counts.forEach((items, key) => {
        const pct = items.length / total;
        const expectedPct = baselineReady ? codexBaselinePct(dim.id, key) : codexExpectedPct(dim.id, key, 'db', rest);
        if (expectedPct == null) return;
        const ratio = expectedPct > 0 ? pct / expectedPct : (pct > 0 ? 99 : 0);
        if (ratio >= 1.5 && (!best || ratio > best.ratio)) best = { field: f, dim, key, items, ratio, pct };
      });
      if (best) out.push(best);
    });
  });
  out.sort((a, b) => b.ratio - a.ratio);
  return { hits: out.slice(0, limit), baselineReady };
}

function renderHero(hot) {
  const wrap = document.getElementById('dashHero');
  if (!codexLoadBaseline()) {
    wrap.innerHTML = `<div class="dash-hero">
      <div class="dash-hero-label">Ready when you are</div>
      <div class="empty-state" style="padding:6px 0 0;">
        <div class="empty-state-title">Build the true baseline to unlock the headline stat</div>
        <div class="empty-state-sub">One click, runs once, then every ratio on the site becomes honest math instead of a guess.</div>
        <div class="empty-state-actions"><a class="btn" href="fields.html">Build it on Fields &rsaquo;</a></div>
      </div>
    </div>`;
    return;
  }
  if (!hot.hits.length) {
    wrap.innerHTML = `<div class="dash-hero">
      <div class="dash-hero-label">Ready when you are</div>
      <div class="empty-state" style="padding:6px 0 0;">
        <div class="empty-state-title">Nothing hot yet</div>
        <div class="empty-state-sub">Add a few fields with real entries (3+ each) and the loudest overrepresented code will headline here.</div>
        <div class="empty-state-actions"><a class="btn" href="fields.html">Go to Fields &rsaquo;</a></div>
      </div>
    </div>`;
    return;
  }
  const top = hot.hits[0];
  wrap.innerHTML = `<div class="dash-hero">
    <div class="dash-hero-label">Loudest code right now</div>
    <div class="dash-hero-value">${codexEscape(top.key)}</div>
    <div class="dash-hero-caption">${codexDimChipHtml(top.dim.id, top.dim.label)} in <strong>${codexEscape(top.field.name)}</strong> &middot; ${top.ratio.toFixed(1)}x normal &middot; ${top.items.length} of ${top.field.entries.length}</div>
  </div>`;
}

function renderStats() {
  const entries = codexAllEntries(db).length;
  const hourEntries = (typeof codexAllHourEntries === 'function') ? codexAllHourEntries(db) : [];
  const deaths = hourEntries.filter((it) => it.entry.deathDate && it.entry.deathTime).length;
  const tiles = [
    { v: db.fields.length, l: 'Fields' },
    { v: entries, l: 'Entries tracked' },
    { v: (db.hourFields || []).length, l: 'Hour categories' },
    { v: hourEntries.length, l: 'People (Hour Studies)' },
    { v: deaths, l: 'Deaths recorded' },
  ];
  document.getElementById('dashStats').innerHTML = tiles.map((t) =>
    `<div class="dash-stat-card cx-reveal"><div class="dash-stat-value">${t.v.toLocaleString()}</div><div class="dash-stat-label">${t.l}</div></div>`
  ).join('');
  document.getElementById('dashFieldsMeta').textContent = `${db.fields.length} fields, ${entries.toLocaleString()} entries`;
  document.getElementById('dashHoursMeta').textContent = `${(db.hourFields || []).length} categories, ${hourEntries.length} people`;
}

const hot = codexComputeGlobalHot(1);
renderHero(hot);
renderStats();
codexShellInit('dashboard');

codexCloudInit(() => {
  location.reload();
});
