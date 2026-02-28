/**
 * KV Namespace Field Definition Tests
 */

import { describe, test, expect } from "bun:test"
import { kvNamespaceDefinition } from "../../src/fields/kv.ts"

describe("KV Namespace Definition", () => {
  describe("metadata", () => {
    test("has correct type", () => {
      expect(kvNamespaceDefinition.type).toBe("kv_namespace")
    })

    test("has correct display name", () => {
      expect(kvNamespaceDefinition.displayName).toBe("KV Namespace")
    })

    test("has correct config key", () => {
      expect(kvNamespaceDefinition.configKey).toBe("kv_namespaces")
    })

    test("is an array binding", () => {
      expect(kvNamespaceDefinition.isArray).toBe(true)
    })
  })

  describe("fields", () => {
    test("has binding field", () => {
      const field = kvNamespaceDefinition.fields.find((f) => f.name === "binding")
      expect(field).toBeDefined()
      expect(field?.required).toBe(true)
      expect(field?.type).toBe("text")
    })

    test("has id field", () => {
      const field = kvNamespaceDefinition.fields.find((f) => f.name === "id")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false) // id is optional per wrangler schema
      expect(field?.type).toBe("text")
    })

    test("has remote field", () => {
      const field = kvNamespaceDefinition.fields.find((f) => f.name === "remote")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
      expect(field?.type).toBe("toggle")
    })

    test("has preview_id field", () => {
      const field = kvNamespaceDefinition.fields.find((f) => f.name === "preview_id")
      expect(field).toBeDefined()
      expect(field?.required).toBe(false)
      expect(field?.type).toBe("text")
    })
  })

  describe("schema validation", () => {
    test("accepts valid binding with all required fields", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
        id: "abc123",
      })
      expect(result.success).toBe(true)
    })

    test("rejects empty binding name", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "",
        id: "abc123",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("required")
      }
    })

    test("rejects invalid JavaScript identifier for binding", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "123invalid",
        id: "abc123",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("JavaScript identifier")
      }
    })

    test("rejects binding name starting with number", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "9MY_KV",
        id: "abc123",
      })
      expect(result.success).toBe(false)
    })

    test("accepts binding name with underscore prefix", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "_MY_KV",
        id: "abc123",
      })
      expect(result.success).toBe(true)
    })

    test("rejects binding name with special characters", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY-KV",
        id: "abc123",
      })
      expect(result.success).toBe(false)
    })

    test("accepts empty id (id is optional per wrangler schema)", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
        id: "",
      })
      expect(result.success).toBe(true)
    })

    test("accepts binding with only binding name (minimal valid config)", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
      })
      expect(result.success).toBe(true)
    })

    test("accepts remote flag", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
        remote: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.remote).toBe(true)
      }
    })

    test("accepts optional preview_id", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
        id: "abc123",
        preview_id: "preview456",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.preview_id).toBe("preview456")
      }
    })

    test("allows omitting preview_id", () => {
      const result = kvNamespaceDefinition.schema.safeParse({
        binding: "MY_KV",
        id: "abc123",
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.preview_id).toBeUndefined()
      }
    })
  })
})
