import fg from 'fast-glob';

export interface FindConfigsOptions {
  cwd: string;
  ignore?: string[];
}

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.wrangler/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.next/**',
  '**/.nuxt/**',
];

export async function findWranglerConfigs(
  options: FindConfigsOptions
): Promise<string[]> {
  const { cwd, ignore = [] } = options;

  const patterns = [
    '**/wrangler.json',
    '**/wrangler.jsonc',
  ];

  const results = await fg(patterns, {
    cwd,
    absolute: true,
    ignore: [...DEFAULT_IGNORE, ...ignore],
    followSymbolicLinks: false,
    dot: false,
  });

  return results.sort((a, b) => a.localeCompare(b));
}
