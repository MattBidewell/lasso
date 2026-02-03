import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { DeployOptions } from '../../types.ts';

// Strip ANSI escape codes from output
const stripAnsi = (str: string): string =>
  str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

export interface RunDeployOptions {
  configPath: string;
  environment?: string;
  deployOptions?: DeployOptions;
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

export function runWranglerDeploy(options: RunDeployOptions): ChildProcess {
  const { configPath, environment, deployOptions, onStdout, onStderr, onExit } = options;
  const cwd = path.dirname(configPath);

  const args = ['wrangler', 'deploy'];

  // Add environment flag for non-default environments
  if (environment && environment !== 'default') {
    args.push('--env', environment);
  }

  // Add deploy options if provided
  if (deployOptions) {
    if (deployOptions.dryRun) {
      args.push('--dry-run');
    }
    if (deployOptions.minify) {
      args.push('--minify');
    }
    if (deployOptions.keepVars) {
      args.push('--keep-vars');
    }
    if (deployOptions.noBundle) {
      args.push('--no-bundle');
    }
    if (deployOptions.uploadSourceMaps) {
      args.push('--upload-source-maps');
    }
    if (deployOptions.compatibilityDate) {
      args.push('--compatibility-date', deployOptions.compatibilityDate);
    }
    if (deployOptions.name) {
      args.push('--name', deployOptions.name);
    }
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

