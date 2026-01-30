import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";
import { renderConfigListPanel } from "../panels/config-list.ts";
import { renderConfigDetailPanel } from "../panels/config-detail.ts";
import { renderOutputPanel } from "../panels/output.ts";
import { renderDeployConfirmModal } from "../modals/index.ts";

export function renderMainScreen(state: AppState) {
  const showOutput = state.isRunning || state.isDeploying || state.output.length > 0;

  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
    },
    // Main content area: left panel + right column
    Box(
      {
        flexGrow: 1,
        flexDirection: "row",
        gap: 1,
      },
      // Left panel: config list (full height)
      renderConfigListPanel(state),
      // Right column: details + output stacked
      Box(
        {
          flexGrow: 1,
          flexDirection: "column",
          gap: 1,
        },
        // Config details (top half)
        renderConfigDetailPanel(state),
        // Output panel (bottom half, only when has content)
        ...(showOutput ? [renderOutputPanel(state)] : []),
      ),
    ),
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
            : state.focusedPanel === 'environments'
            ? "j/k navigate  Enter run  ^D deploy  h/←/Esc back  q quit"
            : "j/k scroll  h/←/Esc back  q quit",
        ),
      ),
      ...(state.statusMessage
        ? [Text({}, vstyles.color(COLORS.success, state.statusMessage))]
        : []),
    ),
    // Modal overlay
    ...(state.modal?.type === 'deploy-confirm'
      ? [renderDeployConfirmModal(state.modal)]
      : []),
  );
}
