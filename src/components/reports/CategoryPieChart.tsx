'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'
import type { CategoryDataPoint } from '@/types'

interface Props {
  data: CategoryDataPoint[]
}

export default function CategoryPieChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={isDark && entry.color === '#000' ? '#e5e5e5' : entry.color}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: isDark ? '#1a1a1a' : '#fff',
            border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, undefined]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
