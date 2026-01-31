import { ScrollBox, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export function renderOutputPanel(state: AppState) {
  const selected = state.configs[state.selectedConfigIndex];
  const env = selected?.environments[state.selectedEnvIndex];

  // Determine command type and build command string
  const commandType = state.currentCommand || "dev";

  const baseCommand =
    commandType === "deploy" ? "wrangler deploy" : "wrangler dev";

  const command =
    env && env !== "default" ? `${baseCommand} --env ${env}` : baseCommand;

  // Determine title and border color based on state
  const isFocused = state.focusedPanel === "output";
  let title: string;
  let borderColor: string;

  if (isFocused) {
    title = " Output (focused) ";
    borderColor = COLORS.activeBorder;
  } else if (state.isDeploying) {
    title = " Output (deploying) ";
    borderColor = COLORS.accent;
  } else if (state.isRunning) {
    title = " Output (running) ";
    borderColor = COLORS.success;
  } else {
    title = " Output (stopped) ";
    borderColor = COLORS.inactiveBorder;
  }

  return ScrollBox(
    {
      id: "output-scrollbox",
      flexGrow: 1,
      scrollY: true,
      scrollX: false,
      stickyScroll: true,
      stickyStart: "bottom",
      viewportCulling: true,
      rootOptions: {
        border: true,
        borderStyle: "rounded",
        borderColor,
        padding: 1,
        title,
        titleAlignment: "left",
      },
    },
    // Command
    Text(
      { marginBottom: 1 },
      vstyles.dim("$ "),
      vstyles.color(COLORS.normal, command),
    ),
    // Output lines - render all, ScrollBox handles viewport and auto-scroll to bottom
    ...state.output.map((line, i) =>
      Text({ id: `output-${i}` }, vstyles.color(COLORS.normal, line)),
    ),
    // Empty state
    ...(state.output.length === 0
      ? [Text({}, vstyles.dim("No output yet"))]
      : []),
  );
}
