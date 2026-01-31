import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";
import { renderConfigListPanel } from "../panels/config-list.ts";
import { renderEnvironmentsPanel } from "../panels/environments.ts";
import { renderBindingsPanel } from "../panels/bindings.ts";
import { renderAboutPanel } from "../panels/about.ts";
import { renderOutputPanel } from "../panels/output.ts";
import { renderDeployConfirmModal } from "../modals/index.ts";

export function renderMainScreen(state: AppState) {
  const showOutput = state.isRunning || state.isDeploying || state.output.length > 0;

  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
    },
    // Main content area: left column (33%) + right column (67%)
    Box(
      {
        flexGrow: 1,
        flexDirection: "row",
        gap: 1,
      },
      // Left column (33%) - 3 stacked panels
      Box(
        {
          width: "33%",
          flexDirection: "column",
          gap: 0,
        },
        // Configs panel (ScrollBox handles its own viewport)
        renderConfigListPanel({ state }),
        // Environments panel (ScrollBox handles its own viewport)
        renderEnvironmentsPanel({ state }),
        // Bindings panel (display-only, compact)
        renderBindingsPanel(state),
      ),
      // Right column (67%) - About OR Output
      Box(
        {
          width: "67%",
          flexDirection: "column",
        },
        showOutput
          ? renderOutputPanel(state)
          : renderAboutPanel(),
      ),
    ),
    // Status bar
    renderStatusBar(state),
    // Modal overlay
    ...(state.modal?.type === 'deploy-confirm'
      ? [renderDeployConfirmModal(state.modal)]
      : []),
  );
}

function renderStatusBar(state: AppState) {
  const helpText = getContextualHelp(state);

  return Box(
    {
      paddingTop: 1,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    Text({}, vstyles.dim(helpText)),
    ...(state.statusMessage
      ? [Text({}, vstyles.color(COLORS.success, state.statusMessage))]
      : []),
  );
}

function getContextualHelp(state: AppState): string {
  switch (state.focusedPanel) {
    case 'configs':
      return "j/k navigate  Enter select  r refresh  Tab focus  q quit";
    case 'environments':
      return "j/k navigate  Enter run  ^D deploy  Tab focus  b back  q quit";
    case 'output':
      return "j/k scroll  ^U/^D page  Tab focus  b back  q quit";
    default:
      return "j/k navigate  Tab focus  q quit";
  }
}
