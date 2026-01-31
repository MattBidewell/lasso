import { ScrollBox, Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export interface ConfigListPanelProps {
  state: AppState;
}

export function renderConfigListPanel({ state }: ConfigListPanelProps) {
  const isFocused = state.focusedPanel === 'configs';

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
