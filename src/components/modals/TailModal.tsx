import { createSignal, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { state } from "../../state/store.ts";
import { closeModal, startTailSession } from "../../state/actions.ts";
import type { TailOptions } from "../../types.ts";
import { COLORS } from "../../themes/index.ts";

type Format = "json" | "pretty";
type StatusFilter = "ok" | "error" | "canceled";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

// Total fields: format(1) + sampling(1) + status(3) + methods(7) + text(4) = 16
const FIELD_COUNT = 16;

export function TailModal() {
  const modal = () => state.modal;

  // Local state for tail options
  const [format, setFormat] = createSignal<Format>("pretty");
  const [samplingRate, setSamplingRate] = createSignal(1);
  const [filterOk, setFilterOk] = createSignal(true);
  const [filterError, setFilterError] = createSignal(true);
  const [filterCanceled, setFilterCanceled] = createSignal(true);
  
  // HTTP Methods (7 toggles)
  const [methodGet, setMethodGet] = createSignal(false);
  const [methodPost, setMethodPost] = createSignal(false);
  const [methodPut, setMethodPut] = createSignal(false);
  const [methodDelete, setMethodDelete] = createSignal(false);
  const [methodPatch, setMethodPatch] = createSignal(false);
  const [methodHead, setMethodHead] = createSignal(false);
  const [methodOptions, setMethodOptions] = createSignal(false);
  
  // Text fields
  const [search, setSearch] = createSignal("");
  const [ip, setIp] = createSignal("");
  const [header, setHeader] = createSignal("");
  const [versionId, setVersionId] = createSignal("");
  
  const [focusedField, setFocusedField] = createSignal(0);

  const configName = () => {
    const m = modal();
    return m?.type === "tail" ? m.configName : "";
  };

  const environment = () => {
    const m = modal();
    return m?.type === "tail" ? m.environment : "";
  };

  const toggleFormat = () => {
    setFormat((f) => (f === "pretty" ? "json" : "pretty"));
  };

  const getStatusFilters = (): StatusFilter[] | undefined => {
    const filters: StatusFilter[] = [];
    if (filterOk()) filters.push("ok");
    if (filterError()) filters.push("error");
    if (filterCanceled()) filters.push("canceled");
    // If all are selected, don't pass status filter (show all)
    if (filters.length === 3) return undefined;
    return filters.length > 0 ? filters : undefined;
  };

  const getHttpMethods = (): HttpMethod[] | undefined => {
    const methods: HttpMethod[] = [];
    if (methodGet()) methods.push("GET");
    if (methodPost()) methods.push("POST");
    if (methodPut()) methods.push("PUT");
    if (methodDelete()) methods.push("DELETE");
    if (methodPatch()) methods.push("PATCH");
    if (methodHead()) methods.push("HEAD");
    if (methodOptions()) methods.push("OPTIONS");
    return methods.length > 0 ? methods : undefined;
  };

  useKeyboard((event) => {
    if (modal()?.type !== "tail") return;

    switch (event.name) {
      case "y":
      case "return": {
        const options: TailOptions = {
          format: format(),
          samplingRate: samplingRate(),
          status: getStatusFilters(),
          methods: getHttpMethods(),
          search: search() || undefined,
          ip: ip() ? [ip()] : undefined,
          header: header() || undefined,
          versionId: versionId() || undefined,
        };
        startTailSession(options);
        break;
      }
      case "escape":
      case "n":
        closeModal();
        break;
      case "j":
      case "down":
        setFocusedField((f) => Math.min(f + 1, FIELD_COUNT - 1));
        break;
      case "k":
      case "up":
        setFocusedField((f) => Math.max(f - 1, 0));
        break;
      case "space": {
        const focused = focusedField();
        // Toggle fields based on index
        if (focused === 0) toggleFormat();
        else if (focused === 2) setFilterOk((v) => !v);
        else if (focused === 3) setFilterError((v) => !v);
        else if (focused === 4) setFilterCanceled((v) => !v);
        else if (focused === 5) setMethodGet((v) => !v);
        else if (focused === 6) setMethodPost((v) => !v);
        else if (focused === 7) setMethodPut((v) => !v);
        else if (focused === 8) setMethodDelete((v) => !v);
        else if (focused === 9) setMethodPatch((v) => !v);
        else if (focused === 10) setMethodHead((v) => !v);
        else if (focused === 11) setMethodOptions((v) => !v);
        break;
      }
      case "left": {
        if (focusedField() === 1) {
          setSamplingRate((r) => Math.max(0.1, Math.round((r - 0.1) * 10) / 10));
        }
        break;
      }
      case "right": {
        if (focusedField() === 1) {
          setSamplingRate((r) => Math.min(1, Math.round((r + 0.1) * 10) / 10));
        }
        break;
      }
      // Text input handling for text fields (12-15)
      case "backspace": {
        const focused = focusedField();
        if (focused === 12) setSearch((s) => s.slice(0, -1));
        else if (focused === 13) setIp((s) => s.slice(0, -1));
        else if (focused === 14) setHeader((s) => s.slice(0, -1));
        else if (focused === 15) setVersionId((s) => s.slice(0, -1));
        break;
      }
      default: {
        // Handle printable characters for text fields (indices 12-15)
        const focused = focusedField();
        if (focused >= 12 && focused <= 15 && event.sequence) {
          // Only accept single printable characters (length 1, not control chars)
          const seq = event.sequence;
          if (seq.length === 1 && seq.charCodeAt(0) >= 32 && seq.charCodeAt(0) <= 126) {
            if (focused === 12) setSearch((s) => s + seq);
            else if (focused === 13) setIp((s) => s + seq);
            else if (focused === 14) setHeader((s) => s + seq);
            else if (focused === 15) setVersionId((s) => s + seq);
          }
        }
        break;
      }
    }
  });

  const statusFilters = [
    { id: "ok", label: "OK (2xx)", get: filterOk, set: setFilterOk, color: COLORS.success },
    { id: "error", label: "Error (4xx/5xx)", get: filterError, set: setFilterError, color: COLORS.error },
    { id: "canceled", label: "Canceled", get: filterCanceled, set: setFilterCanceled, color: COLORS.muted },
  ];

  const httpMethods = [
    { id: "GET", label: "GET", get: methodGet, set: setMethodGet },
    { id: "POST", label: "POST", get: methodPost, set: setMethodPost },
    { id: "PUT", label: "PUT", get: methodPut, set: setMethodPut },
    { id: "DELETE", label: "DELETE", get: methodDelete, set: setMethodDelete },
    { id: "PATCH", label: "PATCH", get: methodPatch, set: setMethodPatch },
    { id: "HEAD", label: "HEAD", get: methodHead, set: setMethodHead },
    { id: "OPTIONS", label: "OPTIONS", get: methodOptions, set: setMethodOptions },
  ];

  const textFields = [
    { id: "search", label: "Search string", get: search, set: setSearch },
    { id: "ip", label: "IP filter", get: ip, set: setIp },
    { id: "header", label: "Header (name:value)", get: header, set: setHeader },
    { id: "versionId", label: "Version ID", get: versionId, set: setVersionId },
  ];

  return (
    <box
      position="absolute"
      top="15%"
      left="20%"
      width={60}
      height={24}
      border={true}
      borderStyle="rounded"
      borderColor={COLORS.activeBorder}
      title={`Tail ${configName()}`}
      backgroundColor="black"
    >
      <text> </text>
      <text fg={COLORS.normal}>  Environment: <strong>{environment()}</strong></text>
      <text> </text>
      
      {/* Format field - index 0 */}
      <text fg={focusedField() === 0 ? COLORS.selected : COLORS.normal}>
        <Show when={focusedField() === 0} fallback={<span>{"  "}Format: {format()}</span>}>
          <strong>{"  "}Format: {format()}</strong>
        </Show>
      </text>
      
      {/* Sampling rate field - index 1 */}
      <text fg={focusedField() === 1 ? COLORS.selected : COLORS.normal}>
        <Show when={focusedField() === 1} fallback={<span>{"  "}Sampling: {(samplingRate() * 100).toFixed(0)}%</span>}>
          <strong>{"  "}Sampling: {(samplingRate() * 100).toFixed(0)}%</strong>
        </Show>
      </text>
      <text> </text>
      
      {/* Status filters section - indices 2-4 */}
      <text fg={COLORS.muted}>  Status filters:</text>
      <For each={statusFilters}>
        {(filter, i) => (
          <text fg={focusedField() === i() + 2 ? COLORS.selected : COLORS.normal}>
            <Show when={focusedField() === i() + 2} fallback={<span>{"    "}[{filter.get() ? "x" : " "}] {filter.label}</span>}>
              <strong>{"    "}[{filter.get() ? "x" : " "}] {filter.label}</strong>
            </Show>
          </text>
        )}
      </For>
      <text> </text>
      
      {/* HTTP Methods section - indices 5-11 */}
      <text fg={COLORS.muted}>  HTTP Methods:</text>
      <text fg={COLORS.muted}>    (toggle with space)</text>
      {/* Row 1: GET, POST, PUT */}
      <text fg={focusedField() >= 5 && focusedField() <= 7 ? COLORS.selected : COLORS.normal}>
        <span>
          {"    "}
          <Show when={focusedField() === 5}><strong>[{methodGet() ? "x" : " "}] GET</strong></Show>
          <Show when={focusedField() !== 5}>[{methodGet() ? "x" : " "}] GET</Show>
          {"  "}
          <Show when={focusedField() === 6}><strong>[{methodPost() ? "x" : " "}] POST</strong></Show>
          <Show when={focusedField() !== 6}>[{methodPost() ? "x" : " "}] POST</Show>
          {"  "}
          <Show when={focusedField() === 7}><strong>[{methodPut() ? "x" : " "}] PUT</strong></Show>
          <Show when={focusedField() !== 7}>[{methodPut() ? "x" : " "}] PUT</Show>
        </span>
      </text>
      {/* Row 2: DELETE, PATCH */}
      <text fg={focusedField() >= 8 && focusedField() <= 9 ? COLORS.selected : COLORS.normal}>
        <span>
          {"    "}
          <Show when={focusedField() === 8}><strong>[{methodDelete() ? "x" : " "}] DELETE</strong></Show>
          <Show when={focusedField() !== 8}>[{methodDelete() ? "x" : " "}] DELETE</Show>
          {"  "}
          <Show when={focusedField() === 9}><strong>[{methodPatch() ? "x" : " "}] PATCH</strong></Show>
          <Show when={focusedField() !== 9}>[{methodPatch() ? "x" : " "}] PATCH</Show>
        </span>
      </text>
      {/* Row 3: HEAD, OPTIONS */}
      <text fg={focusedField() >= 10 && focusedField() <= 11 ? COLORS.selected : COLORS.normal}>
        <span>
          {"    "}
          <Show when={focusedField() === 10}><strong>[{methodHead() ? "x" : " "}] HEAD</strong></Show>
          <Show when={focusedField() !== 10}>[{methodHead() ? "x" : " "}] HEAD</Show>
          {"  "}
          <Show when={focusedField() === 11}><strong>[{methodOptions() ? "x" : " "}] OPTIONS</strong></Show>
          <Show when={focusedField() !== 11}>[{methodOptions() ? "x" : " "}] OPTIONS</Show>
        </span>
      </text>
      <text> </text>
      
      {/* Text filters section - indices 12-15 */}
      <text fg={COLORS.muted}>  Filters (type to edit):</text>
      <For each={textFields}>
        {(field, i) => (
          <text fg={focusedField() === i() + 12 ? COLORS.selected : COLORS.normal}>
            <Show when={focusedField() === i() + 12} fallback={<span>{"    "}{field.label}: {field.get() || "(empty)"}</span>}>
              <strong>{"    "}{field.label}: {field.get()}_</strong>
            </Show>
          </text>
        )}
      </For>
      
      <text> </text>
      <text fg={COLORS.muted}>  j/k:nav  space:toggle  ←→:adjust  y:start  n:cancel</text>
    </box>
  );
}
