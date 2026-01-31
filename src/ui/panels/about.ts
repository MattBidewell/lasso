import { Box, Text, vstyles } from "@opentui/core";
import { COLORS } from "../../themes/index.ts";

const VERSION = "0.1.0";

export function renderAboutPanel() {
  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: COLORS.inactiveBorder,
      padding: 1,
      title: " About ",
      titleAlignment: "left",
    },
    // Title
    Text(
      { marginBottom: 1 },
      vstyles.color(COLORS.selected, `Lasso v${VERSION}`),
    ),
    // Description
    Text(
      { marginBottom: 1 },
      vstyles.color(COLORS.normal, "A TUI for managing Cloudflare Workers Wrangler files in monorepos."),
    ),

    // Keybindings section
    Text({ marginTop: 1 }, vstyles.color(COLORS.title, "Navigation")),
    Text({}, vstyles.dim("  j/k         "), vstyles.color(COLORS.normal, "Move up/down")),
    Text({}, vstyles.dim("  h/l         "), vstyles.color(COLORS.normal, "Move left/right")),
    Text({}, vstyles.dim("  Tab         "), vstyles.color(COLORS.normal, "Cycle focus")),
    Text({}, vstyles.dim("  g/G         "), vstyles.color(COLORS.normal, "Go to top/bottom")),

    Text({ marginTop: 1 }, vstyles.color(COLORS.title, "Actions")),
    Text({}, vstyles.dim("  Enter       "), vstyles.color(COLORS.normal, "Run dev server")),
    Text({}, vstyles.dim("  Ctrl+D      "), vstyles.color(COLORS.normal, "Deploy worker")),
    Text({}, vstyles.dim("  r           "), vstyles.color(COLORS.normal, "Refresh configs")),
    Text({}, vstyles.dim("  q           "), vstyles.color(COLORS.normal, "Quit")),

    // Links
    Text({ marginTop: 1 }, vstyles.color(COLORS.title, "Links")),
    Text(
      {},
      vstyles.dim("  GitHub: "),
      vstyles.color(COLORS.accent, "github.com/mattbidewell/lasso"),
    ),

    // Footer
    Text({ marginTop: 1 }, vstyles.dim("Made with OpenTUI")),
  );
}
