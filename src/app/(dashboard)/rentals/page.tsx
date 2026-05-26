'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Calendar, AlertCircle } from 'lucide-react'
import { orderBy, where } from 'firebase/firestore'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { updateRental } from '@/firebase/firestore'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { STATUS_COLORS } from '@/lib/constants'
import type { Rental } from '@/types'
import { cn } from '@/lib/utils'

type TabType = 'active' | 'history'

export default function RentalsPage() {
  const { data: rentals, loading } = useFirestoreCollection<Rental>('rentals', [orderBy('rentalDate', 'desc')])
  const [tab, setTab] = useState<TabType>('active')
  const [returnModal, setReturnModal] = useState<Rental | null>(null)

  const active = useMemo(() => rentals.filter(r => r.status === 'active' || r.status === 'overdue'), [rentals])
  const history = useMemo(() => rentals.filter(r => r.status === 'returned'), [rentals])
  const displayed = tab === 'active' ? active : history

  const overdueCount = useMemo(() => rentals.filter(r => {
    if (r.status !== 'active') return false
    return new Date(r.returnDueDate) < new Date()
  }).length, [rentals])

  return (
    <div>
      <Header title="Rentals" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active Rentals', value: active.length },
            { label: 'Overdue', value: overdueCount },
            { label: 'Returned (Total)', value: history.length },
            { label: 'Active Value', value: formatCurrency(active.reduce((s, r) => s + r.items.reduce((is, i) => is + i.amount, 0), 0)) },
          ].map(stat => (
            <div key={stat.label} className={cn('bg-card border border-border rounded-xl p-4 luxury-shadow', stat.label === 'Overdue' && overdueCount > 0 ? 'border-red-200 dark:border-red-900' : '')}>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={cn('text-xl font-bold', stat.label === 'Overdue' && overdueCount > 0 ? 'text-red-600' : 'text-foreground')}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue banner */}
        {overdueCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl"
          >
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>{overdueCount} rental{overdueCount > 1 ? 's' : ''}</strong> past return date. Please follow up with customers.
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {(['active', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                tab === t ? 'bg-card text-foreground luxury-shadow' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t} {t === 'active' ? `(${active.length})` : `(${history.length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden luxury-shadow">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Items</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Rented</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Due / Returned</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Deposit</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                {tab === 'active' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                : displayed.map((rental, i) => {
                  const isOverdue = rental.status === 'active' && new Date(rental.returnDueDate) < new Date()
                  return (
                    <motion.tr
                      key={rental.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{rental.customerName}</p>
                          <p className="text-xs text-muted-foreground">{rental.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-foreground truncate max-w-[200px]">
                          {rental.items.map(i => i.name).join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">{rental.items.length} item{rental.items.length !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {formatDate(rental.rentalDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={cn('shrink-0', isOverdue ? 'text-red-500' : 'text-muted-foreground')} />
                          <span className={cn('text-sm', isOverdue ? 'text-red-600 font-medium' : 'text-foreground')}>
                            {rental.returnedDate ? formatDate(rental.returnedDate) : formatDate(rental.returnDueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground hidden lg:table-cell">
                        {formatCurrency(rental.depositPaid)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md capitalize',
                          isOverdue ? STATUS_COLORS.overdue : STATUS_COLORS[rental.status]
                        )}>
                          {isOverdue ? 'overdue' : rental.status}
                        </span>
                      </td>
                      {tab === 'active' && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setReturnModal(rental)}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors border border-border"
                          >
                            <RefreshCw size={12} />
                            Return
                          </button>
                        </td>
                      )}
                    </motion.tr>
                  )
                })
              }
            </tbody>
          </table>
          </div>

          {!loading && displayed.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No {tab} rentals found.
            </div>
          )}
        </div>
      </div>

      {/* Return Modal */}
      <AnimatePresence>
        {returnModal && (
          <ReturnModal rental={returnModal} onClose={() => setReturnModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function ReturnModal({ rental, onClose }: { rental: Rental; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [returnDate] = useState(new Date().toISOString().slice(0, 10))

  async function handleReturn() {
    setLoading(true)
    try {
      await updateRental(rental.id, {
        status: 'returned',
        returnedDate: returnDate,
      })
      toast.success(`Return processed for ${rental.customerName}`)
      onClose()
    } catch {
      toast.error('Failed to process return')
    } finally {
      setLoading(false)
    }
  }

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
        className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm luxury-shadow-lg"
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">Process Return</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Confirm return for <strong>{rental.customerName}</strong>?
          <br />
          <span className="text-xs">{rental.items.map(i => i.name).join(', ')}</span>
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={loading}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Confirm Return
          </button>
        </div>
      </motion.div>
    </div>
  )
}
