import chokidar from 'chokidar';
import path from 'node:path';

export interface WatcherOptions {
  cwd: string;
  onAdd: (filePath: string) => void;
  onChange: (filePath: string) => void;
  onRemove: (filePath: string) => void;
}

export function watchWranglerConfigs(options: WatcherOptions) {
  const { cwd, onAdd, onChange, onRemove } = options;

  const patterns = [
    path.join(cwd, '**/wrangler.json'),
    path.join(cwd, '**/wrangler.jsonc'),
  ];

  const watcher = chokidar.watch(patterns, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/.turbo/**',
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher
    .on('add', onAdd)
    .on('change', onChange)
    .on('unlink', onRemove);

  return watcher;
}
