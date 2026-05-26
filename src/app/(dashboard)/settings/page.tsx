'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Save, Store, Shirt } from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { name, tagline, phone, address, rentalEnabled, loading, save } = useShopSettings()
  const [form, setForm] = useState({ name: '', tagline: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [togglingRental, setTogglingRental] = useState(false)

  useEffect(() => {
    if (!loading) {
      setForm({ name, tagline, phone: phone || '', address: address || '' })
    }
  }, [loading, name, tagline, phone, address])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Shop name is required'); return }
    setSaving(true)
    try {
      await save({
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleRentalToggle() {
    setTogglingRental(true)
    try {
      await save({ rentalEnabled: !rentalEnabled })
      toast.success(rentalEnabled ? 'Rental features disabled' : 'Rental features enabled')
    } catch {
      toast.error('Failed to update setting')
    } finally {
      setTogglingRental(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <div>
      <Header title="Settings" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

        {/* Shop Details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-card border border-border rounded-2xl luxury-shadow overflow-hidden"
        >
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Store size={16} className="text-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Shop Details</h2>
              <p className="text-xs text-muted-foreground">Shown on invoices, PDFs, and throughout the app</p>
            </div>
          </div>

          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Riya Boutique"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">Appears as the header on all invoices and PDFs</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tagline</label>
                <input
                  value={form.tagline}
                  onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder="e.g. Stitching & Rental Management"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Mumbai, Maharashtra"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Preview */}
              {form.name && (
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Invoice Preview</p>
                  <p className="text-base font-bold tracking-[0.1em] text-foreground">{form.name}</p>
                  {form.tagline && <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-widest">{form.tagline}</p>}
                  {form.phone && <p className="text-xs text-muted-foreground mt-1">{form.phone}</p>}
                  {form.address && <p className="text-xs text-muted-foreground">{form.address}</p>}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Settings
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="bg-card border border-border rounded-2xl luxury-shadow overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Features</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enable or disable modules for your business</p>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Shirt size={16} className="text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Rental Outfits</p>
                    <p className="text-xs text-muted-foreground">
                      {rentalEnabled
                        ? 'Rentals section, rental invoices, and rental fields are visible'
                        : 'All rental features are hidden across the app'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRentalToggle}
                  disabled={togglingRental}
                  className="shrink-0 ml-4"
                >
                  {togglingRental ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : (
                    <div className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      rentalEnabled ? 'bg-foreground' : 'bg-muted border border-border'
                    )}>
                      <div className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                        rentalEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      )} />
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
