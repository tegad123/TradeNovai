"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { GlassCard } from '@/components/glass/GlassCard'
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
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Award,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EngagementAnalyticsData } from '@/lib/types/engagement'

interface EngagementAnalyticsProps {
  courseId: string
}

export function EngagementAnalytics({ courseId }: EngagementAnalyticsProps) {
  const [data, setData] = useState<EngagementAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEngagementData = useCallback(async () => {
    const supabase = createClient()
    
    try {
      setLoading(true)
      setError(null)
      
      // Get last 30 days of metrics
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: metrics, error: metricsError } = await supabase
        .from('student_engagement_metrics')
        .select(`
          *,
          user_profiles:user_id (
            full_name
          )
        `)
        .eq('course_id', courseId)
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('metric_date', { ascending: true })

      if (metricsError) {
        // Table might not exist yet if migration hasn't run
        console.warn('Engagement metrics not available:', metricsError.message)
        setData({
          totalActive: 0,
          averageScore: 0,
          atRiskCount: 0,
          topStudent: null,
          chartData: []
        })
        return
      }

      if (!metrics || metrics.length === 0) {
        setData({
          totalActive: 0,
          averageScore: 0,
          atRiskCount: 0,
          topStudent: null,
          chartData: []
        })
        return
      }

      // Calculate stats from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0]

      const recentMetrics = metrics.filter(m => m.metric_date >= sevenDaysStr)

      // Unique active students (had engagement > 0 in last 7 days)
      const uniqueActiveStudents = new Set(
        recentMetrics
          .filter(m => m.daily_engagement_score > 0)
          .map(m => m.user_id)
      ).size

      // Average engagement score
      const avgScore = recentMetrics.length > 0
        ? recentMetrics.reduce((acc, m) => acc + m.daily_engagement_score, 0) / recentMetrics.length
        : 0

      // At-risk students count
      const atRiskCount = new Set(
        recentMetrics
          .filter(m => m.is_at_risk)
          .map(m => m.user_id)
      ).size

      // Find top student (highest average in last 7 days)
      const studentScores: Record<string, { name: string; total: number; count: number }> = {}
      recentMetrics.forEach(m => {
        if (!studentScores[m.user_id]) {
          const profile = m.user_profiles as { full_name: string | null } | null
          studentScores[m.user_id] = {
            name: profile?.full_name || 'Student',
            total: 0,
            count: 0
          }
        }
        studentScores[m.user_id].total += m.daily_engagement_score
        studentScores[m.user_id].count += 1
      })

      const topStudentEntry = Object.entries(studentScores)
        .map(([, data]) => ({
          name: data.name,
          score: data.count > 0 ? data.total / data.count : 0
        }))
        .sort((a, b) => b.score - a.score)[0]

      // Prepare chart data (daily averages)
      const dailyAverages: Record<string, { total: number; count: number }> = {}
      metrics.forEach(m => {
        const date = m.metric_date
        if (!dailyAverages[date]) {
          dailyAverages[date] = { total: 0, count: 0 }
        }
        dailyAverages[date].total += m.daily_engagement_score
        dailyAverages[date].count += 1
      })

      const chartData = Object.entries(dailyAverages)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: data.count > 0 ? Math.round(data.total / data.count) : 0
        }))
        .slice(-30)

      setData({
        totalActive: uniqueActiveStudents,
        averageScore: Math.round(avgScore),
        atRiskCount,
        topStudent: topStudentEntry ? {
          name: topStudentEntry.name,
          score: Math.round(topStudentEntry.score)
        } : null,
        chartData
      })
    } catch (err) {
      console.error('Error fetching engagement data:', err)
      setError('Failed to load engagement data')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchEngagementData()
  }, [fetchEngagementData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Engagement Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-24 mb-3" />
              <div className="h-8 bg-white/10 rounded w-16" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchEngagementData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </GlassCard>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Engagement Analytics</h2>
        <Button variant="ghost" size="sm" onClick={fetchEngagementData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Active Students</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.totalActive}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Engaged in last 7 days
          </p>
        </GlassCard>

        {/* Average Engagement */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Avg Engagement</span>
          </div>
          <div className={`text-2xl font-bold ${
            data.averageScore >= 70 ? 'text-green-400' :
            data.averageScore >= 40 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {data.averageScore}/100
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Class average score
          </p>
        </GlassCard>

        {/* At-Risk Students */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">At-Risk</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{data.atRiskCount}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Need attention
          </p>
        </GlassCard>

        {/* Top Performer */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">Top Performer</span>
          </div>
          <div className="text-lg font-bold text-white truncate">
            {data.topStudent?.name || 'N/A'}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {data.topStudent ? `${data.topStudent.score}/100 score` : 'No data yet'}
          </p>
        </GlassCard>
      </div>

      {/* Engagement Trend Chart */}
      {data.chartData.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-medium text-white mb-4">Engagement Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.chartData}>
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
              {/* Reference lines for thresholds */}
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
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[var(--text-muted)]">Active (70+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-[var(--text-muted)]">At Risk (40-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[var(--text-muted)]">Disengaged (&lt;40)</span>
            </div>
          </div>
        </GlassCard>
      )}

      {data.chartData.length === 0 && (
        <GlassCard className="p-8 text-center">
          <TrendingUp className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-white font-medium mb-1">No Engagement Data Yet</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Engagement metrics will appear here once students start interacting with the course.
          </p>
        </GlassCard>
      )}
    </div>
  )
}

