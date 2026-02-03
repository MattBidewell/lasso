import { createMemo, createSignal } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/solid";
import { state, clearTailOutput, setFocusedPanel, getActiveSession, clearSessionOutput } from "../../state/store.ts";
import { stopTail, stopSession } from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";

const VISIBLE_HEIGHT = 50; // Approximate visible lines
const PAGE_SIZE = 5;

export function LogsPanel() {
  let scrollboxRef: ScrollBoxRenderable | undefined;

  const isFocused = () => state.focusedPanel === "logs";

  // Get output from active tail session or fall back to legacy tailOutput
  const tailOutput = () => {
    const activeId = state.activeSessionId;
    if (activeId && activeId.endsWith(":tail") && state.outputBySession[activeId]) {
      return state.outputBySession[activeId];
    }
    return state.tailOutput;
  };

  const activeSession = () => {
    const session = getActiveSession();
    return session?.action === "tail" ? session : undefined;
  };

  const isTailing = () => state.isTailing || (activeSession()?.status === "running");

  // Scroll state
  const [isSticky, setIsSticky] = createSignal(true);

  const title = createMemo(() => {
    const session = activeSession();
    let titleText = "Logs";

    if (session) {
      // Show session info: "Logs: worker-name [env]"
      titleText = `Logs: ${session.displayName} [${session.environment}]`;
      if (session.status === "running") {
        titleText += " (tailing)";
      } else if (session.status === "stopping") {
        titleText += " (stopping)";
      } else if (session.status === "completed") {
        titleText += " (done)";
      } else if (session.status === "failed") {
        titleText += " (failed)";
      }
    } else if (isTailing()) {
      titleText = "Logs (tailing)";
    }

    // Add scroll indicator when not sticky
    if (!isSticky() && scrollboxRef) {
      const maxOffset = Math.max(0, tailOutput().length - VISIBLE_HEIGHT);
      const currentOffset = scrollboxRef.scrollTop;
      titleText += ` [${currentOffset}/${maxOffset}]`;
    }

    return titleText;
  });

  // Scroll logic
  const scrollBy = (lines: number) => {
    setIsSticky(false);
    const maxOffset = Math.max(0, tailOutput().length - VISIBLE_HEIGHT);
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
    const maxOffset = Math.max(0, tailOutput().length - VISIBLE_HEIGHT);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = maxOffset;
    }
  };

  const handleClear = () => {
    // Clear session output if there's an active tail session
    const session = activeSession();
    if (session) {
      clearSessionOutput(session.id);
    } else {
      clearTailOutput();
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
      case "ctrl-c":
        // Stop active tail session or legacy tail
        const sessionToStop = activeSession();
        if (sessionToStop && sessionToStop.status === "running") {
          stopSession(sessionToStop.id);
        } else if (isTailing()) {
          stopTail();
        }
        break;
      case "h":
      case "left":
      case "b":
      case "escape":
        // Go back to sessions panel
        setFocusedPanel("sessions");
        break;
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
      {tailOutput().length === 0 ? (
        <text fg={COLORS.muted}>  No logs yet. Select a tail session or press t to start.</text>
      ) : (
        <text fg={COLORS.normal}>{tailOutput().join("\n")}</text>
      )}
    </scrollbox>
  );
}
