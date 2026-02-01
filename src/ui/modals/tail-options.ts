import type { FieldConfig, OptionsModalState, TailOptions } from "../../types/app.ts";

export const TAIL_FIELDS: FieldConfig[] = [
  {
    id: "format",
    label: "Format",
    type: "toggle",
    options: [
      { value: "pretty", label: "Pretty" },
      { value: "json", label: "JSON" },
    ],
  },
  {
    id: "status",
    label: "Status Filter",
    type: "multiSelect",
    options: [
      { value: "ok", label: "OK" },
      { value: "error", label: "Error" },
      { value: "canceled", label: "Canceled" },
    ],
  },
  {
    id: "methods",
    label: "HTTP Methods",
    type: "multiSelect",
    options: [
      { value: "GET", label: "GET" },
      { value: "POST", label: "POST" },
      { value: "PUT", label: "PUT" },
      { value: "DELETE", label: "DELETE" },
      { value: "PATCH", label: "PATCH" },
      { value: "HEAD", label: "HEAD" },
      { value: "OPTIONS", label: "OPTIONS" },
    ],
  },
  {
    id: "samplingRate",
    label: "Sampling Rate",
    type: "number",
    min: 0,
    max: 100,
    placeholder: "0-100",
  },
  {
    id: "search",
    label: "Search",
    type: "text",
    placeholder: "filter console.log",
  },
  {
    id: "ip",
    label: "IP Filter",
    type: "text",
    placeholder: "IP or 'self'",
  },
  {
    id: "header",
    label: "Header Filter",
    type: "text",
    placeholder: "header:value",
  },
  {
    id: "versionId",
    label: "Version ID",
    type: "text",
    placeholder: "worker version",
  },
];

export function createTailModalState(
  workerName: string,
  environment: string,
): OptionsModalState {
  return {
    type: "options",
    commandType: "tail",
    title: "Tail Options",
    workerName,
    environment,
    fields: TAIL_FIELDS,
    values: {
      format: "pretty",
      status: [],
      methods: [],
    },
    focusedField: 0,
    confirmLabel: "Start Tail",
  };
}

export function extractTailOptions(values: Record<string, unknown>): TailOptions {
  const options: TailOptions = {};

  if (values.format && values.format !== "pretty") {
    options.format = values.format as "json" | "pretty";
  } else if (values.format === "pretty") {
    options.format = "pretty";
  }

  const status = values.status as string[] | undefined;
  if (status && status.length > 0) {
    options.status = status as Array<"ok" | "error" | "canceled">;
  }

  const methods = values.methods as string[] | undefined;
  if (methods && methods.length > 0) {
    options.methods = methods;
  }

  const samplingRate = values.samplingRate as number | undefined;
  if (samplingRate !== undefined && samplingRate > 0) {
    options.samplingRate = samplingRate;
  }

  const search = values.search as string | undefined;
  if (search && search.trim()) {
    options.search = search.trim();
  }

  const ip = values.ip as string | undefined;
  if (ip && ip.trim()) {
    options.ip = ip.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const header = values.header as string | undefined;
  if (header && header.trim()) {
    options.header = header.trim();
  }

  const versionId = values.versionId as string | undefined;
  if (versionId && versionId.trim()) {
    options.versionId = versionId.trim();
  }

  return options;
}
