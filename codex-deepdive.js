/* ============================================================================
   THE CODEX - Deep Dive profile page.
   Reached from any entry's popup (both wings, via the new "Deep Dive" link
   in codex-detail.js / codex-hours.js). Shows the full code readout for
   whichever entry ?wing=fields|hours&fieldId=&entryId= points at, plus a
   per-entry Events log: name + date + type, each with its own full code
   grid and a check against this person's own First Imprints (does the
   event's own UD land on a day-theme/lucky-number the person already
   imprinted on birth?).
   ========================================================================== */

const ddParams = new URLSearchParams(location.search);
const ddWing = ddParams.get('wing') === 'hours' ? 'hours' : 'fields';
let db = codexLoadDB();
let ddField = ddWing === 'hours' ? codexFindHourField(db, ddParams.get('fieldId')) : codexFindField(db, ddParams.get('fieldId'));
let ddEntry = ddField ? ddField.entries.find((e) => e.id === ddParams.get('entryId')) : null;

if (!ddField || !ddEntry) {
  document.getElementById('ddContent').innerHTML = `<div class="box">
    <div class="box-label">Entry not found</div>
    <div class="box-sub">It may have been deleted, or the link is out of date.</div>
  </div>`;
  throw new Error('deep dive: entry not found');
}

document.getElementById('ddBackLink').href = ddWing === 'hours' ? `hour-field.html?id=${ddField.id}` : `field.html?id=${ddField.id}`;
document.title = `${ddEntry.name} - Deep Dive - The Codex`;

/* The date every imprint/resonance check is anchored to - the real birth
   (or founding/release/etc) date either wing's entry always carries. */
const ddBirthDateStr = ddWing === 'hours' ? ddEntry.birthDate : ddEntry.date;
const ddBaseCodes = codexComputeCodes(ddBirthDateStr);

if (!Array.isArray(ddEntry.events)) ddEntry.events = [];

/* ------------------------------------------------------------- header --- */

function renderHeader() {
  const wrap = document.getElementById('ddContent');
  const subLine = ddWing === 'hours'
    ? `${codexEscape(ddField.name)} &middot; Born ${codexFormatDate(ddEntry.birthDate)} at ${codexEscape(ddEntry.birthTime)}${ddEntry.deathDate ? ` &middot; Died ${codexFormatDate(ddEntry.deathDate)} at ${codexEscape(ddEntry.deathTime)}` : ''}`
    : `${codexEscape(ddField.name)} &middot; ${codexFormatDate(ddEntry.date)}${ddEntry.dateKind ? ` (${codexEscape(ddEntry.dateKind)})` : ''}`;

  let hourTilesHtml = '';
  if (ddWing === 'hours') {
    const hc = codexComputeHourCodes(ddEntry);
    const tiles = [
      codexFactTileHtml('Birth Root', hc.root),
      codexFactTileHtml('Birth Hour Animal', hc.birthAnimal, true),
      hc.death ? codexFactTileHtml('Death Hour Animal', hc.death.animal, true) : '',
      hc.death ? codexFactTileHtml('Own Hour', hc.death.ownExactHour ? 'Exact' : (hc.death.ownShichen ? 'Shichen' : 'No'), true) : '',
    ].filter(Boolean).join('');
    hourTilesHtml = `<div class="detail-section-label">Hour Studies</div><div class="detail-grid">${tiles}</div>`;
  }

  wrap.innerHTML = `
    <div class="box cx-reveal">
      <img id="ddImg" class="detail-img" alt="" hidden style="width:120px;height:120px;">
      <h2 class="detail-name" style="font-size:28px;">${codexEscape(ddEntry.name)}</h2>
      <div class="detail-sub">${subLine}</div>
      ${hourTilesHtml}
      ${codexEntryProfileSectionsHtml(ddBaseCodes)}
    </div>

    <div class="box">
      <div class="box-label">Add Event</div>
      <div class="box-sub">A real date that mattered for this person - a launch, a break, a loss, a turn. Gets its own full code grid, and a flag if it lands on one of this person's own First Imprints.</div>
      <div class="filter-bar">
        <input type="text" id="evName" placeholder="Event name">
        <input type="date" id="evDate">
        <select id="evType">${CODEX_EVENT_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}</select>
        <button id="evAddBtn" class="btn">Add Event</button>
      </div>
      <div id="evAddStatus" class="status-line"></div>
    </div>

    <div class="box-label" style="margin: 18px 0 10px;">Events</div>
    <div id="ddEvents"></div>
  `;

  if (ddWing === 'fields' && ddEntry.wikiTitle) {
    codexFetchImage(ddEntry.wikiTitle).then((url) => {
      const img = document.getElementById('ddImg');
      if (url && img) { img.src = url; img.hidden = false; }
    });
  }
}

/* -------------------------------------------------------------- events --- */

function ddEventCardHtml(ev) {
  const eventDateObj = codexParseDate(ev.date);
  const eventCodes = codexComputeCodes(ev.date);
  const eventUD = codexDigitPoolUD(eventDateObj);
  const resonant = codexFindResonantThemes(ddBaseCodes, eventUD);
  const typeInfo = codexEventTypeInfo(ev.type);
  const accent = CODEX_HUE_TABLE[typeInfo.hue];

  const tiles = [
    codexFactTileHtml('Life Path', eventCodes.lp),
    codexFactTileHtml('UD', eventUD),
    codexFactTileHtml('Day Born', eventCodes.dayBorn),
    codexFactTileHtml('Day Number', eventCodes.dayNum),
    codexFactTileHtml('Combo', eventCodes.combo),
    codexFactTileHtml('Year Animal', eventCodes.vietYear, true),
    codexFactTileHtml('Month Animal', eventCodes.vietMonth, true),
    codexFactTileHtml('Day Animal', eventCodes.vietDay, true),
  ].join('');

  const resonanceHtml = resonant.length
    ? `<div class="resonance-hit">&#10024; Resonates with: ${resonant.map(codexEscape).join(', ')}</div>`
    : '';

  return `<div class="box event-card" style="--dim-accent:${accent}" data-event="${ev.id}">
    <div class="event-card-head">
      <span class="dim-chip" style="--dim-accent:${accent}">${codexEscape(typeInfo.label)}</span>
      <span class="event-date">${codexFormatDate(ev.date)}</span>
      <button class="row-del" data-del-event="${ev.id}" title="Delete">&times;</button>
    </div>
    <div class="event-name">${codexEscape(ev.name)}</div>
    ${resonanceHtml}
    <div class="detail-grid">${tiles}</div>
  </div>`;
}

function renderEvents() {
  const out = document.getElementById('ddEvents');
  if (!ddEntry.events.length) {
    out.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">&#128213;</div>
      <div class="empty-state-title">No events yet</div>
      <div class="empty-state-sub">Add the dates that actually mattered for ${codexEscape(ddEntry.name)} above.</div>
    </div>`;
    return;
  }
  const sorted = ddEntry.events.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  out.innerHTML = sorted.map(ddEventCardHtml).join('');

  out.querySelectorAll('[data-del-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delEvent;
      const ev = ddEntry.events.find((e) => e.id === id);
      if (!ev) return;
      const idx = ddEntry.events.indexOf(ev);
      ddEntry.events.splice(idx, 1);
      codexSaveDB(db);
      renderEvents();
      codexToast(`Deleted event: ${ev.name}`, {
        kind: 'danger', duration: 6000, actionLabel: 'Undo',
        onAction: () => { ddEntry.events.splice(idx, 0, ev); codexSaveDB(db); renderEvents(); },
      });
    });
  });
}

document.addEventListener('click', (ev) => {
  if (ev.target && ev.target.id === 'evAddBtn') {
    const name = document.getElementById('evName').value.trim();
    const date = document.getElementById('evDate').value;
    const type = document.getElementById('evType').value;
    const status = document.getElementById('evAddStatus');
    if (!name || !date) { status.textContent = 'Needs both a name and a real date.'; status.className = 'status-line err'; return; }
    ddEntry.events.push({ id: codexUid(), name, date, type });
    codexSaveDB(db);
    status.textContent = '';
    document.getElementById('evName').value = '';
    document.getElementById('evDate').value = '';
    codexToast(`Added event: ${name}`, { kind: 'success' });
    renderEvents();
  }
});

renderHeader();
renderEvents();
codexShellInit(ddWing === 'hours' ? 'hours' : 'fields');

codexCloudInit(() => {
  db = codexLoadDB();
  ddField = ddWing === 'hours' ? codexFindHourField(db, ddParams.get('fieldId')) : codexFindField(db, ddParams.get('fieldId'));
  ddEntry = ddField ? ddField.entries.find((e) => e.id === ddParams.get('entryId')) : null;
  if (!ddField || !ddEntry) { location.href = ddWing === 'hours' ? 'hours.html' : 'fields.html'; return; }
  if (!Array.isArray(ddEntry.events)) ddEntry.events = [];
  renderHeader();
  renderEvents();
});
