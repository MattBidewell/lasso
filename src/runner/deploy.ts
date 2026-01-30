import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

// Strip ANSI escape codes from output
const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

export interface RunDeployOptions {
  configPath: string;
  environment?: string;
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

export function runWranglerDeploy(options: RunDeployOptions): ChildProcess {
  const { configPath, environment, onStdout, onStderr, onExit } = options;
  const cwd = path.dirname(configPath);

  const args = ['wrangler', 'deploy'];

  if (environment && environment !== 'default') {
    args.push('--env', environment);
  }

  const proc = spawn('npx', args, {
    cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  });

  proc.stdout?.on('data', (data: Buffer) => {
    onStdout(stripAnsi(data.toString()));
  });

  proc.stderr?.on('data', (data: Buffer) => {
    onStderr(stripAnsi(data.toString()));
  });

  proc.on('exit', (code) => {
    onExit(code);
  });

  proc.on('error', (err) => {
    onStderr(`Failed to start: ${err.message}`);
    onExit(1);
  });

  return proc;
}

export interface RunDeployAllOptions {
  configPath: string;
  environments: string[];
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onEnvironmentStart: (env: string) => void;
  onEnvironmentComplete: (env: string, code: number | null) => void;
  onAllComplete: (results: Array<{ env: string; code: number | null }>) => void;
}

export function runWranglerDeployAll(options: RunDeployAllOptions): { cancel: () => void } {
  const {
    configPath,
    environments,
    onStdout,
    onStderr,
    onEnvironmentStart,
    onEnvironmentComplete,
    onAllComplete,
  } = options;

  const results: Array<{ env: string; code: number | null }> = [];
  let currentProcess: ChildProcess | null = null;
  let cancelled = false;
  let currentIndex = 0;

  const deployNext = () => {
    if (cancelled || currentIndex >= environments.length) {
      onAllComplete(results);
      return;
    }

    const env = environments[currentIndex];
    if (!env) {
      onAllComplete(results);
      return;
    }

    onEnvironmentStart(env);

    currentProcess = runWranglerDeploy({
      configPath,
      environment: env,
      onStdout,
      onStderr,
      onExit: (code) => {
        results.push({ env, code });
        onEnvironmentComplete(env, code);
        currentIndex++;
        currentProcess = null;
        deployNext();
      },
    });
  };

  deployNext();

  return {
    cancel: () => {
      cancelled = true;
      if (currentProcess && !currentProcess.killed) {
        currentProcess.kill('SIGTERM');
        setTimeout(() => {
          if (currentProcess && !currentProcess.killed) {
            currentProcess.kill('SIGKILL');
          }
        }, 2000);
      }
    },
  };
}
