/* ============================================================================
   THE CODEX - cloud sync (dormant until firebase-config.js is filled in).
   No login: the owner's explicit call, prioritizing zero-friction access on
   any device over per-account access control. There is no Firebase Auth at
   all here - every page that loads reads and writes the SAME fixed
   Firestore path automatically. That path is a distinct top-level
   collection ("codexData") in the numerology-app's shared Firebase project,
   opened by its own narrow security rule (see codex/FIREBASE_RULES.md) -
   it cannot reach or affect that app's own `users/{uid}` data.

   Model: codexData/{CODEX_CLOUD_DOC_ID}/chunks/{meta, chunk_i}, so a
   database bigger than Firestore's ~1MiB doc limit still syncs (same
   chunking idea as the cockpit's own sync, simplified - no auth layer).
   Newer updatedAt wins in both directions, EXCEPT: a pull that would
   shrink the local entry count never auto-applies (see
   codexTotalEntryCount/the guard in codexCloudPullIfNewerChecked) - a
   timestamp alone can't tell "this is genuinely newer" apart from "this
   is thinner/stale data that happens to have a fresher clock", and a
   real incident (a test push overwriting real local data) proved that
   distinction matters. Pushes are debounced 2s.
   ========================================================================== */

const CODEX_CLOUD_DOC_ID = 'owner-codex-v1';
const CODEX_CLOUD_CHUNK_CHARS = 500000;
let codexCloudReady = false;
let codexCloudPushTimer = null;

function codexCloudEnabled() {
  return !!(window.CODEX_FIREBASE_CONFIG && window.CODEX_FIREBASE_CONFIG.apiKey);
}

function codexCloudLoadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function codexCloudInit(onRemoteReplace) {
  const slot = document.getElementById('cloudSlot');
  if (!codexCloudEnabled()) {
    if (slot) slot.innerHTML = '<span class="count-chip">Local only</span>';
    return;
  }
  if (slot) slot.innerHTML = '<span class="count-chip">Cloud: connecting...</span>';
  try {
    await codexCloudLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await codexCloudLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
    firebase.initializeApp(window.CODEX_FIREBASE_CONFIG);
    codexCloudReady = true;
  } catch (e) {
    if (slot) slot.innerHTML = '<span class="count-chip">Cloud failed to load</span>';
    return;
  }

  const pullResult = await codexCloudPullIfNewerChecked();
  if (pullResult.ok) {
    if (slot) slot.innerHTML = '<span class="count-chip">Cloud: synced</span>';
  } else if (slot) {
    slot.innerHTML = '<span class="count-chip" title="Add the Firestore rule from FIREBASE_RULES.md">Cloud: rule not applied yet</span>';
  }
  if (pullResult.replaced && onRemoteReplace) onRemoteReplace();
  else if (pullResult.ok) codexCloudQueuePush();
}

function codexCloudCollection() {
  return firebase.firestore().collection('codexData').doc(CODEX_CLOUD_DOC_ID).collection('chunks');
}

function codexTotalEntryCount(db) {
  const fieldsTotal = (db.fields || []).reduce((n, f) => n + (f.entries ? f.entries.length : 0), 0);
  const hourTotal = (db.hourFields || []).reduce((n, f) => n + (f.entries ? f.entries.length : 0), 0);
  return fieldsTotal + hourTotal;
}

/* { ok, replaced }: ok is false only on a genuine failure (most likely the
   Firestore rule from FIREBASE_RULES.md not published yet, since the
   default rules deny everything) - "no cloud doc exists yet" is a normal,
   successful outcome (first-ever sync), not a failure.

   Newer timestamp alone is NOT enough to auto-replace: if the cloud copy
   has fewer total entries than what's sitting in local right now, that's
   a real signal something is off (stale write, wrong device, a bad test
   push) even if its clock is "newer" - ask before ever shrinking local
   data, and if declined, push local back up to correct the cloud copy
   instead of leaving it thinner than reality. */
async function codexCloudPullIfNewerChecked() {
  try {
    const local = codexLoadDB();
    const metaSnap = await codexCloudCollection().doc('meta').get();
    if (!metaSnap.exists) return { ok: true, replaced: false };
    const meta = metaSnap.data();
    if (!meta.updatedAt || meta.updatedAt <= (local.updatedAt || 0)) return { ok: true, replaced: false };
    let json = '';
    for (let i = 0; i < meta.chunks; i++) {
      const chunkSnap = await codexCloudCollection().doc(`chunk_${i}`).get();
      if (!chunkSnap.exists) return { ok: true, replaced: false };
      json += chunkSnap.data().json;
    }
    const remote = JSON.parse(json);
    if (!remote || !Array.isArray(remote.fields)) return { ok: true, replaced: false };

    const localCount = codexTotalEntryCount(local);
    const remoteCount = codexTotalEntryCount(remote);
    if (remoteCount < localCount) {
      const proceed = await codexConfirm(
        `The cloud copy has fewer entries (${remoteCount}) than what's here right now (${localCount}). Replace local data with the smaller cloud copy anyway?`,
        { title: 'Cloud data looks thinner', okLabel: 'Replace anyway', danger: true }
      );
      if (!proceed) {
        codexCloudQueuePush();
        return { ok: true, replaced: false };
      }
    }

    localStorage.setItem(CODEX_DB_KEY, JSON.stringify(remote));
    return { ok: true, replaced: true };
  } catch (e) {
    return { ok: false, replaced: false };
  }
}

function codexCloudQueuePush() {
  if (!codexCloudReady) return;
  clearTimeout(codexCloudPushTimer);
  codexCloudPushTimer = setTimeout(codexCloudPushNow, 2000);
}

async function codexCloudPushNow() {
  if (!codexCloudReady) return;
  try {
    const db = codexLoadDB();
    const json = JSON.stringify(db);
    const chunks = [];
    for (let i = 0; i < json.length; i += CODEX_CLOUD_CHUNK_CHARS) {
      chunks.push(json.slice(i, i + CODEX_CLOUD_CHUNK_CHARS));
    }
    const col = codexCloudCollection();
    const batch = firebase.firestore().batch();
    chunks.forEach((c, i) => batch.set(col.doc(`chunk_${i}`), { json: c }));
    batch.set(col.doc('meta'), { chunks: chunks.length, updatedAt: db.updatedAt });
    await batch.commit();
  } catch (e) { /* retried on next save */ }
}
