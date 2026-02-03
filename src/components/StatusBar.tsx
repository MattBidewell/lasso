import { state } from "../state/store.ts";
import { COLORS } from "../themes/index.ts";

export function StatusBar() {
  // Derive shortcuts based on focused panel
  const shortcuts = () => {
    const base = ["Tab:focus", "?:help", "q:quit"];

    switch (state.focusedPanel) {
      case "configs":
        return [...base, "j/k:nav"];
      case "environments":
        return [...base, "j/k:nav"];
      case "bindings":
        return [...base, "j/k:nav"];
      case "actions":
        return [...base, "j/k:nav", "Enter:start", "x:stop"];
      case "history":
        return [...base, "j/k:nav", "Enter:view"];
      case "output":
        return [...base, "c:clear", "x:stop", "k/ctrl+c:stop"];
      default:
        return base;
    }
  };

  return <text fg={COLORS.muted}>{shortcuts().join(" | ")}</text>;
}
