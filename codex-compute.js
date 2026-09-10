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
    // 8 is a compound theme (8th/17th/26th, never the literal 28th) - its
    // own dedicated engine function, not the plain exact-day-of-month walk
    // every other theme uses.
    const found = n === 8 ? getFirstEightDayImprint(d) : getFirstDayOfMonthImprint(d, n);
    if (found) imprints[n] = found.lp;
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
  // The value every "Imprint UD" dimension reports (below) describes the
  // FOUND DATE's own numerological character (a Universal-Day-style
  // reading), never the person's own Life Path - "Imprint LP" was a naming
  // inaccuracy fixed 2026-08-27, not a computation change; the underlying
  // number is untouched (verified against the owner's own 1/3/2003 worked
  // example: every themed day matched exactly).
  {
    id: 'luckyImprint', label: 'Lucky Number Imprint',
    get: (c) => (c.luckyImprint ? String(c.luckyImprint.ud) : null),
    sortKey: codexNumKeySort, numeral: true,
  },
].concat(CODEX_IMPRINT_THEMES.map((n) => ({
  id: `imprint${n}`,
  label: `Imprint UD (${n}-Day)`,
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
