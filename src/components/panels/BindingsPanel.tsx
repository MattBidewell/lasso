import { COLORS } from "../../themes/index.ts";
import { state, setFocusedPanel } from "../../state/store.ts";

export function BindingsPanel() {
  const isFocused = () => state.focusedPanel === "bindings";

  const renderContent = () => {
    // Access state to establish reactive dependencies
    const configs = state.configs;
    const selectedIndex = state.selectedConfigIndex;
    const envIndex = state.selectedEnvIndex;

    const config = configs[selectedIndex];
    if (!config?.config) {
      return <text fg={COLORS.muted}>  No bindings</text>;
    }

    const env = config.environments[envIndex] ?? "default";
    const wranglerConfig = config.config;
    const envConfig = env !== "default" ? wranglerConfig.env?.[env] : undefined;
    const source = envConfig || wranglerConfig;

    const lines: string[] = [];

    if (source.kv_namespaces?.length) {
      lines.push(`KV: ${source.kv_namespaces.length}`);
    }
    if (source.d1_databases?.length) {
      lines.push(`D1: ${source.d1_databases.length}`);
    }
    if (source.r2_buckets?.length) {
      lines.push(`R2: ${source.r2_buckets.length}`);
    }
    if (source.durable_objects?.bindings?.length) {
      lines.push(`DO: ${source.durable_objects.bindings.length}`);
    }
    if (source.services?.length) {
      lines.push(`Services: ${source.services.length}`);
    }
    const queues = (source.queues?.producers?.length ?? 0) + (source.queues?.consumers?.length ?? 0);
    if (queues) {
      lines.push(`Queues: ${queues}`);
    }
    const vars = Object.keys(source.vars ?? {}).length;
    if (vars) {
      lines.push(`Vars: ${vars}`);
    }

    if (lines.length === 0) {
      return <text fg={COLORS.muted}>  No bindings</text>;
    }

    // Join all lines with newlines into a single text element
    return <text fg={COLORS.normal}>{lines.map((line) => `  ${line}`).join("\n")}</text>;
  };

  return (
    <scrollbox
      title="[3] Bindings"
      border={true}
      borderStyle="rounded"
      borderColor={isFocused() ? COLORS.activeBorder : COLORS.inactiveBorder}
      focusedBorderColor={COLORS.activeBorder}
      flexGrow={1}
      focused={isFocused()}
      onMouseDown={() => setFocusedPanel("bindings")}
    >
      {renderContent()}
    </scrollbox>
  );
}
