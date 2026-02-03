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
      top="25%"
      left="10%"
      width={80}
      height={36}
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
      <text fg={COLORS.normal}><strong>  Panels</strong></text>
      <text fg={COLORS.normal}>    [1] Configs       Select a config</text>
      <text fg={COLORS.normal}>    [2] Environments  Select an environment</text>
      <text fg={COLORS.normal}>    [3] Bindings      View bindings</text>
      <text fg={COLORS.normal}>    [4] Actions       Start dev/deploy/tail</text>
      <text fg={COLORS.normal}>    [5] Output        View session output</text>
      <text fg={COLORS.normal}>    [6] History       View session history</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Navigation</strong></text>
      <text fg={COLORS.normal}>    j/k or arrows Move up/down</text>
      <text fg={COLORS.normal}>    g/G           Go to top/bottom</text>
      <text fg={COLORS.normal}>    Ctrl+D/U      Page down/up</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Actions Panel</strong></text>
      <text fg={COLORS.normal}>    Enter         Start action or view output</text>
      <text fg={COLORS.normal}>    x             Stop running session</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  Output Panel</strong></text>
      <text fg={COLORS.normal}>    c             Clear output</text>
      <text fg={COLORS.normal}>    k             Stop running session</text>
      <text fg={COLORS.normal}>    Ctrl+C        Stop running session</text>
      <text> </text>
      <text fg={COLORS.normal}><strong>  History Panel</strong></text>
      <text fg={COLORS.normal}>    j/k or arrows Navigate history</text>
      <text fg={COLORS.normal}>    Enter         View session output</text>
      <text fg={COLORS.normal}>    Selected      Shows full command</text>
      <text> </text>
      <text fg={COLORS.muted}>  Press Esc or ? to close</text>
    </box>
  );
}
