'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { orderBy } from 'firebase/firestore'
import Header from '@/components/layout/Header'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { addCustomer } from '@/firebase/firestore'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants'
import { useDebounce } from '@/hooks/useDebounce'
import { AnimatePresence } from 'framer-motion'
import type { Customer } from '@/types'
import { cn } from '@/lib/utils'

export default function CustomersPage() {
  const { data: customers, loading } = useFirestoreCollection<Customer>('customers', [orderBy('totalSpent', 'desc')])
  const [search, setSearch] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 250)

  const filtered = useMemo(() =>
    customers.filter(c =>
      !debouncedSearch ||
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.phone.includes(debouncedSearch)
    ), [customers, debouncedSearch])

  return (
    <div>
      <Header title="Customers" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Customers', value: customers.length },
            { label: 'Platinum', value: customers.filter(c => c.tier === 'platinum').length },
            { label: 'Gold', value: customers.filter(c => c.tier === 'gold').length },
            { label: 'Avg. Spend', value: customers.length ? formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 luxury-shadow">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 luxury-shadow">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <motion.button
            onClick={() => setAddModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Customer</span>
          </motion.button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Phone</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Tier</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Orders</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Total Spent</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Last Visit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : filtered.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                          {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{customer.phone}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md', TIER_COLORS[customer.tier])}>
                        {TIER_LABELS[customer.tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground hidden lg:table-cell">{customer.totalOrders}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden xl:table-cell">{formatDate(customer.lastVisit)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${customer.id}`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No customers found. Add your first customer!
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <AddCustomerModal onClose={() => setAddModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        totalSpent: 0,
        totalOrders: 0,
        lastVisit: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        tier: 'bronze',
      })
      toast.success('Customer added')
      onClose()
    } catch (err: any) {
      console.error('Add customer error:', err)
      toast.error(err?.message || 'Failed to add customer')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-md luxury-shadow-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Add Customer</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Full Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Sharma" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Phone *</label>
            <input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@example.com" className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Mumbai, Maharashtra" className={inputClass} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Add Customer
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
