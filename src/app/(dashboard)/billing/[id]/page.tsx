'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Download, CheckCircle, Loader2, Edit2, X, Plus, Trash2, Save } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { updateInvoice } from '@/firebase/firestore'
import Header from '@/components/layout/Header'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, toDate } from '@/lib/formatters'
import { STATUS_COLORS } from '@/lib/constants'
import { generateInvoicePDF } from '@/lib/pdf-utils'
import type { Invoice, InvoiceLineItem, InventoryItem } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useShopSettings } from '@/contexts/ShopSettingsContext'

const TAX_RATE = 0

interface LineItemRow {
  id: string
  itemId: string
  name: string
  unitPrice: number
  quantity: number
  type: 'stitching' | 'rental'
  rentalDays: number
}

function invoiceItemToRow(item: InvoiceLineItem): LineItemRow {
  return {
    id: item.id,
    itemId: item.itemId,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    type: item.type,
    rentalDays: item.rentalDays ?? 1,
  }
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const { name: shopName, tagline: shopTagline, rentalEnabled } = useShopSettings()

  // Edit state
  const { data: inventory } = useFirestoreCollection<InventoryItem>('inventory')
  const [lineItems, setLineItems] = useState<LineItemRow[]>([])
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<Invoice['paymentMethod']>('cash')
  const [status, setStatus] = useState<Invoice['status']>('paid')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'invoices', id))
      if (snap.exists()) setInvoice({ id: snap.id, ...snap.data() } as Invoice)
      setLoading(false)
    }
    load()
  }, [id])

  function enterEditMode() {
    if (!invoice) return
    setLineItems(invoice.items.map(invoiceItemToRow))
    setDiscount(invoice.discount)
    setAmountPaid(invoice.amountPaid ?? 0)
    setPaymentMethod(invoice.paymentMethod ?? 'cash')
    setStatus(invoice.status)
    setNotes(invoice.notes ?? '')
    setEditMode(true)
  }

  function exitEditMode() {
    setEditMode(false)
  }

  const subtotal = useMemo(() =>
    lineItems.reduce((sum, l) => {
      return sum + (l.type === 'rental'
        ? l.unitPrice * l.rentalDays * l.quantity
        : l.unitPrice * l.quantity)
    }, 0),
    [lineItems]
  )

  const tax = Math.round((subtotal - discount) * TAX_RATE)
  const total = subtotal - discount + tax
  const balanceDue = Math.max(0, total - amountPaid)

  // Auto-derive status from amountPaid whenever it changes
  function handleAmountPaidChange(value: number) {
    setAmountPaid(value)
    if (value <= 0) {
      setStatus(s => (s === 'partial' ? 'pending' : s))
    } else if (value >= total) {
      setStatus('paid')
    } else {
      setStatus('partial')
    }
  }

  function addLineItem() {
    setLineItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), itemId: '', name: '', unitPrice: 0, quantity: 1, type: 'stitching', rentalDays: 1 },
    ])
  }

  function removeLineItem(rowId: string) {
    if (lineItems.length === 1) return
    setLineItems(prev => prev.filter(l => l.id !== rowId))
  }

  function updateLineItem(rowId: string, field: keyof LineItemRow, value: string | number) {
    setLineItems(prev => prev.map(l => {
      if (l.id !== rowId) return l
      const updated = { ...l, [field]: value }
      if (field === 'itemId') {
        const inv = inventory.find(i => i.id === value)
        if (inv) {
          updated.name = inv.name
          updated.unitPrice = updated.type === 'rental' ? (inv.rentalPrice || inv.price) : inv.price
        }
      }
      if (field === 'type') {
        const inv = inventory.find(i => i.id === l.itemId)
        if (inv) {
          updated.unitPrice = value === 'rental' ? (inv.rentalPrice || inv.price) : inv.price
        }
      }
      return updated
    }))
  }

  async function handleSave() {
    if (lineItems.some(l => !l.name.trim())) {
      toast.error('Fill in all line items')
      return
    }
    setSaving(true)
    try {
      const invoiceItems: InvoiceLineItem[] = lineItems.map(l => {
        const base = {
          id: l.id,
          itemId: l.itemId,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.type === 'rental'
            ? l.unitPrice * l.rentalDays * l.quantity
            : l.unitPrice * l.quantity,
          type: l.type,
        }
        return l.type === 'rental' ? { ...base, rentalDays: l.rentalDays } : base
      })

      const updates: Partial<Invoice> = {
        items: invoiceItems,
        subtotal,
        discount,
        tax,
        total,
        amountPaid: amountPaid > 0 ? amountPaid : undefined,
        status,
        paymentMethod,
        notes: notes || undefined,
      }

      await updateInvoice(id, updates)
      setInvoice(prev => prev ? { ...prev, ...updates } : prev)
      toast.success('Invoice updated')
      setEditMode(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return
    setMarkingPaid(true)
    try {
      await updateInvoice(invoice.id, { status: 'paid', amountPaid: invoice.total })
      setInvoice(prev => prev ? { ...prev, status: 'paid', amountPaid: prev.total } : prev)
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setMarkingPaid(false)
    }
  }

  const dateStr = invoice?.createdAt ? formatDate(toDate(invoice.createdAt).toISOString()) : ''
  const viewBalance = invoice ? Math.max(0, invoice.total - (invoice.amountPaid ?? 0)) : 0
  const inputClass = 'px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <div>
      <Header title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />Back to billing
        </button>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-8 luxury-shadow space-y-6">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : invoice ? (
          <AnimatePresence mode="wait">
            {editMode ? (
              /* ── EDIT MODE ── */
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Left: items + notes */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Invoice meta header */}
                  <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Editing Invoice</p>
                      <p className="text-lg font-mono font-bold text-foreground mt-0.5">{invoice.invoiceNumber}</p>
                    </div>
                    <button onClick={exitEditMode} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Bill to (read-only) */}
                  <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                    <p className="text-base font-semibold text-foreground">{invoice.customerName}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                  </div>

                  {/* Line items */}
                  <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Items</h3>
                    <div className="space-y-3">
                      {lineItems.map(item => (
                        <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start">
                          <div className="w-full sm:col-span-4">
                            <select
                              value={item.itemId}
                              onChange={e => updateLineItem(item.id, 'itemId', e.target.value)}
                              className={cn(inputClass, 'w-full')}
                            >
                              <option value="">Select item</option>
                              {inventory.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 sm:contents">
                            <div className="flex-1 sm:col-span-2">
                              <select
                                value={item.type}
                                onChange={e => updateLineItem(item.id, 'type', e.target.value)}
                                className={cn(inputClass, 'w-full')}
                              >
                                <option value="stitching">Stitching</option>
                                {rentalEnabled && <option value="rental">Rental</option>}
                              </select>
                            </div>
                            <div className="flex-1 sm:col-span-2">
                              <input
                                type="number"
                                min={1}
                                value={item.type === 'rental' ? item.rentalDays : item.quantity}
                                onChange={e => updateLineItem(item.id, item.type === 'rental' ? 'rentalDays' : 'quantity', Number(e.target.value))}
                                placeholder={item.type === 'rental' ? 'Days' : 'Qty'}
                                className={cn(inputClass, 'w-full')}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 items-center sm:contents">
                            <div className="flex-1 sm:col-span-3">
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                                placeholder="Price"
                                className={cn(inputClass, 'w-full')}
                              />
                            </div>
                            <div className="sm:col-span-1 flex items-center justify-center">
                              <button
                                onClick={() => removeLineItem(item.id)}
                                disabled={lineItems.length === 1}
                                className="p-2 text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="w-full sm:col-span-12 text-right text-sm font-semibold text-foreground">
                            {formatCurrency(item.type === 'rental'
                              ? item.unitPrice * item.rentalDays * item.quantity
                              : item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addLineItem}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      <Plus size={14} />Add Item
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Notes</h3>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      className={cn(inputClass, 'w-full resize-none')}
                    />
                  </div>
                </div>

                {/* Right: summary sidebar */}
                <div>
                  <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow lg:sticky lg:top-20 space-y-5">
                    <h3 className="text-sm font-semibold text-foreground">Summary</h3>

                    {/* Payment method */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Payment Method</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['cash', 'upi', 'card', 'credit'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m)}
                            className={cn(
                              'py-2 rounded-xl text-xs font-medium capitalize transition-colors border',
                              paymentMethod === m
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Discount (₹)</label>
                      <input
                        type="number"
                        min={0}
                        max={subtotal}
                        value={discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        className={cn(inputClass, 'w-full')}
                      />
                    </div>

                    {/* Amount Paid */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Amount Paid (₹)</label>
                      <input
                        type="number"
                        min={0}
                        max={total}
                        value={amountPaid}
                        onChange={e => handleAmountPaidChange(Number(e.target.value))}
                        placeholder="0"
                        className={cn(inputClass, 'w-full')}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Status auto-sets: partial / paid
                      </p>
                    </div>

                    {/* Status override */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Status</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['paid', 'pending', 'partial', 'overdue'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={cn(
                              'py-2 rounded-xl text-xs font-medium capitalize transition-colors border',
                              status === s
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Totals */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="h-px bg-border" />
                      <div className="flex justify-between font-bold text-base text-foreground">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      {amountPaid > 0 && (
                        <>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>Amount Paid</span>
                            <span>{formatCurrency(amountPaid)}</span>
                          </div>
                          <div className="flex justify-between text-foreground font-semibold">
                            <span>Balance Due</span>
                            <span>{formatCurrency(balanceDue)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        Save Changes
                      </motion.button>
                      <button
                        onClick={exitEditMode}
                        className="w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── VIEW MODE ── */
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow-lg"
              >
                {/* Invoice header */}
                <div className="p-8 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-[0.12em] text-foreground">{shopName}</h1>
                      <p className="text-xs text-muted-foreground tracking-widest mt-1 uppercase">{shopTagline}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Invoice</p>
                      <p className="text-lg font-mono font-bold text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
                      <span className={cn('text-xs font-medium border px-2.5 py-0.5 rounded-md capitalize mt-2 inline-block', STATUS_COLORS[invoice.status])}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bill to */}
                <div className="px-8 py-5 border-b border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
                  <p className="text-base font-semibold text-foreground">{invoice.customerName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-foreground text-background">
                        <th className="text-left text-xs font-medium px-6 py-3">Item</th>
                        <th className="text-left text-xs font-medium px-4 py-3 hidden sm:table-cell">Type</th>
                        <th className="text-right text-xs font-medium px-4 py-3">Qty</th>
                        <th className="text-right text-xs font-medium px-4 py-3">Unit Price</th>
                        <th className="text-right text-xs font-medium px-6 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3 text-sm font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground capitalize hidden sm:table-cell">
                            {item.type === 'rental' ? `Rental (${item.rentalDays}d)` : 'Stitching'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-foreground">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-foreground">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="px-8 py-6 border-t border-border">
                  <div className="ml-auto max-w-xs space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Discount</span>
                        <span>-{formatCurrency(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-base font-bold text-foreground">
                      <span>Total</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                    {(invoice.amountPaid ?? 0) > 0 && (
                      <>
                        <div className="flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <span>Amount Paid</span>
                          <span>{formatCurrency(invoice.amountPaid!)}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between text-base font-bold text-foreground">
                          <span>Balance Due</span>
                          <span className={viewBalance === 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                            {formatCurrency(viewBalance)}
                          </span>
                        </div>
                      </>
                    )}
                    {invoice.paymentMethod && (
                      <p className="text-xs text-muted-foreground text-right capitalize">via {invoice.paymentMethod}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="px-8 pb-6 border-t border-border pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-foreground">{invoice.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-8 pb-8 flex flex-wrap gap-3 border-t border-border pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => generateInvoicePDF(invoice, { name: shopName, tagline: shopTagline })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Download size={15} />
                    Download PDF
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={enterEditMode}
                    className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Edit2 size={15} />
                    Edit Invoice
                  </motion.button>

                  {invoice.status !== 'paid' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleMarkPaid}
                      disabled={markingPaid}
                      className="flex items-center gap-2 px-5 py-2.5 border border-emerald-600 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-60"
                    >
                      {markingPaid ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      Mark as Paid
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Invoice not found.</div>
        )}
      </div>
    </div>
  )
}
