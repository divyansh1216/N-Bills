'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Shirt, RefreshCw, CreditCard } from 'lucide-react'
import { formatRelativeTime, formatCurrency } from '@/lib/formatters'
import type { ActivityItem } from '@/types'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  stitching: { icon: ShoppingBag, label: 'Stitching', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  rental: { icon: Shirt, label: 'Rental', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  return: { icon: RefreshCw, label: 'Return', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  payment: { icon: CreditCard, label: 'Payment', color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30' },
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
      <h3 className="text-base font-semibold text-foreground mb-1">Recent Activity</h3>
      <p className="text-sm text-muted-foreground mb-6">Latest transactions and events</p>

      <div className="space-y-3">
        {activities.map((activity, i) => {
          const config = TYPE_CONFIG[activity.type]
          const Icon = config.icon

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="flex items-center gap-3 py-2"
            >
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', config.color)}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{activity.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(activity.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</p>
              </div>
            </motion.div>
          )
        })}

        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  )
}
