'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { orderBy } from 'firebase/firestore'
import Header from '@/components/layout/Header'
import { Skeleton } from '@/components/ui/skeleton'
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection'
import { formatCurrency, toDate } from '@/lib/formatters'
import type { Invoice, Rental, Customer, InventoryItem } from '@/types'

const RevenueBarChart = dynamic(() => import('@/components/reports/RevenueBarChart'), { ssr: false })
const CategoryPieChart = dynamic(() => import('@/components/reports/CategoryPieChart'), { ssr: false })
const TopItemsChart = dynamic(() => import('@/components/reports/TopItemsChart'), { ssr: false })

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ReportsPage() {
  const { data: invoices, loading: invLoading } = useFirestoreCollection<Invoice>('invoices', [orderBy('createdAt', 'desc')])
  const { data: customers } = useFirestoreCollection<Customer>('customers')
  const { data: rentals } = useFirestoreCollection<Rental>('rentals')
  const { data: inventory } = useFirestoreCollection<InventoryItem>('inventory')

  const loading = invLoading

  const monthlyRevenue = useMemo(() => {
    const now = new Date()
    return MONTHS.map((month, i) => ({
      month,
      revenue: invoices
        .filter(inv => {
          const d = toDate(inv.createdAt)
          return d.getMonth() === i && d.getFullYear() === now.getFullYear() && inv.status === 'paid'
        })
        .reduce((s, inv) => s + inv.total, 0),
    }))
  }, [invoices])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const inv_item = inventory.find(i => i.id === item.itemId)
        const cat = inv_item?.category || 'other'
        map.set(cat, (map.get(cat) || 0) + item.amount)
      })
    })
    const COLORS = ['#000', '#333', '#666', '#999', '#bbb', '#ccc', '#e5e5e5', '#f5f5f5']
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [invoices, inventory])

  const topItems = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number }>()
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const existing = map.get(item.itemId) || { name: item.name, revenue: 0 }
        map.set(item.itemId, { ...existing, revenue: existing.revenue + item.amount })
      })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [invoices])

  const totalRevenue = useMemo(() => invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0), [invoices])
  const avgOrderValue = useMemo(() => invoices.length ? totalRevenue / invoices.length : 0, [invoices, totalRevenue])

  return (
    <div>
      <Header title="Reports & Analytics" />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
            { label: 'Total Invoices', value: invoices.length.toString() },
            { label: 'Avg. Order Value', value: formatCurrency(avgOrderValue) },
            { label: 'Total Customers', value: customers.length.toString() },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 luxury-shadow">
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue bar chart */}
        <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
          <h3 className="text-base font-semibold text-foreground mb-1">Monthly Revenue</h3>
          <p className="text-sm text-muted-foreground mb-6">Revenue collected per month this year</p>
          {loading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <RevenueBarChart data={monthlyRevenue} />
          )}
        </div>

        {/* Bottom charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category pie */}
          <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
            <h3 className="text-base font-semibold text-foreground mb-1">Revenue by Category</h3>
            <p className="text-sm text-muted-foreground mb-6">Distribution across product categories</p>
            {loading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <CategoryPieChart data={categoryData.length ? categoryData : DEMO_CATEGORY_DATA} />
            )}
          </div>

          {/* Top items horizontal bar */}
          <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
            <h3 className="text-base font-semibold text-foreground mb-1">Top Items by Revenue</h3>
            <p className="text-sm text-muted-foreground mb-6">Best performing products</p>
            {loading ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <TopItemsChart data={topItems.length ? topItems : DEMO_TOP_ITEMS} />
            )}
          </div>
        </div>

        {/* Rental stats */}
        <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
          <h3 className="text-base font-semibold text-foreground mb-5">Rental Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Rentals', value: rentals.length },
              { label: 'Active', value: rentals.filter(r => r.status === 'active').length },
              { label: 'Returned', value: rentals.filter(r => r.status === 'returned').length },
              { label: 'Overdue', value: rentals.filter(r => r.status === 'overdue').length },
            ].map(stat => (
              <div key={stat.label} className="text-center p-4 bg-muted rounded-xl">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const DEMO_CATEGORY_DATA = [
  { name: 'lehenga', value: 185000, color: '#000' },
  { name: 'saree', value: 92000, color: '#333' },
  { name: 'sherwani', value: 74000, color: '#666' },
  { name: 'gown', value: 58000, color: '#999' },
  { name: 'suit', value: 41000, color: '#bbb' },
  { name: 'accessories', value: 28000, color: '#ccc' },
]

const DEMO_TOP_ITEMS = [
  { name: 'Bridal Lehenga Set', revenue: 185000 },
  { name: 'Silk Saree', revenue: 92000 },
  { name: 'Designer Sherwani', revenue: 74000 },
  { name: 'Evening Gown', revenue: 58000 },
  { name: 'Embroidered Suit', revenue: 41000 },
]
