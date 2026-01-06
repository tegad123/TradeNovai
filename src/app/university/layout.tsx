import { ThemeProvider } from "@/lib/contexts/ThemeContext"
import { SupabaseAuthProvider } from "@/lib/contexts/SupabaseAuthContext"

export default function UniversityPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <SupabaseAuthProvider>
        {children}
      </SupabaseAuthProvider>
    </ThemeProvider>
  )
}

