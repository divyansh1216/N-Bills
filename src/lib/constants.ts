import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Shirt,
  Settings,
} from 'lucide-react'
import type { ItemCategory, CustomerTier } from '@/types'

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/billing', label: 'Billing', icon: FileText },
  { href: '/rentals', label: 'Rentals', icon: Shirt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const CATEGORIES: { value: ItemCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'lehenga', label: 'Lehenga' },
  { value: 'saree', label: 'Saree' },
  { value: 'sherwani', label: 'Sherwani' },
  { value: 'gown', label: 'Gown' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'suit', label: 'Suit' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
]

export const TIER_LABELS: Record<CustomerTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

export const TIER_COLORS: Record<CustomerTier, string> = {
  bronze: 'text-amber-700 border-amber-700',
  silver: 'text-slate-500 border-slate-500',
  gold: 'text-yellow-600 border-yellow-600',
  platinum: 'text-violet-600 border-violet-600',
}

export const STATUS_COLORS = {
  paid: 'text-emerald-600 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
  pending: 'text-amber-600 border-amber-600 bg-amber-50 dark:bg-amber-950/20',
  overdue: 'text-red-600 border-red-600 bg-red-50 dark:bg-red-950/20',
  partial: 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-950/20',
  active: 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-950/20',
  returned: 'text-emerald-600 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
}

export const SHOP_NAME = 'My Shop'
export const SHOP_TAGLINE = 'Stitching & Rental Management'
