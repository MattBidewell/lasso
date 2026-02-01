import type { AppState, TailOptions, DeployOptions, OptionsModalState } from "../types/app.ts";
import type { KeyName } from "../ui/input.ts";
import type { Panel } from "../ui/panels/types.ts";
import { getNextFocusedPanel } from "../state/index.ts";

/**
 * Callbacks for actions that require app-level coordination
 */
export interface InputRouterCallbacks {
  onQuit: () => void;
  onShowDeployModal: () => void;
  onShowTailModal: () => void;
  onCloseModal: () => void;
  onStartDeploy: (deployOptions?: DeployOptions) => void;
  onStartTail: (options: TailOptions) => void;
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
    const state = this.getState();
    const modal = state.modal;
    if (!modal) return;

    if (modal.type === "options") {
      this.handleOptionsModalKeyPress(key, modal);
    }
  }

  private handleOptionsModalKeyPress(key: KeyName, modal: OptionsModalState): void {
    const fields = modal.fields;
    const currentField = fields[modal.focusedField];
    const isTextField = currentField?.type === "text";

    // For text fields, handle character input first (except special keys)
    if (isTextField) {
      // Navigation keys that work even in text fields
      if (key === "tab" || key === "down") {
        this.navigateField(modal, fields, 1);
        return;
      }
      if (key === "shift-tab" || key === "up") {
        this.navigateField(modal, fields, -1);
        return;
      }
      if (key === "escape") {
        this.callbacks.onCloseModal();
        return;
      }
      if (key === "enter") {
        // Confirm and start the command
        if (modal.commandType === "tail") {
          const { extractTailOptions } = require("../ui/modals/tail-options.ts");
          const options = extractTailOptions(modal.values);
          this.callbacks.onStartTail(options);
        } else if (modal.commandType === "deploy") {
          const { extractDeployOptions } = require("../ui/modals/deploy-options.ts");
          const options = extractDeployOptions(modal.values);
          this.callbacks.onStartDeploy(options);
        }
        return;
      }
      if (key === "backspace") {
        this.handleTextBackspace(modal, currentField);
        return;
      }
      // Type any single character (including j, k, y, n, etc.)
      if (key.length === 1) {
        this.handleTextInput(modal, currentField, key);
        return;
      }
      return;
    }

    // Non-text field handling
    switch (key) {
      case "j":
      case "down":
      case "tab":
        this.navigateField(modal, fields, 1);
        break;

      case "k":
      case "up":
      case "shift-tab":
        this.navigateField(modal, fields, -1);
        break;

      case "space":
        // Space toggles options (toggle/multiSelect fields only)
        if (currentField && (currentField.type === "toggle" || currentField.type === "multiSelect")) {
          this.handleFieldToggle(modal, currentField);
        }
        break;

      case "enter":
      case "y":
        // Confirm and start the command
        if (modal.commandType === "tail") {
          const { extractTailOptions } = require("../ui/modals/tail-options.ts");
          const options = extractTailOptions(modal.values);
          this.callbacks.onStartTail(options);
        } else if (modal.commandType === "deploy") {
          const { extractDeployOptions } = require("../ui/modals/deploy-options.ts");
          const options = extractDeployOptions(modal.values);
          this.callbacks.onStartDeploy(options);
        }
        break;

      case "left":
      case "right":
        if (currentField?.type === "toggle") {
          this.handleToggleSwitch(modal, currentField, key === "right" ? 1 : -1);
        }
        break;

      case "+":
        if (currentField?.type === "number") {
          this.handleNumberAdjust(modal, currentField, 1);
        }
        break;

      case "-":
        if (currentField?.type === "number") {
          this.handleNumberAdjust(modal, currentField, -1);
        }
        break;

      case "n":
      case "escape":
        this.callbacks.onCloseModal();
        break;
    }
  }

  private navigateField(modal: OptionsModalState, fields: typeof modal.fields, direction: 1 | -1): void {
    const newIndex = direction === 1
      ? Math.min(modal.focusedField + 1, fields.length - 1)
      : Math.max(modal.focusedField - 1, 0);

    this.updateState({
      modal: {
        ...modal,
        focusedField: newIndex,
      },
    });
    this.callbacks.onStateChange();
  }

  private handleTextInput(modal: OptionsModalState, field: typeof modal.fields[0], char: string): void {
    const currentValue = (modal.values[field.id] as string) || "";
    const newValue = currentValue + char;

    this.updateState({
      modal: {
        ...modal,
        values: { ...modal.values, [field.id]: newValue },
      },
    });
    this.callbacks.onStateChange();
  }

  private handleTextBackspace(modal: OptionsModalState, field: typeof modal.fields[0]): void {
    const currentValue = (modal.values[field.id] as string) || "";
    if (currentValue.length === 0) return;

    const newValue = currentValue.slice(0, -1);

    this.updateState({
      modal: {
        ...modal,
        values: { ...modal.values, [field.id]: newValue },
      },
    });
    this.callbacks.onStateChange();
  }

  private handleFieldToggle(modal: OptionsModalState, field: typeof modal.fields[0]): void {
    if (field.type === "toggle" && field.options && field.options.length > 0) {
      // Cycle through toggle options
      const options = field.options;
      const currentValue = modal.values[field.id] as string | undefined;
      const currentIndex = options.findIndex((o) => o.value === currentValue);
      const nextIndex = (currentIndex + 1) % options.length;
      const nextOption = options[nextIndex];
      if (!nextOption) return;
      const newValue = nextOption.value;

      this.updateState({
        modal: {
          ...modal,
          values: { ...modal.values, [field.id]: newValue },
        },
      });
      this.callbacks.onStateChange();
    } else if (field.type === "multiSelect" && field.options && field.options.length > 0) {
      // Toggle first unselected option, or cycle through
      const currentValues = (modal.values[field.id] as string[]) || [];
      const options = field.options;

      // Find the next option to toggle (cycle through)
      // For simplicity, toggle the first option that matches a certain pattern
      // or we'll use a different approach - toggle based on sub-index
      // Actually, let's toggle all options in sequence
      const firstUnselected = options.find((o) => !currentValues.includes(o.value));
      if (firstUnselected) {
        // Add first unselected
        this.updateState({
          modal: {
            ...modal,
            values: { ...modal.values, [field.id]: [...currentValues, firstUnselected.value] },
          },
        });
      } else {
        // All selected, clear all
        this.updateState({
          modal: {
            ...modal,
            values: { ...modal.values, [field.id]: [] },
          },
        });
      }
      this.callbacks.onStateChange();
    }
  }

  private handleToggleSwitch(modal: OptionsModalState, field: typeof modal.fields[0], direction: 1 | -1): void {
    if (!field.options || field.options.length === 0) return;

    const options = field.options;
    const currentValue = modal.values[field.id] as string | undefined;
    const currentIndex = options.findIndex((o) => o.value === currentValue);
    const nextIndex = Math.max(0, Math.min(options.length - 1, currentIndex + direction));
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    const newValue = nextOption.value;

    this.updateState({
      modal: {
        ...modal,
        values: { ...modal.values, [field.id]: newValue },
      },
    });
    this.callbacks.onStateChange();
  }

  private handleNumberAdjust(modal: OptionsModalState, field: typeof modal.fields[0], delta: number): void {
    const currentValue = (modal.values[field.id] as number) || 0;
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));

    this.updateState({
      modal: {
        ...modal,
        values: { ...modal.values, [field.id]: newValue },
      },
    });
    this.callbacks.onStateChange();
  }

  private cycleFocus(direction: 1 | -1): void {
    const state = this.getState();
    const nextPanel = getNextFocusedPanel(state, direction);
    this.updateState({ focusedPanel: nextPanel });
    this.callbacks.onStateChange();
  }
}
