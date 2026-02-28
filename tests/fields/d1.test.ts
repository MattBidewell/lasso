/**
 * D1 Database Field Definition Tests
 */

import { describe, test, expect } from "bun:test"
import { d1DatabaseDefinition } from "../../src/fields/d1.ts"

describe("D1 Database Definition", () => {
  describe("metadata", () => {
    test("has correct type", () => {
      expect(d1DatabaseDefinition.type).toBe("d1_database")
    })

    test("has correct display name", () => {
      expect(d1DatabaseDefinition.displayName).toBe("D1 Database")
    })

    test("has correct config key", () => {
      expect(d1DatabaseDefinition.configKey).toBe("d1_databases")
    })

    test("is an array binding", () => {
      expect(d1DatabaseDefinition.isArray).toBe(true)
    })
  })

  describe("fields", () => {
    test("has binding field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "binding")
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
      expect(field?.type).toBe("text")
    })

    test("has database_id field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "database_id")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false) // database_id is optional per wrangler schema
      expect(field?.type).toBe("text")
    })

    test("has database_name field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "database_name")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false) // database_name is optional per wrangler schema
      expect(field?.type).toBe("text")
    })

    test("has migrations_table field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "migrations_table")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
    })

    test("has remote field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "remote")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
      expect(field?.type).toBe("toggle")
    })

    test("has preview_database_id field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "preview_database_id")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
    })

    test("has migrations_dir field", () => {
      const field = d1DatabaseDefinition.fields.find((f) => f.name === "migrations_dir")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
    })
  })

  describe("schema validation", () => {
    test("accepts valid binding with all required fields", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        database_id: "uuid-here",
        database_name: "my-database",
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty binding name", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "",
        database_id: "uuid-here",
        database_name: "my-database",
      })
      expect(result.success).toBe(false)
    })

    test("rejects invalid JavaScript identifier for binding", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "my-db",
        database_id: "uuid-here",
        database_name: "my-database",
      })
      expect(result.success).toBe(false)
    })

    test("accepts empty database_id (database_id is optional per wrangler schema)", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        database_id: "",
        database_name: "my-database",
      })
      expect(result.success).toBe(true)
    })

    test("accepts empty database_name (database_name is optional per wrangler schema)", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        database_id: "uuid-here",
        database_name: "",
      })
      expect(result.success).toBe(true)
    })

    test("accepts binding with only binding name (minimal valid config)", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
      })
      expect(result.success).toBe(true)
    })

    test("accepts remote flag", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        remote: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.remote).toBe(true)
      }
    })

    test("accepts migrations_table", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        migrations_table: "custom_migrations",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.migrations_table).toBe("custom_migrations")
      }
    })

    test("accepts optional preview_database_id", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        database_id: "uuid-here",
        database_name: "my-database",
        preview_database_id: "preview-uuid",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.preview_database_id).toBe("preview-uuid")
      }
    })

    test("accepts optional migrations_dir", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
        database_id: "uuid-here",
        database_name: "my-database",
        migrations_dir: "./migrations",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.migrations_dir).toBe("./migrations")
      }
    })

    test("allows omitting all optional fields", () => {
      const result = d1DatabaseDefinition.schema.safeParse({
        binding: "MY_DB",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.database_id).toBeUndefined()
        expect(result.data.database_name).toBeUndefined()
        expect(result.data.preview_database_id).toBeUndefined()
        expect(result.data.migrations_dir).toBeUndefined()
        expect(result.data.migrations_table).toBeUndefined()
        expect(result.data.remote).toBeUndefined()
      }
    })
  })
})
