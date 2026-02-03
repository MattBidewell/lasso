import { Show, onMount } from "solid-js";
import { useKeyboard, useRenderer } from "@opentui/solid";
import { state, cycleFocus, setFocusedPanel, getSelectedSession } from "./state/store.ts";
import {
  closeModal,
  showHelpModal,
  openInEditor,
  stopSession,
  setRenderer,
  exitApp,
} from "./state/actions.ts";

// Panels
import { ConfigsPanel } from "./components/panels/ConfigsPanel.tsx";
import { EnvironmentsPanel } from "./components/panels/EnvironmentsPanel.tsx";
import { BindingsPanel } from "./components/panels/BindingsPanel.tsx";
import { ActionsPanel } from "./components/panels/ActionsPanel.tsx";
import { AboutPanel } from "./components/panels/AboutPanel.tsx";
import { OutputPanel } from "./components/panels/OutputPanel.tsx";
import { TerminalHistoryPanel } from "./components/panels/TerminalHistoryPanel.tsx";

// Modals
import { DeployModal } from "./components/modals/DeployModal.tsx";
import { TailModal } from "./components/modals/TailModal.tsx";
import { HelpModal } from "./components/modals/HelpModal.tsx";
import { StatusBar } from "./components/StatusBar.tsx";

export function App() {
  const renderer = useRenderer();
  onMount(() => {
    setRenderer(renderer);
  });

  useKeyboard((event) => {
    // Handle escape first - only closes modals
    if (event.name === "escape") {
      if (state.modal) {
        closeModal();
      }
      return;
    }

    // Modal takes priority for other keys
    if (state.modal) return;

    if (event.ctrl && event.name === "c") {
      const session = getSelectedSession();
      if (session?.status === "running") {
        stopSession(session.id);
      } else {
        exitApp();
      }
      return;
    }

    switch (event.name) {
      case "q":
        exitApp();
        break;
      case "tab":
        cycleFocus("forward");
        break;
      case "shift-tab":
        cycleFocus("backward");
        break;
      case "?":
        showHelpModal();
        break;
      case "1":
        setFocusedPanel("configs");
        break;
      case "2":
        setFocusedPanel("environments");
        break;
      case "3":
        setFocusedPanel("bindings");
        break;
      case "4":
        setFocusedPanel("actions");
        break;
      case "5":
        setFocusedPanel("output");
        break;
      case "6":
        setFocusedPanel("history");
        break;
      case "o":
        openInEditor();
        break;
    }
  });

  return (
    <box flexDirection="column" height="100%" width="100%">
      <box flexDirection="row" flexGrow={1}>
        <box flexDirection="column" width="33%" height="100%">
          <ConfigsPanel />
          <EnvironmentsPanel />
          <BindingsPanel />
          <ActionsPanel />
        </box>

        <box flexDirection="column" width="67%" height="100%">
          <box height="70%">
            <Show when={state.activeSessionId} fallback={<AboutPanel />}>
              <OutputPanel />
            </Show>
          </box>
          <box height="30%">
            <TerminalHistoryPanel />
          </box>
        </box>
      </box>

      <box height={1}>
        <StatusBar />
      </box>

      <Show when={state.modal?.type === "deploy"}>
        <DeployModal />
      </Show>
      <Show when={state.modal?.type === "tail"}>
        <TailModal />
      </Show>
      <Show when={state.modal?.type === "help"}>
        <HelpModal />
      </Show>
    </box>
  );
}
