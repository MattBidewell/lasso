import { describe, test, expect } from 'bun:test';
import path from 'node:path';
import { parseConfig } from '../src/core/discovery/parse-config.ts';

const fixturesPath = path.join(import.meta.dir, 'fixtures');

describe('parseConfig', () => {
  describe('valid configs', () => {
    test('parses valid wrangler.json', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.config).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.name).toBe('test-worker');
      expect(result.config?.main).toBe('src/index.ts');
    });

    test('parses valid wrangler.jsonc with comments', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.jsonc');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.config).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.name).toBe('test-worker-jsonc');
    });

    test('extracts environment names correctly', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.environments).toContain('default');
      expect(result.environments).toContain('staging');
      expect(result.environments).toContain('production');
      expect(result.environments.length).toBe(3);
    });

    test('returns relative path from base', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.relativePath).toBe(path.join('valid', 'wrangler.json'));
    });

    test('returns absolute path', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(path.isAbsolute(result.path)).toBe(true);
      expect(result.path).toBe(configPath);
    });

    test('returns directory containing config', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.directory).toBe(path.join(fixturesPath, 'valid'));
    });
  });

  describe('invalid configs', () => {
    test('returns error for missing name field', () => {
      const configPath = path.join(fixturesPath, 'invalid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.config).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error).toContain('Schema validation failed');
    });

    test('returns error for malformed JSON', () => {
      const configPath = path.join(fixturesPath, 'invalid', 'malformed.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.config).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error).toContain('Invalid JSON');
    });

    test('falls back to directory name when config is invalid', () => {
      const configPath = path.join(fixturesPath, 'invalid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.name).toBe('invalid');
    });

    test('returns empty environments array for invalid config', () => {
      const configPath = path.join(fixturesPath, 'invalid', 'wrangler.json');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.environments).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('handles config without env section', () => {
      const configPath = path.join(fixturesPath, 'valid', 'wrangler.jsonc');
      const result = parseConfig(configPath, fixturesPath);

      expect(result.environments).toEqual(['default']);
    });
  });
});
