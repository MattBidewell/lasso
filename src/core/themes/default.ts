// Lazydocker-inspired orange theme
export const COLORS = {
  // Border colors
  activeBorder: "#f59e0b",   // Orange for focused panels
  inactiveBorder: "#6b7280", // Gray for unfocused panels
  border: "#6b7280",         // Default border (alias for inactive)
  debugBorder: "#38bdf8",    // Blue for debug panel

  // Text colors
  title: "#fafafa",
  selected: "#f59e0b",       // Orange for selected items
  selectedBg: "#78350f",     // Dark orange background
  normal: "#e5e5e5",
  muted: "#737373",

  // Semantic colors
  error: "#ef4444",          // Red for errors
  success: "#22c55e",        // Green for success
  accent: "#f59e0b",         // Orange accent

  // Scroll indicators (legacy)
  scrollIndicator: "#6b7280",

  // Scrollbar colors
  scrollbarTrack: "#404040",
  scrollbarThumb: "#737373",
  scrollbarThumbHover: "#f59e0b",
} as const;

export type ColorKey = keyof typeof COLORS;
