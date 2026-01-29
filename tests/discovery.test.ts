import { describe, test, expect, beforeAll } from 'bun:test';
import path from 'node:path';
import { findWranglerConfigs } from '../src/discovery/find-configs.ts';

const fixturesPath = path.join(import.meta.dir, 'fixtures');

describe('findWranglerConfigs', () => {
  test('finds wrangler.json files in nested directories', async () => {
    const results = await findWranglerConfigs({ cwd: fixturesPath });

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some(p => p.endsWith('wrangler.json'))).toBe(true);
  });

  test('finds wrangler.jsonc files', async () => {
    const results = await findWranglerConfigs({ cwd: fixturesPath });

    expect(results.some(p => p.endsWith('wrangler.jsonc'))).toBe(true);
  });

  test('returns absolute paths', async () => {
    const results = await findWranglerConfigs({ cwd: fixturesPath });

    for (const result of results) {
      expect(path.isAbsolute(result)).toBe(true);
    }
  });

  test('returns sorted results', async () => {
    const results = await findWranglerConfigs({ cwd: fixturesPath });
    const sorted = [...results].sort((a, b) => a.localeCompare(b));

    expect(results).toEqual(sorted);
  });

  test('respects ignore patterns', async () => {
    const results = await findWranglerConfigs({
      cwd: fixturesPath,
      ignore: ['**/valid/**'],
    });

    expect(results.every(p => !p.includes('/valid/'))).toBe(true);
  });

  test('returns empty array for directory with no configs', async () => {
    const emptyDir = path.join(import.meta.dir);
    const results = await findWranglerConfigs({
      cwd: emptyDir,
      ignore: ['**/fixtures/**'],
    });

    expect(results).toEqual([]);
  });
});
