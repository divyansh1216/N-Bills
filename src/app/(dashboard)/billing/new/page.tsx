'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ArrowLeft, Loader2, FileText, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { getDocs, collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { addInvoice, addRental, updateCustomer } from '@/firebase/firestore'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import Header from '@/components/layout/Header'
import { formatCurrency, generateInvoiceNumber } from '@/lib/formatters'
import { generateInvoicePDF } from '@/lib/pdf-utils'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import LoadMeasurementsModal from '@/components/measurements/LoadMeasurementsModal'
import AddItemModal from '@/components/inventory/AddItemModal'
import type { Customer, InventoryItem, InvoiceLineItem, Invoice } from '@/types'
import { cn } from '@/lib/utils'

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

function NewInvoicePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress, rentalEnabled } = useShopSettings()
  const { data: customers } = useFirestoreCollection<Customer>('customers')
  const { data: inventory } = useFirestoreCollection<InventoryItem>('inventory')

  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { id: crypto.randomUUID(), itemId: '', name: '', unitPrice: 0, quantity: 1, type: 'stitching', rentalDays: 1 },
  ])
  const [discount, setDiscount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [measurementsModalOpen, setMeasurementsModalOpen] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [addItemTargetLineId, setAddItemTargetLineId] = useState<string | null>(null)

  const selectedCustomer = customers.find(c => c.id === customerId)

  useEffect(() => {
    const preselect = searchParams.get('customerId')
    if (preselect && customers.length > 0 && !customerId) {
      const match = customers.find(c => c.id === preselect)
      if (match) setCustomerId(match.id)
    }
  }, [customers, searchParams])

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
    ).slice(0, 6),
    [customers, customerSearch]
  )

  function addLineItem() {
    setLineItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), itemId: '', name: '', unitPrice: 0, quantity: 1, type: 'stitching', rentalDays: 1 },
    ])
  }

  function removeLineItem(id: string) {
    if (lineItems.length === 1) return
    setLineItems(prev => prev.filter(l => l.id !== id))
  }

  function updateLineItem(id: string, field: keyof LineItemRow, value: string | number) {
    setLineItems(prev => prev.map(l => {
      if (l.id !== id) return l
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

  const subtotal = useMemo(() =>
    lineItems.reduce((sum, l) => {
      const amount = l.type === 'rental'
        ? l.unitPrice * l.rentalDays * l.quantity
        : l.unitPrice * l.quantity
      return sum + amount
    }, 0), [lineItems])

  const tax = Math.round((subtotal - discount) * TAX_RATE)
  const total = subtotal - discount + tax
  const balanceDue = Math.max(0, total - amountPaid)

  function handleAmountPaidChange(value: number) {
    setAmountPaid(value)
    if (value <= 0) setStatus('pending')
    else if (value >= total) setStatus('paid')
    else setStatus('partial')
  }

  const invoiceItems: InvoiceLineItem[] = lineItems.map(l => {
    const base = {
      id: l.id,
      itemId: l.itemId,
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.type === 'rental' ? l.unitPrice * l.rentalDays * l.quantity : l.unitPrice * l.quantity,
      type: l.type,
    }
    return l.type === 'rental' ? { ...base, rentalDays: l.rentalDays } : base
  })

  async function handleSave(generatePDF = false) {
    if (!customerId) { toast.error('Select a customer'); return }
    if (lineItems.some(l => !l.name)) { toast.error('Fill in all line items'); return }
    if (!selectedCustomer) return

    setLoading(true)
    try {
      const invoice: Omit<Invoice, 'id'> = {
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        items: invoiceItems,
        subtotal,
        discount,
        tax,
        total,
        amountPaid: amountPaid > 0 ? amountPaid : undefined,
        status,
        paymentMethod,
        notes,
        createdAt: new Date().toISOString(),
      }

      const ref = await addInvoice(invoice)

      // Create rental records for rental items
      const rentalItems = invoiceItems.filter(i => i.type === 'rental')
      if (rentalItems.length > 0) {
        const rentalDate = new Date().toISOString()
        const returnDue = new Date(Date.now() + 7 * 86400000).toISOString()
        await addRental({
          invoiceId: ref.id,
          customerId,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          items: rentalItems,
          depositPaid: 0,
          rentalDate,
          returnDueDate: returnDue,
          status: 'active',
          notes,
        })
      }

      // Update customer stats
      await updateCustomer(customerId, {
        totalSpent: selectedCustomer.totalSpent + total,
        totalOrders: selectedCustomer.totalOrders + 1,
        lastVisit: new Date().toISOString(),
      })

      const finalInvoice: Invoice = { ...invoice, id: ref.id }

      if (generatePDF) {
        setPdfLoading(true)
        await generateInvoicePDF(finalInvoice, { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress })
        setPdfLoading(false)
      }

      toast.success('Invoice created successfully!')
      router.push(`/billing/${ref.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <div>
      <Header title="New Invoice" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to billing
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer select */}
            <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
              <h3 className="text-sm font-semibold text-foreground mb-4">Customer</h3>
              <div className="relative">
                <input
                  value={selectedCustomer ? selectedCustomer.name : customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setCustomerId('')
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder="Search customer..."
                  className={cn(inputClass, 'w-full')}
                />
                <AnimatePresence>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-20 top-full mt-1.5 w-full bg-card border border-border rounded-xl luxury-shadow-lg overflow-hidden"
                    >
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={() => { setCustomerId(c.id); setCustomerSearch(''); setShowCustomerDropdown(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone || "—"}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {selectedCustomer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 bg-muted rounded-xl text-sm"
                >
                  <p className="font-medium text-foreground">{selectedCustomer.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{selectedCustomer.phone || "—"} · {selectedCustomer.email || 'No email'}</p>
                </motion.div>
              )}
            </div>

            {/* Line items */}
            <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
              <h3 className="text-sm font-semibold text-foreground mb-4">Items</h3>
              <div className="space-y-3">
                {lineItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start"
                  >
                    {/* Item select + add new */}
                    <div className="w-full sm:col-span-4 flex gap-1.5">
                      <select
                        value={item.itemId}
                        onChange={e => updateLineItem(item.id, 'itemId', e.target.value)}
                        className={cn(inputClass, 'flex-1 min-w-0')}
                      >
                        <option value="">Select item</option>
                        {inventory.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Add new inventory item"
                        onClick={() => { setAddItemTargetLineId(item.id); setAddItemModalOpen(true) }}
                        className="shrink-0 p-2 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Type + Qty row on mobile */}
                    <div className="flex gap-2 sm:contents">
                      {/* Type */}
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

                      {/* Qty or days */}
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

                    {/* Price + Delete row on mobile */}
                    <div className="flex gap-2 items-center sm:contents">
                      {/* Unit price */}
                      <div className="flex-1 sm:col-span-3">
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice || ''}
                          onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                          placeholder="Price"
                          className={cn(inputClass, 'w-full')}
                        />
                      </div>

                      {/* Delete */}
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

                    {/* Amount */}
                    <div className="w-full sm:col-span-12 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(item.type === 'rental' ? item.unitPrice * item.rentalDays * item.quantity : item.unitPrice * item.quantity)}
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={addLineItem}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            {/* Notes */}
            <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                {customerId && (
                  <button
                    type="button"
                    onClick={() => setMeasurementsModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-2.5 py-1.5 hover:bg-muted transition-colors"
                  >
                    <Ruler size={12} />
                    Load Measurements
                  </button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes, stitching instructions..."
                rows={3}
                className={cn(inputClass, 'w-full resize-none')}
              />
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow lg:sticky lg:top-20 space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Summary</h3>

              {/* Payment method */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['cash', 'upi', 'card', 'credit'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-medium capitalize transition-colors border',
                        paymentMethod === method
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {method}
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
                  value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value))}
                  placeholder="0"
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
                  value={amountPaid || ''}
                  onChange={e => handleAmountPaidChange(Number(e.target.value))}
                  placeholder="0"
                  className={cn(inputClass, 'w-full')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Status: <span className="font-medium capitalize text-foreground">{status}</span>
                </p>
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
                    <div className="flex justify-between font-semibold text-foreground">
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
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Save Invoice
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSave(true)}
                  disabled={loading || pdfLoading}
                  className="w-full py-3 border border-border rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <FileText size={15} />
                  Save & Download PDF
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {customerId && selectedCustomer && (
        <LoadMeasurementsModal
          open={measurementsModalOpen}
          onClose={() => setMeasurementsModalOpen(false)}
          customerId={customerId}
          customerName={selectedCustomer.name}
          onLoad={text => setNotes(prev => prev ? `${prev}\n\n${text}` : text)}
        />
      )}

      <AddItemModal
        open={addItemModalOpen}
        onClose={() => { setAddItemModalOpen(false); setAddItemTargetLineId(null) }}
        onSaved={newItemId => {
          if (addItemTargetLineId) updateLineItem(addItemTargetLineId, 'itemId', newItemId)
          setAddItemTargetLineId(null)
        }}
      />
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoicePageInner />
    </Suspense>
  )
}
