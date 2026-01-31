import { Box, Text, vstyles } from "@opentui/core";
import type { AppState } from "../../types/app.ts";
import { countBindings } from "../../types/wrangler.ts";
import { COLORS } from "../../themes/index.ts";

export function renderBindingsPanel(state: AppState) {
  const selected = state.configs[state.selectedConfigIndex];

  if (!selected?.config) {
    return Box(
      {
        flexShrink: 0,
        height: 8,
        flexDirection: "column",
        border: true,
        borderStyle: "rounded",
        borderColor: COLORS.inactiveBorder,
        padding: 1,
        title: " Bindings ",
        titleAlignment: "left",
      },
      Text({}, vstyles.dim("No bindings")),
    );
  }

  const bindings = countBindings(selected.config);

  // Build binding lines - only show non-zero bindings
  const bindingEntries = [
    { label: "KV", count: bindings.kv },
    { label: "D1", count: bindings.d1 },
    { label: "R2", count: bindings.r2 },
    { label: "DO", count: bindings.do },
    { label: "Services", count: bindings.services },
    { label: "Vars", count: bindings.vars },
  ];

  const nonZeroBindings = bindingEntries.filter(b => b.count > 0);

  return Box(
    {
      flexShrink: 0,
      height: 8,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: COLORS.inactiveBorder,
      padding: 1,
      title: " Bindings ",
      titleAlignment: "left",
    },
    nonZeroBindings.length > 0
      ? Box(
          { flexDirection: "column" },
          ...nonZeroBindings.map(b =>
            Text(
              {},
              vstyles.dim(`${b.label}: `),
              vstyles.color(COLORS.normal, String(b.count)),
            )
          ),
        )
      : Text({}, vstyles.dim("No bindings configured")),
  );
}
