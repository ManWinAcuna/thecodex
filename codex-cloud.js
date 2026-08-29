/* ============================================================================
   THE CODEX - cloud sync (dormant until firebase-config.js is filled in).
   Owner-gated: only CODEX_OWNER_EMAIL's Google account may read or write.
   Model: users/{uid}/codex/meta { chunks, updatedAt } + chunk_i docs, so a
   database bigger than Firestore's ~1MB doc limit still syncs (big-store
   pattern from the cockpit, simplified).
   Newer updatedAt wins in both directions. Pushes are debounced 2s.
   ========================================================================== */

const CODEX_CLOUD_CHUNK_CHARS = 500000;
let codexCloudReady = false;
let codexCloudUser = null;
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
  try {
    await codexCloudLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await codexCloudLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    await codexCloudLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
    firebase.initializeApp(window.CODEX_FIREBASE_CONFIG);
    codexCloudReady = true;
  } catch (e) {
    if (slot) slot.innerHTML = '<span class="count-chip">Cloud failed to load</span>';
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (user && user.email !== CODEX_OWNER_EMAIL) {
      codexToast('This database is owner-locked.', { kind: 'danger', duration: 5000 });
      firebase.auth().signOut();
      return;
    }
    codexCloudUser = user;
    codexCloudRenderSlot();
    if (user) {
      const replaced = await codexCloudPullIfNewer();
      if (replaced && onRemoteReplace) onRemoteReplace();
      else codexCloudQueuePush();
    }
  });
  codexCloudRenderSlot();
}

function codexCloudRenderSlot() {
  const slot = document.getElementById('cloudSlot');
  if (!slot) return;
  if (!codexCloudReady) { slot.innerHTML = ''; return; }
  if (codexCloudUser) {
    slot.innerHTML = '<button class="btn-link" id="cloudSignOut">Signed in &middot; Sign out</button>';
    document.getElementById('cloudSignOut').addEventListener('click', () => firebase.auth().signOut());
  } else {
    slot.innerHTML = '<button class="btn-link" id="cloudSignIn">Sign in for cloud sync</button>';
    document.getElementById('cloudSignIn').addEventListener('click', () => {
      firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    });
  }
}

function codexCloudCollection() {
  return firebase.firestore().collection('users').doc(codexCloudUser.uid).collection('codex');
}

async function codexCloudPullIfNewer() {
  try {
    const local = codexLoadDB();
    const metaSnap = await codexCloudCollection().doc('meta').get();
    if (!metaSnap.exists) return false;
    const meta = metaSnap.data();
    if (!meta.updatedAt || meta.updatedAt <= (local.updatedAt || 0)) return false;
    let json = '';
    for (let i = 0; i < meta.chunks; i++) {
      const chunkSnap = await codexCloudCollection().doc(`chunk_${i}`).get();
      if (!chunkSnap.exists) return false;
      json += chunkSnap.data().json;
    }
    const remote = JSON.parse(json);
    if (!remote || !Array.isArray(remote.fields)) return false;
    localStorage.setItem(CODEX_DB_KEY, JSON.stringify(remote));
    return true;
  } catch (e) {
    return false;
  }
}

function codexCloudQueuePush() {
  if (!codexCloudReady || !codexCloudUser) return;
  clearTimeout(codexCloudPushTimer);
  codexCloudPushTimer = setTimeout(codexCloudPushNow, 2000);
}

async function codexCloudPushNow() {
  if (!codexCloudReady || !codexCloudUser) return;
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
