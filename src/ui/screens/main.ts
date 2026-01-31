import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import type { Panel } from "../panels/types.ts";
import { COLORS } from "../../themes/index.ts";
import { renderBindingsPanel } from "../panels/bindings.ts";
import { renderAboutPanel } from "../panels/about.ts";
import { renderDeployConfirmModal } from "../modals/index.ts";

export interface MainScreenPanels {
  configs: Panel;
  environments: Panel;
  output: Panel;
}

export function renderMainScreen(state: AppState, panels: MainScreenPanels) {
  const showOutput =
    state.isRunning || state.isDeploying || state.output.length > 0;

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
        // Configs panel
        panels.configs.render(state) as ReturnType<typeof renderBindingsPanel>,
        // Environments panel
        panels.environments.render(state) as ReturnType<typeof renderBindingsPanel>,
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
          ? (panels.output.render(state) as ReturnType<typeof renderAboutPanel>)
          : renderAboutPanel(),
      ),
    ),
    // Status bar
    renderStatusBar(state),
    // Modal overlay
    ...(state.modal?.type === "deploy-confirm"
      ? [renderDeployConfirmModal(state.modal)]
      : []),
  );
}

function renderStatusBar(state: AppState) {
  const shortcuts = getContextualShortcuts(state);

  return Box(
    {
      height: 2,
      flexShrink: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    Box(
      { flexDirection: "row", gap: 2 },
      ...shortcuts.map(([key, action]) =>
        Text(
          {},
          vstyles.color(COLORS.accent, key),
          vstyles.dim(` ${action}`),
        ),
      ),
    ),
    ...(state.statusMessage
      ? [Text({}, vstyles.color(COLORS.success, state.statusMessage))]
      : []),
  );
}

type Shortcut = [key: string, action: string];

function getContextualShortcuts(state: AppState): Shortcut[] {
  const common: Shortcut[] = [
    ["Tab", "focus"],
    ["q", "quit"],
  ];

  switch (state.focusedPanel) {
    case "configs":
      return [
        ["j/k", "navigate"],
        ["Enter", "select"],
        ["r", "refresh"],
        ...common,
      ];
    case "environments":
      return [
        ["j/k", "navigate"],
        ["Enter", "run"],
        ["^D", "deploy"],
        ["b", "back"],
        ...common,
      ];
    case "output":
      return [["j/k", "scroll"], ["g/G", "top/bottom"], ["b", "back"], ...common];
    default:
      return [["j/k", "navigate"], ...common];
  }
}
