import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type User,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

export async function signOut() {
  return firebaseSignOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// Phone auth — keep verifier instance across calls so we don't re-render reCAPTCHA
let recaptchaVerifier: RecaptchaVerifier | null = null

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
  return recaptchaVerifier
}

export async function sendOtp(phoneNumber: string, containerId: string): Promise<ConfirmationResult> {
  const verifier = setupRecaptcha(containerId)
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

export async function verifyOtp(confirmationResult: ConfirmationResult, otp: string) {
  return confirmationResult.confirm(otp)
}
