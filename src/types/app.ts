import type { WranglerConfig } from './wrangler.ts';

export type ModalType = 'deploy-confirm' | null;
export type DeployScope = 'selected' | 'all';
export type CommandType = 'dev' | 'deploy' | null;

export interface ModalState {
  type: ModalType;
  workerName: string;
  environment: string;
  environments: string[];  // All environments for "deploy all" option
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

export type Panel = 'configs' | 'environments' | 'output';

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
  /** Which command type is currently running */
  currentCommand: CommandType;
  output: string[];
  /** Scroll offset for output panel (lines from bottom) */
  outputScrollOffset: number;
  /** Per-config output storage (keyed by config path) */
  outputByConfig: Record<string, string[]>;
  cwd: string;
  /** Modal state for confirmations */
  modal: ModalState | null;
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
  | { type: 'SET_CURRENT_COMMAND'; payload: CommandType }
  | { type: 'SET_MODAL'; payload: ModalState | null }
  | { type: 'APPEND_OUTPUT'; payload: string }
  | { type: 'CLEAR_OUTPUT' };

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
    currentCommand: null,
    output: [],
    outputScrollOffset: 0,
    outputByConfig: {},
    cwd,
    modal: null,
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

    case 'SET_CURRENT_COMMAND':
      return { ...state, currentCommand: action.payload };

    case 'SET_MODAL':
      return { ...state, modal: action.payload };

    case 'APPEND_OUTPUT':
      return { ...state, output: [...state.output, action.payload].slice(-100) };

    case 'CLEAR_OUTPUT':
      return { ...state, output: [] };

    default:
      return state;
  }
}
