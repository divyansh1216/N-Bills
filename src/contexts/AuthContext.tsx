'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface AppUser {
  name: string
  phone: string
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  setUser: (user: AppUser | null) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function loadUser() {
      const stored = sessionStorage.getItem('nb-user')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    loadUser()
    window.addEventListener('storage', loadUser)
    return () => window.removeEventListener('storage', loadUser)
  }, [])

  function signOut() {
    sessionStorage.removeItem('nb-user')
    document.cookie = 'nb-session=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
