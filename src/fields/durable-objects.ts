/**
 * Durable Object Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#durable-objects
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createRequiredTextField,
  createOptionalTextField,
  bindingNameSchema,
} from "./shared.ts"

export const durableObjectDefinition: BindingTypeDefinition = {
  type: "durable_object",
  displayName: "Durable Object",
  configKey: "durable_objects",
  isArray: true, // Note: durable_objects.bindings is an array
  fields: [
    {
      name: "name",
      label: "Binding Name",
      type: "text",
      required: true,
      validation: bindingNameSchema,
      description: "The binding name used to refer to the Durable Object in your Worker code (e.g., env.MY_DO)",
      placeholder: "MY_DO",
    },
    createRequiredTextField("class_name", "Class Name", {
      description: "The exported class name of the Durable Object. Required - must match the class export in your code",
      placeholder: "MyDurableObject",
    }),
    createOptionalTextField("script_name", "Script Name", {
      description: "The Worker script where the DO class is defined. Only needed for external Durable Objects",
      placeholder: "my-worker",
    }),
    createOptionalTextField("environment", "Environment", {
      description: "The service environment of the script_name to bind to. Only used with external Durable Objects",
      placeholder: "production",
    }),
  ],
  schema: z.object({
    name: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    class_name: z.string().min(1, "Class name is required"),
    script_name: z.string().optional(),
    environment: z.string().optional(),
  }),
}
