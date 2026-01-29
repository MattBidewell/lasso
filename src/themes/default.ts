// Cloudflare-inspired orange theme
export const COLORS = {
  border: "#525252",
  title: "#fafafa",
  selected: "#f6821f",
  selectedBg: "#7c2d12",
  normal: "#e5e5e5",
  muted: "#737373",
  error: "#ef4444", // Red for errors
  success: "#f6821f", // Orange for success
  accent: "#fbbd23", // Golden yellow accent
} as const;

export type ColorKey = keyof typeof COLORS;
