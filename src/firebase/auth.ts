import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './config'

const USERS_COL = 'app_users'

export interface AppUser {
  name: string
  phone: string
  pin: string // stored as plain string; this is a personal boutique app with no sensitive PII
}

// Look up a user by phone number
async function findUserByPhone(phone: string): Promise<{ id: string; data: AppUser } | null> {
  const q = query(collection(db, USERS_COL), where('phone', '==', phone))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, data: d.data() as AppUser }
}

export async function signUpWithPin(name: string, phone: string, pin: string): Promise<AppUser> {
  const existing = await findUserByPhone(phone)
  if (existing) throw new Error('An account with this phone number already exists.')
  const ref = doc(collection(db, USERS_COL))
  const user: AppUser = { name: name.trim(), phone, pin }
  await setDoc(ref, user)
  return user
}

export async function signInWithPin(phone: string, pin: string): Promise<AppUser> {
  const result = await findUserByPhone(phone)
  if (!result) throw new Error('No account found with this phone number.')
  if (result.data.pin !== pin) throw new Error('Incorrect PIN. Please try again.')
  return result.data
}

// Login using only PIN — fetches the first (and only) user and matches the PIN
export async function signInWithPinOnly(pin: string): Promise<AppUser> {
  const snap = await getDocs(collection(db, USERS_COL))
  if (snap.empty) throw new Error('No account found. Please create an account first.')
  const user = snap.docs[0].data() as AppUser
  if (user.pin !== pin) throw new Error('Incorrect PIN. Please try again.')
  return user
}

export async function resetPin(phone: string, newPin: string): Promise<AppUser> {
  const result = await findUserByPhone(phone)
  if (!result) throw new Error('No account found with this phone number.')
  await updateDoc(doc(db, USERS_COL, result.id), { pin: newPin })
  return { ...result.data, pin: newPin }
}

export async function getUserByPhone(phone: string): Promise<AppUser | null> {
  const result = await findUserByPhone(phone)
  return result ? result.data : null
}
