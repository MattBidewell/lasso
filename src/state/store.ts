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
  DebugLogEntry,
  FieldBindingType,
  BindingEditModalState,
  BindingTypeSelectModalState,
  ConfirmDeleteModalState,
  EnvironmentEditModalState,
  EnvironmentDeleteModalState,
} from "../types.ts";
import { createSessionId } from "../types.ts";
import { fieldRegistry } from "../fields/index.ts";

const MAX_OUTPUT_LINES = 500;
const MAX_DEBUG_LOG_LINES = 1000;

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
    debugEnabled: false,
    debugLogs: [],

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

function getPanels(): Panel[] {
  const base: Panel[] = ["configs", "environments", "bindings", "actions", "output", "history"];
  return state.debugEnabled ? [...base, "debug"] : base;
}

export function cycleFocus(direction: "forward" | "backward" = "forward"): void {
  const panels = getPanels();
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

export function setDebugEnabled(enabled: boolean): void {
  setState("debugEnabled", enabled);
  if (!enabled && state.focusedPanel === "debug") {
    setState("focusedPanel", "history");
  }
}

// ============ Binding Edit Modal Actions ============

/**
 * Open the binding type selection modal
 */
export function openBindingTypeSelect(): void {
  const modal: BindingTypeSelectModalState = {
    type: "binding_type_select",
    selectedIndex: 0,
  };
  setState("modal", modal);
}

/**
 * Open the add binding modal for a specific type
 */
export function openAddBinding(bindingType: FieldBindingType): void {
  const definition = fieldRegistry.getBindingType(bindingType);
  if (!definition) return;

  // Initialize values with defaults
  const initialValues: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (field.defaultValue !== undefined) {
      initialValues[field.name] = field.defaultValue;
    }
  }

  const modal: BindingEditModalState = {
    type: "binding_edit",
    mode: "add",
    bindingType,
    values: initialValues,
    errors: {},
    activeFieldIndex: 0,
  };
  setState("modal", modal);
}

/**
 * Open the edit binding modal for an existing binding
 */
export function openEditBinding(
  bindingType: FieldBindingType,
  bindingIndex: number,
  existingValues: Record<string, unknown>
): void {
  const modal: BindingEditModalState = {
    type: "binding_edit",
    mode: "edit",
    bindingType,
    bindingIndex,
    values: { ...existingValues },
    errors: {},
    activeFieldIndex: 0,
  };
  setState("modal", modal);
}

/**
 * Open the delete confirmation modal
 */
export function openDeleteBinding(
  bindingType: FieldBindingType,
  bindingIndex: number,
  displayName: string
): void {
  const modal: ConfirmDeleteModalState = {
    type: "confirm_delete",
    bindingType,
    bindingIndex,
    displayName,
  };
  setState("modal", modal);
}

/**
 * Update a field value in the binding edit modal
 */
export function updateBindingEditField(fieldName: string, value: unknown): void {
  const modal = state.modal;
  if (modal?.type !== "binding_edit") return;

  setState("modal", {
    ...modal,
    values: { ...modal.values, [fieldName]: value },
  });
}

/**
 * Update a field error in the binding edit modal
 */
export function updateBindingEditError(fieldName: string, error: string | undefined): void {
  const modal = state.modal;
  if (modal?.type !== "binding_edit") return;

  const newErrors = { ...modal.errors };
  if (error) {
    newErrors[fieldName] = error;
  } else {
    delete newErrors[fieldName];
  }

  setState("modal", {
    ...modal,
    errors: newErrors,
  });
}

/**
 * Set all errors in the binding edit modal
 */
export function setBindingEditErrors(errors: Record<string, string>): void {
  const modal = state.modal;
  if (modal?.type !== "binding_edit") return;

  setState("modal", {
    ...modal,
    errors,
  });
}

/**
 * Set the active field index in the binding edit modal
 */
export function setBindingEditActiveField(index: number): void {
  const modal = state.modal;
  if (modal?.type !== "binding_edit") return;

  setState("modal", {
    ...modal,
    activeFieldIndex: index,
  });
}

/**
 * Update selected index in binding type select modal
 */
export function setBindingTypeSelectIndex(index: number): void {
  const modal = state.modal;
  if (modal?.type !== "binding_type_select") return;

  setState("modal", {
    ...modal,
    selectedIndex: index,
  });
}

// ============ Environment Edit Modal Actions ============

/**
 * Open the add environment modal
 */
export function openAddEnvironment(): void {
  const modal: EnvironmentEditModalState = {
    type: "environment_edit",
    mode: "add",
    name: "",
  };
  setState("modal", modal);
}

/**
 * Open the edit environment modal for an existing environment
 */
export function openEditEnvironment(environmentName: string): void {
  // Don't allow editing the "default" environment
  if (environmentName === "default") {
    setToastMessage("Cannot edit the default environment");
    return;
  }

  const modal: EnvironmentEditModalState = {
    type: "environment_edit",
    mode: "edit",
    existingName: environmentName,
    name: environmentName,
  };
  setState("modal", modal);
}

/**
 * Open the delete environment confirmation modal
 */
export function openDeleteEnvironment(environmentName: string): void {
  // Don't allow deleting the "default" environment
  if (environmentName === "default") {
    setToastMessage("Cannot delete the default environment");
    return;
  }

  const modal: EnvironmentDeleteModalState = {
    type: "environment_delete",
    environmentName,
  };
  setState("modal", modal);
}

/**
 * Update the environment name in the edit modal
 */
export function updateEnvironmentName(name: string): void {
  const modal = state.modal;
  if (modal?.type !== "environment_edit") return;

  setState("modal", {
    ...modal,
    name,
    error: undefined,
  });
}

/**
 * Set the error in the environment edit modal
 */
export function setEnvironmentEditError(error: string | undefined): void {
  const modal = state.modal;
  if (modal?.type !== "environment_edit") return;

  setState("modal", {
    ...modal,
    error,
  });
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
  /** The field binding type for editing (e.g., "kv_namespace") */
  fieldBindingType: FieldBindingType;
  /** Index within the binding type array */
  typeIndex: number;
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
  const kvNamespaces = source.kv_namespaces ?? [];
  for (let i = 0; i < kvNamespaces.length; i++) {
    const kv = kvNamespaces[i]!;
    entries.push({
      normalized: {
        type: "kv",
        name: kv.binding,
        id: kv.id,
        supportsRemote: true,
      },
      raw: kv,
      fieldBindingType: "kv_namespace",
      typeIndex: i,
    });
  }

  // D1 Databases
  const d1Databases = source.d1_databases ?? [];
  for (let i = 0; i < d1Databases.length; i++) {
    const d1 = d1Databases[i]!;
    entries.push({
      normalized: {
        type: "d1",
        name: d1.binding,
        id: d1.database_id,
        displayName: d1.database_name,
        supportsRemote: true,
      },
      raw: d1,
      fieldBindingType: "d1_database",
      typeIndex: i,
    });
  }

  // R2 Buckets
  const r2Buckets = source.r2_buckets ?? [];
  for (let i = 0; i < r2Buckets.length; i++) {
    const r2 = r2Buckets[i]!;
    entries.push({
      normalized: {
        type: "r2",
        name: r2.binding,
        displayName: r2.bucket_name,
        supportsRemote: true,
      },
      raw: r2,
      fieldBindingType: "r2_bucket",
      typeIndex: i,
    });
  }

  // Durable Objects
  const doBindings = source.durable_objects?.bindings ?? [];
  for (let i = 0; i < doBindings.length; i++) {
    const doBinding = doBindings[i]!;
    entries.push({
      normalized: {
        type: "do",
        name: doBinding.name,
        displayName: doBinding.class_name,
        supportsRemote: true,
      },
      raw: doBinding,
      fieldBindingType: "durable_object",
      typeIndex: i,
    });
  }

  // Services
  const services = source.services ?? [];
  for (let i = 0; i < services.length; i++) {
    const service = services[i]!;
    entries.push({
      normalized: {
        type: "service",
        name: service.binding,
        displayName: service.service,
        supportsRemote: false,
      },
      raw: service,
      fieldBindingType: "service_binding",
      typeIndex: i,
    });
  }

  // Queues
  const queueProducers = source.queues?.producers ?? [];
  for (let i = 0; i < queueProducers.length; i++) {
    const queue = queueProducers[i]!;
    entries.push({
      normalized: {
        type: "queue",
        name: queue.binding,
        displayName: queue.queue,
        supportsRemote: false,
      },
      raw: queue,
      fieldBindingType: "queue_producer",
      typeIndex: i,
    });
  }

  // Vars
  const varEntries = Object.entries(source.vars ?? {});
  for (let i = 0; i < varEntries.length; i++) {
    const [key, value] = varEntries[i]!;
    entries.push({
      normalized: {
        type: "var",
        name: key,
        supportsRemote: false,
      },
      raw: { name: key, value },
      fieldBindingType: "environment_variable",
      typeIndex: i,
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

export function appendDebugLog(entry: DebugLogEntry): void {
  setState("debugLogs", (logs) => [...logs, entry].slice(-MAX_DEBUG_LOG_LINES));
}

export function clearDebugLogs(): void {
  setState("debugLogs", []);
}

export function getDebugLogs(): DebugLogEntry[] {
  return state.debugLogs;
}

// ============ Reinitialize ============

export function reinitialize(cwd: string): void {
  const initial = createInitialState(cwd);
  for (const key of Object.keys(initial) as (keyof AppState)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(key, (initial as any)[key]);
  }
}
