'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, Edit2, Check, X, Loader2,
  Phone, Mail, MapPin, ExternalLink, ChevronDown, Ruler,
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { updateCustomer, updateInvoice } from '@/firebase/firestore'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import Header from '@/components/layout/Header'
import MeasurementTab from '@/components/measurements/MeasurementTab'
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, toDate } from '@/lib/formatters'
import { STATUS_COLORS, TIER_COLORS, TIER_LABELS } from '@/lib/constants'
import { generateInvoicePDF } from '@/lib/pdf-utils'
import { toast } from 'sonner'
import type { Customer, Invoice, PaymentStatus } from '@/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const STATUS_OPTIONS: PaymentStatus[] = ['paid', 'pending', 'partial', 'overdue']
type Tab = 'orders' | 'measurements'

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress } = useShopSettings()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('orders')

  useEffect(() => {
    async function load() {
      try {
        const custSnap = await getDoc(doc(db, 'customers', id))
        if (custSnap.exists()) {
          const c = { id: custSnap.id, ...custSnap.data() } as Customer
          setCustomer(c)
          setEditForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' })
        }
      } catch (err) {
        console.error('Failed to load customer:', err)
      }

      try {
        const q = query(
          collection(db, 'invoices'),
          where('customerId', '==', id),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)))
      } catch {
        try {
          const q2 = query(collection(db, 'invoices'), where('customerId', '==', id))
          const snap2 = await getDocs(q2)
          const sorted = snap2.docs
            .map(d => ({ id: d.id, ...d.data() } as Invoice))
            .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
          setInvoices(sorted)
        } catch (err2) {
          console.error('Failed to load invoices:', err2)
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  function cancelEdit() {
    if (!customer) return
    setEditForm({ name: customer.name, phone: customer.phone, email: customer.email || '', address: customer.address || '' })
    setEditMode(false)
  }

  async function handleSaveCustomer() {
    if (!customer) return
    setSaving(true)
    try {
      const updates = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
      }
      await updateCustomer(customer.id, updates)
      setCustomer(prev => prev ? { ...prev, ...updates } : prev)
      toast.success('Customer updated')
      setEditMode(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(invoiceId: string, newStatus: PaymentStatus) {
    try {
      await updateInvoice(invoiceId, { status: newStatus })
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv))
      toast.success(`Marked as ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
    setStatusDropdown(null)
  }

  if (!loading && !customer) {
    return (
      <div>
        <Header title="Customer" />
        <div className="p-6 text-center text-muted-foreground">Customer not found.</div>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <div onClick={() => setStatusDropdown(null)}>
      <Header title={loading ? 'Customer' : customer?.name || 'Customer'} />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to customers
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Profile card */}
          <div className="lg:col-span-1">
            {loading ? (
              <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow space-y-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ) : customer && (
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow space-y-5">

                  {/* Avatar + name row */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-base font-bold text-foreground shrink-0">
                      {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editMode ? (
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Full Name"
                          className={inputClass}
                        />
                      ) : (
                        <h2 className="text-base font-semibold text-foreground truncate">{customer.name}</h2>
                      )}
                      <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md mt-1.5 inline-block', TIER_COLORS[customer.tier])}>
                        {TIER_LABELS[customer.tier]}
                      </span>
                    </div>
                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors shrink-0"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Contact fields */}
                  <div className="space-y-3">
                    {editMode ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Phone *</label>
                          <input
                            value={editForm.phone}
                            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="optional"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                          <input
                            value={editForm.address}
                            onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                            placeholder="optional"
                            className={inputClass}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone size={13} className="shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail size={13} className="shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin size={13} className="shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Save / cancel */}
                  {editMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                      >
                        <X size={13} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCustomer}
                        disabled={saving}
                        className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Save
                      </button>
                    </div>
                  )}

                  <div className="h-px bg-border" />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Total Spent</p>
                      <p className="text-base font-bold text-foreground">{formatCurrency(customer.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Total Orders</p>
                      <p className="text-base font-bold text-foreground">{customer.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Last Visit</p>
                      <p className="text-sm font-medium text-foreground">{formatDate(customer.lastVisit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                      <p className="text-sm font-medium text-foreground">{formatDate(customer.joinedAt)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right panel: tabs */}
          <div className="lg:col-span-2">

            {/* Tab nav */}
            <div className="flex gap-1 bg-muted/60 border border-border rounded-2xl p-1 mb-4">
              <button
                onClick={() => setActiveTab('orders')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all',
                  activeTab === 'orders'
                    ? 'bg-card text-foreground luxury-shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Purchase History
                {!loading && invoices.length > 0 && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-md', activeTab === 'orders' ? 'bg-muted text-muted-foreground' : 'bg-muted/80 text-muted-foreground')}>
                    {invoices.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('measurements')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all',
                  activeTab === 'measurements'
                    ? 'bg-card text-foreground luxury-shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Ruler size={14} />
                Measurements
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'orders' ? (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
                    <div className="p-5 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Purchase History</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {loading ? 'Loading...' : `${invoices.length} order${invoices.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {!loading && invoices.length > 0 && (
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(invoices.reduce((s, inv) => s + inv.total, 0))}
                        </p>
                      )}
                    </div>

                    <div>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 sm:px-4 py-3">Invoice</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Date</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-3 sm:px-4 py-3">Amount</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-2 sm:px-4 py-3">Status</th>
                            <th className="px-2 sm:px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {loading
                            ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                            : invoices.map((inv, i) => (
                              <motion.tr
                                key={inv.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.04 }}
                                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-mono font-medium text-foreground">{inv.invoiceNumber}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                                  {inv.createdAt ? formatDate(toDate(inv.createdAt).toISOString()) : '—'}
                                </td>
                                <td className="px-3 sm:px-4 py-3 text-right text-sm font-semibold text-foreground whitespace-nowrap">
                                  {formatCurrency(inv.total)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => setStatusDropdown(prev => prev === inv.id ? null : inv.id)}
                                      className={cn(
                                        'text-xs font-medium border px-2 py-0.5 rounded-md capitalize flex items-center gap-1 hover:opacity-80 transition-opacity',
                                        STATUS_COLORS[inv.status]
                                      )}
                                    >
                                      {inv.status}
                                      <ChevronDown size={10} />
                                    </button>
                                    <AnimatePresence>
                                      {statusDropdown === inv.id && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                          transition={{ duration: 0.15 }}
                                          className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-xl luxury-shadow-lg overflow-hidden min-w-[110px]"
                                        >
                                          {STATUS_OPTIONS.map(s => (
                                            <button
                                              key={s}
                                              onClick={() => handleStatusChange(inv.id, s)}
                                              className={cn(
                                                'w-full text-left px-3 py-2 text-xs font-medium capitalize hover:bg-muted transition-colors',
                                                inv.status === s ? 'bg-muted text-foreground' : 'text-muted-foreground'
                                              )}
                                            >
                                              {s}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1 justify-end">
                                    <button
                                      onClick={() => generateInvoicePDF(inv, { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress })}
                                      title="Download PDF"
                                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                      <Download size={13} />
                                    </button>
                                    <Link
                                      href={`/billing/${inv.id}`}
                                      title="View full invoice"
                                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                      <ExternalLink size={13} />
                                    </Link>
                                  </div>
                                </td>
                              </motion.tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>

                    {!loading && invoices.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm">No orders yet</div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="measurements"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {customer && (
                    <MeasurementTab
                      customerId={customer.id}
                      customerName={customer.name}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
