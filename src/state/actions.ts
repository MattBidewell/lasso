import { Runner, type RunnerCallbacks } from "../core/runner/index.ts";
import { parseAnsiLine } from "../core/ansi.ts";
import type { DeployOptions, TailOptions, SessionAction, FieldBindingType } from "../types.ts";
import { createSessionId } from "../types.ts";
import {
  state,
  getSelectedConfig,
  getSelectedEnv,
  openModal,
  closeModal,
  setFocusedPanel,
  addExecution,
  updateExecutionStatus,
  activateSession,
  appendExecutionOutput,
  clearExecutionOutput,
  appendDebugLog,
  getSession,
  getSelectedSession,
  setToastMessage,
  addConfig,
} from "./store.ts";
import { fieldRegistry } from "../fields/index.ts";
import { createJsoncEditor, isFileWritable } from "../core/config/index.ts";
import { parseConfig } from "../core/discovery/index.ts";

// Re-export closeModal for use by modals
export { closeModal } from "./store.ts";

// Renderer reference for triggering re-renders (set during app init)
let triggerRender: (() => void) | null = null;

// Renderer reference for cleanup on exit
let rendererInstance: { destroy: () => void } | null = null;

let consolePatched = false;
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};
let debugLogCounter = 0;

export function setRenderer(renderer: { destroy: () => void }): void {
  rendererInstance = renderer;
}

export function exitApp(): void {
  runner?.stopAll();
  if (consolePatched) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    consolePatched = false;
  }
  rendererInstance?.destroy();
  process.exit(0);
}

export function setRenderCallback(callback: () => void): void {
  triggerRender = callback;
}

function createDebugLogId(): string {
  debugLogCounter += 1;
  return `${Date.now().toString(36)}${debugLogCounter.toString(36)}`;
}

function formatLogArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

function pushDebugLog(level: "info" | "warn" | "error" | "debug", args: unknown[]): void {
  if (!state.debugEnabled) return;
  const message = args.map(formatLogArg).join(" ");
  appendDebugLog({
    id: createDebugLogId(),
    timestamp: Date.now(),
    level,
    message,
  });
}

export function enableDebugLogging(): void {
  if (!state.debugEnabled || consolePatched) return;
  consolePatched = true;
  console.log = (...args: unknown[]) => pushDebugLog("info", args);
  console.info = (...args: unknown[]) => pushDebugLog("info", args);
  console.warn = (...args: unknown[]) => pushDebugLog("warn", args);
  console.error = (...args: unknown[]) => pushDebugLog("error", args);
  console.debug = (...args: unknown[]) => pushDebugLog("debug", args);
}

// ============ Runner Setup ============

const runnerCallbacks: RunnerCallbacks = {
  onSessionStart: (_sessionId, _executionId, _action) => {
    // Execution is added before calling startDev/startTail/startDeploy
  },
  onSessionEnd: (_sessionId, executionId, code) => {
    const status = code === 0 ? "completed" : "failed";
    updateExecutionStatus(executionId, status, Date.now());
  },
  onSessionOutput: (_sessionId, executionId, line) => {
    appendExecutionOutput(executionId, parseAnsiLine(line, state.ansiEnabled));
  },
  onRender: () => {
    triggerRender?.();
  },
};

let runner: Runner | null = null;

export function getRunner(): Runner {
  if (!runner) {
    runner = new Runner(runnerCallbacks);
  }
  return runner;
}

// ============ Modal Actions ============

export function showDeployModal(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) return;

  openModal({
    type: "deploy",
    configName: config.name,
    environment: env,
  });
}

export function showTailModal(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) return;

  openModal({
    type: "tail",
    configName: config.name,
    environment: env,
  });
}

export function showHelpModal(): void {
  openModal({ type: "help" });
}

// ============ Session Actions ============

export function startDevSession(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  const sessionId = createSessionId(config.path, env, "dev");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "dev",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("dev", config.path, env),
  });

  pushDebugLog("info", [`[debug] Starting dev session for ${config.name} (${env})`]);

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDev(config, env, executionId);
}

export function startTailSession(options: TailOptions = {}): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "tail");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "tail",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("tail", config.path, env),
  });

  pushDebugLog("info", [`[debug] Starting tail session for ${config.name} (${env})`]);

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startTail(config, env, executionId, options);
}

export function startDeploySession(options?: DeployOptions): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) return;

  closeModal();

  const sessionId = createSessionId(config.path, env, "deploy");
  const existing = getSession(sessionId);
  if (existing && (existing.status === "running" || existing.status === "stopping")) {
    activateSession(sessionId);
    return;
  }

  const executionId = createExecutionId(sessionId);
  addExecution({
    id: executionId,
    sessionId,
    configPath: config.path,
    environment: env,
    action: "deploy",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
    command: buildCommand("deploy", config.path, env),
  });

  pushDebugLog("info", [`[debug] Starting deploy session for ${config.name} (${env})`]);

  activateSession(sessionId);
  setFocusedPanel("output");

  getRunner().startDeploy(config, env, executionId, options);
}

export function stopSession(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status === "running") {
    updateExecutionStatus(session.executionId, "stopping");
    appendExecutionOutput(
      session.executionId,
      parseAnsiLine("[lasso] Sent SIGINT to stop execution.", state.ansiEnabled)
    );
    pushDebugLog("info", [`[debug] Sent SIGINT to stop session ${session.id}`]);
    getRunner().stop(sessionId, "SIGINT");
  }
}

export function stopSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    stopSession(session.id);
  }
}

export function clearSelectedSessionOutput(): void {
  const session = getSelectedSession();
  if (session) {
    clearExecutionOutput(session.executionId);
  }
}

let executionCounter = 0;

function createExecutionId(_sessionId: string): string {
  executionCounter += 1;
  const stamp = Date.now().toString(36);
  const counter = executionCounter.toString(36);
  return `${stamp}${counter}`;
}

function buildCommand(action: SessionAction, configPath: string, environment: string): string {
  const base = `npx wrangler ${action}`;
  const config = `-c ${configPath}`;
  const env = environment !== "default" ? `-e ${environment}` : "";
  return `${base} ${config} ${env}`.trim();
}

// ============ Binding CRUD Actions ============

/**
 * Save a binding to the config file (add or update)
 */
export function saveBinding(
  bindingType: FieldBindingType,
  data: Record<string, unknown>,
  bindingIndex?: number
): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) {
    setToastMessage("No config selected");
    return;
  }

  // Check if file is writable
  if (!isFileWritable(config.path)) {
    setToastMessage("Config file is read-only");
    return;
  }

  const definition = fieldRegistry.getBindingType(bindingType);
  if (!definition) {
    setToastMessage("Unknown binding type");
    return;
  }

  try {
    const editor = createJsoncEditor(config.path);
    const configKey = definition.configKey;

    // Handle environment-specific bindings
    const basePath = env !== "default" ? ["env", env] : [];

    if (definition.isArray) {
      // Array binding (kv_namespaces, d1_databases, etc.)
      const arrayPath = [...basePath, configKey];
      const existing = (editor.getPath(arrayPath) as unknown[]) ?? [];

      if (bindingIndex !== undefined) {
        // Update existing binding
        existing[bindingIndex] = data;
      } else {
        // Add new binding
        existing.push(data);
      }

      editor.set(arrayPath, existing);
    } else {
      // Object binding (ai, browser, images)
      const objPath = [...basePath, configKey];
      editor.set(objPath, data);
    }

    editor.save();

    // Reload the config to update the UI
    const updated = parseConfig(config.path, state.cwd);
    addConfig(updated);

    closeModal();
    setToastMessage(bindingIndex !== undefined ? "Binding updated" : "Binding added");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save binding";
    setToastMessage(message);
  }
}

/**
 * Delete a binding from the config file
 */
export function deleteBinding(bindingType: FieldBindingType, bindingIndex: number): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config) {
    setToastMessage("No config selected");
    return;
  }

  // Check if file is writable
  if (!isFileWritable(config.path)) {
    setToastMessage("Config file is read-only");
    return;
  }

  const definition = fieldRegistry.getBindingType(bindingType);
  if (!definition) {
    setToastMessage("Unknown binding type");
    return;
  }

  try {
    const editor = createJsoncEditor(config.path);
    const configKey = definition.configKey;

    // Handle environment-specific bindings
    const basePath = env !== "default" ? ["env", env] : [];

    if (definition.isArray) {
      // Array binding - remove item at index
      const arrayPath = [...basePath, configKey];
      const existing = (editor.getPath(arrayPath) as unknown[]) ?? [];

      if (bindingIndex >= 0 && bindingIndex < existing.length) {
        existing.splice(bindingIndex, 1);

        if (existing.length === 0) {
          // Remove empty array
          editor.delete(arrayPath);
        } else {
          editor.set(arrayPath, existing);
        }
      }
    } else {
      // Object binding - delete the whole object
      const objPath = [...basePath, configKey];
      editor.delete(objPath);
    }

    editor.save();

    // Reload the config to update the UI
    const updated = parseConfig(config.path, state.cwd);
    addConfig(updated);

    closeModal();
    setToastMessage("Binding deleted");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete binding";
    setToastMessage(message);
  }
}

// ============ Environment CRUD Actions ============

/**
 * Save an environment to the config file (add or rename)
 */
export function saveEnvironment(name: string, existingName?: string): void {
  const config = getSelectedConfig();

  if (!config) {
    setToastMessage("No config selected");
    return;
  }

  // Check if file is writable
  if (!isFileWritable(config.path)) {
    setToastMessage("Config file is read-only");
    return;
  }

  // Validate environment name (must be valid identifier-like)
  if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    setToastMessage("Environment name must start with a letter and contain only letters, numbers, hyphens, and underscores");
    return;
  }

  // Check if environment already exists (for add mode)
  if (!existingName && config.environments.includes(name)) {
    setToastMessage(`Environment "${name}" already exists`);
    return;
  }

  // Check if renaming to an existing name
  if (existingName && existingName !== name && config.environments.includes(name)) {
    setToastMessage(`Environment "${name}" already exists`);
    return;
  }

  try {
    const editor = createJsoncEditor(config.path);

    if (existingName && existingName !== name) {
      // Rename: copy old env config to new name and delete old
      const oldEnvConfig = editor.getPath(["env", existingName]);
      if (oldEnvConfig !== undefined) {
        editor.set(["env", name], oldEnvConfig);
        editor.delete(["env", existingName]);
      } else {
        // No config for old env, just create empty new one
        editor.set(["env", name], {});
      }
    } else if (!existingName) {
      // Add new environment with empty config
      editor.set(["env", name], {});
    }

    editor.save();

    // Reload the config to update the UI
    const updated = parseConfig(config.path, state.cwd);
    addConfig(updated);

    closeModal();
    setToastMessage(existingName ? "Environment renamed" : "Environment added");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save environment";
    setToastMessage(message);
  }
}

/**
 * Delete an environment from the config file
 */
export function deleteEnvironment(environmentName: string): void {
  const config = getSelectedConfig();

  if (!config) {
    setToastMessage("No config selected");
    return;
  }

  // Don't allow deleting the default environment
  if (environmentName === "default") {
    setToastMessage("Cannot delete the default environment");
    return;
  }

  // Check if file is writable
  if (!isFileWritable(config.path)) {
    setToastMessage("Config file is read-only");
    return;
  }

  try {
    const editor = createJsoncEditor(config.path);

    // Delete the environment config
    editor.delete(["env", environmentName]);

    // Check if env object is now empty and remove it
    const envObj = editor.getPath(["env"]);
    if (envObj && typeof envObj === "object" && Object.keys(envObj).length === 0) {
      editor.delete(["env"]);
    }

    editor.save();

    // Reload the config to update the UI
    const updated = parseConfig(config.path, state.cwd);
    addConfig(updated);

    closeModal();
    setToastMessage("Environment deleted");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete environment";
    setToastMessage(message);
  }
}
