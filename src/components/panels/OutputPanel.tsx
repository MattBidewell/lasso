import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state, getActiveExecution, getActiveSession, clearExecutionOutput, setFocusedPanel } from "../../state/store.ts";
import { stopSession } from "../../state/actions.ts";
import { COLORS } from "../../themes/index.ts";
import type { OutputSegment } from "../../types.ts";

const VISIBLE_HEIGHT = 50;
const PAGE_SIZE = 5;

export function OutputPanel() {
  let scrollboxRef: any;
  const setScrollboxRef = (el: any) => {
    scrollboxRef = el;
  };

  const isFocused = () => state.focusedPanel === "output";

  const output = () => {
    const activeId = state.activeExecutionId;
    if (activeId && state.outputByExecution[activeId]) {
      return state.outputByExecution[activeId];
    }
    return [];
  };

  const activeExecution = () => getActiveExecution();
  const activeSession = () => getActiveSession();
  const isRunning = () => activeSession()?.status === "running";

  const [isSticky, setIsSticky] = createSignal(true);

  createEffect(() => {
    state.activeExecutionId;
    setIsSticky(true);
    if (scrollboxRef) {
      scrollboxRef.scrollTop = 0;
    }
  });

  const title = createMemo(() => {
    const execution = activeExecution();
    let titleText = "[5] Output";

    if (execution) {
      const shortId = execution.id.slice(-6);
      titleText = `[5] Output · ${execution.displayName} [${execution.environment}] ${execution.action} #${shortId}`;
      if (execution.status === "stopping") {
        titleText += " (stopping)";
      } else if (execution.status === "failed") {
        titleText += " (failed)";
      }
    } else if (isRunning()) {
      titleText = "[5] Output (running)";
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
    const execution = activeExecution();
    if (execution) {
      clearExecutionOutput(execution.id);
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
      case "k": {
        const sessionToStop = activeSession();
        if (sessionToStop?.status === "running") {
          stopSession(sessionToStop.id);
        } else {
          scrollBy(-1);
        }
        break;
      }
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
      case "x": {
        const sessionToStop = activeSession();
        if (sessionToStop?.status === "running") {
          stopSession(sessionToStop.id);
        }
        break;
      }
      case "ctrl-c": {
        const sessionToStop = activeSession();
        if (sessionToStop?.status === "running") {
          stopSession(sessionToStop.id);
        }
        break;
      }
    }

  });

  const renderSegment = (segment: OutputSegment) => {
    let node: unknown = segment.text;
    if (segment.bold) {
      node = <strong>{node}</strong>;
    }
    if (segment.underline) {
      node = <u>{node}</u>;
    }

    const spanProps = { fg: segment.fg, bg: segment.bg } as Record<string, unknown>;

    return (
      <span {...spanProps}>
        {node}
      </span>
    );
  };

  return (
    <scrollbox
      ref={setScrollboxRef}
      title={title()}
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      height="100%"
      focused={isFocused()}
      stickyScroll={isSticky()}
      stickyStart="bottom"
      onMouseDown={() => setFocusedPanel("output")}
    >
      <Show
        when={output().length > 0}
        fallback={<text fg={COLORS.muted}>  No output yet. Select config, environment, and action (press 4).</text>}
      >
        <text fg={COLORS.normal}>
          <For each={output()}>
            {(line, i) => (
              <span>
                <For each={line.segments}>
                  {(segment) => renderSegment(segment)}
                </For>
                <Show when={i() < output().length - 1}>
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
