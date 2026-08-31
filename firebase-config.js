/* ============================================================================
   THE CODEX - Firebase config.
   Reuses the numerology-app's existing Firebase project (advanced-numerology
   -d3f0f) rather than a separate one - same infrastructure, a completely
   separate data path (top-level "codexData" collection, see codex-cloud.js),
   so nothing here can collide with or affect that app's own synced data.

   No login: this app has no per-account access control by design (the
   owner's explicit call - see codex-cloud.js's own header comment). Any
   device that loads the site syncs automatically to one fixed spot in this
   project the moment the page opens.
   ========================================================================== */

window.CODEX_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCv3i-Eetjr0zZ3ZNd-hPRRH_bTrjbs-yE',
  authDomain: 'advanced-numerology-d3f0f.firebaseapp.com',
  projectId: 'advanced-numerology-d3f0f',
  storageBucket: 'advanced-numerology-d3f0f.firebasestorage.app',
  messagingSenderId: '521136780282',
  appId: '1:521136780282:web:121419fb086a7da70cea43',
};
