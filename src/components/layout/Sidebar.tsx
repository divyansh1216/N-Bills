'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, X } from 'lucide-react'
import { toast } from 'sonner'
import { NAV_ITEMS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { name: shopName, rentalEnabled } = useShopSettings()

  function handleSignOut() {
    signOut()
    toast.success('Signed out successfully')
  }

  const displayName = user?.name || 'User'
  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <aside className="h-full w-72 flex flex-col bg-sidebar text-sidebar-foreground">

      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/10">
        <h1 className="text-sm font-semibold text-white tracking-wide truncate">{shopName}</h1>
        {mobile && (
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 shrink-0 ml-2">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.filter(item => item.href !== '/rentals' || rentalEnabled).map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                />
              )}
              <item.icon
                size={16}
                className={cn(
                  'relative z-10 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                )}
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom — user */}
      <div className="px-2 pb-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{displayName}</p>
            {user?.phone && (
              <p className="text-[10px] text-white/40 truncate">+91 {user.phone}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="text-white/40 hover:text-white/80 transition-colors p-1 shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

    </aside>
  )
}
