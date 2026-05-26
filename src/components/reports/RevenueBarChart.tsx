'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

interface Props {
  data: { month: string; revenue: number }[]
}

export default function RevenueBarChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = isDark ? '#888' : '#999'
  const barColor = isDark ? '#e5e5e5' : '#1a1a1a'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
        <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a1a' : '#fff',
            border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
            borderRadius: 12,
            fontSize: 12,
            color: isDark ? '#f5f5f5' : '#1a1a1a',
          }}
          formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
        />
        <Bar dataKey="revenue" fill={barColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
