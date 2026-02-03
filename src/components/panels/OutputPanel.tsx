import { createMemo, createSignal } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { state, setFocusedPanel, getActiveSession, clearSessionOutput } from "../../state/store.ts";
import { stopSession } from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";

const VISIBLE_HEIGHT = 50;
const PAGE_SIZE = 5;

export function OutputPanel() {
  let scrollboxRef: ScrollBoxRenderable | undefined;

  const isFocused = () => state.focusedPanel === "output";

  const output = () => {
    const activeId = state.activeSessionId;
    if (activeId && state.outputBySession[activeId]) {
      return state.outputBySession[activeId];
    }
    return [];
  };

  const activeSession = () => getActiveSession();
  const isRunning = () => activeSession()?.status === "running";

  const [isSticky, setIsSticky] = createSignal(true);

  const title = createMemo(() => {
    const session = activeSession();
    let titleText = "Output";

    if (session) {
      titleText = `${session.displayName} [${session.environment}]`;
      if (session.status === "running") {
        titleText += ` (${session.action})`;
      } else if (session.status === "stopping") {
        titleText += " (stopping)";
      } else if (session.status === "completed") {
        titleText += " (done)";
      } else if (session.status === "failed") {
        titleText += " (failed)";
      }
    } else if (isRunning()) {
      titleText = "Output (running)";
    }

    if (!isSticky() && scrollboxRef) {
      const maxOffset = Math.max(0, output().length - VISIBLE_HEIGHT);
      const currentOffset = scrollboxRef.scrollTop;
      titleText += ` [${currentOffset}/${maxOffset}]`;
    }

    return titleText;
  });

  const scrollBy = (lines: number) => {
    setIsSticky(false);
    const maxOffset = Math.max(0, output().length - VISIBLE_HEIGHT);
    const newOffset = Math.max(0, Math.min((scrollboxRef?.scrollTop ?? 0) + lines, maxOffset));
    if (scrollboxRef) {
      scrollboxRef.scrollTop = newOffset;
    }
  };

  const scrollToTop = () => {
    setIsSticky(true);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    setIsSticky(true);
    const maxOffset = Math.max(0, output().length - VISIBLE_HEIGHT);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = maxOffset;
    }
  };

  const handleClear = () => {
    const session = activeSession();
    if (session) {
      clearSessionOutput(session.id);
    }
    setIsSticky(true);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = 0;
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
        scrollToTop();
        break;
      case "G":
        scrollToBottom();
        break;
      case "ctrl-d":
        scrollBy(PAGE_SIZE);
        break;
      case "ctrl-u":
        scrollBy(-PAGE_SIZE);
        break;
      case "c":
        handleClear();
        break;
      case "ctrl-c": {
        const sessionToStop = activeSession();
        if (sessionToStop?.status === "running") {
          stopSession(sessionToStop.id);
        }
        break;
      }
      case "h":
      case "left":
      case "b":
      case "escape": {
        const sessionToStop = activeSession();
        if (sessionToStop?.status === "running") {
          stopSession(sessionToStop.id);
        }
        setFocusedPanel("sessions");
        break;
      }
    }
  });

  return (
    <scrollbox
      ref={scrollboxRef}
      title={title()}
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      height="100%"
      focused={isFocused()}
      stickyScroll={isSticky()}
      stickyStart="bottom"
    >
      {output().length === 0 ? (
        <text fg={COLORS.muted}>  No output yet. Select a session or press Enter to start dev.</text>
      ) : (
        <text fg={COLORS.normal}>{output().join("\n")}</text>
      )}
    </scrollbox>
  );
}
