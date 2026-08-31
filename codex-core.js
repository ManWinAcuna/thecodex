/* ============================================================================
   THE CODEX - core data model + storage.
   DB shape:
   {
     fields: [{ id, name, kind, entries: [entry] }],
     seenSeeds: [fieldName],   // seed fields offered once, never resurrected
     updatedAt: 0              // ms timestamp of last local save (cloud sync)
   }
   entry: { id, name, date: 'YYYY-MM-DD', dateKind, wikiTitle, qid, notes }
   Dates are ALWAYS full day-precision. Never a fabricated day, never a bare
   year - same doctrine as EMAX. A subject without a findable real date does
   not enter the database.
   ========================================================================== */

const CODEX_DB_KEY = 'codex_db_v1';

const CODEX_FIELD_KINDS = {
  people: { label: 'People', dateLabel: 'Born' },
  entity: { label: 'Entities', dateLabel: 'Founded / Released' },
  event: { label: 'Events', dateLabel: 'Happened' },
  custom: { label: 'Research List', dateLabel: 'Date' },
};

// Wikidata property cascade per field kind - first real day-precision hit
// wins. P569 born, P571 inception, P1619 opened, P577 published, P580 start,
// P585 point in time.
const CODEX_KIND_PROPS = {
  people: [['P569', 'born']],
  entity: [['P571', 'founded'], ['P1619', 'opened'], ['P577', 'released'], ['P580', 'aired']],
  event: [['P585', 'happened'], ['P580', 'began'], ['P577', 'released'], ['P571', 'founded']],
  custom: [['P569', 'born'], ['P585', 'happened'], ['P571', 'founded'], ['P1619', 'opened'], ['P577', 'released'], ['P580', 'aired']],
};

function codexUid() {
  return 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function codexLoadDB() {
  try {
    const raw = localStorage.getItem(CODEX_DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (db && Array.isArray(db.fields)) {
        if (!Array.isArray(db.seenSeeds)) db.seenSeeds = [];
        if (!Array.isArray(db.hourFields)) db.hourFields = [];
        if (!db.updatedAt) db.updatedAt = 0;
        return db;
      }
    }
  } catch (e) { /* corrupted -> fresh */ }
  return { fields: [], hourFields: [], seenSeeds: [], updatedAt: 0 };
}

function codexSaveDB(db) {
  db.updatedAt = Date.now();
  try {
    localStorage.setItem(CODEX_DB_KEY, JSON.stringify(db));
  } catch (e) {
    codexToast('Storage full - export a backup and clear something.', { kind: 'danger', duration: 0 });
  }
  if (typeof codexCloudQueuePush === 'function') codexCloudQueuePush();
}

function codexFindField(db, fieldId) {
  return db.fields.find((f) => f.id === fieldId) || null;
}

function codexAllEntries(db) {
  const out = [];
  db.fields.forEach((f) => {
    f.entries.forEach((e) => out.push({ entry: e, field: f }));
  });
  return out;
}

/* 'YYYY-MM-DD' -> local Date. Local (not UTC) on purpose: every engine
   function reads local date parts, same as the whole numerology app. */
function codexParseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function codexFormatDate(dateStr) {
  const d = codexParseDate(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function codexEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Collapsible box wiring shared by both pages. */
function codexWireCollapsible(toggleId, bodyId, chevronId) {
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  const chevron = document.getElementById(chevronId);
  if (!toggle || !body) return;
  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
    if (chevron) chevron.classList.toggle('open', !body.hidden);
  });
}

/* ------------------------------------------------- export / import ------- */

function codexExportBackup(db) {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `codex-backup-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function codexImportBackup(file, onDone) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.fields)) throw new Error('bad shape');
      const entryCount = data.fields.reduce((n, f) => n + (f.entries ? f.entries.length : 0), 0);
      const ok = await codexConfirm(`Replace the current database with this backup? (${data.fields.length} fields, ${entryCount} entries)`, { title: 'Replace database?', okLabel: 'Replace', danger: true });
      if (!ok) return;
      if (!Array.isArray(data.seenSeeds)) data.seenSeeds = [];
      if (!Array.isArray(data.hourFields)) data.hourFields = [];
      codexSaveDB(data);
      codexToast('Backup restored.', { kind: 'success' });
      onDone(data);
    } catch (e) {
      codexToast('Not a valid Codex backup file.', { kind: 'danger' });
    }
  };
  reader.readAsText(file);
}
