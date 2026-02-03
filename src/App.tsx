import { Show, onMount } from "solid-js";
import { useKeyboard, useRenderer } from "@opentui/solid";
import { state, cycleFocus, setFocusedPanel } from "./state/store.ts";
import {
  handleEscape,
  showHelpModal,
  openInEditor,
  stopDev,
  stopDeploy,
  stopTail,
  setRenderer,
  exitApp,
} from "./state/actions.ts";

// Panels
import { ConfigsPanel } from "./components/panels/ConfigsPanel.tsx";
import { EnvironmentsPanel } from "./components/panels/EnvironmentsPanel.tsx";
import { BindingsPanel } from "./components/panels/BindingsPanel.tsx";
import { SessionsPanel } from "./components/panels/SessionsPanel.tsx";
import { AboutPanel } from "./components/panels/AboutPanel.tsx";
import { OutputPanel } from "./components/panels/OutputPanel.tsx";
import { LogsPanel } from "./components/panels/LogsPanel.tsx";

// Modals
import { DeployModal } from "./components/modals/DeployModal.tsx";
import { TailModal } from "./components/modals/TailModal.tsx";
import { HelpModal } from "./components/modals/HelpModal.tsx";
import { StatusBar } from "./components/StatusBar.tsx";

export function App() {
  // Get renderer reference for proper cleanup on exit
  const renderer = useRenderer();
  onMount(() => {
    setRenderer(renderer);
  });

  // Global keyboard handler
  useKeyboard((event) => {
    // Modal takes priority
    if (state.modal) return;

    // Handle Ctrl+C - check ctrl flag and name separately
    if (event.ctrl && event.name === "c") {
      // Ctrl+C handling - stop processes based on state
      if (state.isTailing && state.focusedPanel === "logs") {
        stopTail();
      } else if (state.isDeploying && state.focusedPanel === "output") {
        stopDeploy();
      } else if (state.isRunning && state.focusedPanel === "output") {
        stopDev();
      } else {
        // No process running or not in output/logs panel - exit cleanly
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
      case "escape":
      case "b":
        handleEscape();
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
        setFocusedPanel("sessions");
        break;
      case "5":
        setFocusedPanel("output");
        break;
      case "6":
        setFocusedPanel("logs");
        break;
      case "o":
        openInEditor();
        break;
    }
  });

  return (
    <box flexDirection="column" height="100%" width="100%">
      {/* Main content area */}
      <box flexDirection="row" flexGrow={1}>
        <box flexDirection="column" width="33%" height="100%">
          <ConfigsPanel />
          <EnvironmentsPanel />
          <BindingsPanel />
          <SessionsPanel />
        </box>

        <box flexDirection="column" width="67%" height="100%">
          <Show when={state.rightPanelView === "about"}>
            <AboutPanel />
          </Show>
          <Show when={state.rightPanelView === "output"}>
            <OutputPanel />
          </Show>
          <Show when={state.rightPanelView === "logs"}>
            <LogsPanel />
          </Show>
        </box>
      </box>

      {/* Status bar at bottom */}
      <box height={1}>
        <StatusBar />
      </box>

      {/* Modal overlay */}
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
