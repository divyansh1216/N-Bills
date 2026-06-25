'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export interface ShopSettings {
  name: string
  tagline: string
  phone?: string
  address?: string
  rentalEnabled: boolean
  notificationEnabled: boolean
}

const DEFAULTS: ShopSettings = {
  name: 'My Shop',
  tagline: 'Stitching & Rental Management',
  rentalEnabled: true,
  notificationEnabled: false,
}

interface ShopCtx extends ShopSettings {
  loading: boolean
  save: (updates: Partial<ShopSettings>) => Promise<void>
}

const ShopSettingsContext = createContext<ShopCtx>({
  ...DEFAULTS,
  loading: true,
  save: async () => {},
})

export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'shop'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Partial<ShopSettings>
          setSettings(prev => ({
            ...prev,
            ...data,
            rentalEnabled: data.rentalEnabled ?? true,
            notificationEnabled: data.notificationEnabled ?? false,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(updates: Partial<ShopSettings>) {
    await setDoc(doc(db, 'settings', 'shop'), updates, { merge: true })
    setSettings(prev => ({ ...prev, ...updates }))
  }

  return (
    <ShopSettingsContext.Provider value={{ ...settings, loading, save }}>
      {children}
    </ShopSettingsContext.Provider>
  )
}

export function useShopSettings() {
  return useContext(ShopSettingsContext)
}
