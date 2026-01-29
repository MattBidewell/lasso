import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

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
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  proc.stdout?.on('data', (data: Buffer) => {
    onStdout(data.toString());
  });

  proc.stderr?.on('data', (data: Buffer) => {
    onStderr(data.toString());
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
