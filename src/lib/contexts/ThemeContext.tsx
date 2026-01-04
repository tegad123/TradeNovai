"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type ThemeColor = "slate" | "orange" | "indigo" | "purple" | "emerald" | "rose" | "amber" | "blue"
export type GlassPreset = "off" | "subtle" | "normal" | "strong" | "custom"

export interface GlassSettings {
  preset: GlassPreset
  opacity: number
  blur: number
  borderOpacity: number
  saturation: number
  hoverOpacityAdd: number
  hoverBorderAdd: number
}

interface ThemeColors {
  primary: string
  primaryRgb: string
  gradientFrom: string
  gradientTo: string
  name: string
}

const GLASS_PRESETS: Record<Exclude<GlassPreset, "custom">, Omit<GlassSettings, "preset">> = {
  off: { opacity: 0, blur: 0, borderOpacity: 0.10, saturation: 100, hoverOpacityAdd: 0.02, hoverBorderAdd: 0.05 },
  subtle: { opacity: 0.06, blur: 16, borderOpacity: 0.10, saturation: 150, hoverOpacityAdd: 0.02, hoverBorderAdd: 0.05 },
  normal: { opacity: 0.12, blur: 24, borderOpacity: 0.18, saturation: 180, hoverOpacityAdd: 0.02, hoverBorderAdd: 0.05 },
  strong: { opacity: 0.18, blur: 32, borderOpacity: 0.25, saturation: 200, hoverOpacityAdd: 0.02, hoverBorderAdd: 0.05 }
}

const DEFAULT_GLASS_SETTINGS: GlassSettings = {
  preset: "subtle",
  ...GLASS_PRESETS.subtle
}

const themeColorMap: Record<ThemeColor, ThemeColors> = {
  slate: {
    primary: "215 25% 63%",
    primaryRgb: "148, 162, 180",
    gradientFrom: "#94a2b4",
    gradientTo: "#7a8a9e",
    name: "Slate"
  },
  orange: {
    primary: "24 100% 50%",
    primaryRgb: "255, 153, 0",
    gradientFrom: "#ff9500",
    gradientTo: "#ff6a00",
    name: "Terminal Orange"
  },
  indigo: {
    primary: "239 50% 68%",
    primaryRgb: "150, 153, 200",
    gradientFrom: "#9699c8",
    gradientTo: "#8385ba",
    name: "Lavender"
  },
  purple: {
    primary: "270 45% 68%",
    primaryRgb: "175, 150, 200",
    gradientFrom: "#af96c8",
    gradientTo: "#9880b0",
    name: "Lilac"
  },
  emerald: {
    primary: "160 40% 58%",
    primaryRgb: "117, 168, 148",
    gradientFrom: "#75a894",
    gradientTo: "#5f9680",
    name: "Sage"
  },
  rose: {
    primary: "350 50% 68%",
    primaryRgb: "200, 145, 155",
    gradientFrom: "#c89199",
    gradientTo: "#b27c85",
    name: "Blush"
  },
  amber: {
    primary: "45 55% 63%",
    primaryRgb: "198, 175, 125",
    gradientFrom: "#c6af7d",
    gradientTo: "#b29c6a",
    name: "Sand"
  },
  blue: {
    primary: "210 50% 65%",
    primaryRgb: "135, 165, 200",
    gradientFrom: "#87a5c8",
    gradientTo: "#7292b2",
    name: "Sky"
  }
}

interface ThemeContextType {
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void
  colors: ThemeColors
  availableColors: { key: ThemeColor; colors: ThemeColors }[]
  backgroundColor: string
  setBackgroundColor: (color: string) => void
  glassSettings: GlassSettings
  setGlassPreset: (preset: GlassPreset) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>("orange")
  const [backgroundColor, setBackgroundColorState] = useState<string>("#050505")
  const [glassSettings, setGlassSettingsState] = useState<GlassSettings>(DEFAULT_GLASS_SETTINGS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedColor = localStorage.getItem("theme-color") as ThemeColor
    if (savedColor && themeColorMap[savedColor]) {
      setThemeColorState(savedColor)
    }
    const savedBgColor = localStorage.getItem("theme-bg-color")
    if (savedBgColor) {
      setBackgroundColorState(savedBgColor)
    }
    const savedGlass = localStorage.getItem("theme-glass")
    if (savedGlass) {
      try {
        const parsed = JSON.parse(savedGlass)
        setGlassSettingsState({ ...DEFAULT_GLASS_SETTINGS, ...parsed })
      } catch {
        // Use default
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const colors = themeColorMap[themeColor]
    const root = document.documentElement
    root.style.setProperty("--theme-primary", colors.primary)
    root.style.setProperty("--theme-primary-rgb", colors.primaryRgb)
    root.style.setProperty("--theme-gradient-from", colors.gradientFrom)
    root.style.setProperty("--theme-gradient-to", colors.gradientTo)
    localStorage.setItem("theme-color", themeColor)
  }, [themeColor, mounted])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty("--theme-bg-color", backgroundColor)
    localStorage.setItem("theme-bg-color", backgroundColor)
  }, [backgroundColor, mounted])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.style.setProperty("--glass-opacity", glassSettings.opacity.toString())
    root.style.setProperty("--glass-blur", `${glassSettings.blur}px`)
    root.style.setProperty("--glass-border-opacity", glassSettings.borderOpacity.toString())
    root.style.setProperty("--glass-saturation", `${glassSettings.saturation}%`)
    root.style.setProperty("--glass-hover-opacity-add", glassSettings.hoverOpacityAdd.toString())
    root.style.setProperty("--glass-hover-border-add", glassSettings.hoverBorderAdd.toString())
    localStorage.setItem("theme-glass", JSON.stringify(glassSettings))
  }, [glassSettings, mounted])

  const setThemeColor = (color: ThemeColor) => setThemeColorState(color)
  const setBackgroundColor = (color: string) => setBackgroundColorState(color)

  const setGlassPreset = (preset: GlassPreset) => {
    if (preset === "custom") {
      setGlassSettingsState(prev => ({ ...prev, preset: "custom" }))
    } else {
      setGlassSettingsState({ preset, ...GLASS_PRESETS[preset] })
    }
  }

  const availableColors = Object.entries(themeColorMap).map(([key, colors]) => ({
    key: key as ThemeColor,
    colors
  }))

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        setThemeColor,
        colors: themeColorMap[themeColor],
        availableColors,
        backgroundColor,
        setBackgroundColor,
        glassSettings,
        setGlassPreset
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

