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

/* ------------------------------------------------------- Deep Dive events */
/* Colors reuse the same energy hue table codex-shell.js's dimension
   accents pull from - not new colors, just applied to a new concept. */
const CODEX_EVENT_TYPES = [
  { id: 'career', label: 'Career', hue: 8 },
  { id: 'achievement', label: 'Achievement', hue: 22 },
  { id: 'personal', label: 'Personal', hue: 4 },
  { id: 'relationship', label: 'Relationship', hue: 33 },
  { id: 'health', label: 'Health', hue: 6 },
  { id: 'tragedy', label: 'Tragedy', hue: 7 },
  { id: 'financial', label: 'Financial', hue: 28 },
  { id: 'other', label: 'Other', hue: 1 },
];
function codexEventTypeInfo(typeId) {
  return CODEX_EVENT_TYPES.find((t) => t.id === typeId) || CODEX_EVENT_TYPES[CODEX_EVENT_TYPES.length - 1];
}

/* Does an arbitrary date's own UD (codexDigitPoolUD) match any of this
   person's own Day Energy Imprints or Lucky Number Imprints? Returns the
   matching theme labels, e.g. an event landing on UD 5 for someone whose
   Day Energy 8 imprint is also 5 gets flagged - a real hit against the
   owner's own resonance theory, not something you'd have to notice by eye.
   First UD imprints (codes.imprints) are deliberately excluded here
   (2026-09-10): since that family now reports a DAY (1-31), not a UD,
   comparing it against an event's UD would be a coincidental, meaningless
   match, not a real one. */
function codexFindResonantThemes(codes, ud) {
  const hits = [];
  CODEX_IMPRINT_THEMES.forEach((n) => {
    if (codes.dayEnergyImprints && codes.dayEnergyImprints[n] != null && String(codes.dayEnergyImprints[n]) === String(ud)) hits.push(`Day Energy ${n} imprint`);
  });
  if (codes.luckyImprint && String(codes.luckyImprint.ud) === String(ud)) hits.push(`Lucky Number (${codes.luckyValue}) imprint`);
  if (codes.altLuckyImprint && String(codes.altLuckyImprint.ud) === String(ud)) hits.push(`Alt Lucky Number (${codes.altLuckyValue}) imprint`);
  return hits;
}

/* Shared by both derived imprint searches below: pool a date's own
   month+day+year (11/22/33-pairing method) and reduce via
   runCustomReduction - the exact digit-pool block getFirstDayOfMonthImprint/
   getFirstEightDayImprint (imprint-alignment.js) already duplicate
   per-function, kept here as one Codex-side helper instead of a third
   copy-paste. Never touches the sacrosanct engine files - only consumes
   the public runCustomReduction. */
function codexDigitPoolUD(date) {
  const fullSequence = String(date.getMonth() + 1) + String(date.getDate()) + String(date.getFullYear());
  const pool = [];
  let i = 0;
  while (i < fullSequence.length) {
    if (i + 1 < fullSequence.length) {
      const two = fullSequence.substring(i, i + 2);
      if (two === '11' || two === '22' || two === '33') { pool.push(parseInt(two, 10)); i += 2; continue; }
    }
    pool.push(parseInt(fullSequence.charAt(i), 10));
    i++;
  }
  return runCustomReduction(pool.reduce((a, b) => a + b, 0));
}

/* First UD imprint: walk forward day-by-day from birth (inclusive) for the
   first date whose OWN Universal Day (codexDigitPoolUD) equals the target -
   the day-of-month behind THAT date is the imprint. (2026-09-10 fix: the
   previous version of this searched by literal day-of-month and reported
   that date's UD - backwards. Confirmed against the owner's own worked
   example: born 1/3/2003, the first UD1 date is 1/4/2003, so "First UD 1"
   reports day 4; the first UD11 date is 1/5/2003, so "First UD 11" reports
   day 5.) UD is driven by the full month+day+year pool, not just the day -
   a master-number target like 22 needs the raw pre-reduction sum to land
   on that exact value, which can legitimately take years from birth (e.g.
   verified live: one real entry's first UD22 date was 910 days out). A
   20-year window comfortably covers that; the search itself stays cheap
   (one string concat + digit sum per day) and every result is cached by
   codexComputeCodes, so this only ever runs once per unique birth date. */
function codexFirstDateForUD(birthDate, targetUD) {
  const searchDate = new Date(birthDate.getTime());
  for (let i = 0; i <= 7305; i++) {
    if (i > 0) searchDate.setDate(searchDate.getDate() + 1);
    if (String(codexDigitPoolUD(searchDate)) === String(targetUD)) {
      return { date: new Date(searchDate.getTime()), day: searchDate.getDate() };
    }
  }
  return null;
}

/* Day Energy imprint: NOT in the sacrosanct engine, built here per the
   user's own spec (2026-08-27) - same "walk forward up to 31 days" shape
   as getFirstEightDayImprint, but the per-day test is Day Energy
   (reduceNumber of the day-of-month itself, the simpler one-pass formula -
   distinct from Universal Day's full month+day+year pool) instead of a
   fixed target of 8. Reports the found date's own UD (codexDigitPoolUD),
   same output convention as every other imprint here. */
function codexFirstDayEnergyImprint(birthDate, target) {
  const searchDate = new Date(birthDate.getTime());
  for (let i = 0; i <= 31; i++) {
    if (i > 0) searchDate.setDate(searchDate.getDate() + 1);
    if (reduceNumber(searchDate.getDate()) !== target) continue;
    return { date: new Date(searchDate.getTime()), ud: codexDigitPoolUD(searchDate) };
  }
  return null; // unreachable: every reduceNumber(1..31) target recurs within 31 days
}

/* Lucky Number imprint: the engine's own getPersonLuckyImprintValues
   (imprint-alignment.js) only ever handles a lucky number 1-31 (treats it
   as a day-of-month, via getFirstDayOfMonthImprint) and silently drops
   anything bigger - getLuckyNumber's month-digit+year-digit concatenation
   routinely lands well past 31. This fills that gap Codex-side: >31 reads
   as a day-of-year instead (JS's Date constructor normalizes day overflow
   on its own, e.g. new Date(year,0,72) rolls cleanly into March), using
   the first year on/after birth where that day-of-year itself falls
   on/after the actual birth date. */
function codexLuckyNumberImprint(birthDate, luckyValue) {
  if (luckyValue == null) return null;
  if (luckyValue >= 1 && luckyValue <= 31) {
    const found = getFirstDayOfMonthImprint(birthDate, luckyValue);
    return found ? { date: found.date, ud: found.lp, kind: 'day' } : null;
  }
  let year = birthDate.getFullYear();
  let candidate = new Date(year, 0, luckyValue);
  if (candidate < birthDate) candidate = new Date(year + 1, 0, luckyValue);
  return { date: candidate, ud: codexDigitPoolUD(candidate), kind: 'year' };
}

const codexCodesCache = new Map();

function codexComputeCodes(dateStr) {
  if (codexCodesCache.has(dateStr)) return codexCodesCache.get(dateStr);
  const d = codexParseDate(dateStr);
  const lpb = lifePathBreakdown(d);
  const rawDay = getRawDay(d);
  const imprints = {};
  CODEX_IMPRINT_THEMES.forEach((n) => {
    const found = codexFirstDateForUD(d, n);
    if (found) imprints[n] = found.day;
  });
  const dayEnergyImprints = {};
  CODEX_IMPRINT_THEMES.forEach((n) => {
    const found = codexFirstDayEnergyImprint(d, n);
    if (found) dayEnergyImprints[n] = found.ud;
  });
  const lucky = getImprintLuckyNumbers(d);
  const luckyImprint = codexLuckyNumberImprint(d, lucky.primary);
  const altLuckyImprint = lucky.alt != null ? codexLuckyNumberImprint(d, lucky.alt) : null;
  // Same day-condition the real engine uses to decide "22" vs "22/4" and
  // "33" vs "33/6" (lifePathBreakdown, numerology.js - not exposed on its
  // return value, so re-derived here from the date rather than touching
  // that file). 13 gets treated as an honorary 4th master number on the
  // SAME condition as 22/33 (not 11's - 11's own "/2" suffix is narrower,
  // tied to the day literally being 20, a coincidence unique to how 11
  // gets pushed into the reduction pool that has no parallel for 13).
  const isDoubleDigitDay = rawDay > 9 && rawDay !== 11 && rawDay !== 22 && rawDay !== 33;
  const codes = {
    lp: lpb.display,
    lpNum: lpb.result,
    lpCompound: lpb.compound,
    pure13: lpb.compound === 13,
    pure13Slash: lpb.compound === 13 && isDoubleDigitDay,
    dayBorn: rawDay,
    dayNum: reduceNumber(rawDay),
    combo: getCombo(d),
    vietYear: getChineseZodiacYear(d),
    vietMonth: getChineseMonth(d),
    vietDay: getChineseDaySign(d),
    imprints,
    dayEnergyImprints,
    luckyValue: lucky.primary,
    luckyImprint,
    altLuckyValue: lucky.alt,
    altLuckyImprint,
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
  // still splits the karmic path out as its own value (display-only,
  // c.lp itself - the true engine value shown in every table/popup - is
  // untouched) so it's visible directly in the Life Path spread. Treated
  // as an honorary 4th master number: plain "13" by default, "13/4" only
  // under the same day-condition that already governs 22->22/4 and
  // 33->33/6 (see isDoubleDigitDay above) - most pure-13 people will show
  // "13/4", same as most 22/33 results do.
  { id: 'lp', label: 'Life Path', get: (c) => (c.pure13 ? (c.pure13Slash ? '13/4' : '13') : c.lp), sortKey: codexNumKeySort, numeral: true },
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
  // Reports the found date's own Universal-Day-style reading (via
  // codexLuckyNumberImprint), never the person's own Life Path.
  {
    id: 'luckyImprint', label: 'Lucky Number Imprint',
    get: (c) => (c.luckyImprint ? String(c.luckyImprint.ud) : null),
    sortKey: codexNumKeySort, numeral: true,
  },
  // "First UD N" reports a DAY (1-31), not a UD - it's the day-of-month
  // behind the first date after birth whose own Universal Day equals N
  // (codexFirstDateForUD). Fixed 2026-09-10: this used to search by
  // literal day-of-month and report that date's UD, backwards from spec.
].concat(CODEX_IMPRINT_THEMES.map((n) => ({
  id: `imprint${n}`,
  label: `First UD ${n}`,
  get: (c) => (c.imprints[n] != null ? String(c.imprints[n]) : null),
  sortKey: codexNumKeySort,
  numeral: true,
}))).concat(CODEX_IMPRINT_THEMES.map((n) => ({
  id: `dayEnergyImprint${n}`,
  label: `Day Energy Imprint (${n})`,
  get: (c) => (c.dayEnergyImprints[n] != null ? String(c.dayEnergyImprints[n]) : null),
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
