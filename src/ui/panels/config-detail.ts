import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { countBindings } from "../../types/wrangler.ts";
import { COLORS } from "../../themes/index.ts";

export function renderConfigDetailPanel(state: AppState) {
  const selected = state.configs[state.selectedConfigIndex];
  const isFocused = state.focusedPanel === 'environments';

  if (!selected) {
    return Box(
      {
        flexGrow: 2,
        flexDirection: "column",
        border: true,
        borderStyle: "rounded",
        borderColor: COLORS.border,
        padding: 1,
        title: " Details ",
        titleAlignment: "left",
      },
      Text({}, vstyles.dim("No config selected")),
    );
  }

  const bindings = selected.config ? countBindings(selected.config) : null;

  return Box(
    {
      flexGrow: 2,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: isFocused ? COLORS.selected : COLORS.border,
      padding: 1,
      title: ` ${selected.name} `,
      titleAlignment: "left",
    },
    // Path
    Text(
      { marginBottom: 1 },
      vstyles.dim("Path: "),
      vstyles.color(COLORS.normal, selected.relativePath),
    ),
    // Error message if any
    ...(selected.error
      ? [
          Text(
            { marginBottom: 1 },
            vstyles.color(COLORS.error, `Error: ${selected.error}`),
          ),
        ]
      : []),
    // Environments section
    Text({ marginBottom: 1 }, vstyles.color(COLORS.title, "Environments:")),
    ...selected.environments.map((env, index) => {
      const isSelected = index === state.selectedEnvIndex;
      const prefix = isSelected ? ">" : " ";
      const displayName = env === "default" ? "(default)" : env;

      return Box(
        {
          backgroundColor: isSelected && isFocused ? COLORS.selectedBg : undefined,
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
    // Bindings summary
    ...(bindings
      ? [
          Text(
            { marginTop: 1 },
            vstyles.color(COLORS.title, "Bindings:"),
          ),
          Text(
            {},
            vstyles.dim(
              `KV: ${bindings.kv}  D1: ${bindings.d1}  R2: ${bindings.r2}  DO: ${bindings.do}  Services: ${bindings.services}  Vars: ${bindings.vars}`,
            ),
          ),
        ]
      : []),
  );
}
