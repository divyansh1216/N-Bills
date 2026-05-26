'use client'

import { Phone, Mail, MapPin, ShoppingBag, Calendar } from 'lucide-react'
import type { Customer } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { TIER_COLORS, TIER_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CustomerCardProps {
  customer: Customer
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  const initials = customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow space-y-5">
      {/* Avatar & name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-lg font-bold text-foreground shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
          <span className={cn('text-xs font-medium border px-2 py-0.5 rounded-md', TIER_COLORS[customer.tier])}>
            {TIER_LABELS[customer.tier]}
          </span>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone size={13} />
          <span>{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail size={13} />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={13} />
            <span className="truncate">{customer.address}</span>
          </div>
        )}
      </div>

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
  )
}
