/**
 * Firestore Backup Script
 *
 * Exports every collection, document, and nested subcollection from Firestore
 * into a single timestamped JSON file under ./backups/
 *
 * Usage:
 *   node backup.js
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
};

// ─── Type serialisation ───────────────────────────────────────────────────────

/**
 * Recursively converts Firestore field values into a plain JSON-safe structure.
 * Special types are wrapped with a __type tag so restore.js can reconstruct them.
 */
function serialiseValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Firestore Timestamp → { __type: 'timestamp', seconds, nanoseconds }
  if (value instanceof admin.firestore.Timestamp) {
    return {
      __type: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }

  // Firestore GeoPoint → { __type: 'geopoint', latitude, longitude }
  if (value instanceof admin.firestore.GeoPoint) {
    return {
      __type: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  // Firestore DocumentReference → { __type: 'reference', path }
  if (value instanceof admin.firestore.DocumentReference) {
    return {
      __type: 'reference',
      path: value.path,
    };
  }

  // Array — recurse into each element
  if (Array.isArray(value)) {
    return value.map(serialiseValue);
  }

  // Plain object (map) — recurse into each field
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serialiseValue(v);
    }
    return out;
  }

  // Primitives (string, number, boolean) pass through unchanged
  return value;
}

// ─── Core export logic ────────────────────────────────────────────────────────

/**
 * Exports all documents inside a collection reference.
 * Returns an object keyed by document ID, each containing:
 *   { data: {...}, subcollections: {...} }
 */
async function exportCollection(collectionRef, depth = 0) {
  const indent = '  '.repeat(depth);
  const result = {};

  let snapshot;
  try {
    snapshot = await collectionRef.get();
  } catch (err) {
    console.error(`${indent}[ERROR] Failed to read collection ${collectionRef.path}: ${err.message}`);
    return result;
  }

  console.log(`${indent}  → ${snapshot.size} document(s)`);
  stats.documents += snapshot.size;

  for (const docSnap of snapshot.docs) {
    const docId = docSnap.id;
    const rawData = docSnap.data();

    // Serialise all field values to JSON-safe representations
    const data = serialiseValue(rawData);

    // Recurse into subcollections
    const subcollections = await exportSubcollections(docSnap.ref, depth + 1);

    result[docId] = { data, subcollections };
  }

  return result;
}

/**
 * Fetches all subcollections of a document and recursively exports them.
 */
async function exportSubcollections(docRef, depth) {
  const indent = '  '.repeat(depth);
  const result = {};

  let subCollectionRefs;
  try {
    subCollectionRefs = await docRef.listCollections();
  } catch (err) {
    console.error(`${indent}[ERROR] Failed to list subcollections for ${docRef.path}: ${err.message}`);
    return result;
  }

  for (const subColRef of subCollectionRefs) {
    stats.subcollections++;
    console.log(`${indent}  [subcollection] ${subColRef.id}`);
    result[subColRef.id] = await exportCollection(subColRef, depth);
  }

  return result;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function runBackup() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       Firestore Backup — N-Bills         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Fetch all root-level collections
  let rootCollections;
  try {
    rootCollections = await db.listCollections();
  } catch (err) {
    console.error(`[ERROR] Cannot connect to Firestore: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${rootCollections.length} root collection(s).\n`);
  stats.collections += rootCollections.length;

  const backup = {};

  for (const colRef of rootCollections) {
    console.log(`[collection] ${colRef.id}`);
    backup[colRef.id] = await exportCollection(colRef, 0);
  }

  // Build output path with timestamp
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('-');

  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const outputPath = path.join(backupsDir, `firestore-backup-${timestamp}.json`);

  try {
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');
  } catch (err) {
    console.error(`[ERROR] Failed to write backup file: ${err.message}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              Backup Complete             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Collections   : ${stats.collections}`);
  console.log(`  Documents     : ${stats.documents}`);
  console.log(`  Subcollections: ${stats.subcollections}`);
  console.log(`  Time elapsed  : ${elapsed}s`);
  console.log(`  Output file   : ${outputPath}\n`);
}

runBackup().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
