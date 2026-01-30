import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

// Strip ANSI escape codes from output
const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

export interface RunDevOptions {
  configPath: string;
  environment?: string;
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

export function runWranglerDev(options: RunDevOptions): ChildProcess {
  const { configPath, environment, onStdout, onStderr, onExit } = options;
  const cwd = path.dirname(configPath);

  const args = ['wrangler', 'dev'];

  if (environment && environment !== 'default') {
    args.push('--env', environment);
  }

  const proc = spawn('npx', args, {
    cwd,
    shell: true,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
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

export function stopProcess(proc: ChildProcess): void {
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');

    // Force kill after 2 seconds if still running
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }, 2000);
  }
}
