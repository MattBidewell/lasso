import { ScrollBox, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import type { KeyName } from "../input.ts";
import type { Panel, InputResult, BasePanelCallbacks } from "./types.ts";
import { COLORS } from "../../themes/index.ts";

export interface LogsPanelCallbacks extends BasePanelCallbacks {
  onScrollLogs: (delta: number) => void;
}

export class LogsPanel implements Panel {
  readonly id = "logs";

  constructor(private callbacks: LogsPanelCallbacks) {}

  render(state: AppState) {
    const selected = state.configs[state.selectedConfigIndex];
    const env = selected?.environments[state.selectedEnvIndex];

    // Build command string for display
    const baseCommand = "wrangler tail";
    const command =
      env && env !== "default" ? `${baseCommand} --env ${env}` : baseCommand;

    // Determine title and border color based on state
    const isFocused = state.focusedPanel === "logs";
    let title: string;
    let borderColor: string;

    if (isFocused) {
      title = " Logs (focused) ";
      borderColor = COLORS.activeBorder;
    } else if (state.isTailing) {
      title = " Logs (tailing) ";
      borderColor = COLORS.success;
    } else {
      title = " Logs (stopped) ";
      borderColor = COLORS.inactiveBorder;
    }

    return ScrollBox(
      {
        id: "logs-scrollbox",
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
        vstyles.color(COLORS.normal, state.isTailing ? command : "tail stopped"),
      ),
      // Log output lines
      ...state.tailOutput.map((line, i) =>
        Text({ id: `log-${i}` }, vstyles.color(COLORS.normal, line)),
      ),
      // Empty state
      ...(state.tailOutput.length === 0
        ? [Text({}, vstyles.dim("No logs yet. Press 't' to start tailing."))]
        : []),
    );
  }

  handleInput(key: KeyName, state: AppState): InputResult {
    switch (key) {
      case "k":
      case "up":
        this.callbacks.onScrollLogs(-1);
        return { handled: true };

      case "j":
      case "down":
        this.callbacks.onScrollLogs(1);
        return { handled: true };

      case "g":
        this.callbacks.onScrollLogs(-Infinity);
        return { handled: true };

      case "G":
        this.callbacks.onScrollLogs(Infinity);
        return { handled: true };

      case "h":
      case "left":
      case "escape":
      case "b":
        // Go back to environments panel
        return {
          handled: true,
          stateUpdates: { focusedPanel: "environments" },
        };
    }

    return { handled: false };
  }
}
