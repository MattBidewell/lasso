import { useKeyboard } from "@opentui/solid";
import { state } from "../../state/store.ts";
import { closeModal } from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";

export function HelpModal() {
  const modal = () => state.modal;

  useKeyboard((event) => {
    if (modal()?.type !== "help") return;

    switch (event.name) {
      case "escape":
      case "?":
      case "q":
        closeModal();
        break;
    }
  });

  return (
    <box
      position="absolute"
      top="15%"
      left="20%"
      width={60}
      height={32}
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title="Help"
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.accent}><strong>  Keybindings</strong></text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Global</strong></text>
      <text fg={COLORS.normal}>    q             Quit</text>
      <text fg={COLORS.normal}>    ?             Toggle help</text>
      <text fg={COLORS.normal}>    Tab           Cycle panels forward</text>
      <text fg={COLORS.normal}>    Shift+Tab     Cycle panels backward</text>
      <text fg={COLORS.normal}>    1-6           Jump to panel</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Navigation</strong></text>
      <text fg={COLORS.normal}>    j/k or arrows Move up/down</text>
      <text fg={COLORS.normal}>    g/G           Go to top/bottom</text>
      <text fg={COLORS.normal}>    Ctrl+D/U      Page down/up</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Actions (Environments)</strong></text>
      <text fg={COLORS.normal}>    Enter         Start dev server</text>
      <text fg={COLORS.normal}>    d             Deploy worker</text>
      <text fg={COLORS.normal}>    t             Tail logs</text>
      <text fg={COLORS.normal}>    o             Open config in $EDITOR</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Sessions Panel</strong></text>
      <text fg={COLORS.normal}>    Enter         View session output</text>
      <text fg={COLORS.normal}>    x             Stop running session</text>
      <text fg={COLORS.normal}>    d             Remove stopped session</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Output/Logs</strong></text>
      <text fg={COLORS.normal}>    c             Clear output</text>
      <text fg={COLORS.normal}>    Esc/b         Go back</text>
      <text> </text>
      <text fg={COLORS.muted}>  Press Esc or ? to close</text>
    </box>
  );
}
