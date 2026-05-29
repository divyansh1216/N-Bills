'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { signIn, signInWithGoogle, sendOtp, verifyOtp } from '@/firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { ConfirmationResult } from 'firebase/auth'

type Tab = 'email' | 'phone'
type PhoneStep = 'number' | 'otp'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [shopName, setShopName] = useState('My Shop')
  const [tab, setTab] = useState<Tab>('email')

  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Phone state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('number')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const recaptchaContainerId = 'recaptcha-container'

  useEffect(() => {
    getDoc(doc(db, 'settings', 'shop'))
      .then(snap => { if (snap.exists()) setShopName((snap.data() as any).name || 'My Shop') })
      .catch(() => {})
  }, [])

  function setSession() {
    document.cookie = 'nb-session=1; path=/; max-age=86400'
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setEmailLoading(true)
    try {
      await signIn(email, password)
      setSession()
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      setSession()
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Google sign in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = phone.trim()
    if (!trimmed) return
    // Ensure E.164 format — prepend +91 if user omits country code
    const formatted = trimmed.startsWith('+') ? trimmed : `+91${trimmed}`
    setPhoneLoading(true)
    try {
      const result = await sendOtp(formatted, recaptchaContainerId)
      setConfirmationResult(result)
      setPhoneStep('otp')
      toast.success('OTP sent successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP')
    } finally {
      setPhoneLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmationResult || !otp.trim()) return
    setPhoneLoading(true)
    try {
      await verifyOtp(confirmationResult, otp.trim())
      setSession()
      router.replace(redirect)
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  function resetPhone() {
    setPhone('')
    setOtp('')
    setPhoneStep('number')
    setConfirmationResult(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Invisible reCAPTCHA mount point */}
      <div id={recaptchaContainerId} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-[0.15em] text-foreground mb-2 uppercase">{shopName}</h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Boutique Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 luxury-shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue</p>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'email'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail size={14} />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setTab('phone'); resetPhone() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'phone'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Phone size={14} />
              Phone
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'email' ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={emailLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {emailLoading && <Loader2 size={16} className="animate-spin" />}
                    Sign in
                  </motion.button>
                </form>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted-foreground text-xs">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <motion.button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-background border border-border rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence mode="wait">
                  {phoneStep === 'number' ? (
                    <motion.form
                      key="phone-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onSubmit={handleSendOtp}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Phone number</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-xl text-sm text-muted-foreground">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="98765 43210"
                            maxLength={10}
                            required
                            className="flex-1 px-4 py-3 bg-background border border-border rounded-r-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your 10-digit mobile number. An OTP will be sent via SMS.
                        </p>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={phoneLoading || phone.length < 10}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {phoneLoading && <Loader2 size={16} className="animate-spin" />}
                        Send OTP
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="otp-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onSubmit={handleVerifyOtp}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Enter OTP</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="• • • • • •"
                          maxLength={6}
                          required
                          autoFocus
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        />
                        <p className="text-xs text-muted-foreground">
                          OTP sent to +91 {phone}
                        </p>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={phoneLoading || otp.length < 6}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {phoneLoading && <Loader2 size={16} className="animate-spin" />}
                        Verify &amp; Sign in
                      </motion.button>

                      <button
                        type="button"
                        onClick={resetPhone}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Change phone number
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
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
