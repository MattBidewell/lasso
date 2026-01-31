import { ScrollBox, Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import type { KeyName } from "../input.ts";
import type { Panel, InputResult, BasePanelCallbacks } from "./types.ts";
import { COLORS } from "../../themes/index.ts";
import { getSwitchConfigUpdates } from "../../state/index.ts";

export interface ConfigsPanelCallbacks extends BasePanelCallbacks {
  onRefresh: () => void;
  onScrollToSelection: (index: number) => void;
}

export class ConfigsPanel implements Panel {
  readonly id = "configs";

  constructor(private callbacks: ConfigsPanelCallbacks) {}

  render(state: AppState) {
    const isFocused = state.focusedPanel === "configs";

    return ScrollBox(
      {
        id: "configs-scrollbox",
        flexGrow: 1,
        scrollY: true,
        scrollX: false,
        viewportCulling: true,
        rootOptions: {
          border: true,
          borderStyle: "rounded",
          borderColor: isFocused ? COLORS.activeBorder : COLORS.inactiveBorder,
          padding: 1,
          title: " Configs ",
          titleAlignment: "left",
        },
      },
      // Config list - render all items, ScrollBox handles viewport
      ...state.configs.map((config, index) => {
        const isSelected = index === state.selectedConfigIndex;
        const prefix = isSelected ? ">" : " ";
        const name = config.name;
        const errorSuffix = config.error ? " !" : "";

        return Box(
          {
            id: `config-item-${index}`,
            backgroundColor:
              isSelected && isFocused ? COLORS.selectedBg : undefined,
          },
          Text(
            {},
            isSelected && isFocused
              ? vstyles.color(COLORS.selected, `${prefix} ${name}${errorSuffix}`)
              : isSelected
                ? vstyles.color(COLORS.normal, `${prefix} ${name}${errorSuffix}`)
                : vstyles.color(COLORS.muted, `${prefix} ${name}${errorSuffix}`),
          ),
        );
      }),
      // Empty state
      ...(state.configs.length === 0
        ? [Text({ marginTop: 1 }, vstyles.dim("No configs found"))]
        : []),
    );
  }

  handleInput(key: KeyName, state: AppState): InputResult {
    const maxIndex = state.configs.length - 1;

    switch (key) {
      case "r":
        this.callbacks.onRefresh();
        return { handled: true };

      case "j":
      case "down": {
        const newIndex = Math.min(state.selectedConfigIndex + 1, maxIndex);
        if (newIndex !== state.selectedConfigIndex) {
          const updates = getSwitchConfigUpdates(state, newIndex);
          this.callbacks.onScrollToSelection(newIndex);
          return { handled: true, stateUpdates: updates };
        }
        return { handled: true };
      }

      case "k":
      case "up": {
        const newIndex = Math.max(state.selectedConfigIndex - 1, 0);
        if (newIndex !== state.selectedConfigIndex) {
          const updates = getSwitchConfigUpdates(state, newIndex);
          this.callbacks.onScrollToSelection(newIndex);
          return { handled: true, stateUpdates: updates };
        }
        return { handled: true };
      }

      case "g":
        // Jump to top
        if (state.configs.length > 0) {
          const updates = getSwitchConfigUpdates(state, 0);
          this.callbacks.onScrollToSelection(0);
          return {
            handled: true,
            stateUpdates: { ...updates, configsScrollOffset: 0 },
          };
        }
        return { handled: true };

      case "G":
        // Jump to bottom
        if (state.configs.length > 0) {
          const updates = getSwitchConfigUpdates(state, maxIndex);
          this.callbacks.onScrollToSelection(maxIndex);
          return { handled: true, stateUpdates: updates };
        }
        return { handled: true };

      case "enter":
      case "l":
      case "right":
        if (state.configs.length > 0) {
          const selected = state.configs[state.selectedConfigIndex];
          if (selected?.config) {
            return {
              handled: true,
              stateUpdates: {
                focusedPanel: "environments",
                selectedEnvIndex: 0,
                environmentsScrollOffset: 0,
              },
            };
          }
        }
        return { handled: true };
    }

    return { handled: false };
  }
}
