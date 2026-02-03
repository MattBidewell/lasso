import { createSignal, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state } from "../../state/store.ts";
import { closeModal, startDeploySession } from "../../state/actions.ts";
import type { DeployOptions } from "../../types.ts";
import { COLORS } from "../../themes/index.ts";

type FieldType = "toggle" | "text";

interface Field {
  id: string;
  type: FieldType;
  label: string;
}

export function DeployModal() {
  const modal = () => state.modal;

  // Local state for deploy options
  const [dryRun, setDryRun] = createSignal(false);
  const [minify, setMinify] = createSignal(true);
  const [keepVars, setKeepVars] = createSignal(false);
  const [noBundle, setNoBundle] = createSignal(false);
  const [uploadSourceMaps, setUploadSourceMaps] = createSignal(false);
  const [compatibilityDate, setCompatibilityDate] = createSignal("");
  const [workerName, setWorkerName] = createSignal("");
  const [focusedField, setFocusedField] = createSignal(0);

  const fields: Field[] = [
    { id: "dryRun", type: "toggle", label: "Dry run" },
    { id: "minify", type: "toggle", label: "Minify" },
    { id: "keepVars", type: "toggle", label: "Keep vars" },
    { id: "noBundle", type: "toggle", label: "No bundle" },
    { id: "uploadSourceMaps", type: "toggle", label: "Source maps" },
    { id: "compatibilityDate", type: "text", label: "Compatibility date" },
    { id: "workerName", type: "text", label: "Worker name" },
  ];

  const getFieldValue = (id: string): boolean | string => {
    switch (id) {
      case "dryRun": return dryRun();
      case "minify": return minify();
      case "keepVars": return keepVars();
      case "noBundle": return noBundle();
      case "uploadSourceMaps": return uploadSourceMaps();
      case "compatibilityDate": return compatibilityDate();
      case "workerName": return workerName();
      default: return false;
    }
  };

  const setFieldValue = (id: string, value: boolean | string) => {
    switch (id) {
      case "dryRun": setDryRun(value as boolean); break;
      case "minify": setMinify(value as boolean); break;
      case "keepVars": setKeepVars(value as boolean); break;
      case "noBundle": setNoBundle(value as boolean); break;
      case "uploadSourceMaps": setUploadSourceMaps(value as boolean); break;
      case "compatibilityDate": setCompatibilityDate(value as string); break;
      case "workerName": setWorkerName(value as string); break;
    }
  };

  const configName = () => {
    const m = modal();
    return m?.type === "deploy" ? m.configName : "";
  };

  const environment = () => {
    const m = modal();
    return m?.type === "deploy" ? m.environment : "";
  };

  const confirmDeploy = () => {
    const options: DeployOptions = {
      dryRun: dryRun(),
      minify: minify(),
      keepVars: keepVars(),
      noBundle: noBundle(),
      uploadSourceMaps: uploadSourceMaps(),
      compatibilityDate: compatibilityDate() || undefined,
      name: workerName() || undefined,
    };
    startDeploySession(options);
  };

  useKeyboard((event) => {
    if (modal()?.type !== "deploy") return;

    const currentField = fields[focusedField()];
    if (!currentField) return;
    
    const currentValue = getFieldValue(currentField.id);

    switch (event.name) {
      case "y":
        confirmDeploy();
        break;
      case "escape":
      case "n":
        closeModal();
        break;
      case "j":
      case "down":
        setFocusedField((f) => Math.min(f + 1, fields.length - 1));
        break;
      case "k":
      case "up":
        setFocusedField((f) => Math.max(f - 1, 0));
        break;
      case "tab":
        if (focusedField() === fields.length - 1) {
          confirmDeploy();
        } else {
          setFocusedField((f) => f + 1);
        }
        break;
      case "return":
        if (focusedField() === fields.length - 1) {
          confirmDeploy();
        } else {
          setFocusedField((f) => f + 1);
        }
        break;
      case "space":
        if (currentField.type === "toggle") {
          setFieldValue(currentField.id, !(currentValue as boolean));
        }
        break;
      case "backspace":
        if (currentField.type === "text") {
          const textValue = (currentValue as string);
          setFieldValue(currentField.id, textValue.slice(0, -1));
        }
        break;
      default:
        // Handle printable characters for text fields
        if (currentField.type === "text" && event.name.length === 1) {
          setFieldValue(currentField.id, (currentValue as string) + event.name);
        }
        break;
    }
  });

  const renderField = (field: Field, index: number) => {
    const isActive = focusedField() === index;
    const value = getFieldValue(field.id);
    const color = isActive ? COLORS.selected : COLORS.normal;
    const prefix = isActive ? "> " : "  ";

    if (field.type === "toggle") {
      const toggleValue = value as boolean;
      return (
        <text fg={color}>
          <Show when={isActive} fallback={<span>{prefix}[{toggleValue ? "x" : " "}] {field.label}</span>}>
            <strong>{prefix}[{toggleValue ? "x" : " "}] {field.label}</strong>
          </Show>
        </text>
      );
    }

    // Text field
    const textValue = (value as string) || "(empty)";
    const cursor = isActive ? "_" : "";
    return (
      <text fg={color}>
        <Show when={isActive} fallback={<span>{prefix}{field.label}: {textValue}</span>}>
          <strong>{prefix}{field.label}: {textValue}{cursor}</strong>
        </Show>
      </text>
    );
  };

  return (
    <box
      position="absolute"
      top="30%"
      left="25%"
      width={50}
      height={16}
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title={`Deploy ${configName()}`}
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.normal}>  Environment: <strong>{environment()}</strong></text>
      <text> </text>
      <For each={fields}>
        {(field, i) => renderField(field, i())}
      </For>
      <text> </text>
      <text fg={COLORS.muted}>  j/k:nav space:toggle tab/ret:next y:deploy n:cancel</text>
    </box>
  );
}
