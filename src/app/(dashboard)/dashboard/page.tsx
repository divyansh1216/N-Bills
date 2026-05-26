'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IndianRupee, Users, Shirt, FileText, ChevronRight, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/dashboard/StatCard'
import { StatCardSkeleton, Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { orderBy } from 'firebase/firestore'
import type { Invoice, Customer, Rental } from '@/types'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import { formatCurrency, formatDate, toDate } from '@/lib/formatters'
import { STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { rentalEnabled } = useShopSettings()
  const { data: invoices, loading: invLoading } = useFirestoreCollection<Invoice>('invoices', [orderBy('createdAt', 'desc')])
  const { data: customers, loading: custLoading } = useFirestoreCollection<Customer>('customers')
  const { data: rentals, loading: rentLoading } = useFirestoreCollection<Rental>('rentals')

  const loading = invLoading || custLoading || rentLoading

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const thisYear = now.getFullYear()

    const isThisMonth = (val: any) => {
      const d = toDate(val)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    }
    const isLastMonth = (val: any) => {
      const d = toDate(val)
      return d.getMonth() === lastMonth && d.getFullYear() === (thisMonth === 0 ? thisYear - 1 : thisYear)
    }

    const thisMonthRevenue = invoices
      .filter(inv => isThisMonth(inv.createdAt) && inv.status === 'paid')
      .reduce((s, inv) => s + (inv.total || 0), 0)
    const lastMonthRevenue = invoices
      .filter(inv => isLastMonth(inv.createdAt) && inv.status === 'paid')
      .reduce((s, inv) => s + (inv.total || 0), 0)
    const revenueChange = lastMonthRevenue
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0

    const thisMonthCust = customers.filter(c => isThisMonth(c.joinedAt)).length
    const lastMonthCust = customers.filter(c => isLastMonth(c.joinedAt)).length
    const customerChange = lastMonthCust
      ? ((thisMonthCust - lastMonthCust) / lastMonthCust) * 100
      : thisMonthCust > 0 ? 100 : 0

    const activeRentals = rentals.filter(r => r.status === 'active').length
    const lastActiveRentals = rentals.filter(r => r.status === 'returned' && isLastMonth(r.rentalDate)).length
    const rentalChange = lastActiveRentals
      ? ((activeRentals - lastActiveRentals) / lastActiveRentals) * 100
      : 0

    const pendingBills = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial').length
    const lastPending = invoices.filter(inv => isLastMonth(inv.createdAt) && (inv.status === 'pending' || inv.status === 'partial')).length
    const pendingChange = lastPending
      ? ((pendingBills - lastPending) / lastPending) * 100
      : 0

    return { thisMonthRevenue, revenueChange, customers: customers.length, customerChange, activeRentals, rentalChange, pendingBills, pendingChange }
  }, [invoices, customers, rentals])

  const recentInvoices = invoices.slice(0, 8)

  const needsAttention = useMemo(() => {
    const now = new Date()
    const overdueRentals = rentals.filter(r => r.status === 'active' && new Date(r.returnDueDate) < now)
    const unpaidInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partial')
    return { overdueRentals, unpaidInvoices }
  }, [invoices, rentals])

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="This Month" value={stats.thisMonthRevenue} change={stats.revenueChange} icon={IndianRupee} delay={0} format={v => formatCurrency(v)} />
              <StatCard label="Customers" value={stats.customers} change={stats.customerChange} icon={Users} delay={0.06} />
              {rentalEnabled && <StatCard label="Active Rentals" value={stats.activeRentals} change={stats.rentalChange} icon={Shirt} delay={0.12} />}
              <StatCard label="Pending Bills" value={stats.pendingBills} change={stats.pendingChange} icon={FileText} delay={0.18} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent invoices */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Recent Invoices</h3>
              <Link href="/billing" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View all <ChevronRight size={13} />
              </Link>
            </div>
            <div>
              <table className="w-full table-fixed sm:table-auto">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Customer</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Invoice</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2.5">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
                    : recentInvoices.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No invoices yet
                        </td>
                      </tr>
                    )
                    : recentInvoices.map((inv, i) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{inv.customerName}</p>
                            <p className="text-xs text-muted-foreground truncate">{inv.createdAt ? formatDate(toDate(inv.createdAt).toISOString()) : '—'}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs font-mono text-muted-foreground hidden sm:table-cell">{inv.invoiceNumber}</td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(inv.total)}</td>
                        <td className="px-2 sm:px-3 py-3">
                          <Link href={`/billing/${inv.id}`} className="flex items-center gap-1.5">
                            <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md capitalize', STATUS_COLORS[inv.status])}>
                              {inv.status}
                            </span>
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Needs attention */}
          <div className="space-y-4">

            {/* Overdue rentals */}
            {rentalEnabled && <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={15} className="text-amber-500 shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">Overdue Rentals</h3>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : needsAttention.overdueRentals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All clear</p>
              ) : (
                <div className="space-y-2">
                  {needsAttention.overdueRentals.slice(0, 4).map(r => (
                    <Link key={r.id} href="/rentals" className="flex items-center justify-between py-2 hover:bg-muted -mx-1 px-1 rounded-lg transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.customerName}</p>
                        <p className="text-xs text-red-500">Due {formatDate(r.returnDueDate)}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                  {needsAttention.overdueRentals.length > 4 && (
                    <Link href="/rentals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      +{needsAttention.overdueRentals.length - 4} more
                    </Link>
                  )}
                </div>
              )}
            </div>}

            {/* Unpaid invoices */}
            <div className="bg-card border border-border rounded-2xl p-5 luxury-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Unpaid Bills</h3>
                <span className="text-xs text-muted-foreground">{needsAttention.unpaidInvoices.length}</span>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : needsAttention.unpaidInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending payments</p>
              ) : (
                <div className="space-y-2">
                  {needsAttention.unpaidInvoices.slice(0, 5).map(inv => (
                    <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between py-2 hover:bg-muted -mx-1 px-1 rounded-lg transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.customerName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{inv.status}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0 ml-2">{formatCurrency(inv.total)}</span>
                    </Link>
                  ))}
                  {needsAttention.unpaidInvoices.length > 5 && (
                    <Link href="/billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      +{needsAttention.unpaidInvoices.length - 5} more
                    </Link>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
