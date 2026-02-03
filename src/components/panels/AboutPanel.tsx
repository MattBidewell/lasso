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
      <text fg={COLORS.muted}>  Ctrl+D/U       Page down/up</text>
      <text fg={COLORS.muted}>  Tab            Cycle focus forward</text>
      <text fg={COLORS.muted}>  Shift+Tab      Cycle focus backward</text>
      <text fg={COLORS.muted}>  1-5            Jump to panel 1-5</text>
      <text> </text>

      <text fg={COLORS.title}><strong>Actions</strong></text>
      <text fg={COLORS.muted}>  Enter          Start/stop dev server</text>
      <text fg={COLORS.muted}>  d              Deploy worker</text>
      <text fg={COLORS.muted}>  t              Tail logs</text>
      <text fg={COLORS.muted}>  /              Search configs</text>
      <text fg={COLORS.muted}>  c              Clear output/logs</text>
      <text fg={COLORS.muted}>  o              Open in $EDITOR</text>
      <text fg={COLORS.muted}>  ?              Show help</text>
      <text fg={COLORS.muted}>  q              Quit</text>
      <text> </text>

      <text fg={COLORS.title}><strong>When Running</strong></text>
      <text fg={COLORS.muted}>  Esc/b          Stop and return</text>
      <text fg={COLORS.muted}>  Ctrl+C         Stop process</text>
      <text fg={COLORS.muted}>  f              Toggle log format</text>
      <text> </text>

      <text fg={"#3b82f6"}>github.com/mattbidewell/lasso</text>
      <text fg={COLORS.muted}>Made with OpenTUI</text>
    </scrollbox>
  );
}
