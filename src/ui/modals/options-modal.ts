import { Box, Text, vstyles } from "@opentui/core";
import type { OptionsModalState, FieldConfig } from "../../types/app.ts";
import { COLORS } from "../../themes/index.ts";

export function renderOptionsModal(modal: OptionsModalState) {
  return Box(
    {
      position: "absolute",
      top: "15%",
      left: "25%",
      width: 60,
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
      Text({}, vstyles.color(COLORS.title, modal.title)),
    ),
    // Worker info
    Box(
      {
        flexDirection: "column",
        gap: 0,
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
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
    Box(
      { marginBottom: 1 },
      Text({}, vstyles.dim("─".repeat(56))),
    ),
    // Form fields
    ...modal.fields.map((field, index) =>
      renderField(field, index, modal.focusedField, modal.values),
    ),
    // Divider
    Box(
      { marginTop: 1, marginBottom: 1 },
      Text({}, vstyles.dim("─".repeat(56))),
    ),
    // Actions
    Box(
      {
        flexDirection: "column",
        paddingLeft: 1,
      },
      Text(
        {},
        vstyles.color(COLORS.accent, "[Enter]"),
        vstyles.color(COLORS.normal, ` ${modal.confirmLabel}`),
      ),
      Text(
        {},
        vstyles.color(COLORS.muted, "[Escape]"),
        vstyles.color(COLORS.muted, " Cancel"),
      ),
    ),
    // Navigation hint
    Box({ marginTop: 1 }),
    Text(
      { paddingLeft: 1 },
      vstyles.dim("Tab/↑↓: navigate  Space: toggle  +/-: number  Type in text fields"),
    ),
  );
}

function renderField(
  field: FieldConfig,
  index: number,
  focusedField: number,
  values: Record<string, unknown>,
): ReturnType<typeof Box> {
  const isFocused = index === focusedField;
  const value = values[field.id];

  const labelColor = isFocused ? COLORS.selected : COLORS.normal;
  const focusIndicator = isFocused ? "▶ " : "  ";

  switch (field.type) {
    case "toggle":
      return renderToggleField(field, focusIndicator, labelColor, value as string | undefined);
    case "multiSelect":
      return renderMultiSelectField(field, focusIndicator, labelColor, value as string[] | undefined);
    case "number":
      return renderNumberField(field, focusIndicator, labelColor, value as number | undefined);
    case "text":
      return renderTextField(field, focusIndicator, labelColor, value as string | undefined, isFocused);
    default:
      return Box({});
  }
}

function renderToggleField(
  field: FieldConfig,
  focusIndicator: string,
  labelColor: string,
  value: string | undefined,
): ReturnType<typeof Box> {
  const options = field.options || [];
  const selectedValue = value || options[0]?.value;

  return Box(
    {
      flexDirection: "row",
      paddingLeft: 1,
      marginBottom: 0,
    },
    Text({}, vstyles.color(labelColor, `${focusIndicator}${field.label}: `)),
    ...options.map((opt, i) => {
      const isSelected = opt.value === selectedValue;
      const optColor = isSelected ? COLORS.accent : COLORS.muted;
      const bracket = isSelected ? "[●]" : "[ ]";
      const separator = i < options.length - 1 ? "  " : "";
      return Text(
        {},
        vstyles.color(optColor, `${bracket} ${opt.label}${separator}`),
      );
    }),
  );
}

function renderMultiSelectField(
  field: FieldConfig,
  focusIndicator: string,
  labelColor: string,
  value: string[] | undefined,
): ReturnType<typeof Box> {
  const options = field.options || [];
  const selectedValues = value || [];

  return Box(
    {
      flexDirection: "column",
      paddingLeft: 1,
      marginBottom: 0,
    },
    Text({}, vstyles.color(labelColor, `${focusIndicator}${field.label}:`)),
    Box(
      { paddingLeft: 3, flexDirection: "row", flexWrap: "wrap" },
      ...options.map((opt, i) => {
        const isSelected = selectedValues.includes(opt.value);
        const optColor = isSelected ? COLORS.accent : COLORS.muted;
        const checkbox = isSelected ? "[✓]" : "[ ]";
        const separator = i < options.length - 1 ? "  " : "";
        return Text(
          {},
          vstyles.color(optColor, `${checkbox} ${opt.label}${separator}`),
        );
      }),
    ),
  );
}

function renderNumberField(
  field: FieldConfig,
  focusIndicator: string,
  labelColor: string,
  value: number | undefined,
): ReturnType<typeof Box> {
  const displayValue = value !== undefined ? String(value) : "-";
  const hint = field.min !== undefined && field.max !== undefined
    ? ` (${field.min}-${field.max})`
    : "";

  return Box(
    {
      flexDirection: "row",
      paddingLeft: 1,
      marginBottom: 0,
    },
    Text({}, vstyles.color(labelColor, `${focusIndicator}${field.label}: `)),
    Text({}, vstyles.color(COLORS.accent, `[${displayValue}]`)),
    Text({}, vstyles.dim(hint)),
  );
}

function renderTextField(
  field: FieldConfig,
  focusIndicator: string,
  labelColor: string,
  value: string | undefined,
  isFocused: boolean,
): ReturnType<typeof Box> {
  const hasValue = value && value.length > 0;
  const displayValue = hasValue ? value : (field.placeholder || "");
  const cursor = isFocused ? "│" : "";

  return Box(
    {
      flexDirection: "row",
      paddingLeft: 1,
      marginBottom: 0,
    },
    Text({}, vstyles.color(labelColor, `${focusIndicator}${field.label}: `)),
    Text(
      {},
      hasValue
        ? vstyles.color(COLORS.accent, `[${displayValue}${cursor}]`)
        : vstyles.dim(`[${displayValue}${cursor}]`),
    ),
  );
}
