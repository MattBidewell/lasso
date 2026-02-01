export interface KeyEvent {
  name: string;
  ctrl: boolean;
  shift?: boolean;
  sequence: string;
}

export type KeyName =
  | "up"
  | "down"
  | "left"
  | "right"
  | "enter"
  | "escape"
  | "tab"
  | "shift-tab"
  | "space"
  | "backspace"
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
  | "g"
  | "G"
  | "o"
  | "t"
  | "+"
  | "-"
  | "ctrl-u"
  | "ctrl-d"
  | "char"  // Generic character input
  | "?";

export function parseKeyEvent(event: KeyEvent): KeyName | null {
  // Ctrl key combinations
  if (event.ctrl) {
    if (event.name === "u") return "ctrl-u";
    if (event.name === "d") return "ctrl-d";
  }

  // Tab key (check for shift+tab sequence)
  if (event.name === "tab") {
    // Shift+Tab typically sends escape sequence \x1b[Z
    if (event.sequence === "\x1b[Z" || event.shift) return "shift-tab";
    return "tab";
  }

  // Arrow keys
  if (event.name === "up") return "up";
  if (event.name === "down") return "down";
  if (event.name === "left") return "left";
  if (event.name === "right") return "right";

  // Enter/Return
  if (event.name === "return" || event.name === "enter") return "enter";

  // Escape
  if (event.name === "escape") return "escape";

  // Space
  if (event.name === "space" || event.sequence === " ") return "space";

  // Backspace
  if (event.name === "backspace") return "backspace";

  // Handle uppercase G separately (shift detection via sequence)
  if (event.sequence === "G") return "G";

  // Plus and minus keys
  if (event.sequence === "+" || event.name === "+") return "+";
  if (event.sequence === "-" || event.name === "-") return "-";

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

export function isCtrlU(event: KeyEvent): boolean {
  return event.ctrl && event.name === "u";
}
