import type { AppState } from "../../types/app.ts";
import type { KeyName } from "../input.ts";

/**
 * Result of handling a key press
 */
export type InputResult =
  | { handled: true; stateUpdates?: Partial<AppState> }
  | { handled: false };

/**
 * Base callbacks available to all panels
 * (Currently empty - panels define their own specific callbacks)
 */
export interface BasePanelCallbacks {}

/**
 * Interface for interactive panels that can handle input
 */
export interface Panel {
  readonly id: string;
  render(state: AppState): unknown;
  handleInput(key: KeyName, state: AppState): InputResult;
}
