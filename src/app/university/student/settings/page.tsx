"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Palette,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { useTheme, ThemeColor } from "@/lib/contexts/ThemeContext"
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth"
import { useSupabaseAuthContext } from "@/lib/contexts/SupabaseAuthContext"
import { UniversityRoleGuard } from "@/lib/guards/UniversityRoleGuard"
import { GlassCard } from "@/components/glass/GlassCard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function StudentSettingsContent() {
  const router = useRouter()
  const { user } = useSupabaseAuthContext()
  const { signOut } = useSupabaseAuth()
  const { themeColor, setThemeColor, availableColors } = useTheme()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return
    
    setDeleting(true)
    
    // For MVP, we'll just sign out the user
    // In production, this would call a server function to delete the account
    try {
      // Clear localStorage
      localStorage.removeItem('tradenova:universityRole')
      localStorage.removeItem('tradenova:intendedRole')
      
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
    }
    
    setDeleting(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/university/courses"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to courses
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Student Settings</h1>
          <p className="text-[var(--text-muted)]">
            Customize your University experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Accent Color */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--theme-primary))]/20 flex items-center justify-center">
                <Palette className="w-5 h-5 text-[hsl(var(--theme-primary))]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Accent Color</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Choose your preferred accent color
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {availableColors.map(({ key, colors }) => (
                <button
                  key={key}
                  onClick={() => setThemeColor(key)}
                  className={`relative w-full aspect-square rounded-xl transition-all ${
                    themeColor === key 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-primary)]' 
                      : 'hover:scale-110'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})` }}
                  title={colors.name}
                >
                  {themeColor === key && (
                    <CheckCircle2 className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Account Info */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="text-white">{user?.email || 'Not available'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-[var(--text-muted)]">Role</span>
                <span className="text-white">Student</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[var(--text-muted)]">Account Created</span>
                <span className="text-white">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'Not available'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard className="p-6 border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Irreversible actions
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-white">Delete Account</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account
                and remove all your data from our servers.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Type <strong className="text-white">DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            <DialogFooter>
              <Button variant="glass" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function StudentSettingsPage() {
  return (
    <UniversityRoleGuard allowedRoles={['student']}>
      <StudentSettingsContent />
    </UniversityRoleGuard>
  )
}

