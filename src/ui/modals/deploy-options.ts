import type { FieldConfig, OptionsModalState, DeployOptions } from "../../types/app.ts";

export const DEPLOY_FIELDS: FieldConfig[] = [
  {
    id: "dryRun",
    label: "Dry Run",
    type: "toggle",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    id: "minify",
    label: "Minify",
    type: "toggle",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    id: "keepVars",
    label: "Keep Vars",
    type: "toggle",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    id: "noBundle",
    label: "No Bundle",
    type: "toggle",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    id: "uploadSourceMaps",
    label: "Upload Source Maps",
    type: "toggle",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes" },
    ],
  },
  {
    id: "compatibilityDate",
    label: "Compatibility Date",
    type: "text",
    placeholder: "yyyy-mm-dd",
  },
  {
    id: "name",
    label: "Worker Name",
    type: "text",
    placeholder: "override name",
  },
];

export function createDeployModalState(
  workerName: string,
  environment: string,
): OptionsModalState {
  return {
    type: "options",
    commandType: "deploy",
    title: "Deploy Options",
    workerName,
    environment,
    fields: DEPLOY_FIELDS,
    values: {
      dryRun: "false",
      minify: "false",
      keepVars: "false",
      noBundle: "false",
      uploadSourceMaps: "false",
    },
    focusedField: 0,
    confirmLabel: "Deploy",
  };
}

export function extractDeployOptions(values: Record<string, unknown>): DeployOptions {
  const options: DeployOptions = {};

  if (values.dryRun === "true") {
    options.dryRun = true;
  }

  if (values.minify === "true") {
    options.minify = true;
  }

  if (values.keepVars === "true") {
    options.keepVars = true;
  }

  if (values.noBundle === "true") {
    options.noBundle = true;
  }

  if (values.uploadSourceMaps === "true") {
    options.uploadSourceMaps = true;
  }

  const compatibilityDate = values.compatibilityDate as string | undefined;
  if (compatibilityDate && compatibilityDate.trim()) {
    options.compatibilityDate = compatibilityDate.trim();
  }

  const name = values.name as string | undefined;
  if (name && name.trim()) {
    options.name = name.trim();
  }

  return options;
}
