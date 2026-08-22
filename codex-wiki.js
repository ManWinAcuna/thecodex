/* ============================================================================
   THE CODEX - Wikipedia/Wikidata lookup machinery.
   Same cascade the cockpit's EMAX and Famous Lookup use: name -> Wikidata
   entity -> first day-precision date claim in the kind's property cascade.
   Never fabricates a day, never accepts a bare year (precision < 11 is a
   miss, full stop).
   ========================================================================== */

/* Small promise queue so bulk imports stay polite to the APIs - at most
   CODEX_WIKI_CONCURRENCY requests in flight, the rest wait their turn. */
const CODEX_WIKI_CONCURRENCY = 3;
let codexWikiActive = 0;
const codexWikiWaiting = [];

function codexQueuedJson(url) {
  return new Promise((resolve, reject) => {
    const run = () => {
      codexWikiActive++;
      fetch(url)
        .then((res) => res.json())
        .then(resolve, reject)
        .finally(() => {
          codexWikiActive--;
          const next = codexWikiWaiting.shift();
          if (next) next();
        });
    };
    if (codexWikiActive < CODEX_WIKI_CONCURRENCY) run();
    else codexWikiWaiting.push(run);
  });
}

/* Wikidata dates look like "+1990-06-15T00:00:00Z". Precision 11 = day.
   Coarser (year/decade) is unusable for numerology - a real miss. */
function codexDateFromClaim(claims) {
  if (!claims || claims.length === 0) return null;
  const snak = claims[0].mainsnak;
  if (!snak || !snak.datavalue) return null;
  const value = snak.datavalue.value;
  if (value.precision < 11) return null;
  const time = value.time;
  if (time.charAt(0) === '-') return null;
  return time.slice(1, 11);
}

function codexBestDateFromClaims(claims, propKindPairs) {
  if (!claims) return null;
  for (const [prop, kind] of propKindPairs) {
    const exact = codexDateFromClaim(claims[prop]);
    if (exact) return { date: exact, kind };
  }
  return null;
}

/* Search candidates for the manual "Look up" flow: label + description so
   the right John Smith is pickable. */
async function codexSearchCandidates(name) {
  const data = await codexQueuedJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=8&format=json&origin=*`);
  const hits = (data && Array.isArray(data.search)) ? data.search : [];
  return hits.map((h) => ({ qid: h.id, label: h.label, description: h.description || '' }));
}

/* Resolve one QID to { date, kind, title } or null. */
async function codexResolveQid(qid, propKindPairs) {
  const d = await codexQueuedJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims%7Csitelinks&sitefilter=enwiki&format=json&origin=*`);
  const entity = d && d.entities && d.entities[qid];
  if (!entity) return null;
  const best = codexBestDateFromClaims(entity.claims, propKindPairs);
  if (!best) return null;
  const sitelink = entity.sitelinks && entity.sitelinks.enwiki;
  return { date: best.date, kind: best.kind, title: sitelink ? sitelink.title : null };
}

/* One-shot lookup by plain name (bulk import / seed preload): search the
   top candidates, batch-fetch their claims, first one with a real
   day-precision date in the cascade wins. Returns
   { qid, name, date, kind, title } or null. */
async function codexLookupByName(name, propKindPairs) {
  const data = await codexQueuedJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json&origin=*`);
  const hits = (data && Array.isArray(data.search)) ? data.search : [];
  if (!hits.length) return null;
  const d = await codexQueuedJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${hits.map((h) => h.id).join('|')}&props=claims%7Csitelinks&sitefilter=enwiki&format=json&origin=*`);
  const entities = (d && d.entities) || {};
  for (const hit of hits) {
    const entity = entities[hit.id];
    if (!entity) continue;
    const best = codexBestDateFromClaims(entity.claims, propKindPairs);
    if (!best) continue;
    const sitelink = entity.sitelinks && entity.sitelinks.enwiki;
    return { qid: hit.id, name: hit.label, date: best.date, kind: best.kind, title: sitelink ? sitelink.title : null };
  }
  return null;
}

/* Lead image for the detail popup, via the article summary. Session cache
   only - images are decoration here, not data. */
const codexImageCache = new Map();
async function codexFetchImage(title) {
  if (!title) return null;
  if (codexImageCache.has(title)) return codexImageCache.get(title);
  let url = null;
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const data = await res.json();
    url = (data.thumbnail && data.thumbnail.source) || null;
  } catch (e) { url = null; }
  codexImageCache.set(title, url);
  return url;
}
