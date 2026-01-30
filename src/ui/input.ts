export interface KeyEvent {
  name: string;
  ctrl: boolean;
  sequence: string;
}

export type KeyName =
  | "up"
  | "down"
  | "left"
  | "right"
  | "enter"
  | "escape"
  | "j"
  | "k"
  | "l"
  | "h"
  | "b"
  | "r"
  | "q"
  | "y"
  | "a"
  | "n"
  | "?";

export function parseKeyEvent(event: KeyEvent): KeyName | null {
  // Arrow keys
  if (event.name === "up") return "up";
  if (event.name === "down") return "down";
  if (event.name === "left") return "left";
  if (event.name === "right") return "right";

  // Enter/Return
  if (event.name === "return" || event.name === "enter") return "enter";

  // Escape
  if (event.name === "escape") return "escape";

  // Single character keys
  if (event.name && event.name.length === 1) {
    return event.name as KeyName;
  }

  return null;
}

export function isCtrlC(event: KeyEvent): boolean {
  return event.ctrl && event.name === "c";
}

export function isCtrlD(event: KeyEvent): boolean {
  return event.ctrl && event.name === "d";
}
