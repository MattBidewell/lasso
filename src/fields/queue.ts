/**
 * Queue Field Definitions (Producer and Consumer)
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#queues
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createRequiredTextField,
  createOptionalTextField,
  createNumberField,
  createToggleField,
} from "./shared.ts"

export const queueProducerDefinition: BindingTypeDefinition = {
  type: "queue_producer",
  displayName: "Queue (Producer)",
  configKey: "queues.producers",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the Queue in your Worker code (e.g., env.MY_QUEUE)",
      placeholder: "MY_QUEUE",
    }),
    createRequiredTextField("queue", "Queue Name", {
      description: "The name of the Queue to send messages to. Required - must match an existing Queue",
      placeholder: "my-queue",
    }),
    createNumberField("delivery_delay", "Delivery Delay (seconds)", {
      description: "Default delay in seconds before messages are delivered to consumers (0-43200). Optional",
      placeholder: "0",
      min: 0,
      max: 43200,
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote Queue during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    queue: z.string().min(1, "Queue name is required"),
    delivery_delay: z.number().min(0).max(43200).optional(),
    remote: z.boolean().optional(),
  }),
}

export const queueConsumerDefinition: BindingTypeDefinition = {
  type: "queue_consumer",
  displayName: "Queue (Consumer)",
  configKey: "queues.consumers",
  isArray: true,
  fields: [
    createRequiredTextField("queue", "Queue Name", {
      description: "The name of the Queue to consume messages from. Required - must match an existing Queue",
      placeholder: "my-queue",
    }),
    createOptionalTextField("type", "Consumer Type", {
      description: "The consumer type: 'worker' (default), 'http-pull', or 'r2-bucket'. Optional",
      placeholder: "worker",
    }),
    createNumberField("max_batch_size", "Max Batch Size", {
      description: "Maximum number of messages delivered per batch (1-100). Optional - defaults to 10",
      placeholder: "10",
      min: 1,
      max: 100,
    }),
    createNumberField("max_batch_timeout", "Max Batch Timeout (seconds)", {
      description: "Maximum seconds to wait to fill a batch with messages (0-30). Optional - defaults to 5",
      placeholder: "5",
      min: 0,
      max: 30,
    }),
    createNumberField("max_retries", "Max Retries", {
      description: "Maximum retry attempts for failed messages before sending to DLQ (0-100). Optional - defaults to 3",
      placeholder: "3",
      min: 0,
      max: 100,
    }),
    createOptionalTextField("dead_letter_queue", "Dead Letter Queue", {
      description: "The name of a Queue to send messages that fail after max_retries. Optional",
      placeholder: "my-dlq",
    }),
    createNumberField("max_concurrency", "Max Concurrency", {
      description: "Maximum concurrent consumer invocations. Leave unset for auto-scaling to handle backlog",
      placeholder: "10",
      min: 1,
      max: 1000,
    }),
    createNumberField("visibility_timeout_ms", "Visibility Timeout (ms)", {
      description: "For http-pull: milliseconds before pulled messages become visible again. Optional",
      placeholder: "30000",
      min: 0,
    }),
    createNumberField("retry_delay", "Retry Delay (seconds)", {
      description: "Seconds to wait before retrying a failed message. Optional - defaults to 0",
      placeholder: "0",
      min: 0,
    }),
  ],
  schema: z.object({
    queue: z.string().min(1, "Queue name is required"),
    type: z.string().optional(),
    max_batch_size: z.number().min(1).max(100).optional(),
    max_batch_timeout: z.number().min(0).max(30).optional(),
    max_retries: z.number().min(0).max(100).optional(),
    dead_letter_queue: z.string().optional(),
    max_concurrency: z.number().min(1).max(1000).nullable().optional(),
    visibility_timeout_ms: z.number().min(0).optional(),
    retry_delay: z.number().min(0).optional(),
  }),
}
