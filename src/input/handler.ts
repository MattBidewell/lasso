import type { AppState, DeployScope } from "../types/app.ts";
import type { KeyName } from "../ui/input.ts";
import type { Panel } from "../ui/panels/types.ts";
import { getNextFocusedPanel } from "../state/index.ts";

/**
 * Callbacks for actions that require app-level coordination
 */
export interface InputRouterCallbacks {
  onQuit: () => void;
  onShowDeployModal: () => void;
  onCloseModal: () => void;
  onStartDeploy: (scope: DeployScope) => void;
  onStateChange: () => void;
}

/**
 * Routes keyboard input to the appropriate panel or handles global keys
 */
export class InputRouter {
  private panels: Map<string, Panel> = new Map();

  constructor(
    private getState: () => AppState,
    private updateState: (updates: Partial<AppState>) => void,
    private callbacks: InputRouterCallbacks,
  ) {}

  /**
   * Register a panel with the router
   */
  registerPanel(panel: Panel): void {
    this.panels.set(panel.id, panel);
  }

  /**
   * Main entry point for handling key presses
   */
  handleKeyPress(key: KeyName): void {
    const state = this.getState();

    // Modal takes priority
    if (state.modal) {
      this.handleModalKeyPress(key);
      return;
    }

    // Global keys
    switch (key) {
      case "q":
        this.callbacks.onQuit();
        return;
      case "tab":
        this.cycleFocus(1);
        return;
      case "shift-tab":
        this.cycleFocus(-1);
        return;
    }

    // Route to focused panel
    const panel = this.panels.get(state.focusedPanel);
    if (panel) {
      const result = panel.handleInput(key, state);
      if (result.handled && result.stateUpdates) {
        this.updateState(result.stateUpdates);
        this.callbacks.onStateChange();
      }
    }
  }

  private handleModalKeyPress(key: KeyName): void {
    switch (key) {
      case "y":
        this.callbacks.onStartDeploy("selected");
        break;
      case "a":
        this.callbacks.onStartDeploy("all");
        break;
      case "n":
      case "escape":
        this.callbacks.onCloseModal();
        break;
    }
  }

  private cycleFocus(direction: 1 | -1): void {
    const state = this.getState();
    const nextPanel = getNextFocusedPanel(state, direction);
    this.updateState({ focusedPanel: nextPanel });
    this.callbacks.onStateChange();
  }
}
