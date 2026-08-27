/* ============================================================================
   THE CODEX - Hour Studies shared logic.
   Personal-hours research on people with exact birth times (and optionally
   exact death date + time). All values come from the engine's own personal
   hours system (getTimeOfBirthRoot / getMilitaryTimeOfBirthRoot /
   getPersonalHoursTable / personalHourReduce in numerology.js) - nothing
   here reinvents a reduction or the shichen cycle.

   hour entry: { id, name, birthDate 'YYYY-MM-DD', birthTime 'HH:MM' (24h),
                 deathDate|null, deathTime|null }
   Death carries BOTH date and time or neither. Minutes are always real -
   no :00 guessing, same doctrine as no fabricated dates.
   ========================================================================== */

function codexFindHourField(db, id) {
  return db.hourFields.find((f) => f.id === id) || null;
}

function codexAllHourEntries(db) {
  const out = [];
  db.hourFields.forEach((f) => f.entries.forEach((e) => out.push({ entry: e, field: f })));
  return out;
}

/* ------------------------------------------------------------- compute --- */
/* The row of a person's 24-row table that a clock hour falls in: the table
   starts at the Rat hour (11PM), so clock hour h sits at index (h+1)%24 -
   the same formula the engine uses for ownIndex. */

function codexComputeHourCodes(entry) {
  const [bh, bm] = entry.birthTime.split(':').map(Number);
  const table = getPersonalHoursTable(bh, bm);
  const codes = {
    root: String(table.digitalRoot),
    rootMil: table.isPM ? String(table.militaryRoot) : null,
    birthAnimal: table.ownSign,
    isPM: table.isPM,
    table,
    death: null,
  };
  if (entry.deathDate && entry.deathTime) {
    const [dh, dm] = entry.deathTime.split(':').map(Number);
    const row = table.rows[(dh + 1) % 24];
    const deathTable = getPersonalHoursTable(dh, dm);
    codes.death = {
      personalHour: String(row.digitalReduced),
      personalHourMil: table.isPM ? String(row.militaryReduced) : null,
      clockRoot: String(deathTable.digitalRoot),
      clockRootMil: deathTable.isPM ? String(deathTable.militaryRoot) : null,
      animal: deathTable.ownSign,
      rowSign: row.sign,
      ownShichen: row.sign === table.ownSign,
      ownExactHour: row.isOwnHour,
    };
  }
  return codes;
}

/* --------------------------------------------------------------- parse --- */
/* One block: "YYYY-MM-DD HH:MM" (24h) or "YYYY-MM-DD H:MM AM/PM".
   Returns { date, time } (time normalized to 24h 'HH:MM') or null. */
function codexParseDateTimeBlock(str) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(str || '').trim());
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  let h = Number(m[4]); const min = Number(m[5]); const ampm = m[6] ? m[6].toUpperCase() : null;
  const roundtrip = new Date(y, mo - 1, d);
  if (roundtrip.getFullYear() !== y || roundtrip.getMonth() !== mo - 1 || roundtrip.getDate() !== d) return null;
  if (min > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === 'AM') h = (h === 12) ? 0 : h;
    else h = (h === 12) ? 12 : h + 12;
  } else if (h > 23) {
    return null;
  }
  return { date: `${y}-${pad2(mo)}-${pad2(d)}`, time: `${pad2(h)}:${pad2(min)}` };
}

/* One paste line: "Name | birth block | death block?" ->
   { name, birthDate, birthTime, deathDate, deathTime } or { error }. */
function codexParseHourLine(line) {
  const parts = line.split('|').map((p) => p.trim());
  const name = parts[0];
  if (!name) return { error: 'missing name' };
  if (!parts[1]) return { error: `${name}: missing birth block` };
  const birth = codexParseDateTimeBlock(parts[1]);
  if (!birth) return { error: `${name}: birth needs YYYY-MM-DD HH:MM with exact minutes` };
  let death = null;
  if (parts[2]) {
    death = codexParseDateTimeBlock(parts[2]);
    if (!death) return { error: `${name}: death needs date AND time (YYYY-MM-DD HH:MM)` };
    if (`${death.date} ${death.time}` <= `${birth.date} ${birth.time}`) return { error: `${name}: death is not after birth` };
  }
  return {
    name,
    birthDate: birth.date,
    birthTime: birth.time,
    deathDate: death ? death.date : null,
    deathTime: death ? death.time : null,
  };
}

/* ------------------------------------------------ death hour study ------- */
/* Enemy comes from the REAL compat tables, never invented: score 10 is the
   true enemy cell, the 10+20 tier also counts the 20 cells. Numerology
   enemy = birth root vs the personal hour VALUE running at death, checked
   on the digital line and (for PM births, either-counts rule) the military
   line too. Vietnamese enemy = birth shichen animal vs the death hour's
   animal via VIETNAMESE_TABLE. Expected counts are honest per person: each
   person's own 24-row table is scanned for how many hours actually qualify,
   so a root with many enemy hours raises its own expectation. */

function codexHourRowEnemyNum(table, row, threshold) {
  if (numerologyCompat(table.digitalRoot, row.digitalReduced) <= threshold) return true;
  return table.isPM && numerologyCompat(table.militaryRoot, row.militaryReduced) <= threshold;
}

function codexHourRowEnemyViet(table, row) {
  return vietnameseCompat(table.ownSign, row.sign) <= 10;
}

const CODEX_DEATH_STUDY_METRICS = [
  { id: 'ownShichen', label: 'Own shichen' },
  { id: 'ownExact', label: 'Own exact hour' },
  { id: 'numE10', label: 'Numerology enemy (10)' },
  { id: 'numE20', label: 'Numerology enemy (10 + 20)' },
  { id: 'vietE', label: 'Vietnamese enemy' },
  { id: 'bothE10', label: 'Both enemies (10)' },
  { id: 'bothE20', label: 'Both enemies (10 + 20)' },
];

function codexHourRowStudyFlags(table, row) {
  const n10 = codexHourRowEnemyNum(table, row, 10);
  const n20 = codexHourRowEnemyNum(table, row, 20);
  const v = codexHourRowEnemyViet(table, row);
  return {
    ownShichen: row.sign === table.ownSign,
    ownExact: row.isOwnHour,
    numE10: n10,
    numE20: n20,
    vietE: v,
    bothE10: n10 && v,
    bothE20: n20 && v,
  };
}

function codexDeathHourStudyHtml(items, showField) {
  const dead = items.filter((it) => it.entry.deathDate && it.entry.deathTime);
  if (!dead.length) return '<div class="status-line">No deaths recorded in this scope yet.</div>';

  const acc = {};
  CODEX_DEATH_STUDY_METRICS.forEach((m) => { acc[m.id] = { hits: [], expected: 0 }; });

  dead.forEach((it) => {
    const [bh, bm] = it.entry.birthTime.split(':').map(Number);
    const table = getPersonalHoursTable(bh, bm);
    const dh = Number(it.entry.deathTime.split(':')[0]);
    const deathRow = table.rows[(dh + 1) % 24];

    table.rows.forEach((row) => {
      const flags = codexHourRowStudyFlags(table, row);
      CODEX_DEATH_STUDY_METRICS.forEach((m) => { if (flags[m.id]) acc[m.id].expected += 1 / 24; });
    });

    const deathFlags = codexHourRowStudyFlags(table, deathRow);
    CODEX_DEATH_STUDY_METRICS.forEach((m) => { if (deathFlags[m.id]) acc[m.id].hits.push(it); });
  });

  const chip = (it) => `<span class="entry-chip" data-entry="${it.entry.id}">${codexEscape(it.entry.name)}${showField ? `<span class="chip-field">${codexEscape(it.field.name)}</span>` : ''}</span>`;

  const rows = CODEX_DEATH_STUDY_METRICS.map((m) => {
    const a = acc[m.id];
    const expectedPct = a.expected > 0 ? a.expected / dead.length : null;
    const badge = (a.hits.length || expectedPct != null) ? codexRatioBadgeHtml(a.hits.length / dead.length, expectedPct) : '';
    return `<div class="study-row">
      <span class="study-label">${m.label}</span>
      <span class="study-nums">${a.hits.length} &middot; exp ${a.expected.toFixed(2)}</span>
      ${badge}
      ${a.hits.length ? `<div class="bar-entries" style="display:flex;">${a.hits.map(chip).join('')}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="status-line">${dead.length} deaths in scope</div>${rows}`;
}

/* Kept as an alias so nothing external breaks. */
function codexOwnHourStatHtml(items, showField) {
  return codexDeathHourStudyHtml(items, showField);
}

/* -------------------------------------------------------- detail popup --- */

function codexOpenHourDetail(entry, field) {
  const overlay = document.getElementById('detailOverlay');
  const body = document.getElementById('detailBody');
  if (!overlay || !body) return;
  const codes = codexComputeHourCodes(entry);
  const d = codes.death;

  const birthTiles = [
    codexFactTileHtml('Root', codes.root),
    codes.rootMil != null ? codexFactTileHtml('Military Root', codes.rootMil) : '',
    codexFactTileHtml('Birth Animal', codes.birthAnimal, true),
  ].join('');

  const deathTiles = d ? [
    codexFactTileHtml('Death PH', d.personalHour),
    d.personalHourMil != null ? codexFactTileHtml('Death PH (Mil)', d.personalHourMil) : '',
    codexFactTileHtml('Death Root', d.clockRoot),
    d.clockRootMil != null ? codexFactTileHtml('D.Root (Mil)', d.clockRootMil) : '',
    codexFactTileHtml('Death Animal', d.animal, true),
    codexFactTileHtml('Own Hour', d.ownExactHour ? 'Exact' : (d.ownShichen ? 'Shichen' : 'No'), true),
  ].join('') : '';

  const deathRowIndex = d ? (Number(entry.deathTime.split(':')[0]) + 1) % 24 : -1;
  const tableRows = codes.table.rows.map((row) => {
    const cls = row.isOwnHour ? ' class="ph-own"' : (row.index === deathRowIndex ? ' class="ph-death"' : '');
    const badge = row.isOwnHour ? ' <span class="own-badge">OWN</span>' : (row.index === deathRowIndex ? ' <span class="death-badge">DEATH</span>' : '');
    return `<tr${cls}><td class="dim-cell">${row.label}</td><td class="dim-cell">${row.sign}</td><td class="num">${row.digitalReduced}</td>${codes.isPM ? `<td class="num">${row.militaryReduced}</td>` : ''}<td>${badge}</td></tr>`;
  }).join('');

  body.innerHTML = `
    <h2 class="detail-name">${codexEscape(entry.name)}</h2>
    <div class="detail-sub">${codexEscape(field.name)} &middot; Born ${codexFormatDate(entry.birthDate)} at ${codexEscape(entry.birthTime)}${d ? ` &middot; Died ${codexFormatDate(entry.deathDate)} at ${codexEscape(entry.deathTime)}` : ''}</div>
    <div class="detail-grid">${birthTiles}</div>
    ${d ? `<div class="detail-section-label">Death</div><div class="detail-grid">${deathTiles}</div>` : ''}
    <div class="detail-section-label">Personal Hours table</div>
    <div class="table-wrap"><table class="codex-table"><thead><tr><th>Hour</th><th>Sign</th><th>Value</th>${codes.isPM ? '<th>Military</th>' : ''}<th></th></tr></thead><tbody>${tableRows}</tbody></table></div>
  `;
  overlay.classList.add('open');
}
