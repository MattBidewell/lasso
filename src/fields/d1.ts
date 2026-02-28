/**
 * D1 Database Field Definition
 *
 * Schema aligned with wrangler config-schema.json
 * @see https://developers.cloudflare.com/workers/wrangler/configuration/#d1-databases
 */

import { z } from "zod"
import type { BindingTypeDefinition } from "./types.ts"
import {
  createBindingNameField,
  createOptionalTextField,
  createToggleField,
} from "./shared.ts"

export const d1DatabaseDefinition: BindingTypeDefinition = {
  type: "d1_database",
  displayName: "D1 Database",
  configKey: "d1_databases",
  isArray: true,
  fields: [
    createBindingNameField({
      description: "The binding name used to refer to the D1 database in your Worker code (e.g., env.MY_DB)",
      placeholder: "MY_DB",
    }),
    createOptionalTextField("database_name", "Database Name", {
      description: "The name of the D1 database. Optional - useful for identifying the database",
      placeholder: "my-database",
    }),
    createOptionalTextField("database_id", "Database ID", {
      description: "The UUID of the D1 database. Optional - can be configured later via dashboard or CLI",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    }),
    createOptionalTextField("preview_database_id", "Preview Database ID", {
      description: "The UUID of the D1 database to use during 'wrangler dev'. If not set, uses local simulation",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    }),
    createOptionalTextField("migrations_table", "Migrations Table", {
      description: "The name of the table that tracks applied migrations. Defaults to 'd1_migrations'",
      placeholder: "d1_migrations",
    }),
    createOptionalTextField("migrations_dir", "Migrations Directory", {
      description: "The path to the directory containing migration files. Defaults to './migrations'",
      placeholder: "./migrations",
    }),
    createToggleField("remote", "Remote", {
      description: "When enabled, use the remote D1 database during local development instead of local simulation",
    }),
  ],
  schema: z.object({
    binding: z
      .string()
      .min(1, "Binding name is required")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Must be a valid JavaScript identifier"),
    database_name: z.string().optional(),
    database_id: z.string().optional(),
    preview_database_id: z.string().optional(),
    migrations_table: z.string().optional(),
    migrations_dir: z.string().optional(),
    remote: z.boolean().optional(),
  }),
}
