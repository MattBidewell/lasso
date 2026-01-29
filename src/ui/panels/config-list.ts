import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export function renderConfigListPanel(state: AppState) {
  const isFocused = state.focusedPanel === 'configs';

  return Box(
    {
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: isFocused ? COLORS.selected : COLORS.border,
      padding: 1,
      title: " Configs ",
      titleAlignment: "left",
    },
    // Config list
    ...state.configs.map((config, index) => {
      const isSelected = index === state.selectedConfigIndex;
      const prefix = isSelected ? ">" : " ";
      const name = config.name;
      const errorSuffix = config.error ? " !" : "";

      return Box(
        {
          backgroundColor: isSelected && isFocused ? COLORS.selectedBg : undefined,
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
      ? [
          Text({ marginTop: 1 }, vstyles.dim("No configs found")),
        ]
      : []),
  );
}
