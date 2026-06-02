# Firestore Backup & Restore

Standalone Node.js scripts for backing up and restoring the N-Bills Firestore database.

## Setup

```
scripts/
├── backup.js
├── restore.js
├── package.json
├── serviceAccountKey.json   ← you add this (never commit it)
└── backups/                 ← created automatically
```

### 1. Get your service account key

1. Open [Firebase Console](https://console.firebase.google.com) → your project
2. Go to **Project Settings → Service accounts**
3. Click **Generate new private key** → download the JSON file
4. Rename it to `serviceAccountKey.json` and place it in this `scripts/` folder

### 2. Install dependencies

```bash
cd scripts
npm install
```

---

## Backup

Exports every collection, document, and nested subcollection to a timestamped JSON file.

```bash
node backup.js
```

Output is saved to:

```
backups/firestore-backup-YYYY-MM-DD-HH-mm-ss.json
```

---

## Restore

Reads a backup file and recreates all data in Firestore.  
Original document IDs and all Firestore types (Timestamp, GeoPoint, etc.) are preserved.

**Restore the most recent backup automatically:**
```bash
node restore.js
```

**Restore a specific backup file:**
```bash
node restore.js backups/firestore-backup-2024-01-15-10-30-00.json
```

> **Note:** Restore *overwrites* documents with matching IDs.  
> Documents in Firestore that are not in the backup are left untouched.

---

## Backup file format

```json
{
  "customers": {
    "abc123": {
      "data": {
        "name": "Priya Sharma",
        "createdAt": { "__type": "timestamp", "seconds": 1700000000, "nanoseconds": 0 }
      },
      "subcollections": {}
    }
  },
  "invoices": {
    "inv001": {
      "data": { "total": 4500 },
      "subcollections": {
        "items": {
          "item1": {
            "data": { "name": "Lehenga", "amount": 4500 },
            "subcollections": {}
          }
        }
      }
    }
  }
}
```

### Special type tags

| Firestore type | JSON representation |
|---|---|
| `Timestamp` | `{ "__type": "timestamp", "seconds": N, "nanoseconds": N }` |
| `GeoPoint` | `{ "__type": "geopoint", "latitude": N, "longitude": N }` |
| `DocumentReference` | `{ "__type": "reference", "path": "collection/docId" }` |
| Arrays, maps, booleans, numbers, null | Stored as-is |

---

## npm shortcuts

```bash
npm run backup    # same as: node backup.js
npm run restore   # same as: node restore.js
```
