import { ScrollBox, Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import type { KeyName } from "../input.ts";
import type { Panel, InputResult, BasePanelCallbacks } from "./types.ts";
import { COLORS } from "../../themes/index.ts";
import { getEnvsScrollOffset } from "../../state/index.ts";

export interface EnvironmentsPanelCallbacks extends BasePanelCallbacks {
  onStartDev: () => void;
  onScrollToSelection: (index: number) => void;
}

export class EnvironmentsPanel implements Panel {
  readonly id = "environments";

  constructor(private callbacks: EnvironmentsPanelCallbacks) {}

  render(state: AppState) {
    const selected = state.configs[state.selectedConfigIndex];
    const isFocused = state.focusedPanel === "environments";

    if (!selected) {
      return ScrollBox(
        {
          id: "environments-scrollbox",
          flexGrow: 1,
          scrollY: true,
          scrollX: false,
          rootOptions: {
            border: true,
            borderStyle: "rounded",
            borderColor: COLORS.inactiveBorder,
            padding: 1,
            title: " Environments ",
            titleAlignment: "left",
          },
        },
        Text({}, vstyles.dim("No config selected")),
      );
    }

    return ScrollBox(
      {
        id: "environments-scrollbox",
        flexGrow: 1,
        scrollY: true,
        scrollX: false,
        viewportCulling: true,
        rootOptions: {
          border: true,
          borderStyle: "rounded",
          borderColor: isFocused ? COLORS.activeBorder : COLORS.inactiveBorder,
          padding: 1,
          title: " Environments ",
          titleAlignment: "left",
        },
      },
      // Environment items - render all, ScrollBox handles viewport
      ...selected.environments.map((env, index) => {
        const isSelected = index === state.selectedEnvIndex;
        const prefix = isSelected ? ">" : " ";
        const displayName = env === "default" ? "(default)" : env;

        return Box(
          {
            id: `env-item-${index}`,
            backgroundColor:
              isSelected && isFocused ? COLORS.selectedBg : undefined,
          },
          Text(
            {},
            isSelected && isFocused
              ? vstyles.color(COLORS.selected, `${prefix} ${displayName}`)
              : isSelected
                ? vstyles.color(COLORS.normal, `${prefix} ${displayName}`)
                : vstyles.color(COLORS.muted, `${prefix} ${displayName}`),
          ),
        );
      }),
      // Empty state
      ...(selected.environments.length === 0
        ? [Text({}, vstyles.dim("No environments"))]
        : []),
    );
  }

  handleInput(key: KeyName, state: AppState): InputResult {
    const selected = state.configs[state.selectedConfigIndex];
    if (!selected) return { handled: false };

    const maxEnvIndex = selected.environments.length - 1;

    switch (key) {
      case "j":
      case "down": {
        const newIndex = Math.min(state.selectedEnvIndex + 1, maxEnvIndex);
        const newOffset = getEnvsScrollOffset(
          state.environmentsScrollOffset,
          newIndex,
        );
        this.callbacks.onScrollToSelection(newIndex);
        return {
          handled: true,
          stateUpdates: {
            selectedEnvIndex: newIndex,
            environmentsScrollOffset: newOffset,
          },
        };
      }

      case "k":
      case "up": {
        const newIndex = Math.max(state.selectedEnvIndex - 1, 0);
        const newOffset = getEnvsScrollOffset(
          state.environmentsScrollOffset,
          newIndex,
        );
        this.callbacks.onScrollToSelection(newIndex);
        return {
          handled: true,
          stateUpdates: {
            selectedEnvIndex: newIndex,
            environmentsScrollOffset: newOffset,
          },
        };
      }

      case "g":
        // Jump to top
        this.callbacks.onScrollToSelection(0);
        return {
          handled: true,
          stateUpdates: {
            selectedEnvIndex: 0,
            environmentsScrollOffset: 0,
          },
        };

      case "G":
        // Jump to bottom
        this.callbacks.onScrollToSelection(maxEnvIndex);
        return {
          handled: true,
          stateUpdates: {
            selectedEnvIndex: maxEnvIndex,
            environmentsScrollOffset: getEnvsScrollOffset(
              state.environmentsScrollOffset,
              maxEnvIndex,
            ),
          },
        };

      case "enter":
        this.callbacks.onStartDev();
        return { handled: true };

      case "h":
      case "left":
      case "escape":
      case "b":
        return {
          handled: true,
          stateUpdates: { focusedPanel: "configs" },
        };
    }

    return { handled: false };
  }
}
