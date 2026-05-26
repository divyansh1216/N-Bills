'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  change: number
  changeLabel?: string
  icon: LucideIcon
  delay?: number
  format?: (v: number) => string
}

function useCountUp(target: number, duration = 1200, start = false) {
  const [count, setCount] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!start) return
    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration, start])

  return count
}

export default function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  delay = 0,
  format,
}: StatCardProps) {
  const [visible, setVisible] = useState(false)
  const count = useCountUp(value, 1200, visible)

  const displayValue = format ? format(count) : `${prefix}${count.toLocaleString('en-IN')}${suffix}`
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => setVisible(true)}
      className="bg-card border border-border rounded-2xl p-4 md:p-6 luxury-shadow hover:luxury-shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <p className="text-xs md:text-sm font-medium text-muted-foreground">{label}</p>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          <Icon size={16} className="text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        </div>
      </div>

      <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">{displayValue}</p>

      <div className="flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp size={13} className="text-emerald-500" />
        ) : (
          <TrendingDown size={13} className="text-red-500" />
        )}
        <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">{changeLabel}</span>
      </div>
    </motion.div>
  )
}
