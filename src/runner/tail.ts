import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { TailOptions } from '../types/app.ts';

const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

export interface RunTailOptions {
  configPath: string;
  workerName: string;
  environment?: string;
  tailOptions: TailOptions;
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

export function runWranglerTail(options: RunTailOptions): ChildProcess {
  const { configPath, workerName, environment, tailOptions, onStdout, onStderr, onExit } = options;
  const cwd = path.dirname(configPath);

  const args = ['wrangler', 'tail', workerName];

  // Add environment flag for non-default environments
  if (environment && environment !== 'default') {
    args.push('--env', environment);
  }

  // Add format option if set
  if (tailOptions.format) {
    args.push('--format', tailOptions.format);
  }

  // Add status filters if set
  if (tailOptions.status && tailOptions.status.length > 0) {
    for (const status of tailOptions.status) {
      args.push('--status', status);
    }
  }

  // Add method filters if set
  if (tailOptions.methods && tailOptions.methods.length > 0) {
    for (const method of tailOptions.methods) {
      args.push('--method', method);
    }
  }

  // Add sampling rate if set
  if (tailOptions.samplingRate !== undefined) {
    args.push('--sampling-rate', String(tailOptions.samplingRate));
  }

  // Add search string if set
  if (tailOptions.search) {
    args.push('--search', tailOptions.search);
  }

  // Add IP filters if set
  if (tailOptions.ip && tailOptions.ip.length > 0) {
    for (const ip of tailOptions.ip) {
      args.push('--ip', ip);
    }
  }

  // Add header filter if set
  if (tailOptions.header) {
    args.push('--header', tailOptions.header);
  }

  // Add version ID if set
  if (tailOptions.versionId) {
    args.push('--version-id', tailOptions.versionId);
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
    onStderr(`Failed to start tail: ${err.message}`);
    onExit(1);
  });

  return proc;
}
