/* ============================================================================
   THE CODEX - shared entry detail modal.
   Full readout of every computed dimension for one entry, image lazy-loaded
   from Wikipedia. Both pages include this and provide the #detailOverlay
   modal skeleton.
   ========================================================================== */

function codexFactTileHtml(label, value, plain) {
  return `<div class="fact-tile"><div class="fact-label">${codexEscape(label)}</div><div class="fact-value${plain ? ' plain' : ''}">${codexEscape(value)}</div></div>`;
}

/* Shared by the quick popup AND the full Deep Dive profile page - the
   always-visible headline tiles plus a collapsible body holding the rest
   (remaining core tiles + the two imprint-family grids), all derived from
   one codexComputeCodes() result. Kept as one function so the two views
   can never quietly drift apart on what a "profile" actually shows.
   Wired via event delegation (below) rather than per-instance IDs passed
   to codexWireCollapsible, since this can render multiple times on one
   page load (popup reopened) or appear fresh on Deep Dive - a delegated
   listener needs no re-wiring call from either caller. */
function codexEntryProfileSectionsHtml(codes) {
  const headlineTiles = [
    codexFactTileHtml('Life Path', codes.lp),
    codexFactTileHtml('Day Born', codes.dayBorn),
    codexFactTileHtml('Year Animal', codes.vietYear, true),
    codes.luckyImprint ? codexFactTileHtml(`Lucky (${codes.luckyValue})`, codes.luckyImprint.ud) : '',
  ].filter(Boolean).join('');

  const moreCoreTiles = [
    codexFactTileHtml('LP Compound', codes.lpCompound),
    codexFactTileHtml('Day Number', codes.dayNum),
    codexFactTileHtml('Combo', codes.combo),
    codexFactTileHtml('Month Animal', codes.vietMonth, true),
    codexFactTileHtml('Day Animal', codes.vietDay, true),
    codes.altLuckyImprint ? codexFactTileHtml(`Alt Lucky (${codes.altLuckyValue})`, codes.altLuckyImprint.ud) : '',
  ].filter(Boolean).join('');

  const imprintTiles = CODEX_IMPRINT_THEMES
    .filter((n) => codes.imprints[n] != null)
    .map((n) => codexFactTileHtml(`First UD ${n}`, codes.imprints[n]))
    .join('');

  const dayEnergyTiles = CODEX_IMPRINT_THEMES
    .filter((n) => codes.dayEnergyImprints[n] != null)
    .map((n) => codexFactTileHtml(`DE ${n}`, codes.dayEnergyImprints[n]))
    .join('');

  const bodyId = `profBody-${codexUid()}`;

  return `
    <div class="detail-grid">${headlineTiles}</div>
    <button class="collapsible-toggle" data-profile-toggle="${bodyId}" type="button" style="margin-top: 14px;">
      <span class="box-label">More codes</span>
      <span class="collapse-chevron">&#9656;</span>
    </button>
    <div class="collapsible-body" id="${bodyId}" hidden>
      <div class="detail-grid">${moreCoreTiles}</div>
      <div class="detail-section-label">First UD (day it landed on)</div>
      <div class="detail-grid">${imprintTiles || '<div class="status-line">None found.</div>'}</div>
      <div class="detail-section-label">Day Energy imprint per theme</div>
      <div class="detail-grid">${dayEnergyTiles || '<div class="status-line">None found.</div>'}</div>
    </div>
  `;
}

/* Delegated so it covers every codexEntryProfileSectionsHtml() instance,
   present or future, without per-render wiring calls. */
document.addEventListener('click', (ev) => {
  const toggle = ev.target.closest('[data-profile-toggle]');
  if (!toggle) return;
  const body = document.getElementById(toggle.dataset.profileToggle);
  if (!body) return;
  body.hidden = !body.hidden;
  const chevron = toggle.querySelector('.collapse-chevron');
  if (chevron) chevron.classList.toggle('open', !body.hidden);
});

function codexOpenDetail(entry, field) {
  const overlay = document.getElementById('detailOverlay');
  const body = document.getElementById('detailBody');
  if (!overlay || !body) return;
  const codes = codexComputeCodes(entry.date);
  const kindInfo = CODEX_FIELD_KINDS[field.kind] || CODEX_FIELD_KINDS.custom;

  body.innerHTML = `
    <img id="detailImg" class="detail-img" alt="" hidden>
    <h2 class="detail-name">${codexEscape(entry.name)}</h2>
    <div class="detail-sub">${codexEscape(field.name)} &middot; ${kindInfo.dateLabel}: ${codexFormatDate(entry.date)}${entry.dateKind ? ` (${codexEscape(entry.dateKind)})` : ''}</div>
    ${codexEntryProfileSectionsHtml(codes)}
    <div class="detail-section-label">
      <a class="btn-link" href="deep-dive.html?wing=fields&fieldId=${field.id}&entryId=${entry.id}">&#128213; Deep Dive - add events</a>
      ${entry.wikiTitle ? `<a class="back-link" href="https://en.wikipedia.org/wiki/${encodeURIComponent(entry.wikiTitle)}" target="_blank" rel="noopener">Wikipedia: ${codexEscape(entry.wikiTitle)}</a>` : ''}
    </div>
  `;
  overlay.classList.add('open');

  if (entry.wikiTitle) {
    codexFetchImage(entry.wikiTitle).then((url) => {
      const img = document.getElementById('detailImg');
      if (url && img) { img.src = url; img.hidden = false; }
    });
  }
}

function codexCloseDetail() {
  const overlay = document.getElementById('detailOverlay');
  if (overlay) overlay.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('detailOverlay');
  const close = document.getElementById('detailClose');
  if (close) close.addEventListener('click', codexCloseDetail);
  if (overlay) overlay.addEventListener('click', (ev) => { if (ev.target === overlay) codexCloseDetail(); });
});
