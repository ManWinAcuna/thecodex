# Firestore rule needed for cloud sync

The Codex reuses the numerology-app's existing Firebase project
(`advanced-numerology-d3f0f`) but syncs with **no login** - every device
that opens the site reads/writes the same fixed spot automatically, by the
owner's own choice (zero friction over per-account access control).

That means the security rule can't check `request.auth` the way the
numerology-app's own rules do. To keep the blast radius contained, Codex's
data lives in its own top-level collection (`codexData`), completely
separate from that app's `users/{uid}` data - this rule only opens
`codexData`, nothing else.

## How to apply

1. Firebase console -> project **advanced-numerology-d3f0f** -> **Firestore
   Database** -> **Rules** tab.
2. Add this block **inside** the existing `match /databases/{database}/documents { ... }`,
   alongside the `users/{userId}` block already there - as a SIBLING of it,
   both nested one level in, both closed BEFORE that outer block's own
   closing brace. Getting this nesting wrong is the single most common
   mistake here (pasting it after the last `}` puts it outside the whole
   `service` block and the editor rejects it with "Unexpected 'match'").

```
    match /codexData/{document=**} {
      allow read, write: if true;
    }
```

   If in doubt, replace the WHOLE editor contents with this (adjust if you
   also have a `publicConfig` block from Code13 - keep that one too):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && request.auth.token.email == 'horseyear2026manuel@gmail.com';
    }
    match /codexData/{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. **Publish**.

Until this is applied, every sync attempt fails silently and the site just
keeps running on localStorage only (exactly like today) - nothing breaks,
cloud sync just doesn't turn on yet.
