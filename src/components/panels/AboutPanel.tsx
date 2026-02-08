import { COLORS } from "../../themes/index.ts";

const VERSION = "0.1.0";

const LOGO = `
  ██╗      █████╗ ███████╗███████╗ ██████╗ 
  ██║     ██╔══██╗██╔════╝██╔════╝██╔═══██╗
  ██║     ███████║███████╗███████╗██║   ██║
  ██║     ██╔══██║╚════██║╚════██║██║   ██║
  ███████╗██║  ██║███████║███████║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ 
`;

export function AboutPanel() {
  return (
    <scrollbox
      title="About"
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.inactiveBorder}
      height="100%"
      padding={1}
    >
      <text fg={COLORS.accent}>{LOGO}</text>
      <text> </text>
      <text fg={COLORS.muted}>  Version {VERSION}</text>
      <text> </text>

      <text fg={COLORS.title}><strong>Navigation</strong></text>
      <text fg={COLORS.muted}>  j/k or ↑↓      Move up/down</text>
      <text fg={COLORS.muted}>  g/G            Jump to top/bottom</text>
      <text fg={COLORS.muted}>  Tab            Cycle focus forward</text>
      <text fg={COLORS.muted}>  1-6            Jump to panel 1-6</text>
      <text fg={COLORS.muted}>  Update         lasso update / lasso upgrade</text>
      <text> </text>

      <text fg={COLORS.title}><strong>Actions</strong></text>
      <text fg={COLORS.muted}>  Enter          Start action</text>
      <text fg={COLORS.muted}>  x              Stop running session</text>
      <text fg={COLORS.muted}>  k              Stop running session</text>
      <text fg={COLORS.muted}>  Ctrl+C         Stop running session</text>
      <text fg={COLORS.muted}>  ?              Show help</text>
      <text fg={COLORS.muted}>  q              Quit</text>
      <text> </text>

      <text fg={"#3b82f6"}>github.com/mattbidewell/lasso</text>
      <text fg={COLORS.muted}>Made with OpenTUI</text>
    </scrollbox>
  );
}
