'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { signInWithPinOnly, signUpWithPin, resetPin, getUserByPhone } from '@/firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

type Mode = 'login' | 'signup' | 'forgot'
// forgot flow: 'phone' → verify phone exists → 'new-pin'
type ForgotStep = 'phone' | 'new-pin'

function PhoneField({
  label = 'Phone number', value, onChange,
}: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex">
        <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-xl text-sm text-muted-foreground">
          +91
        </span>
        <input
          type="tel"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="98765 43210"
          maxLength={10}
          required
          className="flex-1 px-4 py-3 bg-background border border-border rounded-r-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
    </div>
  )
}

function PinField({
  value, onChange, show, onToggle, label, placeholder = '••••',
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  label: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          maxLength={8}
          required
          className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all tracking-widest font-mono"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const { setUser } = useAuth()

  const [shopName, setShopName] = useState('My Shop')
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)

  // Shared fields
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)

  // Signup extra
  const [name, setName] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  // Forgot flow
  const [forgotStep, setForgotStep] = useState<ForgotStep>('phone')
  const [forgotName, setForgotName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [showNewPin, setShowNewPin] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'shop'))
      .then(snap => { if (snap.exists()) setShopName((snap.data() as any).name || 'My Shop') })
      .catch(() => {})
  }, [])

  function setSession(user: { name: string; phone: string }) {
    document.cookie = 'nb-session=1; path=/; max-age=86400'
    sessionStorage.setItem('nb-user', JSON.stringify(user))
  }

  function resetMode(m: Mode) {
    setMode(m)
    setPhone('')
    setPin('')
    setName('')
    setConfirmPin('')
    setForgotStep('phone')
    setForgotName('')
    setNewPin('')
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) return
    setLoading(true)
    try {
      const user = await signInWithPinOnly(pin)
      setSession(user)
      setUser(user)
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Sign up ────────────────────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone || !pin) return
    if (pin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }
    setLoading(true)
    try {
      const user = await signUpWithPin(name.trim(), phone, pin)
      setSession(user)
      setUser(user)
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot PIN — step 1: verify phone ──────────────────────────────────────
  async function handleForgotPhone(e: React.FormEvent) {
    e.preventDefault()
    if (!phone) return
    setLoading(true)
    try {
      const user = await getUserByPhone(phone)
      if (!user) {
        toast.error('No account found with this phone number.')
        return
      }
      setForgotName(user.name)
      setForgotStep('new-pin')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot PIN — step 2: set new PIN ──────────────────────────────────────
  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault()
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 digits')
      return
    }
    setLoading(true)
    try {
      const user = await resetPin(phone, newPin)
      toast.success('PIN updated! Signing you in…')
      setSession(user)
      setUser(user)
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-[0.15em] text-foreground mb-2 uppercase">{shopName}</h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">Boutique Management</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 luxury-shadow-lg">
          <AnimatePresence mode="wait">

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
                <p className="text-muted-foreground text-sm mb-6">Enter your PIN to sign in</p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <PinField
                    label="Secret PIN"
                    value={pin}
                    onChange={setPin}
                    show={showPin}
                    onToggle={() => setShowPin(v => !v)}
                  />

                  <motion.button
                    type="submit"
                    disabled={loading || pin.length < 4}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Sign in
                  </motion.button>
                </form>

                <div className="flex justify-between mt-6 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => resetMode('forgot')}
                    className="hover:text-foreground transition-colors"
                  >
                    Forgot PIN?
                  </button>
                  {/* <button
                    type="button"
                    onClick={() => resetMode('signup')}
                    className="hover:text-foreground transition-colors"
                  >
                    Create account
                  </button> */}
                </div>
              </motion.div>
            )}

            {/* ── SIGN UP ── */}
            {mode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-foreground mb-1">Create account</h2>
                <p className="text-muted-foreground text-sm mb-6">Enter your details to get started</p>

                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Your name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>

                  <PhoneField label="Phone number" value={phone} onChange={setPhone} />

                  <PinField
                    label="Set a secret PIN"
                    value={pin}
                    onChange={setPin}
                    show={showPin}
                    onToggle={() => setShowPin(v => !v)}
                    placeholder="4–8 digits"
                  />

                  <PinField
                    label="Confirm PIN"
                    value={confirmPin}
                    onChange={setConfirmPin}
                    show={showConfirmPin}
                    onToggle={() => setShowConfirmPin(v => !v)}
                    placeholder="repeat PIN"
                  />

                  {/* <motion.button
                    type="submit"
                    disabled={loading || !name.trim() || phone.length < 10 || pin.length < 4}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Create account
                  </motion.button> */}
                </form>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => resetMode('login')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── FORGOT PIN ── */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence mode="wait">
                  {forgotStep === 'phone' ? (
                    <motion.div
                      key="forgot-phone"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <h2 className="text-xl font-semibold text-foreground mb-1">Reset PIN</h2>
                      <p className="text-muted-foreground text-sm mb-6">Enter your phone number to continue</p>

                      <form onSubmit={handleForgotPhone} className="space-y-5">
                        <PhoneField label="Registered phone number" value={phone} onChange={setPhone} />

                        <motion.button
                          type="submit"
                          disabled={loading || phone.length < 10}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {loading && <Loader2 size={16} className="animate-spin" />}
                          Continue
                        </motion.button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="forgot-newpin"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <h2 className="text-xl font-semibold text-foreground mb-1">Set new PIN</h2>
                      <p className="text-muted-foreground text-sm mb-6">
                        Hi <span className="text-foreground font-medium">{forgotName}</span>, choose a new PIN
                      </p>

                      <form onSubmit={handleResetPin} className="space-y-5">
                        <PinField
                          label="New PIN"
                          value={newPin}
                          onChange={setNewPin}
                          show={showNewPin}
                          onToggle={() => setShowNewPin(v => !v)}
                          placeholder="4–8 digits"
                        />

                        <motion.button
                          type="submit"
                          disabled={loading || newPin.length < 4}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {loading && <Loader2 size={16} className="animate-spin" />}
                          Save PIN &amp; Sign in
                        </motion.button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => resetMode('login')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} {shopName}. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}
