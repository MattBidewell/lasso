import type { WranglerConfig } from "./core/types/wrangler.ts";

// Re-export from existing types
export type { WranglerConfig, BindingCounts } from "./core/types/wrangler.ts";
export type { TailOptions, DeployOptions } from "./core/types/app.ts";

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

export type Panel = "configs" | "environments" | "bindings" | "sessions" | "output" | "logs";

// Normalized binding type for display
export type BindingType = "kv" | "d1" | "r2" | "do" | "service" | "queue" | "var";

export interface NormalizedBinding {
  type: BindingType;
  name: string; // The binding name used in code
  id?: string; // The resource ID (namespace_id, database_id, etc.)
  displayName?: string; // Friendly name for display
  supportsRemote: boolean; // Whether this binding can toggle remote mode
}
export type RightPanelView = "about" | "output" | "logs";
export type CommandType = "dev" | "deploy" | "tail" | null;

// Session types for multi-process support
export type SessionAction = "dev" | "tail" | "deploy";
export type SessionStatus = "running" | "stopping" | "completed" | "failed";

export interface Session {
  /** Unique identifier: configPath:environment:action */
  id: string;
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
  /** Timestamp when session started */
  startedAt: number;
}

/** Helper to generate session ID */
export function createSessionId(
  configPath: string,
  environment: string,
  action: SessionAction
): string {
  return `${configPath}:${environment}:${action}`;
}

// Simplified modal types
export type ModalType = "deploy" | "tail" | "help" | null;

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

export type ModalState = DeployModalState | TailModalState | HelpModalState;

export interface AppState {
  // Config data
  configs: DiscoveredConfig[];
  selectedConfigIndex: number;
  selectedEnvIndex: number;
  selectedBindingIndex: number;
  cwd: string;

  // UI state
  focusedPanel: Panel;
  rightPanelView: RightPanelView;
  modal: ModalState | null;

  // Process state (legacy - kept for backward compatibility)
  isRunning: boolean;
  runningConfigPath: string | null;
  isDeploying: boolean;
  isTailing: boolean;
  tailingConfigPath: string | null;
  currentCommand: CommandType;

  // Output (legacy)
  output: string[];
  outputByConfig: Record<string, string[]>;
  tailOutput: string[];
  tailOutputByConfig: Record<string, string[]>;

  // Sessions - multi-process support
  sessions: Session[];
  selectedSessionIndex: number;
  activeSessionId: string | null;
  outputBySession: Record<string, string[]>;

  // Status
  statusMessage: string | null;
}
