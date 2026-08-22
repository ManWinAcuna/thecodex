/* ============================================================================
   THE CODEX - Firebase config slot.
   The site runs fully on localStorage until this is filled in. To go
   cloud-enabled: create a Firebase project (Firestore + Google sign-in),
   then replace the null below with the web app config object from
   Project settings -> Your apps -> SDK setup and configuration, e.g.:

   window.CODEX_FIREBASE_CONFIG = {
     apiKey: '...',
     authDomain: 'the-codex-xxxxx.firebaseapp.com',
     projectId: 'the-codex-xxxxx',
     storageBucket: 'the-codex-xxxxx.appspot.com',
     messagingSenderId: '...',
     appId: '...',
   };
   ========================================================================== */

window.CODEX_FIREBASE_CONFIG = null;
