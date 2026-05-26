'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Download, Search, Eye } from 'lucide-react'
import { orderBy } from 'firebase/firestore'
import Header from '@/components/layout/Header'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import { formatCurrency, formatDate, toDate } from '@/lib/formatters'
import { STATUS_COLORS } from '@/lib/constants'
import { generateInvoicePDF } from '@/lib/pdf-utils'
import { useDebounce } from '@/hooks/useDebounce'
import type { Invoice, PaymentStatus } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'partial', label: 'Partial' },
]

export default function BillingPage() {
  const { data: invoices, loading } = useFirestoreCollection<Invoice>('invoices', [orderBy('createdAt', 'desc')])
  const { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress } = useShopSettings()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const debouncedSearch = useDebounce(search, 250)

  const filtered = useMemo(() =>
    invoices.filter(inv => {
      const matchSearch = !debouncedSearch ||
        inv.invoiceNumber?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchSearch && matchStatus
    }), [invoices, debouncedSearch, statusFilter])

  const totalRevenue = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0), [invoices])
  const pendingRevenue = useMemo(() => invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0), [invoices])

  return (
    <div>
      <Header title="Billing" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Invoices', value: invoices.length.toString() },
            { label: 'Collected', value: formatCurrency(totalRevenue) },
            { label: 'Pending', value: formatCurrency(pendingRevenue) },
            { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length.toString() },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 luxury-shadow">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 luxury-shadow">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-0.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                  statusFilter === f.value
                    ? 'bg-foreground text-background'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground luxury-shadow'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Link href="/billing/new">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus size={16} />
              New Invoice
            </motion.div>
          </Link>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
          <div>
          <table className="w-full table-fixed sm:table-auto">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Invoice #</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 sm:px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Date</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Items</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-3 sm:px-4 py-3">Total</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-2 sm:px-4 py-3">Status</th>
                <th className="px-2 sm:px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : filtered.map((inv, i) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono font-medium text-foreground hidden sm:table-cell">{inv.invoiceNumber}</td>
                    <td className="px-3 sm:px-4 py-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="sm:hidden font-mono">{inv.invoiceNumber} · </span>{inv.customerPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {inv.createdAt ? formatDate(toDate(inv.createdAt).toISOString()) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">{inv.items?.length ?? 0}</td>
                    <td className="px-3 sm:px-4 py-3 text-right text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(inv.total)}</td>
                    <td className="px-2 sm:px-4 py-3">
                      <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md capitalize', STATUS_COLORS[inv.status])}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/billing/${inv.id}`} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                          <Eye size={14} />
                        </Link>
                        <button onClick={() => generateInvoicePDF(inv, { name: shopName, tagline: shopTagline, phone: shopPhone, address: shopAddress })} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No invoices found.{' '}
              <Link href="/billing/new" className="text-foreground underline underline-offset-2">Create one!</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
