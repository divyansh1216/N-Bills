'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'

interface RevenueChartProps {
  data: { month: string; revenue: number; rentals: number }[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = isDark ? '#888' : '#999'
  const strokeColor = isDark ? '#e5e5e5' : '#1a1a1a'

  return (
    <div className="bg-card border border-border rounded-2xl p-6 luxury-shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly performance this year</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-foreground inline-block" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block" />
            Rentals
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={textColor} stopOpacity={0.1} />
              <stop offset="100%" stopColor={textColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1a1a1a' : '#fff',
              border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
              borderRadius: 12,
              fontSize: 12,
              color: isDark ? '#f5f5f5' : '#1a1a1a',
            }}
            formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, undefined]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={strokeColor}
            strokeWidth={2}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 4, fill: strokeColor }}
          />
          <Area
            type="monotone"
            dataKey="rentals"
            stroke={textColor}
            strokeWidth={1.5}
            fill="url(#rentGrad)"
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 3, fill: textColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
