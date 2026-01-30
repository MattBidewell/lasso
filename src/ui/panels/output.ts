import { Box, Text, ScrollBox, vstyles } from "@opentui/core";
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

  // Calculate visible output based on scroll offset
  const visibleOutput = state.output;

  if (isFocused) {
    title = " Output (focused) ";
    borderColor = COLORS.selected;
  } else if (state.isDeploying) {
    title = " Output (deploying) ";
    borderColor = COLORS.accent;
  } else if (state.isRunning) {
    title = " Output (running) ";
    borderColor = COLORS.success;
  } else {
    title = " Output (stopped) ";
    borderColor = COLORS.border;
  }

  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor,
      padding: 1,
      title,
      titleAlignment: "left",
    },
    // Command
    Text(
      { marginBottom: 1 },
      vstyles.dim("$ "),
      vstyles.color(COLORS.normal, command),
    ),
    // Output area
    ScrollBox(
      {
        flexGrow: 1,
        stickyStart: "bottom",
      },
      ...visibleOutput.map((line, i) =>
        Text({ id: `output-${i}` }, vstyles.color(COLORS.normal, line)),
      ),
    ),
  );
}
