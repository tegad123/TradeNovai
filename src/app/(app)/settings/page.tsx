"use client"

import { PageContainer } from "@/components/layout/PageContainer"
import { GlassCard } from "@/components/glass/GlassCard"
import { useTheme, ThemeColor } from "@/lib/contexts/ThemeContext"
import { useAuth } from "@/lib/hooks/useAuth"

export default function SettingsPage() {
  const { themeColor, setThemeColor, availableColors, glassSettings, setGlassPreset } = useTheme()
  const { user } = useAuth()

  return (
    <PageContainer>
      <div className="space-y-6 max-w-3xl">
        {/* Profile Section */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                defaultValue={user?.displayName || ""}
                className="w-full px-4 py-2 rounded-lg glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full px-4 py-2 rounded-lg glass-input text-sm opacity-50 cursor-not-allowed"
              />
            </div>
          </div>
        </GlassCard>

        {/* Theme Section */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-white mb-4">Theme</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-3">Accent Color</label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map(({ key, colors }) => (
                  <button
                    key={key}
                    onClick={() => setThemeColor(key)}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      themeColor === key 
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--theme-bg-color)]" 
                        : "hover:scale-110"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})` }}
                    title={colors.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-3">Glass Effect</label>
              <div className="flex flex-wrap gap-2">
                {(["off", "subtle", "normal", "strong"] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setGlassPreset(preset)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      glassSettings.preset === preset
                        ? "bg-theme-gradient text-white"
                        : "glass text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-sm text-[var(--text-muted)]">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm font-medium">
              Delete
            </button>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}

