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
    `<div class="dash-stat-card cx-reveal" title="${t.v.toLocaleString()}"><div class="dash-stat-value">${codexAbbrevNum(t.v)}</div><div class="dash-stat-label">${t.l}</div></div>`
  ).join('');
  document.getElementById('dashFieldsMeta').textContent = `${db.fields.length} fields, ${entries.toLocaleString()} entries`;
  document.getElementById('dashHoursMeta').textContent = `${(db.hourFields || []).length} categories, ${hourEntries.length} people`;
}

/* --------------------------------------------------- ambient background --
   A slow-drifting field of points, one per real entry in the database
   (sampled if there are a lot), positioned by a deterministic hash of the
   entry's own id so the same point lands in the same spot every visit -
   not randomly reshuffling. Entries that belong to the hero's hot field+
   dimension+value glow gold and drift slightly faster; everything else is
   a faint, calm gray. Pauses entirely under prefers-reduced-motion. */
function codexHashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function codexInitAmbientBackground(db, hot) {
  const canvas = document.createElement('canvas');
  canvas.id = 'dashAmbient';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const hotIds = new Set();
  if (hot.hits.length) {
    const top = hot.hits[0];
    const scoped = top.field.entries.map((e) => ({ entry: e, field: top.field }));
    const matching = codexCountsFor(scoped, top.dim.id).get(top.key) || [];
    matching.forEach((it) => hotIds.add(it.entry.id));
  }

  const allEntries = codexAllEntries(db).map((it) => it.entry.id)
    .concat(((typeof codexAllHourEntries === 'function') ? codexAllHourEntries(db) : []).map((it) => it.entry.id));
  const CAP = 160;
  const sampled = allEntries.length <= CAP ? allEntries
    : allEntries.filter((id) => codexHashSeed(id) < CAP / allEntries.length);

  let w = 0; let h = 0;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = sampled.map((id) => {
    const a = codexHashSeed(id + 'x');
    const b = codexHashSeed(id + 'y');
    const va = codexHashSeed(id + 'vx') - 0.5;
    const vb = codexHashSeed(id + 'vy') - 0.5;
    const isHot = hotIds.has(id);
    return {
      x: a, y: b,
      vx: va * (isHot ? 0.00028 : 0.00012),
      vy: vb * (isHot ? 0.00028 : 0.00012),
      r: isHot ? 2.4 : 1.2,
      hot: isHot,
    };
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      const px = s.x * w; const py = s.y * h;
      if (s.hot) {
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 10);
        grad.addColorStop(0, 'rgba(245,197,66,.55)');
        grad.addColorStop(1, 'rgba(245,197,66,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - 10, py - 10, 20, 20);
      }
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.hot ? 'rgba(245,197,66,.85)' : 'rgba(236,231,220,.35)';
      ctx.fill();
    });
  }

  if (reduceMotion) { draw(); return; }

  function tick() {
    stars.forEach((s) => {
      s.x += s.vx; s.y += s.vy;
      if (s.x < -0.02) s.x = 1.02; if (s.x > 1.02) s.x = -0.02;
      if (s.y < -0.02) s.y = 1.02; if (s.y > 1.02) s.y = -0.02;
    });
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const hot = codexComputeGlobalHot(1);
renderHero(hot);
renderStats();
codexInitAmbientBackground(db, hot);
codexShellInit('dashboard');

codexCloudInit(() => {
  location.reload();
});
