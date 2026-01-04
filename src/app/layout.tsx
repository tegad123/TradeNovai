import "./globals.css"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { ThemeProvider } from "@/lib/contexts/ThemeContext"
import { SupabaseAuthProvider } from "@/lib/contexts/SupabaseAuthContext"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "TradeNova",
    template: "%s | TradeNova",
  },
  description: "AI-powered trading journal with analytics, insights, and intelligent trade coaching",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ThemeProvider>
          <SupabaseAuthProvider>
            <AuthProvider>{children}</AuthProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
