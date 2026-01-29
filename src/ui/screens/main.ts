import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";
import { renderConfigListPanel } from "../panels/config-list.ts";
import { renderConfigDetailPanel } from "../panels/config-detail.ts";
import { renderOutputPanel } from "../panels/output.ts";

export function renderMainScreen(state: AppState) {
  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
    },
    // Top section: split panels
    Box(
      {
        flexGrow: 1,
        flexDirection: "row",
        gap: 1,
      },
      // Left panel: config list
      renderConfigListPanel(state),
      // Right panel: config details
      renderConfigDetailPanel(state),
    ),
    // Bottom panel: output (only when running or has output)
    ...(state.isRunning || state.output.length > 0
      ? [renderOutputPanel(state)]
      : []),
    // Status bar
    Box(
      {
        paddingTop: 1,
        flexDirection: "row",
        gap: 2,
      },
      Text(
        {},
        vstyles.dim(
          state.focusedPanel === 'configs'
            ? "j/k navigate  l/→/Enter select  r refresh  q quit"
            : "j/k navigate  Enter run  h/←/Esc back  q quit",
        ),
      ),
      ...(state.statusMessage
        ? [Text({}, vstyles.color(COLORS.success, state.statusMessage))]
        : []),
    ),
  );
}
