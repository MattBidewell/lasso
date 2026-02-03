import { spawn } from "node:child_process";
import { ProcessController, type ProcessControllerCallbacks } from "../core/runner/controller.ts";
import { MultiProcessController, type MultiProcessCallbacks } from "../core/runner/multi-controller.ts";
import type { DeployOptions, TailOptions, SessionAction } from "../types.ts";
import { createSessionId } from "../types.ts";
import {
  state,
  getSelectedConfig,
  getSelectedEnv,
  setRunning,
  setDeploying,
  setTailing,
  appendOutput,
  appendTailOutput,
  clearOutput,
  clearTailOutput,
  openModal,
  closeModal,
  setRightPanelView,
  // Session actions
  addSession,
  updateSessionStatus,
  removeSession,
  activateSession,
  appendSessionOutput,
  clearSessionOutput,
  getSession,
  getSelectedSession,
} from "./store.ts";

// Re-export closeModal for use by modals
export { closeModal } from "./store.ts";

// Renderer reference for triggering re-renders (set during app init)
let triggerRender: (() => void) | null = null;

// Renderer reference for cleanup on exit
let rendererInstance: { destroy: () => void } | null = null;

export function setRenderer(renderer: { destroy: () => void }): void {
  rendererInstance = renderer;
}

export function exitApp(): void {
  stopAll();
  rendererInstance?.destroy();
  process.exit(0);
}

export function setRenderCallback(callback: () => void): void {
  triggerRender = callback;
}

// ProcessController callbacks that integrate with our store
const callbacks: ProcessControllerCallbacks = {
  onOutputLine: (line) => {
    appendOutput(line);
  },
  onDevStart: () => {
    const config = getSelectedConfig();
    setRunning(true, config?.path ?? null);
    clearOutput();
  },
  onDevEnd: (_code) => {
    setRunning(false);
  },
  onDeployStart: () => {
    setDeploying(true);
    clearOutput();
  },
  onDeployEnd: () => {
    setDeploying(false);
  },
  onTailStart: () => {
    const config = getSelectedConfig();
    setTailing(true, config?.path ?? null);
    clearTailOutput();
  },
  onTailEnd: (_code) => {
    setTailing(false);
  },
  onTailOutputLine: (line) => {
    appendTailOutput(line);
  },
  onRender: () => {
    triggerRender?.();
  },
};

// Create the process controller instance
let processController: ProcessController | null = null;

export function getProcessController(): ProcessController {
  if (!processController) {
    processController = new ProcessController(callbacks);
  }
  return processController;
}

// ============ Process Actions ============

export function startDev(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    appendOutput("Error: No valid config selected");
    return;
  }

  getProcessController().startDevServer(config, env);
}

export function stopDev(): void {
  getProcessController().stopDevServer();
}

export function startDeploy(options?: DeployOptions): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    appendOutput("Error: No valid config selected");
    return;
  }

  closeModal();
  getProcessController().startDeploy(config, env, options);
}

export function stopDeploy(): void {
  getProcessController().stopDeploy();
}

export function startTail(options: TailOptions = {}): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    appendTailOutput("Error: No valid config selected");
    return;
  }

  closeModal();
  getProcessController().startTail(config, env, options);
}

export function stopTail(): void {
  getProcessController().stopTail();
}

export function stopAll(): void {
  getProcessController().stopAll();
  // Also stop all multi-process sessions
  if (multiController) {
    multiController.stopAll();
  }
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

// ============ Navigation Shortcuts ============

export function handleEnter(): void {
  if (state.isRunning) {
    stopDev();
  } else {
    startDev();
  }
}

export function handleDeployKey(): void {
  if (state.isDeploying) {
    stopDeploy();
  } else {
    showDeployModal();
  }
}

export function handleTailKey(): void {
  if (state.isTailing) {
    stopTail();
  } else {
    showTailModal();
  }
}

export function handleEscape(): void {
  if (state.modal) {
    closeModal();
  } else if (state.isRunning) {
    stopDev();
    setRightPanelView("about");
  } else if (state.isTailing) {
    stopTail();
    setRightPanelView("about");
  }
}

// ============ Editor Actions ============

export function openInEditor(): void {
  const config = getSelectedConfig();
  if (!config) return;

  const editor = process.env.EDITOR || process.env.VISUAL || "vi";

  // Spawn the editor detached so we don't block
  const child = spawn(editor, [config.path], {
    stdio: "inherit",
    detached: true,
  });

  // Prevent the child process from keeping the parent alive
  child.unref();
}

// ============ Multi-Process Session Actions ============

// MultiProcessController callbacks that integrate with our store
const multiCallbacks: MultiProcessCallbacks = {
  onSessionStart: (_sessionId, _action) => {
    // Session is added before calling startDev/startTail/startDeploy
    // This callback can be used for additional logging if needed
  },
  onSessionEnd: (sessionId, code) => {
    const status = code === 0 ? "completed" : "failed";
    updateSessionStatus(sessionId, status);
  },
  onSessionOutput: (sessionId, line) => {
    appendSessionOutput(sessionId, line);
  },
  onRender: () => {
    triggerRender?.();
  },
};

// Create the multi-process controller instance
let multiController: MultiProcessController | null = null;

export function getMultiController(): MultiProcessController {
  if (!multiController) {
    multiController = new MultiProcessController(multiCallbacks);
  }
  return multiController;
}

/**
 * Start a dev server session for the currently selected config/env
 */
export function startDevSession(): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    return;
  }

  const sessionId = createSessionId(config.path, env, "dev");

  // Check if session already exists
  if (getSession(sessionId)) {
    // Just activate the existing session
    activateSession(sessionId);
    return;
  }

  // Add session to store first
  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "dev",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  // Activate and show output
  activateSession(sessionId);
  setRightPanelView("output");

  // Start the process
  getMultiController().startDev(config, env);
}

/**
 * Start a tail session for the currently selected config/env
 */
export function startTailSession(options: TailOptions = {}): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    return;
  }

  closeModal();

  const sessionId = createSessionId(config.path, env, "tail");

  // Check if session already exists
  if (getSession(sessionId)) {
    activateSession(sessionId);
    return;
  }

  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "tail",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  activateSession(sessionId);
  setRightPanelView("logs");

  getMultiController().startTail(config, env, options);
}

/**
 * Start a deploy session for the currently selected config/env
 */
export function startDeploySession(options?: DeployOptions): void {
  const config = getSelectedConfig();
  const env = getSelectedEnv();

  if (!config?.config) {
    return;
  }

  closeModal();

  const sessionId = createSessionId(config.path, env, "deploy");

  // Check if session already exists
  if (getSession(sessionId)) {
    activateSession(sessionId);
    return;
  }

  addSession({
    id: sessionId,
    configPath: config.path,
    environment: env,
    action: "deploy",
    status: "running",
    displayName: config.name,
    startedAt: Date.now(),
  });

  activateSession(sessionId);
  setRightPanelView("output");

  getMultiController().startDeploy(config, env, options);
}

/**
 * Stop a specific session by ID
 */
export function stopSession(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status === "running") {
    updateSessionStatus(sessionId, "stopping");
    getMultiController().stop(sessionId);
  }
}

/**
 * Stop the currently selected session in the sessions panel
 */
export function stopSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    stopSession(session.id);
  }
}

/**
 * Remove a session from the list (only if not running)
 */
export function removeSessionFromList(sessionId: string): void {
  const session = getSession(sessionId);
  if (session && session.status !== "running" && session.status !== "stopping") {
    removeSession(sessionId);
  }
}

/**
 * Remove the currently selected session from the list
 */
export function removeSelectedSession(): void {
  const session = getSelectedSession();
  if (session) {
    removeSessionFromList(session.id);
  }
}

/**
 * Clear output for a specific session
 */
export function clearSelectedSessionOutput(): void {
  const session = getSelectedSession();
  if (session) {
    clearSessionOutput(session.id);
  }
}

/**
 * Stop all sessions
 */
export function stopAllSessions(): void {
  getMultiController().stopAll();
}
