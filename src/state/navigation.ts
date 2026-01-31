import type { AppState, Panel } from "../types/app.ts";

// Default viewport heights for scroll calculations
export const CONFIGS_VIEWPORT = 8;
export const ENVIRONMENTS_VIEWPORT = 6;

export function getNextFocusedPanel(state: AppState, direction: 1 | -1): Panel {
  const panels: Panel[] = ["configs", "environments"];
  const hasOutput =
    state.output.length > 0 || state.isRunning || state.isDeploying;
  if (hasOutput) {
    panels.push("output");
  }

  const currentIndex = panels.indexOf(state.focusedPanel);
  const nextIndex = (currentIndex + direction + panels.length) % panels.length;
  return panels[nextIndex] ?? state.focusedPanel;
}

/**
 * Calculate the scroll offset needed to keep an index visible in the environments list
 */
export function getEnvsScrollOffset(
  currentOffset: number,
  index: number,
): number {
  const viewportHeight = ENVIRONMENTS_VIEWPORT - 2; // Account for scroll indicators
  if (index < currentOffset) {
    return index;
  } else if (index >= currentOffset + viewportHeight) {
    return index - viewportHeight + 1;
  }
  return currentOffset;
}

/**
 * Calculate new output scroll offset
 */
export function scrollOutput(
  state: AppState,
  delta: number,
): number {
  const maxScroll = Math.max(0, state.output.length - 5); // Keep at least 5 lines visible
  return Math.max(0, Math.min(state.outputScrollOffset + delta, maxScroll));
}

/**
 * Calculate state updates when switching to a new config
 */
export function getSwitchConfigUpdates(
  state: AppState,
  newIndex: number,
): Partial<AppState> {
  // Save current output to storage
  const currentConfig = state.configs[state.selectedConfigIndex];
  const outputByConfig = { ...state.outputByConfig };
  if (currentConfig && state.output.length > 0) {
    outputByConfig[currentConfig.path] = [...state.output];
  }

  // Load saved output for the new config
  const newConfig = state.configs[newIndex];
  const savedOutput = newConfig ? outputByConfig[newConfig.path] : undefined;

  if (savedOutput) {
    return {
      selectedConfigIndex: newIndex,
      selectedEnvIndex: 0,
      outputScrollOffset: 0,
      outputByConfig,
      output: [...savedOutput],
    };
  } else {
    return {
      selectedConfigIndex: newIndex,
      selectedEnvIndex: 0,
      outputScrollOffset: 0,
      outputByConfig,
      output: [],
      isRunning: false,
      isDeploying: false,
      currentCommand: null,
    };
  }
}
