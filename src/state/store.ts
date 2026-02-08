import { createStore } from "solid-js/store";
import type {
  AppState,
  DiscoveredConfig,
  ModalState,
  Panel,
  NormalizedBinding,
  OutputLine,
  Execution,
  Session,
  SessionAction,
  SessionStatus,
} from "../types.ts";
import { createSessionId } from "../types.ts";

const MAX_OUTPUT_LINES = 500;

function createInitialState(cwd: string): AppState {
  return {
    // Config data
    configs: [],
    selectedConfigIndex: 0,
    selectedEnvIndex: 0,
    selectedBindingIndex: 0,
    cwd,

    // UI state
    focusedPanel: "configs",
    modal: null,
    ansiEnabled: true,
    toastMessage: null,

    // Executions and output
    executions: [],
    sessionIndex: {},
    selectedActionIndex: 0,
    selectedHistoryIndex: 0,
    activeSessionId: null,
    activeExecutionId: null,
    outputByExecution: {},

    // Status
    statusMessage: null,
  };
}

// Create the global store
const [state, setState] = createStore<AppState>(createInitialState(process.cwd()));

// Export state as readonly and setState for actions
export { state };

// ============ Config Actions ============

export function setConfigs(configs: DiscoveredConfig[]): void {
  setState("configs", configs);
  setState("selectedConfigIndex", (i) => Math.min(i, Math.max(0, configs.length - 1)));
}

export function addConfig(config: DiscoveredConfig): void {
  const existingIndex = state.configs.findIndex((c) => c.path === config.path);
  if (existingIndex >= 0) {
    setState("configs", existingIndex, config);
  } else {
    setState("configs", (configs) => [...configs, config]);
  }
}

export function removeConfig(path: string): void {
  setState("configs", (configs) => configs.filter((c) => c.path !== path));
  setState("selectedConfigIndex", (i) => Math.min(i, Math.max(0, state.configs.length - 1)));
}

export function selectConfig(index: number): void {
  const clamped = Math.max(0, Math.min(index, state.configs.length - 1));
  setState("selectedConfigIndex", clamped);
  setState("selectedEnvIndex", 0);
  setState("selectedBindingIndex", 0);
}

export function selectEnv(index: number): void {
  const config = state.configs[state.selectedConfigIndex];
  if (!config) return;
  const clamped = Math.max(0, Math.min(index, config.environments.length - 1));
  setState("selectedEnvIndex", clamped);
  setState("selectedBindingIndex", 0);
}

// ============ UI Actions ============

export function setFocusedPanel(panel: Panel): void {
  setState("focusedPanel", panel);
}

export function cycleFocus(direction: "forward" | "backward" = "forward"): void {
  const panels: Panel[] = ["configs", "environments", "bindings", "actions", "output", "history"];
  const currentIndex = panels.indexOf(state.focusedPanel);
  const nextIndex = direction === "forward"
    ? (currentIndex + 1) % panels.length
    : (currentIndex - 1 + panels.length) % panels.length;
  setState("focusedPanel", panels[nextIndex]!);
}

export function selectBinding(index: number): void {
  const bindings = getBindings();
  const clamped = Math.max(0, Math.min(index, bindings.length - 1));
  setState("selectedBindingIndex", clamped);
}

export function openModal(modal: ModalState): void {
  setState("modal", modal);
}

export function closeModal(): void {
  setState("modal", null);
}

export function setStatusMessage(message: string | null): void {
  setState("statusMessage", message);
}

export function setToastMessage(message: string | null): void {
  setState("toastMessage", message);
}

export function setAnsiEnabled(enabled: boolean): void {
  setState("ansiEnabled", enabled);
}

// ============ Derived State (Selectors) ============

export function getSelectedConfig(): DiscoveredConfig | undefined {
  return state.configs[state.selectedConfigIndex];
}

export function getSelectedEnv(): string {
  const config = getSelectedConfig();
  if (!config) return "default";
  return config.environments[state.selectedEnvIndex] ?? "default";
}

export function getEnvironments(): string[] {
  const config = getSelectedConfig();
  return config?.environments ?? [];
}

export function getFilteredConfigs(): DiscoveredConfig[] {
  return state.configs;
}

export function getBindings(): NormalizedBinding[] {
  const config = getSelectedConfig();
  if (!config?.config) return [];

  const env = getSelectedEnv();
  const wranglerConfig = config.config;
  const envConfig = env !== "default" ? wranglerConfig.env?.[env] : undefined;
  const source = envConfig || wranglerConfig;

  const bindings: NormalizedBinding[] = [];

  // KV Namespaces
  for (const kv of source.kv_namespaces ?? []) {
    bindings.push({
      type: "kv",
      name: kv.binding,
      id: kv.id,
      supportsRemote: true,
    });
  }

  // D1 Databases
  for (const d1 of source.d1_databases ?? []) {
    bindings.push({
      type: "d1",
      name: d1.binding,
      id: d1.database_id,
      displayName: d1.database_name,
      supportsRemote: true,
    });
  }

  // R2 Buckets
  for (const r2 of source.r2_buckets ?? []) {
    bindings.push({
      type: "r2",
      name: r2.binding,
      displayName: r2.bucket_name,
      supportsRemote: true,
    });
  }

  // Durable Objects
  for (const doBinding of source.durable_objects?.bindings ?? []) {
    bindings.push({
      type: "do",
      name: doBinding.name,
      displayName: doBinding.class_name,
      supportsRemote: true,
    });
  }

  // Services
  for (const service of source.services ?? []) {
    bindings.push({
      type: "service",
      name: service.binding,
      displayName: service.service,
      supportsRemote: false,
    });
  }

  // Queues
  for (const queue of source.queues?.producers ?? []) {
    bindings.push({
      type: "queue",
      name: queue.binding,
      displayName: queue.queue,
      supportsRemote: false,
    });
  }

  // Vars
  for (const [key] of Object.entries(source.vars ?? {})) {
    bindings.push({
      type: "var",
      name: key,
      supportsRemote: false,
    });
  }

  return bindings;
}

export interface BindingEntry {
  normalized: NormalizedBinding;
  raw: unknown;
}

export function getBindingEntries(): BindingEntry[] {
  const config = getSelectedConfig();
  if (!config?.config) return [];

  const env = getSelectedEnv();
  const wranglerConfig = config.config;
  const envConfig = env !== "default" ? wranglerConfig.env?.[env] : undefined;
  const source = envConfig || wranglerConfig;

  const entries: BindingEntry[] = [];

  // KV Namespaces
  for (const kv of source.kv_namespaces ?? []) {
    entries.push({
      normalized: {
        type: "kv",
        name: kv.binding,
        id: kv.id,
        supportsRemote: true,
      },
      raw: kv,
    });
  }

  // D1 Databases
  for (const d1 of source.d1_databases ?? []) {
    entries.push({
      normalized: {
        type: "d1",
        name: d1.binding,
        id: d1.database_id,
        displayName: d1.database_name,
        supportsRemote: true,
      },
      raw: d1,
    });
  }

  // R2 Buckets
  for (const r2 of source.r2_buckets ?? []) {
    entries.push({
      normalized: {
        type: "r2",
        name: r2.binding,
        displayName: r2.bucket_name,
        supportsRemote: true,
      },
      raw: r2,
    });
  }

  // Durable Objects
  for (const doBinding of source.durable_objects?.bindings ?? []) {
    entries.push({
      normalized: {
        type: "do",
        name: doBinding.name,
        displayName: doBinding.class_name,
        supportsRemote: true,
      },
      raw: doBinding,
    });
  }

  // Services
  for (const service of source.services ?? []) {
    entries.push({
      normalized: {
        type: "service",
        name: service.binding,
        displayName: service.service,
        supportsRemote: false,
      },
      raw: service,
    });
  }

  // Queues
  for (const queue of source.queues?.producers ?? []) {
    entries.push({
      normalized: {
        type: "queue",
        name: queue.binding,
        displayName: queue.queue,
        supportsRemote: false,
      },
      raw: queue,
    });
  }

  // Vars
  for (const [key, value] of Object.entries(source.vars ?? {})) {
    entries.push({
      normalized: {
        type: "var",
        name: key,
        supportsRemote: false,
      },
      raw: { name: key, value },
    });
  }

  return entries;
}

export function getSelectedBindingEntry(): BindingEntry | undefined {
  const entries = getBindingEntries();
  return entries[state.selectedBindingIndex];
}

// ============ Execution Actions ============

export function addExecution(execution: Execution): void {
  setState("executions", (executions) => [...executions, execution]);
  setState("sessionIndex", execution.sessionId, {
    id: execution.sessionId,
    executionId: execution.id,
    status: execution.status,
  });
  setState("activeExecutionId", execution.id);
  setState("activeSessionId", execution.sessionId);
  setState("outputByExecution", execution.id, []);
}

export function updateExecutionStatus(
  executionId: string,
  status: SessionStatus,
  endedAt?: number,
): void {
  const index = state.executions.findIndex((e) => e.id === executionId);
  if (index < 0) return;

  const execution = state.executions[index]!;
  setState("executions", index, "status", status);
  if (endedAt) {
    setState("executions", index, "endedAt", endedAt);
  }

  const sessionId = execution.sessionId;
  const current = state.sessionIndex[sessionId];
  if (current?.executionId === executionId) {
    setState("sessionIndex", sessionId, "status", status);
  }
}

export function selectAction(index: number): void {
  const clamped = Math.max(0, Math.min(index, 2)); // 3 actions: dev, deploy, tail
  setState("selectedActionIndex", clamped);
}

export function activateExecution(executionId: string): void {
  const execution = state.executions.find((e) => e.id === executionId);
  if (!execution) return;
  setState("activeExecutionId", executionId);
  setState("activeSessionId", execution.sessionId);
}

export function clearActiveExecution(): void {
  setState("activeExecutionId", null);
}

export function activateSession(sessionId: string): void {
  setState("activeSessionId", sessionId);
  const latest = getLatestExecution(sessionId);
  if (latest) {
    setState("activeExecutionId", latest.id);
  }
}

export function getExecution(executionId: string): Execution | undefined {
  return state.executions.find((e) => e.id === executionId);
}

export function getLatestExecution(sessionId: string): Execution | undefined {
  const executions = state.executions.filter((e) => e.sessionId === sessionId);
  if (executions.length === 0) return undefined;
  return executions.reduce((latest, current) =>
    current.startedAt > latest.startedAt ? current : latest
  );
}

export function getSession(sessionId: string): Session | undefined {
  return state.sessionIndex[sessionId];
}

export function getSelectedSession(): Session | undefined {
  // Get session based on selected action
  const config = getSelectedConfig();
  const env = getSelectedEnv();
  if (!config || !env) return undefined;
  
  const actions: SessionAction[] = ["dev", "deploy", "tail"];
  const action = actions[state.selectedActionIndex];
  if (!action) return undefined;
  
  const sessionId = createSessionId(config.path, env, action);
  return getSession(sessionId);
}

export function getSelectedExecution(): Execution | undefined {
  const config = getSelectedConfig();
  const env = getSelectedEnv();
  if (!config || !env) return undefined;

  const actions: SessionAction[] = ["dev", "deploy", "tail"];
  const action = actions[state.selectedActionIndex];
  if (!action) return undefined;

  const sessionId = createSessionId(config.path, env, action);
  return getLatestExecution(sessionId);
}

export function getActiveSession(): Session | undefined {
  if (!state.activeSessionId) return undefined;
  return state.sessionIndex[state.activeSessionId];
}

export function getActiveExecution(): Execution | undefined {
  if (!state.activeExecutionId) return undefined;
  return getExecution(state.activeExecutionId);
}

export function selectHistory(index: number): void {
  const clamped = Math.max(0, Math.min(index, state.executions.length - 1));
  setState("selectedHistoryIndex", clamped);
}

export function getSelectedHistory(): Execution | undefined {
  return state.executions[state.selectedHistoryIndex];
}

export function hasActiveSession(configPath: string, environment: string, action: SessionAction): boolean {
  const id = createSessionId(configPath, environment, action);
  return state.sessionIndex[id]?.status === "running";
}

// ============ Output Actions ============

export function appendExecutionOutput(executionId: string, line: OutputLine): void {
  setState("outputByExecution", executionId, (lines) =>
    [...(lines ?? []), line].slice(-MAX_OUTPUT_LINES)
  );
}

export function clearExecutionOutput(executionId: string): void {
  setState("outputByExecution", executionId, []);
}

export function getExecutionOutput(executionId: string): OutputLine[] {
  return state.outputByExecution[executionId] ?? [];
}

export function getActiveOutput(): OutputLine[] {
  if (!state.activeExecutionId) return [];
  return state.outputByExecution[state.activeExecutionId] ?? [];
}

// ============ Reinitialize ============

export function reinitialize(cwd: string): void {
  const initial = createInitialState(cwd);
  for (const key of Object.keys(initial) as (keyof AppState)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(key, (initial as any)[key]);
  }
}
