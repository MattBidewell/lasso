import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, setFocusedPanel, getDebugLogs } from "../../state/store.ts";
import { COLORS } from "../../themes/index.ts";

const VISIBLE_HEIGHT = 20;

export function DebugLogPanel() {
  let scrollboxRef: any;
  const setScrollboxRef = (el: any) => {
    scrollboxRef = el;
  };

  const isFocused = () => state.focusedPanel === "debug";
  const logs = () => getDebugLogs();

  const [isSticky, setIsSticky] = createSignal(true);

  createEffect(() => {
    logs().length;
    if (isSticky() && scrollboxRef) {
      const maxOffset = Math.max(0, logs().length - VISIBLE_HEIGHT);
      scrollboxRef.scrollTop = maxOffset;
    }
  });

  const scrollBy = (lines: number) => {
    setIsSticky(false);
    const maxOffset = Math.max(0, logs().length - VISIBLE_HEIGHT);
    const newOffset = Math.max(0, Math.min((scrollboxRef?.scrollTop ?? 0) + lines, maxOffset));
    if (scrollboxRef) {
      scrollboxRef.scrollTop = newOffset;
    }
  };

  const scrollToTop = () => {
    setIsSticky(false);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    setIsSticky(true);
    const maxOffset = Math.max(0, logs().length - VISIBLE_HEIGHT);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = maxOffset;
    }
  };

  useKeyboard((event) => {
    if (!isFocused()) return;
    if (state.modal) return;

    switch (event.name) {
      case "j":
      case "down":
        scrollBy(1);
        break;
      case "k":
      case "up":
        scrollBy(-1);
        break;
      case "g":
        if (event.shift) {
          scrollToBottom();
        } else {
          scrollToTop();
        }
        break;
      case "G":
        scrollToBottom();
        break;
    }
  });

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatLine = (line: { timestamp: number; level: string; message: string }): string => {
    const time = formatTime(line.timestamp);
    const level = line.level.toUpperCase();
    return `[${time}] [${level}] ${line.message}`;
  };

  const title = createMemo(() => {
    if (!isSticky() && scrollboxRef) {
      const maxOffset = Math.max(0, logs().length - VISIBLE_HEIGHT);
      const currentOffset = scrollboxRef.scrollTop;
      return `[7] Debug Logs [${currentOffset}/${maxOffset}]`;
    }
    return "[7] Debug Logs";
  });

  return (
    <scrollbox
      ref={setScrollboxRef}
      title={title()}
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.debugBorder}
      focusedBorderColor={COLORS.debugBorder}
      height="100%"
      focused={isFocused()}
      stickyScroll={isSticky()}
      stickyStart="bottom"
      onMouseDown={() => setFocusedPanel("debug")}
    >
      <Show
        when={logs().length > 0}
        fallback={<text fg={COLORS.muted}>  No debug logs yet.</text>}
      >
        <text fg={COLORS.normal}>
          <For each={logs()}>
            {(line, i) => (
              <span>
                <span>{formatLine(line)}</span>
                <Show when={i() < logs().length - 1}>
                  <br />
                </Show>
              </span>
            )}
          </For>
        </text>
      </Show>
    </scrollbox>
  );
}
