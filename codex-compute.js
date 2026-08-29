/* ============================================================================
   THE CODEX - per-entry code computation + the dimension registry.
   Every value comes from the copied engines (numerology.js /
   imprint-alignment.js) - nothing here reinvents a reduction. The engines
   are read-only copies of the cockpit's and are never edited.
   ========================================================================== */

/* Imprint themes come straight from the engine's own tracked list
   (IMPRINT_TRACKED_NUMBERS in imprint-alignment.js). 33 is excluded: its
   pure-33 imprint rarely exists and needs the person-level path. */
const CODEX_IMPRINT_THEMES = IMPRINT_TRACKED_NUMBERS.slice();

const codexCodesCache = new Map();

function codexComputeCodes(dateStr) {
  if (codexCodesCache.has(dateStr)) return codexCodesCache.get(dateStr);
  const d = codexParseDate(dateStr);
  const lpb = lifePathBreakdown(d);
  const rawDay = getRawDay(d);
  const imprints = {};
  CODEX_IMPRINT_THEMES.forEach((n) => {
    const found = getFirstDayOfMonthImprint(d, n);
    if (found) imprints[n] = found.lp;
  });
  const codes = {
    lp: lpb.display,
    lpNum: lpb.result,
    lpCompound: lpb.compound,
    pure13: lpb.compound === 13,
    dayBorn: rawDay,
    dayNum: reduceNumber(rawDay),
    combo: getCombo(d),
    vietYear: getChineseZodiacYear(d),
    vietMonth: getChineseMonth(d),
    vietDay: getChineseDaySign(d),
    imprints,
  };
  codexCodesCache.set(dateStr, codes);
  return codes;
}

/* --------------------------------------------------- dimension registry --- */
/* get() returns the aggregation key (string) or null when not applicable.
   sortKey() orders keys canonically in cross-field tables and pickers. */

function codexAnimalSortKey(key) {
  const n = CHINESE_ANIMAL_NUMERIC[key];
  return n ? n : 99;
}

function codexNumKeySort(key) {
  // '11/2' sorts with 11, '33/6' with 33, plain numbers numerically
  const base = parseFloat(String(key));
  return isNaN(base) ? 999 : base + (String(key).includes('/') ? 0.5 : 0);
}

const CODEX_DIMENSIONS = [
  // The real engine result for a Pure-13 person is plain "4" - 13 never
  // survives reduction (unlike 11/22/33, which freeze). This dimension
  // still splits the karmic path out as its own "13/4" bucket (display-only,
  // same slash convention as 11/2, 22/4, 33/6) so it's visible directly in
  // the Life Path spread - c.lp itself (the true engine value, shown in
  // every table/popup) is untouched.
  { id: 'lp', label: 'Life Path', get: (c) => (c.pure13 ? '13/4' : c.lp), sortKey: codexNumKeySort, numeral: true },
  { id: 'lpCompound', label: 'LP Compound', get: (c) => String(c.lpCompound), sortKey: codexNumKeySort, numeral: true },
  // Karmic-debt path: the RAW pre-reduction total lands exactly on 13 (which
  // then reduces to 4, same as the compat table's "Karmic 13 borrows 4's
  // row"). Only ever true/false, so like the imprint dims below it returns
  // null (not "No") when absent - a boolean dim would otherwise flood every
  // leaderboard/reverse-lookup with an overwhelming "No" bucket.
  { id: 'pure13', label: 'Pure 13 (Karmic)', get: (c) => (c.pure13 ? 'Pure 13' : null), sortKey: () => 0, numeral: false },
  { id: 'dayBorn', label: 'Day Born', get: (c) => String(c.dayBorn), sortKey: codexNumKeySort, numeral: true },
  { id: 'dayNum', label: 'Day Number', get: (c) => String(c.dayNum), sortKey: codexNumKeySort, numeral: true },
  { id: 'combo', label: 'Combo', get: (c) => String(c.combo), sortKey: codexNumKeySort, numeral: true },
  { id: 'vietYear', label: 'Year Animal', get: (c) => c.vietYear, sortKey: codexAnimalSortKey, numeral: false },
  { id: 'vietMonth', label: 'Month Animal', get: (c) => c.vietMonth, sortKey: codexAnimalSortKey, numeral: false },
  { id: 'vietDay', label: 'Day Animal', get: (c) => c.vietDay, sortKey: codexAnimalSortKey, numeral: false },
].concat(CODEX_IMPRINT_THEMES.map((n) => ({
  id: `imprint${n}`,
  label: `Imprint LP (${n}-Day)`,
  get: (c) => (c.imprints[n] != null ? String(c.imprints[n]) : null),
  sortKey: codexNumKeySort,
  numeral: true,
})));

function codexDimension(dimId) {
  return CODEX_DIMENSIONS.find((d) => d.id === dimId) || CODEX_DIMENSIONS[0];
}

function codexDimensionOptionsHtml(selectedId) {
  return CODEX_DIMENSIONS.map((d) =>
    `<option value="${d.id}"${d.id === selectedId ? ' selected' : ''}>${d.label}</option>`).join('');
}
