import { z } from 'zod';

const BindingSchema = z.object({
  binding: z.string(),
}).passthrough();

const KVNamespaceSchema = z.object({
  binding: z.string(),
  id: z.string().optional(),
  preview_id: z.string().optional(),
}).passthrough();

const D1DatabaseSchema = z.object({
  binding: z.string(),
  database_id: z.string().optional(),
  database_name: z.string().optional(),
}).passthrough();

const R2BucketSchema = z.object({
  binding: z.string(),
  bucket_name: z.string().optional(),
}).passthrough();

const DurableObjectSchema = z.object({
  name: z.string(),
  class_name: z.string(),
  script_name: z.string().optional(),
}).passthrough();

const ServiceBindingSchema = z.object({
  binding: z.string(),
  service: z.string(),
  environment: z.string().optional(),
}).passthrough();

const QueueSchema = z.object({
  binding: z.string(),
  queue: z.string().optional(),
}).passthrough();

const RouteSchema = z.union([
  z.string(),
  z.object({
    pattern: z.string(),
    zone_name: z.string().optional(),
    zone_id: z.string().optional(),
    custom_domain: z.boolean().optional(),
  }),
]);

const EnvironmentSchema = z.object({
  name: z.string().optional(),
  vars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  kv_namespaces: z.array(KVNamespaceSchema).optional(),
  d1_databases: z.array(D1DatabaseSchema).optional(),
  r2_buckets: z.array(R2BucketSchema).optional(),
  durable_objects: z.object({
    bindings: z.array(DurableObjectSchema).optional(),
  }).optional(),
  services: z.array(ServiceBindingSchema).optional(),
  queues: z.object({
    producers: z.array(QueueSchema).optional(),
    consumers: z.array(z.object({
      queue: z.string(),
      max_batch_size: z.number().optional(),
      max_batch_timeout: z.number().optional(),
    }).passthrough()).optional(),
  }).optional(),
  routes: z.array(RouteSchema).optional(),
  route: RouteSchema.optional(),
}).passthrough();

export const WranglerConfigSchema = z.object({
  name: z.string(),
  main: z.string().optional(),
  compatibility_date: z.string().optional(),
  compatibility_flags: z.array(z.string()).optional(),
  account_id: z.string().optional(),
  workers_dev: z.boolean().optional(),

  // Top-level bindings (default environment)
  vars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  kv_namespaces: z.array(KVNamespaceSchema).optional(),
  d1_databases: z.array(D1DatabaseSchema).optional(),
  r2_buckets: z.array(R2BucketSchema).optional(),
  durable_objects: z.object({
    bindings: z.array(DurableObjectSchema).optional(),
  }).optional(),
  services: z.array(ServiceBindingSchema).optional(),
  queues: z.object({
    producers: z.array(QueueSchema).optional(),
    consumers: z.array(z.object({
      queue: z.string(),
      max_batch_size: z.number().optional(),
      max_batch_timeout: z.number().optional(),
    }).passthrough()).optional(),
  }).optional(),
  routes: z.array(RouteSchema).optional(),
  route: RouteSchema.optional(),

  // Named environments
  env: z.record(EnvironmentSchema).optional(),
}).passthrough();

export type WranglerConfig = z.infer<typeof WranglerConfigSchema>;
export type WranglerEnvironment = z.infer<typeof EnvironmentSchema>;

export interface BindingCounts {
  kv: number;
  d1: number;
  r2: number;
  do: number;
  services: number;
  queues: number;
  vars: number;
}

export function countBindings(config: WranglerConfig, envName?: string): BindingCounts {
  const env = envName && envName !== 'default' && config.env?.[envName];
  const source = env || config;

  return {
    kv: source.kv_namespaces?.length ?? 0,
    d1: source.d1_databases?.length ?? 0,
    r2: source.r2_buckets?.length ?? 0,
    do: source.durable_objects?.bindings?.length ?? 0,
    services: source.services?.length ?? 0,
    queues: (source.queues?.producers?.length ?? 0) + (source.queues?.consumers?.length ?? 0),
    vars: Object.keys(source.vars ?? {}).length,
  };
}
