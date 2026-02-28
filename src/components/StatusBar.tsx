import { state } from "../state/store.ts";
import { COLORS } from "../themes/index.ts";

export function StatusBar() {
  // Derive shortcuts based on focused panel
  const shortcuts = () => {
    const base = [
      "Tab:focus",
      "?:help",
      "q:quit",
      ...(state.debugEnabled ? ["7:debug"] : []),
    ];

    switch (state.focusedPanel) {
      case "configs":
        return [...base, "j/k:nav"];
      case "environments":
        return [...base, "j/k:nav", "A:add", "E:edit", "D:delete"];
      case "bindings":
        return [...base, "j/k:nav", "A:add", "E:edit", "D:delete"];
      case "actions":
        return [...base, "j/k:nav", "Enter:start", "x:stop"];
      case "history":
        return [...base, "j/k:nav", "Enter:view"];
      case "output":
        return [...base, "x:stop", "k/ctrl+c:stop"];
      case "debug":
        return [...base, "j/k:scroll", "g/G:jump"];
      default:
        return base;
    }
  };

  return <text fg={COLORS.muted}>{shortcuts().join(" | ")}</text>;
}
