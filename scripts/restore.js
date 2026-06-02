/**
 * Firestore Restore Script
 *
 * Reads a backup JSON file produced by backup.js and recreates every
 * collection, document, and nested subcollection in Firestore.
 * Original document IDs and all Firestore data types are preserved.
 *
 * Usage:
 *   node restore.js                                     # prompts for latest backup
 *   node restore.js backups/firestore-backup-2024-01-15-10-30-00.json
 *
 * WARNING: This OVERWRITES existing documents with the same ID.
 *          It does NOT delete documents that exist in Firestore but not in the backup.
 *
 * Prerequisites:
 *   - Place your Firebase service account key at ./serviceAccountKey.json
 *   - Run: npm install
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Initialise Firebase Admin ────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    '\n[ERROR] serviceAccountKey.json not found.\n' +
    '        Download it from Firebase Console → Project Settings → Service accounts\n' +
    '        and place it at: scripts/serviceAccountKey.json\n'
  );
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── Counters ─────────────────────────────────────────────────────────────────

const stats = {
  collections: 0,
  documents: 0,
  subcollections: 0,
  errors: 0,
};

// ─── Batch write helpers ──────────────────────────────────────────────────────

// Firestore limits a single batch to 500 operations
const BATCH_SIZE = 400;

/**
 * A simple queue that accumulates set() operations and auto-commits
 * whenever the batch reaches BATCH_SIZE, then starts a fresh batch.
 */
class BatchQueue {
  constructor() {
    this._batch = db.batch();
    this._count = 0;
    this._totalCommits = 0;
  }

  set(docRef, data) {
    this._batch.set(docRef, data, { merge: false });
    this._count++;
    if (this._count >= BATCH_SIZE) {
      return this._flush();
    }
    return Promise.resolve();
  }

  async _flush() {
    if (this._count === 0) return;
    await this._batch.commit();
    this._totalCommits++;
    process.stdout.write(` [batch ${this._totalCommits} committed — ${this._count} docs]`);
    this._batch = db.batch();
    this._count = 0;
  }

  async commit() {
    await this._flush();
  }
}

// ─── Type deserialisation ─────────────────────────────────────────────────────

/**
 * Recursively converts the tagged JSON values from backup.js back into
 * native Firestore Admin SDK types.
 */
function deserialiseValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Detect our tagged special types
  if (typeof value === 'object' && !Array.isArray(value) && value.__type) {
    switch (value.__type) {
      case 'timestamp':
        return new admin.firestore.Timestamp(value.seconds, value.nanoseconds);

      case 'geopoint':
        return new admin.firestore.GeoPoint(value.latitude, value.longitude);

      case 'reference':
        return db.doc(value.path);

      default:
        // Unknown tag — fall through to object handling
        break;
    }
  }

  // Array — recurse into each element
  if (Array.isArray(value)) {
    return value.map(deserialiseValue);
  }

  // Plain object (map) — recurse into each field
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deserialiseValue(v);
    }
    return out;
  }

  // Primitives pass through unchanged
  return value;
}

// ─── Core restore logic ───────────────────────────────────────────────────────

/**
 * Restores all documents in a collection from the backup object.
 * collectionRef  — Firestore CollectionReference to write into
 * collectionData — { docId: { data: {...}, subcollections: {...} }, ... }
 * queue          — shared BatchQueue instance
 * depth          — current nesting level (for logging indentation)
 */
async function restoreCollection(collectionRef, collectionData, queue, depth = 0) {
  const indent = '  '.repeat(depth);

  for (const [docId, docEntry] of Object.entries(collectionData)) {
    const docRef = collectionRef.doc(docId);

    // Deserialise field values back to Firestore types
    let deserialisedData;
    try {
      deserialisedData = deserialiseValue(docEntry.data);
    } catch (err) {
      console.error(`\n${indent}  [ERROR] Failed to deserialise doc ${docRef.path}: ${err.message}`);
      stats.errors++;
      continue;
    }

    // Queue the write — batch commits automatically when full
    try {
      await queue.set(docRef, deserialisedData);
      stats.documents++;
    } catch (err) {
      console.error(`\n${indent}  [ERROR] Failed to queue doc ${docRef.path}: ${err.message}`);
      stats.errors++;
      continue;
    }

    // Recurse into subcollections
    if (docEntry.subcollections && Object.keys(docEntry.subcollections).length > 0) {
      for (const [subColId, subColData] of Object.entries(docEntry.subcollections)) {
        stats.subcollections++;
        console.log(`\n${indent}    [subcollection] ${subColId} (${Object.keys(subColData).length} doc(s))`);
        const subColRef = docRef.collection(subColId);
        await restoreCollection(subColRef, subColData, queue, depth + 2);
      }
    }
  }
}

// ─── Resolve backup file path ─────────────────────────────────────────────────

function resolveBackupFile() {
  // If a path was passed on the command line, use it directly
  const cliArg = process.argv[2];
  if (cliArg) {
    const resolved = path.resolve(cliArg);
    if (!fs.existsSync(resolved)) {
      console.error(`[ERROR] Backup file not found: ${resolved}`);
      process.exit(1);
    }
    return resolved;
  }

  // Otherwise pick the most recent file in ./backups/
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    console.error('[ERROR] No backups/ directory found. Run backup.js first.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(backupsDir)
    .filter(f => f.startsWith('firestore-backup-') && f.endsWith('.json'))
    .sort()
    .reverse(); // most recent first (lexicographic sort works for YYYY-MM-DD-HH-mm-ss)

  if (files.length === 0) {
    console.error('[ERROR] No backup files found in backups/. Run backup.js first.');
    process.exit(1);
  }

  return path.join(backupsDir, files[0]);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function runRestore() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       Firestore Restore — N-Bills        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const backupFile = resolveBackupFile();
  console.log(`Reading backup: ${backupFile}\n`);

  let backup;
  try {
    const raw = fs.readFileSync(backupFile, 'utf8');
    backup = JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] Failed to read/parse backup file: ${err.message}`);
    process.exit(1);
  }

  const rootCollections = Object.keys(backup);
  console.log(`Found ${rootCollections.length} root collection(s) in backup.\n`);

  // Warn the operator before touching the database
  console.log('⚠️  This will OVERWRITE existing documents with matching IDs.');
  console.log('   Documents in Firestore that are NOT in the backup are left untouched.\n');

  const startTime = Date.now();
  const queue = new BatchQueue();

  for (const colId of rootCollections) {
    stats.collections++;
    const colData = backup[colId];
    const docCount = Object.keys(colData).length;
    process.stdout.write(`[collection] ${colId} (${docCount} doc(s))`);

    const colRef = db.collection(colId);
    await restoreCollection(colRef, colData, queue, 0);

    process.stdout.write('\n');
  }

  // Commit any remaining buffered writes
  await queue.commit();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║             Restore Complete             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Collections   : ${stats.collections}`);
  console.log(`  Documents     : ${stats.documents}`);
  console.log(`  Subcollections: ${stats.subcollections}`);
  console.log(`  Errors        : ${stats.errors}`);
  console.log(`  Time elapsed  : ${elapsed}s\n`);

  if (stats.errors > 0) {
    console.log(`⚠️  ${stats.errors} error(s) occurred. Check the logs above.\n`);
    process.exit(1);
  }
}

runRestore().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
