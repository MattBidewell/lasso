import { createStore } from "solid-js/store";
import type { AppState, DiscoveredConfig, ModalState, Panel, RightPanelView, CommandType, NormalizedBinding, Session, SessionAction, SessionStatus } from "../types.ts";
import { createSessionId } from "../types.ts";

const MAX_OUTPUT_LINES = 100;
const MAX_TAIL_LINES = 500;

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
    rightPanelView: "about",
    modal: null,

    // Process state
    isRunning: false,
    runningConfigPath: null,
    isDeploying: false,
    isTailing: false,
    tailingConfigPath: null,
    currentCommand: null,

    // Output (legacy)
    output: [],
    outputByConfig: {},
    tailOutput: [],
    tailOutputByConfig: {},

    // Sessions - multi-process support
    sessions: [],
    selectedSessionIndex: 0,
    activeSessionId: null,
    outputBySession: {},

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
  // Clamp selected index
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
  const newConfig = state.configs[clamped];

  setState("selectedConfigIndex", clamped);
  setState("selectedEnvIndex", 0); // Reset env selection when config changes
  setState("selectedBindingIndex", 0); // Reset binding selection when config changes

  // Restore output for the newly selected config
  if (newConfig?.path) {
    restoreOutputForConfig(newConfig.path);
    restoreTailOutputForConfig(newConfig.path);
  }
}

export function selectEnv(index: number): void {
  const config = state.configs[state.selectedConfigIndex];
  if (!config) return;
  const clamped = Math.max(0, Math.min(index, config.environments.length - 1));
  setState("selectedEnvIndex", clamped);
  setState("selectedBindingIndex", 0); // Reset binding selection when env changes
}

// ============ UI Actions ============

export function setFocusedPanel(panel: Panel): void {
  setState("focusedPanel", panel);
}

export function cycleFocus(direction: "forward" | "backward" = "forward"): void {
  const panels: Panel[] = ["configs", "environments", "bindings", "sessions", "output", "logs"];
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

export function setRightPanelView(view: RightPanelView): void {
  setState("rightPanelView", view);
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

// ============ Process State Actions ============

export function setRunning(running: boolean, configPath: string | null = null): void {
  setState("isRunning", running);
  setState("runningConfigPath", configPath);
  if (running) {
    setState("currentCommand", "dev");
    setState("rightPanelView", "output");
  }
}

export function setDeploying(deploying: boolean): void {
  setState("isDeploying", deploying);
  if (deploying) {
    setState("currentCommand", "deploy");
    setState("rightPanelView", "output");
  }
}

export function setTailing(tailing: boolean, configPath: string | null = null): void {
  setState("isTailing", tailing);
  setState("tailingConfigPath", configPath);
  if (tailing) {
    setState("currentCommand", "tail");
    setState("rightPanelView", "logs");
  }
}

export function setCurrentCommand(command: CommandType): void {
  setState("currentCommand", command);
}

// ============ Output Actions ============

export function appendOutput(line: string): void {
  setState("output", (lines) => [...lines, line].slice(-MAX_OUTPUT_LINES));

  // Also store per-config
  const configPath = state.runningConfigPath;
  if (configPath) {
    setState("outputByConfig", configPath, (lines) =>
      [...(lines ?? []), line].slice(-MAX_OUTPUT_LINES)
    );
  }
}

export function clearOutput(): void {
  setState("output", []);
}

export function restoreOutputForConfig(configPath: string): void {
  const savedOutput = state.outputByConfig[configPath] ?? [];
  setState("output", savedOutput);
}

export function appendTailOutput(line: string): void {
  setState("tailOutput", (lines) => [...lines, line].slice(-MAX_TAIL_LINES));

  // Also store per-config
  const configPath = state.tailingConfigPath;
  if (configPath) {
    setState("tailOutputByConfig", configPath, (lines) =>
      [...(lines ?? []), line].slice(-MAX_TAIL_LINES)
    );
  }
}

export function clearTailOutput(): void {
  setState("tailOutput", []);
}

export function restoreTailOutputForConfig(configPath: string): void {
  const savedOutput = state.tailOutputByConfig[configPath] ?? [];
  setState("tailOutput", savedOutput);
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

// ============ Session Actions ============

export function addSession(session: Session): void {
  setState("sessions", (sessions) => [...sessions, session]);
  // Auto-select and activate the new session
  setState("selectedSessionIndex", state.sessions.length); // Points to new session after add
  setState("activeSessionId", session.id);
}

export function updateSessionStatus(sessionId: string, status: SessionStatus): void {
  const index = state.sessions.findIndex((s) => s.id === sessionId);
  if (index >= 0) {
    setState("sessions", index, "status", status);
  }
}

export function removeSession(sessionId: string): void {
  const index = state.sessions.findIndex((s) => s.id === sessionId);
  if (index < 0) return;

  setState("sessions", (sessions) => sessions.filter((s) => s.id !== sessionId));

  // Adjust selection index
  if (state.selectedSessionIndex >= state.sessions.length) {
    setState("selectedSessionIndex", Math.max(0, state.sessions.length - 1));
  }

  // Clear active if it was removed
  if (state.activeSessionId === sessionId) {
    const remaining = state.sessions;
    setState("activeSessionId", remaining.length > 0 ? remaining[0]!.id : null);
  }

  // Clean up output buffer
  const { [sessionId]: _, ...rest } = state.outputBySession;
  setState("outputBySession", rest);
}

export function selectSession(index: number): void {
  const clamped = Math.max(0, Math.min(index, state.sessions.length - 1));
  setState("selectedSessionIndex", clamped);
}

export function activateSession(sessionId: string): void {
  setState("activeSessionId", sessionId);
  // Switch right panel based on session type
  const session = state.sessions.find((s) => s.id === sessionId);
  if (session) {
    setState("rightPanelView", session.action === "tail" ? "logs" : "output");
  }
}

export function getSession(sessionId: string): Session | undefined {
  return state.sessions.find((s) => s.id === sessionId);
}

export function getSelectedSession(): Session | undefined {
  return state.sessions[state.selectedSessionIndex];
}

export function getActiveSession(): Session | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

export function hasActiveSession(configPath: string, environment: string, action: SessionAction): boolean {
  const id = createSessionId(configPath, environment, action);
  return state.sessions.some((s) => s.id === id && s.status === "running");
}

// ============ Per-Session Output Actions ============

export function appendSessionOutput(sessionId: string, line: string): void {
  const maxLines = sessionId.endsWith(":tail") ? MAX_TAIL_LINES : MAX_OUTPUT_LINES;
  setState("outputBySession", sessionId, (lines) =>
    [...(lines ?? []), line].slice(-maxLines)
  );
}

export function clearSessionOutput(sessionId: string): void {
  setState("outputBySession", sessionId, []);
}

export function getSessionOutput(sessionId: string): string[] {
  return state.outputBySession[sessionId] ?? [];
}

export function getActiveOutput(): string[] {
  if (!state.activeSessionId) return [];
  return state.outputBySession[state.activeSessionId] ?? [];
}

// Derived booleans (for backward compatibility)
export function isAnyRunning(): boolean {
  return state.sessions.some((s) => s.action === "dev" && s.status === "running");
}

export function isAnyTailing(): boolean {
  return state.sessions.some((s) => s.action === "tail" && s.status === "running");
}

export function isAnyDeploying(): boolean {
  return state.sessions.some((s) => s.action === "deploy" && s.status === "running");
}

// ============ Reinitialize ============

export function reinitialize(cwd: string): void {
  const initial = createInitialState(cwd);
  // Reset all state fields
  for (const key of Object.keys(initial) as (keyof AppState)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(key, (initial as any)[key]);
  }
}
