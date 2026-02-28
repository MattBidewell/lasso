/**
 * R2 Bucket Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#r2-buckets
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createOptionalTextField,
  createToggleField,
} from "./shared.ts"

export const r2BucketDefinition: BindingTypeDefinition = {
  type: "r2_bucket",
  displayName: "R2 Bucket",
  configKey: "r2_buckets",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the R2 bucket in your Worker code (e.g., env.MY_BUCKET)",
      placeholder: "MY_BUCKET",
    }),
    createOptionalTextField("bucket_name", "Bucket Name", {
      description: "The name of the R2 bucket at the edge. Optional - can be configured later via dashboard or CLI",
      placeholder: "my-bucket",
    }),
    createOptionalTextField("preview_bucket_name", "Preview Bucket Name", {
      description: "The name of the R2 bucket to use during 'wrangler dev'. If not set, uses local simulation",
      placeholder: "my-bucket-preview",
    }),
    createOptionalTextField("jurisdiction", "Jurisdiction", {
      description: "The jurisdiction where the bucket exists for data residency (e.g., 'eu'). Leave empty for default",
      placeholder: "eu",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote R2 bucket during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    bucket_name: z.string().optional(),
    preview_bucket_name: z.string().optional(),
    jurisdiction: z.string().optional(),
    remote: z.boolean().optional(),
  }),
}
