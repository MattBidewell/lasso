/**
 * FieldRegistry Tests
 */

import { describe, test, expect, beforeEach } from "bun:test"
import { FieldRegistry } from "../../src/fields/registry.ts"
import { kvNamespaceDefinition } from "../../src/fields/kv.ts"
import { d1DatabaseDefinition } from "../../src/fields/d1.ts"

describe("FieldRegistry", () => {
  let registry: FieldRegistry

  beforeEach(() => {
    registry = new FieldRegistry()
  })

  describe("registerBindingType", () => {
    test("registers a binding type definition", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.getBindingType("kv_namespace")
      expect(result).toBeDefined()
      expect(result?.displayName).toBe("KV Namespace")
    })

    test("overwrites existing definition with same type", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const modified = { ...kvNamespaceDefinition, displayName: "Modified KV" }
      registry.registerBindingType(modified)

      const result = registry.getBindingType("kv_namespace")
      expect(result?.displayName).toBe("Modified KV")
    })
  })

  describe("getBindingType", () => {
    test("returns undefined for unregistered type", () => {
      const result = registry.getBindingType("kv_namespace")
      expect(result).toBeUndefined()
    })

    test("returns definition for registered type", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.getBindingType("kv_namespace")
      expect(result).toBeDefined()
      expect(result?.type).toBe("kv_namespace")
    })
  })

  describe("getAllBindingTypes", () => {
    test("returns empty array when no types registered", () => {
      const result = registry.getAllBindingTypes()
      expect(result).toEqual([])
    })

    test("returns all registered types", () => {
      registry.registerBindingType(kvNamespaceDefinition)
      registry.registerBindingType(d1DatabaseDefinition)

      const result = registry.getAllBindingTypes()
      expect(result).toHaveLength(2)
      expect(result.map((d) => d.type)).toContain("kv_namespace")
      expect(result.map((d) => d.type)).toContain("d1_database")
    })
  })

  describe("getFieldsForBinding", () => {
    test("returns empty array for unregistered type", () => {
      const result = registry.getFieldsForBinding("kv_namespace")
      expect(result).toEqual([])
    })

    test("returns fields for registered type", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.getFieldsForBinding("kv_namespace")
      expect(result.length).toBeGreaterThan(0)
      expect(result.map((f) => f.name)).toContain("binding")
      expect(result.map((f) => f.name)).toContain("id")
    })
  })

  describe("validateBinding", () => {
    beforeEach(() => {
      registry.registerBindingType(kvNamespaceDefinition)
    })

    test("returns error for unknown binding type", () => {
      const result = registry.validateBinding("d1_database", { binding: "TEST" })
      expect(result.valid).toBe(false)
      expect(result.errors?._form).toBe("Unknown binding type")
    })

    test("validates valid binding data", () => {
      const result = registry.validateBinding("kv_namespace", {
        binding: "MY_KV",
        id: "abc123",
      })
      expect(result.valid).toBe(true)
      expect(result.data).toEqual({
        binding: "MY_KV",
        id: "abc123",
      })
    })

    test("returns errors for invalid binding data", () => {
      const result = registry.validateBinding("kv_namespace", {
        binding: "", // empty binding should fail
        id: "",      // id is optional per wrangler schema, so empty is ok
      })
      expect(result.valid).toBe(false)
      expect(result.errors?.binding).toBeDefined()
      // id is now optional per wrangler schema, so no error expected
    })

    test("validates binding name format", () => {
      const result = registry.validateBinding("kv_namespace", {
        binding: "123invalid",
        id: "abc123",
      })
      expect(result.valid).toBe(false)
      expect(result.errors?.binding).toContain("JavaScript identifier")
    })

    test("accepts optional fields when omitted", () => {
      const result = registry.validateBinding("kv_namespace", {
        binding: "MY_KV",
        id: "abc123",
        // preview_id is optional
      })
      expect(result.valid).toBe(true)
    })

    test("accepts optional fields when provided", () => {
      const result = registry.validateBinding("kv_namespace", {
        binding: "MY_KV",
        id: "abc123",
        preview_id: "preview123",
      })
      expect(result.valid).toBe(true)
      expect(result.data?.preview_id).toBe("preview123")
    })
  })

  describe("getDisplayName", () => {
    test("returns type for unregistered binding", () => {
      const result = registry.getDisplayName("kv_namespace")
      expect(result).toBe("kv_namespace")
    })

    test("returns display name for registered binding", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.getDisplayName("kv_namespace")
      expect(result).toBe("KV Namespace")
    })
  })

  describe("getConfigKey", () => {
    test("returns type for unregistered binding", () => {
      const result = registry.getConfigKey("kv_namespace")
      expect(result).toBe("kv_namespace")
    })

    test("returns config key for registered binding", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.getConfigKey("kv_namespace")
      expect(result).toBe("kv_namespaces")
    })
  })

  describe("isArrayBinding", () => {
    test("returns true by default for unregistered type", () => {
      const result = registry.isArrayBinding("kv_namespace")
      expect(result).toBe(true)
    })

    test("returns correct value for registered type", () => {
      registry.registerBindingType(kvNamespaceDefinition)

      const result = registry.isArrayBinding("kv_namespace")
      expect(result).toBe(true)
    })
  })
})
