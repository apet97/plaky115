#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SOURCE = File.join(ROOT, "openapi/plaky115-dx.openapi.yaml")
OUT = File.join(ROOT, "openapi/plaky115-operation-metadata.json")

HTTP_METHODS = %w[get post put patch delete head options trace].freeze

# Pagination query params are threaded through dedicated codegen branches, so
# they are excluded from the generic query-param list.
PAGINATION_QUERY_PARAMS = %w[page pageSize limit offset].freeze

# Non-pagination query params threaded onto the raw CLI/MCP surfaces so the SDK,
# CLI, and MCP reach the same server-side filters. Array params (emails) are
# emitted with `array: true` and serialized as repeated keys; `expand` carries
# `explode: false` so it stays comma-joined.
THREADED_QUERY_PARAMS = %w[expand emails status type boardViewId parentId subitemsBehaviour].freeze

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
  return true if operation.key?("x-plaky115-pagination")

  schema = response_schema(operation, spec)
  method == "get" && schema.is_a?(Hash) && schema.dig("properties", "hasMore")
end

def default_scopes(operation, method)
  mcp = operation["x-plaky115-mcp"] || {}
  scopes = Array(mcp["scopes"]).uniq
  return scopes unless scopes.empty?

  return %w[read] if method == "get" || method == "head"
  return %w[write destructive] if method == "delete"

  %w[write]
end

def destructive?(operation, method)
  mcp = operation["x-plaky115-mcp"] || {}
  return mcp["destructiveHint"] unless mcp["destructiveHint"].nil?

  method == "delete"
end

def body_required?(operation)
  request_body = operation["requestBody"]
  return false unless request_body.is_a?(Hash)

  request_body["required"] == true
end

def collapse_whitespace(text)
  return nil if text.nil?

  text.gsub(/\s+/, " ").strip
end

def query_parameters(operation, path_item, spec)
  raw = Array(path_item["parameters"]) + Array(operation["parameters"])
  raw
    .map { |param| fetch_ref(param, spec) }
    .select { |param| param.is_a?(Hash) && param["in"] == "query" }
    .reject { |param| PAGINATION_QUERY_PARAMS.include?(param["name"]) }
    .select { |param| THREADED_QUERY_PARAMS.include?(param["name"]) }
    .map do |param|
      schema = fetch_ref(param["schema"] || {}, spec)
      entry = {
        "name" => param.fetch("name"),
        "description" => collapse_whitespace(param["description"]),
      }.compact
      entry["array"] = true if schema.is_a?(Hash) && schema["type"] == "array"
      entry["explode"] = false if param["explode"] == false
      entry
    end
end

spec = load_yaml(SOURCE)
operations = []
examples = {}

spec.fetch("paths").each do |path, path_item|
  path_item.each do |method, operation|
    next unless HTTP_METHODS.include?(method)

    operation_id = operation.fetch("operationId")
    mcp = operation["x-plaky115-mcp"] || {}
    pagination = operation["x-plaky115-pagination"]
    usage_example = operation["x-plaky115-usage-example"]
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
      "bodyRequired" => body_required?(operation),
    }

    if pagination
      entry["pagination"] = {
        "type" => pagination["type"],
        "results" => pagination.dig("outputs", "results"),
      }.compact
    end

    query = query_parameters(operation, path_item, spec)
    entry["query"] = query unless query.empty?

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
