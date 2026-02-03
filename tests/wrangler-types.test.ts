import { describe, test, expect } from 'bun:test';
import { WranglerConfigSchema, countBindings } from '../src/core/types/wrangler.ts';

describe('WranglerConfigSchema', () => {
  test('validates minimal config', () => {
    const config = { name: 'test-worker' };
    const result = WranglerConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });

  test('validates full config', () => {
    const config = {
      name: 'test-worker',
      main: 'src/index.ts',
      compatibility_date: '2024-01-01',
      compatibility_flags: ['nodejs_compat'],
      vars: { API_KEY: 'secret' },
      kv_namespaces: [{ binding: 'KV', id: 'abc123' }],
      d1_databases: [{ binding: 'DB', database_id: 'def456' }],
      r2_buckets: [{ binding: 'BUCKET', bucket_name: 'my-bucket' }],
      durable_objects: {
        bindings: [{ name: 'DO', class_name: 'MyDO' }],
      },
      services: [{ binding: 'AUTH', service: 'auth-worker' }],
      env: {
        staging: { vars: { ENV: 'staging' } },
        production: { vars: { ENV: 'production' } },
      },
    };
    const result = WranglerConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });

  test('rejects config without name', () => {
    const config = { main: 'src/index.ts' };
    const result = WranglerConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
  });

  test('allows passthrough for unknown properties', () => {
    const config = {
      name: 'test-worker',
      custom_field: 'custom_value',
    };
    const result = WranglerConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).custom_field).toBe('custom_value');
    }
  });
});

describe('countBindings', () => {
  test('counts bindings in default environment', () => {
    const config = {
      name: 'test',
      vars: { A: '1', B: '2' },
      kv_namespaces: [{ binding: 'KV1' }, { binding: 'KV2' }],
      d1_databases: [{ binding: 'DB' }],
      r2_buckets: [],
      durable_objects: { bindings: [{ name: 'DO', class_name: 'MyDO' }] },
      services: [{ binding: 'AUTH', service: 'auth' }],
    };

    const counts = countBindings(config);

    expect(counts.vars).toBe(2);
    expect(counts.kv).toBe(2);
    expect(counts.d1).toBe(1);
    expect(counts.r2).toBe(0);
    expect(counts.do).toBe(1);
    expect(counts.services).toBe(1);
  });

  test('counts bindings in named environment', () => {
    const config = {
      name: 'test',
      vars: { A: '1' },
      kv_namespaces: [{ binding: 'KV1' }],
      env: {
        staging: {
          vars: { B: '2', C: '3' },
          kv_namespaces: [{ binding: 'KV2' }, { binding: 'KV3' }, { binding: 'KV4' }],
        },
      },
    };

    const defaultCounts = countBindings(config);
    const stagingCounts = countBindings(config, 'staging');

    expect(defaultCounts.vars).toBe(1);
    expect(defaultCounts.kv).toBe(1);

    expect(stagingCounts.vars).toBe(2);
    expect(stagingCounts.kv).toBe(3);
  });

  test('falls back to default for non-existent environment', () => {
    const config = {
      name: 'test',
      vars: { A: '1' },
    };

    const counts = countBindings(config, 'nonexistent');

    expect(counts.vars).toBe(1);
  });

  test('handles empty config', () => {
    const config = { name: 'test' };

    const counts = countBindings(config);

    expect(counts.vars).toBe(0);
    expect(counts.kv).toBe(0);
    expect(counts.d1).toBe(0);
    expect(counts.r2).toBe(0);
    expect(counts.do).toBe(0);
    expect(counts.services).toBe(0);
    expect(counts.queues).toBe(0);
  });
});
