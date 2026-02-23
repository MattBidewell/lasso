import { readFileSync } from 'node:fs';
import path from 'node:path';
import stripJsonComments from 'strip-json-comments';
import { WranglerConfigSchema } from '../types/wrangler.ts';
import type { DiscoveredConfig } from '../../types.ts';

export function parseConfig(
  configPath: string,
  basePath: string
): DiscoveredConfig {
  const relativePath = path.relative(basePath, configPath);
  const directory = path.dirname(configPath);
  const dirName = path.basename(directory);

  console.debug(`Parsing wrangler config: ${relativePath}`);

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const json = JSON.parse(stripJsonComments(raw));
    const parsed = WranglerConfigSchema.parse(json);

    const environments = ['default'];
    if (parsed.env) {
      environments.push(...Object.keys(parsed.env));
    }

    return {
      path: configPath,
      relativePath,
      directory,
      config: parsed,
      error: null,
      name: parsed.name || dirName,
      environments,
    };
  } catch (err) {
    let message = 'Unknown error';

    if (err instanceof SyntaxError) {
      message = `Invalid JSON: ${err.message}`;
    } else if (err instanceof Error) {
      if (err.name === 'ZodError') {
        const zodErr = err as unknown as { errors: Array<{ path: (string | number)[]; message: string }> };
        const issues = zodErr.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        message = `Schema validation failed: ${issues}`;
      } else {
        message = err.message;
      }
    }

    console.debug(`Failed to parse config: ${relativePath} (${message})`);

    return {
      path: configPath,
      relativePath,
      directory,
      config: null,
      error: message,
      name: dirName,
      environments: [],
    };
  }
}

export async function discoverAndParse(
  cwd: string,
  configPaths: string[]
): Promise<DiscoveredConfig[]> {
  console.debug(`Discover/parse start: ${configPaths.length} configs`);
  return configPaths.map(p => parseConfig(p, cwd));
}
