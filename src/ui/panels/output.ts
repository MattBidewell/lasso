import { Box, Text, ScrollBox, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export function renderOutputPanel(state: AppState) {
  const selected = state.configs[state.selectedConfigIndex];
  const env = selected?.environments[state.selectedEnvIndex];
  const command = env && env !== "default"
    ? `wrangler dev --env ${env}`
    : "wrangler dev";

  return Box(
    {
      height: 12,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: state.isRunning ? COLORS.success : COLORS.border,
      padding: 1,
      title: state.isRunning ? " Output (running) " : " Output (stopped) ",
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
        stickyScroll: true,
        stickyStart: "bottom",
      },
      ...state.output.map((line, i) =>
        Text({ id: `output-${i}` }, vstyles.color(COLORS.normal, line)),
      ),
    ),
  );
}
