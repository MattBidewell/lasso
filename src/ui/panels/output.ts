import { ScrollBox, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import type { KeyName } from "../input.ts";
import type { Panel, InputResult, BasePanelCallbacks } from "./types.ts";
import { COLORS } from "../../themes/index.ts";

export interface OutputPanelCallbacks extends BasePanelCallbacks {
  onScrollOutput: (delta: number) => void;
}

export class OutputPanel implements Panel {
  readonly id = "output";

  constructor(private callbacks: OutputPanelCallbacks) {}

  render(state: AppState) {
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

  handleInput(key: KeyName, state: AppState): InputResult {
    switch (key) {
      case "k":
      case "up":
        // Scroll up (negative delta moves viewport up, showing earlier content)
        this.callbacks.onScrollOutput(-1);
        return { handled: true };

      case "j":
      case "down":
        // Scroll down (positive delta moves viewport down, showing later content)
        this.callbacks.onScrollOutput(1);
        return { handled: true };

      case "g":
        // Jump to top
        this.callbacks.onScrollOutput(-Infinity);
        return { handled: true };

      case "G":
        // Jump to bottom
        this.callbacks.onScrollOutput(Infinity);
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
