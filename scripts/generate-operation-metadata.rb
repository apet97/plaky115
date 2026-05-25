#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SOURCE = File.join(ROOT, "openapi/plaky115-dx.openapi.yaml")
OUT = File.join(ROOT, "openapi/plaky115-operation-metadata.json")

HTTP_METHODS = %w[get post put patch delete head options trace].freeze

def load_yaml(path)
  YAML.safe_load(File.read(path), aliases: true)
end

def fetch_ref(schema, spec)
  return schema unless schema.is_a?(Hash) && schema["$ref"]

  pointer = schema.fetch("$ref").delete_prefix("#/").split("/")
  pointer.reduce(spec) { |node, part| node.fetch(part) }
end

def response_schema(operation, spec)
  content = operation.dig("responses", "200", "content", "application/json", "schema") ||
            operation.dig("responses", "201", "content", "application/json", "schema")
  fetch_ref(content || {}, spec)
end

def list_operation?(operation, method, spec)
  return true if operation.key?("x-speakeasy-pagination")

  schema = response_schema(operation, spec)
  method == "get" && schema.is_a?(Hash) && schema.dig("properties", "hasMore")
end

def default_scopes(operation, method)
  mcp = operation["x-speakeasy-mcp"] || {}
  scopes = Array(mcp["scopes"]).uniq
  return scopes unless scopes.empty?

  return %w[read] if method == "get" || method == "head"
  return %w[write destructive] if method == "delete"

  %w[write]
end

def destructive?(operation, method)
  mcp = operation["x-speakeasy-mcp"] || {}
  return mcp["destructiveHint"] unless mcp["destructiveHint"].nil?

  method == "delete"
end

spec = load_yaml(SOURCE)
operations = []
examples = {}

spec.fetch("paths").each do |path, path_item|
  path_item.each do |method, operation|
    next unless HTTP_METHODS.include?(method)

    operation_id = operation.fetch("operationId")
    mcp = operation["x-speakeasy-mcp"] || {}
    pagination = operation["x-speakeasy-pagination"]
    usage_example = operation["x-speakeasy-usage-example"]
    scopes = default_scopes(operation, method)
    destructive = destructive?(operation, method)

    entry = {
      "operationId" => operation_id,
      "method" => method.upcase,
      "path" => path,
      "summary" => operation["summary"],
      "mcpName" => mcp["name"],
      "mcpTitle" => mcp["title"],
      "scopes" => scopes,
      "readOnly" => mcp.fetch("readOnlyHint", method == "get"),
      "destructive" => destructive,
      "idempotent" => mcp.fetch("idempotentHint", %w[get head put delete].include?(method)),
      "openWorld" => mcp.fetch("openWorldHint", true),
      "list" => list_operation?(operation, method, spec),
      "mutation" => !%w[get head].include?(method),
    }

    if pagination
      entry["pagination"] = {
        "type" => pagination["type"],
        "results" => pagination.dig("outputs", "results"),
      }.compact
    end

    operations << entry
    examples[operation_id] = usage_example if usage_example
  end
end

payload = {
  "generatedAt" => "deterministic",
  "source" => "openapi/plaky115-dx.openapi.yaml",
  "operations" => operations,
  "paths" => operations.map { |operation| operation.slice("method", "path", "operationId") },
  "scopes" => operations.each_with_object({}) { |operation, out| out[operation.fetch("operationId")] = operation.fetch("scopes") },
  "listEndpoints" => operations.select { |operation| operation.fetch("list") }.map { |operation| operation.fetch("operationId") },
  "mutations" => operations.select { |operation| operation.fetch("mutation") }.map { |operation| operation.fetch("operationId") },
  "destructive" => operations.select { |operation| operation.fetch("destructive") }.map { |operation| operation.fetch("operationId") },
  "examples" => examples,
}

File.write(OUT, "#{JSON.pretty_generate(payload)}\n")
