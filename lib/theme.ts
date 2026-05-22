export const theme = {
  colors: {
    bgBase: "#0f0e17",
    bgSurface: "#1a1825",
    bgInput: "#231f35",
    accentPurple: "#7c5cbf",
    accentPurpleGlow: "#9b7de8",
    accentPurpleDim: "#3d2d6b",
    textPrimary: "#f0eaf9",
    textSecondary: "#9e96b5",
    textDim: "#5a5370",
    borderSubtle: "#2e2945",
    userBubble: "#2a2440",
    aiBubble: "transparent",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    baseFontSize: "16px",
    baseLineHeight: 1.75,
    messageFontSize: "15px",
    headingLetterSpacing: "0.02em",
  },
  borderRadius: {
    min: "12px",
    pill: "999px",
  },
  transition: {
    base: "0.25s ease",
  },
} as const;

export type Theme = typeof theme;

/** CSS variable references — use these for inline styles so values stay in sync with globals.css */
export const cssVars = {
  bgBase: "var(--bg-base)",
  bgSurface: "var(--bg-surface)",
  bgInput: "var(--bg-input)",
  accentPurple: "var(--accent-purple)",
  accentPurpleGlow: "var(--accent-purple-glow)",
  accentPurpleDim: "var(--accent-purple-dim)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textDim: "var(--text-dim)",
  borderSubtle: "var(--border-subtle)",
  userBubble: "var(--user-bubble)",
  aiBubble: "var(--ai-bubble)",
} as const;

export type CssVars = typeof cssVars;
