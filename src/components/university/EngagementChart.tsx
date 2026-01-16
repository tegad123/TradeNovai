"use client"

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

interface EngagementChartProps {
  data: Array<{ date: string; score: number }>
}

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--theme-primary))" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="hsl(var(--theme-primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          interval="preserveStartEnd"
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px'
          }}
          formatter={(value) => [`${value}/100`, 'Engagement Score']}
        />
        <ReferenceLine 
          y={70} 
          stroke="#22c55e" 
          strokeDasharray="5 5"
          strokeOpacity={0.5}
        />
        <ReferenceLine 
          y={40} 
          stroke="#eab308" 
          strokeDasharray="5 5"
          strokeOpacity={0.5}
        />
        <Area 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(var(--theme-primary))" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorEngagement)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
