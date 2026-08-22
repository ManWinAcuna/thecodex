/* ============================================================================
   THE CODEX - shared entry detail modal.
   Full readout of every computed dimension for one entry, image lazy-loaded
   from Wikipedia. Both pages include this and provide the #detailOverlay
   modal skeleton.
   ========================================================================== */

function codexFactTileHtml(label, value, plain) {
  return `<div class="fact-tile"><div class="fact-label">${codexEscape(label)}</div><div class="fact-value${plain ? ' plain' : ''}">${codexEscape(value)}</div></div>`;
}

function codexOpenDetail(entry, field) {
  const overlay = document.getElementById('detailOverlay');
  const body = document.getElementById('detailBody');
  if (!overlay || !body) return;
  const codes = codexComputeCodes(entry.date);
  const kindInfo = CODEX_FIELD_KINDS[field.kind] || CODEX_FIELD_KINDS.custom;

  const coreTiles = [
    codexFactTileHtml('Life Path', codes.lp),
    codexFactTileHtml('LP Compound', codes.lpCompound),
    codexFactTileHtml('Day Born', codes.dayBorn),
    codexFactTileHtml('Day Number', codes.dayNum),
    codexFactTileHtml('Combo', codes.combo),
    codexFactTileHtml('Year Animal', codes.vietYear, true),
    codexFactTileHtml('Month Animal', codes.vietMonth, true),
    codexFactTileHtml('Day Animal', codes.vietDay, true),
  ].join('');

  const imprintTiles = CODEX_IMPRINT_THEMES
    .filter((n) => codes.imprints[n] != null)
    .map((n) => codexFactTileHtml(`${n}-Day`, codes.imprints[n]))
    .join('');

  body.innerHTML = `
    <img id="detailImg" class="detail-img" alt="" hidden>
    <h2 class="detail-name">${codexEscape(entry.name)}</h2>
    <div class="detail-sub">${codexEscape(field.name)} &middot; ${kindInfo.dateLabel}: ${codexFormatDate(entry.date)}${entry.dateKind ? ` (${codexEscape(entry.dateKind)})` : ''}</div>
    <div class="detail-grid">${coreTiles}</div>
    <div class="detail-section-label">Imprint LP per themed day</div>
    <div class="detail-grid">${imprintTiles || '<div class="status-line">None found.</div>'}</div>
    ${entry.wikiTitle ? `<div class="detail-section-label"><a class="back-link" href="https://en.wikipedia.org/wiki/${encodeURIComponent(entry.wikiTitle)}" target="_blank" rel="noopener">Wikipedia: ${codexEscape(entry.wikiTitle)}</a></div>` : ''}
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
