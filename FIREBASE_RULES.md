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
   alongside the `users/{userId}` and `publicConfig` blocks already there -
   don't replace them, just add this one too:

```
    match /codexData/{document=**} {
      allow read, write: if true;
    }
```

3. **Publish**.

Until this is applied, every sync attempt fails silently and the site just
keeps running on localStorage only (exactly like today) - nothing breaks,
cloud sync just doesn't turn on yet.
