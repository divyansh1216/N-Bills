'use client'

import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/formatters'

interface TopItem {
  name: string
  category: string
  revenue: number
  count: number
}

interface TopItemsCardProps {
  items: TopItem[]
}

export default function TopItemsCard({ items }: TopItemsCardProps) {
  const maxRevenue = Math.max(...items.map(i => i.revenue), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
      <h3 className="text-base font-semibold text-foreground mb-1">Top Performers</h3>
      <p className="text-sm text-muted-foreground mb-6">Top items by stitching & rental revenue</p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground capitalize hidden sm:inline shrink-0">
                  · {item.category}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground ml-2 shrink-0">
                {formatCurrency(item.revenue)}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                transition={{ delay: i * 0.06 + 0.3, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
