#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "optparse"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SOURCE = File.join(ROOT, "openapi/plaky115-dx.openapi.yaml")
OUT = File.join(ROOT, "openapi/plaky115-operation-metadata.json")

HTTP_METHODS = %w[get post put patch delete head options trace].freeze

# Pagination query params are threaded through dedicated codegen branches, so
# they are excluded from the generic query-param list.
PAGINATION_QUERY_PARAMS = %w[page pageSize limit offset].freeze

def load_yaml(path)
  YAML.safe_load(File.read(path), aliases: true)
end

def fetch_ref(schema, spec, seen = [])
  return schema unless schema.is_a?(Hash) && schema["$ref"]

  reference = schema.fetch("$ref")
  raise ArgumentError, "only local $ref values are supported: #{reference}" unless reference.start_with?("#/")
  raise ArgumentError, "cyclic local $ref: #{reference}" if seen.include?(reference)

  pointer = reference.delete_prefix("#/").split("/").map do |part|
    part.gsub("~1", "/").gsub("~0", "~")
  end
  resolved = pointer.reduce(spec) { |node, part| node.fetch(part) }
  fetch_ref(resolved, spec, seen + [reference])
end

def success_responses(operation, spec)
  operation.fetch("responses", {}).each_with_object([]) do |(status, raw_response), responses|
    next unless status.to_s.match?(/\A2\d\d\z/)

    responses << [status.to_i, fetch_ref(raw_response, spec)]
  end.sort_by(&:first)
end

def success_shape(status, response, spec)
  return { "status" => status, "kind" => "void" } if [204, 205].include?(status)

  content = response.is_a?(Hash) ? response["content"] : nil
  return { "status" => status, "kind" => "void" } unless content.is_a?(Hash) && !content.empty?

  media_type = content.key?("application/json") ? "application/json" : content.keys.sort.first
  raw_schema = content.dig(media_type, "schema")
  raise ArgumentError, "successful response #{status} schema is required" unless raw_schema.is_a?(Hash)

  schema = fetch_ref(raw_schema, spec)
  {
    "status" => status,
    "kind" => media_type == "application/json" && schema.is_a?(Hash) && schema["type"] == "array" ?
      "json-array" : "json-object",
    "mediaType" => media_type,
    "schemaRef" => raw_schema["$ref"],
  }.compact
end

def success_metadata(operation, spec)
  responses = success_responses(operation, spec)
  raise ArgumentError, "operation has no numeric 2xx response" if responses.empty?

  selected_status = operation["x-plaky115-success-status"]&.to_i
  selected_status ||= responses.first.first
  selected = responses.find { |status, _response| status == selected_status }
  raise ArgumentError, "selected success status is unavailable: #{selected_status}" unless selected

  shapes = responses.map { |status, response| success_shape(status, response, spec) }
  if !operation.key?("x-plaky115-success-status") && shapes.map { |shape| shape["kind"] }.uniq.length > 1
    kinds = shapes.map { |shape| "#{shape['status']}=#{shape['kind']}" }.join(", ")
    raise ArgumentError, "incompatible successful response kinds: #{kinds}"
  end
  shapes.find { |shape| shape["status"] == selected_status }
end

def response_schema(operation, success, spec)
  response = success_responses(operation, spec).find { |status, _value| status == success.fetch("status") }&.last
  raw_schema = response&.dig("content", success["mediaType"], "schema")
  raw_schema ? fetch_ref(raw_schema, spec) : {}
end

def list_operation?(operation, success, spec)
  return true if operation.key?("x-plaky115-pagination")
  return true if success["kind"] == "json-array"

  schema = response_schema(operation, success, spec)
  schema.is_a?(Hash) && schema.dig("properties", "hasMore")
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

def request_metadata(operation, spec)
  raw_request = operation["requestBody"]
  return { "kind" => "none", "required" => false } unless raw_request

  request = fetch_ref(raw_request, spec)
  raise ArgumentError, "requestBody must resolve to an object" unless request.is_a?(Hash)

  content = request["content"]
  raise ArgumentError, "requestBody content must be an object" unless content.is_a?(Hash)

  supported = content.keys & ["application/json", "multipart/form-data"]
  selected = operation["x-plaky115-request-media-type"]
  if selected
    raise ArgumentError, "selected request media type is unavailable: #{selected}" unless supported.include?(selected)
  elsif supported.length > 1
    raise ArgumentError, "multiple supported request media types require x-plaky115-request-media-type"
  else
    selected = supported.first
  end
  raise ArgumentError, "unsupported request media types: #{content.keys.join(', ')}" unless selected

  raw_schema = content.dig(selected, "schema")
  raise ArgumentError, "request schema is required for #{selected}" unless raw_schema.is_a?(Hash)

  schema_ref = raw_schema["$ref"]
  schema = fetch_ref(raw_schema, spec)
  output = {
    "kind" => selected == "application/json" ? "json" : "multipart",
    "required" => request["required"] == true,
    "mediaType" => selected,
    "schemaRef" => schema_ref,
  }.compact
  output["parts"] = multipart_parts(schema, spec) if selected == "multipart/form-data"
  output
end

def multipart_parts(schema, spec)
  unless schema.is_a?(Hash) && schema["type"] == "object" && schema["properties"].is_a?(Hash)
    raise ArgumentError, "multipart request schema must be an object with properties"
  end

  required = Array(schema["required"])
  parts = schema.fetch("properties").map do |name, raw_part|
    part = fetch_ref(raw_part, spec)
    type = part.is_a?(Hash) ? part["type"] : nil
    unless %w[string integer number boolean].include?(type)
      raise ArgumentError, "unsupported multipart part #{name}: #{type.inspect}"
    end

    {
      "name" => name,
      "required" => required.include?(name),
      "type" => type,
      "format" => part["format"],
      "description" => collapse_whitespace(part["description"]),
    }.compact
  end
  unless parts.any? { |part| part["type"] == "string" && part["format"] == "binary" }
    raise ArgumentError, "multipart request requires a binary part"
  end
  parts
end

def collapse_whitespace(text)
  return nil if text.nil?

  text.gsub(/\s+/, " ").strip
end

def merged_parameters(operation, path_item, spec)
  merged = {}
  (Array(path_item["parameters"]) + Array(operation["parameters"])).each do |raw_parameter|
    parameter = fetch_ref(raw_parameter, spec)
    next unless parameter.is_a?(Hash) && %w[path query].include?(parameter["in"])

    key = [parameter.fetch("in"), parameter.fetch("name")]
    merged[key] = parameter
  end
  merged.values
end

def parameter_schema(schema, spec, parameter_name)
  resolved = fetch_ref(schema || {}, spec)
  raise ArgumentError, "parameter #{parameter_name} schema must be an object" unless resolved.is_a?(Hash)

  type = resolved["type"]
  supported = %w[string integer number boolean array]
  raise ArgumentError, "unsupported parameter #{parameter_name} schema type #{type.inspect}" unless supported.include?(type)

  output = { "type" => type }
  output["format"] = resolved["format"] if resolved["format"]
  output["enum"] = resolved["enum"] if resolved.key?("enum")
  output["default"] = resolved["default"] if resolved.key?("default")
  output["items"] = parameter_schema(resolved["items"], spec, parameter_name) if type == "array"
  output
end

def parameter_metadata(parameter, spec)
  name = parameter.fetch("name")
  location = parameter.fetch("in")
  style = parameter["style"] || (location == "query" ? "form" : "simple")
  resolved_schema = fetch_ref(parameter["schema"] || {}, spec)
  if location == "query" && (style == "deepObject" || resolved_schema["type"] == "object")
    raise ArgumentError,
          "unsupported query parameter #{name}: style=#{style} schema=#{resolved_schema['type']}"
  end
  schema = parameter_schema(resolved_schema, spec, name)
  explode = parameter.key?("explode") ? parameter["explode"] : style == "form"

  {
    "name" => name,
    "in" => location,
    "required" => location == "path" ? true : parameter["required"] == true,
    "description" => collapse_whitespace(parameter["description"]),
    "schema" => schema,
    "style" => style,
    "explode" => explode,
  }.compact
end

def operation_parameter_metadata(operation, path_item, spec)
  merged_parameters(operation, path_item, spec).map { |parameter| parameter_metadata(parameter, spec) }
end

def generic_parameters(parameters)
  parameters.reject do |parameter|
    parameter["in"] == "query" && PAGINATION_QUERY_PARAMS.include?(parameter["name"])
  end
end

def pagination_parameters(parameters)
  parameters.select do |parameter|
    parameter["in"] == "query" && PAGINATION_QUERY_PARAMS.include?(parameter["name"])
  end
end

def query_parameters(parameters)
  parameters
    .select { |parameter| parameter["in"] == "query" }
    .reject { |parameter| PAGINATION_QUERY_PARAMS.include?(parameter["name"]) }
    .map do |parameter|
      schema = parameter.fetch("schema")
      entry = {
        "name" => parameter.fetch("name"),
        "description" => parameter["description"],
      }.compact
      entry["array"] = true if schema["type"] == "array"
      entry["explode"] = false if parameter["explode"] == false
      entry
    end
end

def generate_metadata(source)
  spec = load_yaml(source)
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
      parameters = operation_parameter_metadata(operation, path_item, spec)
      success = success_metadata(operation, spec)

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
        "list" => list_operation?(operation, success, spec),
        "mutation" => !%w[get head].include?(method),
        "request" => request_metadata(operation, spec),
        "success" => success,
        # Deprecated compatibility field; remove after generators consume request.kind in G006.
        "bodyRequired" => body_required?(operation),
      }

      generic = generic_parameters(parameters)
      entry["parameters"] = generic unless generic.empty?
      if pagination
        entry["pagination"] = {
          "type" => pagination["type"],
          "results" => pagination.dig("outputs", "results"),
          "inputs" => pagination_parameters(parameters),
        }.compact
        entry["pagination"].delete("inputs") if entry["pagination"]["inputs"].empty?
      end

      query = query_parameters(parameters)
      entry["query"] = query unless query.empty?

      operations << entry
      examples[operation_id] = usage_example if usage_example
    end
  end

  {
    "generatedAt" => "deterministic",
    "source" => source == SOURCE ? "openapi/plaky115-dx.openapi.yaml" : source,
    "operations" => operations,
    "paths" => operations.map { |operation| operation.slice("method", "path", "operationId") },
    "scopes" => operations.each_with_object({}) { |operation, out| out[operation.fetch("operationId")] = operation.fetch("scopes") },
    "listEndpoints" => operations.select { |operation| operation.fetch("list") }.map { |operation| operation.fetch("operationId") },
    "mutations" => operations.select { |operation| operation.fetch("mutation") }.map { |operation| operation.fetch("operationId") },
    "destructive" => operations.select { |operation| operation.fetch("destructive") }.map { |operation| operation.fetch("operationId") },
    "examples" => examples,
  }
end

def parse_options(argv)
  options = { source: SOURCE, out: OUT }
  OptionParser.new do |parser|
    parser.on("--source PATH") { |path| options[:source] = path }
    parser.on("--out PATH") { |path| options[:out] = path }
  end.parse!(argv)
  options
end

if $PROGRAM_NAME == __FILE__
  begin
    options = parse_options(ARGV)
    payload = generate_metadata(options.fetch(:source))
    File.write(options.fetch(:out), "#{JSON.pretty_generate(payload)}\n")
  rescue StandardError => e
    warn "generate-operation-metadata: #{e.message}"
    exit 1
  end
end
