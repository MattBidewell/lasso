import { Box, Text, vstyles } from "@opentui/core";
import type { DeployModalState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export function renderDeployConfirmModal(modal: DeployModalState) {
  const hasMultipleEnvs = modal.environments.length > 1;

  return Box(
    {
      position: "absolute",
      top: "40%",
      left: "40%",
      width: 44,
      backgroundColor: "#1a1a1a",
      border: true,
      borderStyle: "rounded",
      borderColor: COLORS.selected,
      flexDirection: "column",
      padding: 1,
      zIndex: 1000,
    },
    // Title
    Box(
      {
        justifyContent: "center",
        marginBottom: 1,
      },
      Text({}, vstyles.color(COLORS.title, "Deploy Worker?")),
    ),
    // Worker info
    Box(
      {
        flexDirection: "column",
        gap: 0,
        paddingLeft: 1,
        paddingRight: 1,
      },
      Text(
        {},
        vstyles.dim("Worker: "),
        vstyles.color(COLORS.selected, modal.workerName),
      ),
      Text(
        {},
        vstyles.dim("Environment: "),
        vstyles.color(COLORS.normal, modal.environment),
      ),
    ),
    // Divider
    Box({ marginTop: 1, marginBottom: 1 }),
    // Options
    Box(
      {
        flexDirection: "column",
        gap: 0,
        paddingLeft: 1,
        paddingRight: 1,
      },
      Text(
        {},
        vstyles.color(COLORS.accent, "[y]"),
        vstyles.color(COLORS.normal, " Deploy selected"),
      ),
      ...(hasMultipleEnvs
        ? [
            Text(
              {},
              vstyles.color(COLORS.accent, "[a]"),
              vstyles.color(COLORS.normal, ` Deploy all (${modal.environments.length} envs)`),
            ),
          ]
        : []),
      Text(
        {},
        vstyles.color(COLORS.muted, "[n]"),
        vstyles.color(COLORS.muted, " Cancel"),
      ),
    ),
  );
}
