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
/* Click any event card to open a notes + pasted-photo editor for it.
   ddOpenEventIds tracks which cards are expanded so that editor stays open
   across the re-renders a photo add/remove or undo triggers. Notes save
   debounced (no re-render, so typing never loses focus); photos save and
   re-render immediately since a paste is a deliberate, infrequent action. */
const ddOpenEventIds = new Set();
const ddNotesSaveTimers = new Map();
const DD_IMAGE_MAX_DIM = 1000;

function ddCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > DD_IMAGE_MAX_DIM || height > DD_IMAGE_MAX_DIM) {
          const scale = DD_IMAGE_MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('bad image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

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

  const isOpen = ddOpenEventIds.has(ev.id);
  const images = Array.isArray(ev.images) ? ev.images : [];
  const imagesHtml = images.map((src, i) => `
    <div class="dd-image-thumb">
      <img src="${src}" alt="">
      <button class="dd-image-del" data-img-del="${ev.id}:${i}" title="Remove photo">&times;</button>
    </div>`).join('');

  return `<div class="box event-card" style="--dim-accent:${accent}" data-event-card="${ev.id}">
    <div class="event-card-head">
      <span class="dim-chip" style="--dim-accent:${accent}">${codexEscape(typeInfo.label)}</span>
      <span class="event-date">${codexFormatDate(ev.date)}</span>
      <button class="row-del" data-del-event="${ev.id}" title="Delete">&times;</button>
    </div>
    <div class="event-name">${codexEscape(ev.name)}</div>
    <div class="dd-event-body" data-editor-for="${ev.id}" ${isOpen ? '' : 'hidden'}>
      ${resonanceHtml}
      <div class="detail-grid">${tiles}</div>
      <div class="dd-event-editor">
        <div class="detail-section-label">Notes &amp; photos</div>
        <textarea class="dd-notes-input" data-notes-for="${ev.id}" placeholder="Notes... paste a screenshot here too (Ctrl+V)">${codexEscape(ev.notes || '')}</textarea>
        <div class="dd-image-row" data-images-for="${ev.id}">${imagesHtml}</div>
      </div>
    </div>
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
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.delEvent;
      const found = ddEntry.events.find((e) => e.id === id);
      if (!found) return;
      const idx = ddEntry.events.indexOf(found);
      ddEntry.events.splice(idx, 1);
      ddOpenEventIds.delete(id);
      codexSaveDB(db);
      renderEvents();
      codexToast(`Deleted event: ${found.name}`, {
        kind: 'danger', duration: 6000, actionLabel: 'Undo',
        onAction: () => { ddEntry.events.splice(idx, 0, found); codexSaveDB(db); renderEvents(); },
      });
    });
  });

  out.querySelectorAll('[data-event-card]').forEach((card) => {
    card.addEventListener('click', (ev) => {
      if (ev.target.closest('.dd-event-body, [data-del-event]')) return;
      const id = card.dataset.eventCard;
      if (ddOpenEventIds.has(id)) ddOpenEventIds.delete(id); else ddOpenEventIds.add(id);
      renderEvents();
    });
  });

  out.querySelectorAll('[data-img-del]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const [eventId, idxStr] = btn.dataset.imgDel.split(':');
      const found = ddEntry.events.find((e) => e.id === eventId);
      if (!found || !Array.isArray(found.images)) return;
      found.images.splice(Number(idxStr), 1);
      codexSaveDB(db);
      renderEvents();
    });
  });

  out.querySelectorAll('[data-notes-for]').forEach((textarea) => {
    textarea.addEventListener('click', (ev) => ev.stopPropagation());
    textarea.addEventListener('input', () => {
      const id = textarea.dataset.notesFor;
      clearTimeout(ddNotesSaveTimers.get(id));
      ddNotesSaveTimers.set(id, setTimeout(() => {
        const found = ddEntry.events.find((e) => e.id === id);
        if (found) { found.notes = textarea.value; codexSaveDB(db); }
      }, 600));
    });
    textarea.addEventListener('paste', async (ev) => {
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      const imageFiles = Array.from(items).filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter(Boolean);
      if (!imageFiles.length) return;
      ev.preventDefault();
      const id = textarea.dataset.notesFor;
      const found = ddEntry.events.find((e) => e.id === id);
      if (!found) return;
      if (!Array.isArray(found.images)) found.images = [];
      for (const file of imageFiles) {
        try {
          const dataUrl = await ddCompressImage(file);
          found.images.push(dataUrl);
        } catch (e) { /* unreadable clipboard image, skip */ }
      }
      found.notes = textarea.value;
      codexSaveDB(db);
      codexToast('Photo added.', { kind: 'success' });
      renderEvents();
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
