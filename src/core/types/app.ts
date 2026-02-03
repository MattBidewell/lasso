import type { WranglerConfig } from './wrangler.ts';

export type ModalType = 'deploy-confirm' | 'options' | null;
export type CommandType = 'dev' | 'deploy' | 'tail' | null;

// Generic modal field configuration (reusable for any options modal)
export type FieldType = 'toggle' | 'multiSelect' | 'number' | 'text';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
}

// Deploy confirmation modal state
export interface DeployModalState {
  type: 'deploy-confirm';
  workerName: string;
  environment: string;
  environments: string[];
}

// Generic options modal state
export interface OptionsModalState {
  type: "options";
  commandType: "tail" | "deploy" | string;
  title: string;
  workerName: string;
  environment: string;
  fields: FieldConfig[];
  values: Record<string, unknown>;
  focusedField: number;
  confirmLabel: string;
}

export type ModalState = DeployModalState | OptionsModalState;

// Tail-specific options (extracted from modal values)
export interface TailOptions {
  format?: 'json' | 'pretty';
  status?: Array<'ok' | 'error' | 'canceled'>;
  methods?: string[];
  samplingRate?: number;
  search?: string;
  ip?: string[];
  header?: string;
  versionId?: string;
}

// Deploy-specific options (extracted from modal values)
export interface DeployOptions {
  dryRun?: boolean;
  minify?: boolean;
  keepVars?: boolean;
  noBundle?: boolean;
  uploadSourceMaps?: boolean;
  compatibilityDate?: string;
  name?: string;
}

export interface DiscoveredConfig {
  /** Absolute path to wrangler.json */
  path: string;

  /** Relative path from cwd for display */
  relativePath: string;

  /** Directory containing the config */
  directory: string;

  /** Parsed config, or null if parse failed */
  config: WranglerConfig | null;

  /** Parse error message, if any */
  error: string | null;

  /** Worker name from config, or directory name fallback */
  name: string;

  /** List of environment names (always includes 'default' if valid) */
  environments: string[];
}

export type Panel = 'configs' | 'environments' | 'output' | 'logs';
export type RightPanelView = 'about' | 'output' | 'logs';

export interface AppState {
  configs: DiscoveredConfig[];
  selectedConfigIndex: number;
  /** Which panel currently has focus */
  focusedPanel: Panel;
  selectedEnvIndex: number;
  watching: boolean;
  statusMessage: string | null;
  /** Is a dev server currently running */
  isRunning: boolean;
  /** Is a deploy currently running */
  isDeploying: boolean;
  /** Is tail currently running */
  isTailing: boolean;
  /** Which command type is currently running */
  currentCommand: CommandType;
  output: string[];
  /** Scroll offset for output panel (lines from bottom) */
  outputScrollOffset: number;
  /** Per-config output storage (keyed by config path) */
  outputByConfig: Record<string, string[]>;
  /** Tail log output (separate from dev/deploy output) */
  tailOutput: string[];
  /** Current tail options when tailing is active */
  tailOptions: TailOptions | null;
  cwd: string;
  /** Modal state for confirmations */
  modal: ModalState | null;
  /** Scroll offset for configs list */
  configsScrollOffset: number;
  /** Scroll offset for environments list */
  environmentsScrollOffset: number;
  /** Which view to show in right panel */
  rightPanelView: RightPanelView;
}

export type AppAction =
  | { type: 'SET_CONFIGS'; payload: DiscoveredConfig[] }
  | { type: 'UPDATE_CONFIG'; payload: DiscoveredConfig }
  | { type: 'REMOVE_CONFIG'; payload: string }
  | { type: 'SELECT_CONFIG'; payload: number }
  | { type: 'SELECT_ENV'; payload: number }
  | { type: 'SET_FOCUSED_PANEL'; payload: Panel }
  | { type: 'SET_STATUS'; payload: string | null }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_DEPLOYING'; payload: boolean }
  | { type: 'SET_TAILING'; payload: boolean }
  | { type: 'SET_CURRENT_COMMAND'; payload: CommandType }
  | { type: 'SET_MODAL'; payload: ModalState | null }
  | { type: 'APPEND_OUTPUT'; payload: string }
  | { type: 'CLEAR_OUTPUT' }
  | { type: 'APPEND_TAIL_OUTPUT'; payload: string }
  | { type: 'CLEAR_TAIL_OUTPUT' }
  | { type: 'SET_TAIL_OPTIONS'; payload: TailOptions | null }
  | { type: 'SET_CONFIGS_SCROLL'; payload: number }
  | { type: 'SET_ENVIRONMENTS_SCROLL'; payload: number }
  | { type: 'SET_RIGHT_PANEL_VIEW'; payload: RightPanelView };

export function createInitialState(cwd: string): AppState {
  return {
    configs: [],
    selectedConfigIndex: 0,
    focusedPanel: 'configs',
    selectedEnvIndex: 0,
    watching: true,
    statusMessage: null,
    isRunning: false,
    isDeploying: false,
    isTailing: false,
    currentCommand: null,
    output: [],
    outputScrollOffset: 0,
    outputByConfig: {},
    tailOutput: [],
    tailOptions: null,
    cwd,
    modal: null,
    configsScrollOffset: 0,
    environmentsScrollOffset: 0,
    rightPanelView: 'about',
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CONFIGS':
      return {
        ...state,
        configs: action.payload,
        selectedConfigIndex: Math.min(state.selectedConfigIndex, Math.max(0, action.payload.length - 1)),
      };

    case 'UPDATE_CONFIG': {
      const index = state.configs.findIndex(c => c.path === action.payload.path);
      if (index === -1) {
        return { ...state, configs: [...state.configs, action.payload] };
      }
      const newConfigs = [...state.configs];
      newConfigs[index] = action.payload;
      return { ...state, configs: newConfigs };
    }

    case 'REMOVE_CONFIG': {
      const newConfigs = state.configs.filter(c => c.path !== action.payload);
      return {
        ...state,
        configs: newConfigs,
        selectedConfigIndex: Math.min(state.selectedConfigIndex, Math.max(0, newConfigs.length - 1)),
      };
    }

    case 'SELECT_CONFIG':
      return { ...state, selectedConfigIndex: action.payload };

    case 'SELECT_ENV':
      return { ...state, selectedEnvIndex: action.payload };

    case 'SET_FOCUSED_PANEL':
      return {
        ...state,
        focusedPanel: action.payload,
        selectedEnvIndex: action.payload === 'environments' ? 0 : state.selectedEnvIndex,
      };

    case 'SET_STATUS':
      return { ...state, statusMessage: action.payload };

    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };

    case 'SET_DEPLOYING':
      return { ...state, isDeploying: action.payload };

    case 'SET_TAILING':
      return { ...state, isTailing: action.payload };

    case 'SET_CURRENT_COMMAND':
      return { ...state, currentCommand: action.payload };

    case 'SET_MODAL':
      return { ...state, modal: action.payload };

    case 'APPEND_OUTPUT':
      return { ...state, output: [...state.output, action.payload].slice(-100) };

    case 'CLEAR_OUTPUT':
      return { ...state, output: [] };

    case 'APPEND_TAIL_OUTPUT':
      return { ...state, tailOutput: [...state.tailOutput, action.payload].slice(-500) };

    case 'CLEAR_TAIL_OUTPUT':
      return { ...state, tailOutput: [] };

    case 'SET_TAIL_OPTIONS':
      return { ...state, tailOptions: action.payload };

    case 'SET_CONFIGS_SCROLL':
      return { ...state, configsScrollOffset: action.payload };

    case 'SET_ENVIRONMENTS_SCROLL':
      return { ...state, environmentsScrollOffset: action.payload };

    case 'SET_RIGHT_PANEL_VIEW':
      return { ...state, rightPanelView: action.payload };

    default:
      return state;
  }
}
