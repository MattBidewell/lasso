import type { WranglerConfig } from "./core/types/wrangler.ts";

// Re-export from wrangler types
export type { WranglerConfig, BindingCounts } from "./core/types/wrangler.ts";

// Tail-specific options
export interface TailOptions {
  format?: "json" | "pretty";
  status?: Array<"ok" | "error" | "canceled">;
  methods?: string[];
  samplingRate?: number;
  search?: string;
  ip?: string[];
  header?: string;
  versionId?: string;
}

// Deploy-specific options
export interface DeployOptions {
  dryRun?: boolean;
  minify?: boolean;
  keepVars?: boolean;
  noBundle?: boolean;
  uploadSourceMaps?: boolean;
  compatibilityDate?: string;
  name?: string;
}

export interface DiscoveredConfig {
  /** Absolute path to wrangler.json */
  path: string;
  /** Relative path from cwd for display */
  relativePath: string;
  /** Directory containing the config */
  directory: string;
  /** Parsed config, or null if parse failed */
  config: WranglerConfig | null;
  /** Parse error message, if any */
  error: string | null;
  /** Worker name from config, or directory name fallback */
  name: string;
  /** List of environment names (always includes 'default' if valid) */
  environments: string[];
}

// UI panels
export type Panel = "configs" | "environments" | "bindings" | "actions" | "output" | "history" | "debug";

// Normalized binding type for display
export type BindingType = "kv" | "d1" | "r2" | "do" | "service" | "queue" | "var";

export interface NormalizedBinding {
  type: BindingType;
  name: string; // The binding name used in code
  id?: string; // The resource ID (namespace_id, database_id, etc.)
  displayName?: string; // Friendly name for display
  supportsRemote: boolean; // Whether this binding can toggle remote mode
}

export interface OutputSegment {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  underline?: boolean;
}

export interface OutputLine {
  raw: string;
  segments: OutputSegment[];
}

export type DebugLogLevel = "info" | "warn" | "error" | "debug";

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: DebugLogLevel;
  message: string;
}

// Session types
export type SessionAction = "dev" | "tail" | "deploy";
export type SessionStatus = "running" | "stopping" | "completed" | "failed";

export interface Execution {
  /** Unique identifier for a single execution */
  id: string;
  /** Stable session key: configPath:environment:action */
  sessionId: string;
  /** Absolute path to the config file */
  configPath: string;
  /** Environment name */
  environment: string;
  /** Type of action running */
  action: SessionAction;
  /** Current status */
  status: SessionStatus;
  /** Display name (worker name from config) */
  displayName: string;
  /** Timestamp when execution started */
  startedAt: number;
  /** Timestamp when execution ended */
  endedAt?: number;
  /** Command used for this execution */
  command: string;
}

export interface Session {
  /** Stable session key: configPath:environment:action */
  id: string;
  /** Current execution id */
  executionId: string;
  /** Current status */
  status: SessionStatus;
}

/** Helper to generate session ID */
export function createSessionId(
  configPath: string,
  environment: string,
  action: SessionAction,
): string {
  return `${configPath}:${environment}:${action}`;
}

// Modal types
export type ModalType = "deploy" | "tail" | "help" | "binding_type_select" | "binding_edit" | "config_edit" | "confirm_delete" | "environment_edit" | "environment_delete" | null;

export interface DeployModalState {
  type: "deploy";
  configName: string;
  environment: string;
}

export interface TailModalState {
  type: "tail";
  configName: string;
  environment: string;
}

export interface HelpModalState {
  type: "help";
}

// Import the field BindingType (different from display BindingType above)
import type { BindingType as FieldBindingType } from "./fields/types.ts";

// Re-export for convenience
export type { FieldBindingType };

/** Modal state for selecting a binding type when adding */
export interface BindingTypeSelectModalState {
  type: "binding_type_select";
  selectedIndex: number;
}

/** Edit mode: creating new or editing existing */
export type EditMode = "add" | "edit";

/** Modal state for editing a binding */
export interface BindingEditModalState {
  type: "binding_edit";
  mode: EditMode;
  bindingType: FieldBindingType;
  /** Index in the binding array (for edit mode) */
  bindingIndex?: number;
  /** Current field values */
  values: Record<string, unknown>;
  /** Validation errors by field name */
  errors: Record<string, string>;
  /** Currently focused field index */
  activeFieldIndex: number;
  /** Environment name (if editing env-specific binding) */
  environmentName?: string;
}

/** Modal state for editing top-level config fields */
export interface ConfigEditModalState {
  type: "config_edit";
  /** Config section being edited (e.g., "top-level", "build", "limits") */
  section: string;
  /** Current field values */
  values: Record<string, unknown>;
  /** Validation errors by field name */
  errors: Record<string, string>;
  /** Currently focused field index */
  activeFieldIndex: number;
  /** Environment name (if editing env-specific config) */
  environmentName?: string;
}

/** Modal state for confirming deletion */
export interface ConfirmDeleteModalState {
  type: "confirm_delete";
  /** Type of binding being deleted */
  bindingType: FieldBindingType;
  /** Index in the binding array */
  bindingIndex: number;
  /** Display name for confirmation message */
  displayName: string;
}

/** Modal state for editing an environment */
export interface EnvironmentEditModalState {
  type: "environment_edit";
  mode: EditMode;
  /** Environment name (for edit mode) */
  existingName?: string;
  /** Current environment name value */
  name: string;
  /** Validation error */
  error?: string;
}

/** Modal state for confirming environment deletion */
export interface EnvironmentDeleteModalState {
  type: "environment_delete";
  /** Environment name to delete */
  environmentName: string;
}

export type ModalState =
  | DeployModalState
  | TailModalState
  | HelpModalState
  | BindingTypeSelectModalState
  | BindingEditModalState
  | ConfigEditModalState
  | ConfirmDeleteModalState
  | EnvironmentEditModalState
  | EnvironmentDeleteModalState;

// Main application state
export interface AppState {
  // Config data
  configs: DiscoveredConfig[];
  selectedConfigIndex: number;
  selectedEnvIndex: number;
  selectedBindingIndex: number;
  cwd: string;

  // UI state
  focusedPanel: Panel;
  modal: ModalState | null;
  ansiEnabled: boolean;
  toastMessage: string | null;
  debugEnabled: boolean;
  debugLogs: DebugLogEntry[];

  // Executions and output
  executions: Execution[];
  sessionIndex: Record<string, Session>;
  selectedActionIndex: number;
  selectedHistoryIndex: number;
  activeSessionId: string | null;
  activeExecutionId: string | null;
  outputByExecution: Record<string, OutputLine[]>;

  // Status
  statusMessage: string | null;
}
