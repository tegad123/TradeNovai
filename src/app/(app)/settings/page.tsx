"use client"

import { useState, useEffect } from "react"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { useTheme } from "@/lib/contexts/ThemeContext"
import { createClientSafe } from "@/lib/supabase/browser"
import { 
  User, 
  Palette, 
  Bell, 
  Shield, 
  Database,
  Check,
  LogOut,
  Trash2,
  Target,
  DollarSign,
  Calendar as CalendarIcon,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Theme colors
const THEME_COLORS = [
  { value: "orange", label: "Orange", color: "#ff9500" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "purple", label: "Purple", color: "#8b5cf6" },
  { value: "pink", label: "Pink", color: "#ec4899" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
  { value: "red", label: "Red", color: "#ef4444" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
]

// Trading styles
const TRADING_STYLES = [
  { value: "scalping", label: "Scalping" },
  { value: "day_trading", label: "Day Trading" },
  { value: "swing", label: "Swing Trading" },
  { value: "position", label: "Position Trading" },
]

export default function SettingsPage() {
  const { user, signOut } = useSupabaseAuthContext()
  const { theme, setTheme } = useTheme()
  
  // Settings state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Trading goals
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState("")
  const [maxDailyLoss, setMaxDailyLoss] = useState("")
  const [dailyProfitTarget, setDailyProfitTarget] = useState("")
  const [maxTradesPerDay, setMaxTradesPerDay] = useState("")
  const [tradingStyle, setTradingStyle] = useState("")
  const [weeklyGoals, setWeeklyGoals] = useState("")
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [tradeAlerts, setTradeAlerts] = useState(true)
  
  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Load trading goals
  useEffect(() => {
    async function loadGoals() {
      if (!user) return
      
      const supabase = createClientSafe()
      if (!supabase) return

      const { data } = await supabase
        .from('user_trading_goals')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setMaxRiskPerTrade(data.max_risk_per_trade?.toString() || "")
        setMaxDailyLoss(data.max_daily_loss?.toString() || "")
        setDailyProfitTarget(data.daily_profit_target?.toString() || "")
        setMaxTradesPerDay(data.max_trades_per_day?.toString() || "")
        setTradingStyle(data.trading_style || "")
        setWeeklyGoals(data.weekly_goals || "")
      }

      setLoading(false)
    }

    loadGoals()
  }, [user])

  // Save trading goals
  const saveGoals = async () => {
    if (!user) return
    
    const supabase = createClientSafe()
    if (!supabase) return

    setSaving(true)

    const { error } = await supabase
      .from('user_trading_goals')
      .upsert({
        user_id: user.id,
        max_risk_per_trade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade) : null,
        max_daily_loss: maxDailyLoss ? parseFloat(maxDailyLoss) : null,
        daily_profit_target: dailyProfitTarget ? parseFloat(dailyProfitTarget) : null,
        max_trades_per_day: maxTradesPerDay ? parseInt(maxTradesPerDay) : null,
        trading_style: tradingStyle || null,
        weekly_goals: weeklyGoals || null,
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving goals:', error)
    }

    setSaving(false)
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !user) return
    
    setDeleting(true)
    
    // In a real app, you'd call a server action to delete the user
    // For now, just sign out
    await signOut()
    
    setDeleting(false)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
              <User className="w-8 h-8 text-[hsl(var(--theme-primary))]" />
            </div>
          )}
          <div>
            <p className="text-lg font-medium text-white">
              {user?.user_metadata?.full_name || "Trader"}
            </p>
            <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Appearance</h2>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)] mb-3 block">Accent Color</label>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  theme === option.value && "ring-2 ring-white ring-offset-2 ring-offset-[var(--theme-bg-color)]"
                )}
                style={{ backgroundColor: option.color }}
                title={option.label}
              >
                {theme === option.value && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Goals Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Trading Goals</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--theme-primary))]" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Max Risk Per Trade ($)
                </label>
                <input
                  type="number"
                  value={maxRiskPerTrade}
                  onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Max Daily Loss ($)
                </label>
                <input
                  type="number"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(e.target.value)}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Daily Profit Target ($)
                </label>
                <input
                  type="number"
                  value={dailyProfitTarget}
                  onChange={(e) => setDailyProfitTarget(e.target.value)}
                  placeholder="e.g., 200"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Max Trades Per Day
                </label>
                <input
                  type="number"
                  value={maxTradesPerDay}
                  onChange={(e) => setMaxTradesPerDay(e.target.value)}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)]">Trading Style</label>
              <div className="flex flex-wrap gap-2">
                {TRADING_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setTradingStyle(style.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      tradingStyle === style.value
                        ? "bg-[hsl(var(--theme-primary))] text-white"
                        : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Weekly Goals
              </label>
              <textarea
                value={weeklyGoals}
                onChange={(e) => setWeeklyGoals(e.target.value)}
                placeholder="What do you want to achieve this week?"
                rows={3}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--theme-primary))]/50 resize-none"
              />
            </div>

            <Button 
              variant="glass-theme" 
              onClick={saveGoals}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Goals"}
            </Button>
          </div>
        )}
      </section>

      {/* Notifications Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Email Notifications</p>
              <p className="text-xs text-[var(--text-muted)]">Receive email updates about your trading</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Daily Digest</p>
              <p className="text-xs text-[var(--text-muted)]">Get a daily summary of your trades</p>
            </div>
            <Switch
              checked={dailyDigest}
              onCheckedChange={setDailyDigest}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Trade Alerts</p>
              <p className="text-xs text-[var(--text-muted)]">Get notified when you hit daily limits</p>
            </div>
            <Switch
              checked={tradeAlerts}
              onCheckedChange={setTradeAlerts}
            />
          </div>
        </div>
      </section>

      {/* Data & Privacy Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Data & Privacy</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Export Data</p>
              <p className="text-xs text-[var(--text-muted)]">Download all your trading data as CSV</p>
            </div>
            <Button variant="glass" size="sm">
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Clear History</p>
              <p className="text-xs text-[var(--text-muted)]">Delete all your trade history</p>
            </div>
            <Button variant="glass" size="sm" className="text-yellow-400 hover:text-yellow-300">
              Clear
            </Button>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
          <h2 className="text-lg font-semibold text-white">Account</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Sign Out</p>
              <p className="text-xs text-[var(--text-muted)]">Sign out from your account</p>
            </div>
            <Button 
              variant="glass" 
              size="sm"
              onClick={() => signOut()}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-400">Delete Account</p>
              <p className="text-xs text-red-400/70">Permanently delete your account and all data</p>
            </div>
            <Button 
              variant="glass" 
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Type <span className="font-mono text-red-400">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmText("")
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
