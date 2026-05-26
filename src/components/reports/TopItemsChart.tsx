'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

interface Props {
  data: { name: string; revenue: number }[]
}

export default function TopItemsChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = isDark ? '#888' : '#999'
  const barColor = isDark ? '#e5e5e5' : '#1a1a1a'

  const truncated = data.map(d => ({
    ...d,
    shortName: d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={truncated}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
        barSize={14}
      >
        <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="shortName" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a1a' : '#fff',
            border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
        />
        <Bar dataKey="revenue" fill={barColor} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
