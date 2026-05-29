import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)

// Enable offline persistence so bills/data work without internet
// Only runs client-side; silently ignored if already enabled or unsupported
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch(err => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — persistence only works in one tab at a time
      console.warn('Firestore offline persistence unavailable: multiple tabs open')
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn('Firestore offline persistence not supported in this browser')
    }
  })
}

export default app
