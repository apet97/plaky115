#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "optparse"
require "fileutils"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SOURCE = File.join(ROOT, "openapi/plaky115-dx.openapi.yaml")
OUT = File.join(ROOT, "openapi/plaky115-operation-metadata.json")

HTTP_METHODS = %w[get post put patch delete head options trace].freeze
COMPACT_KINDS = %w[raw space board item comment itemGroup itemFile downloadLink].freeze
CONFIRMATIONS = %w[none destructive].freeze

PARAMETER_SCHEMA_KEYS = %w[
  type format enum default minimum maximum exclusiveMinimum exclusiveMaximum
  minLength maxLength pattern minItems maxItems uniqueItems multipleOf
].freeze

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

def required_properties(schema, label)
  required = schema["required"]
  return [] if required.nil?
  unless required.is_a?(Array) && required.all? { |property| property.is_a?(String) } && required.uniq == required
    raise ArgumentError, "#{label} required must be a unique string array"
  end

  required
end

def success_shape(status, response, spec, operation)
  return { "status" => status, "kind" => "void" } if [204, 205].include?(status)

  content = response.is_a?(Hash) ? response["content"] : nil
  return { "status" => status, "kind" => "void" } unless content.is_a?(Hash) && !content.empty?

  media_type = content.key?("application/json") ? "application/json" : content.keys.sort.first
  raw_schema = content.dig(media_type, "schema")
  raise ArgumentError, "successful response #{status} schema is required" unless raw_schema.is_a?(Hash)

  schema = fetch_ref(raw_schema, spec)
  root_kind = schema.is_a?(Hash) ? schema["type"] : nil
  raise ArgumentError, "successful response #{status} schema type is required" unless root_kind
  unless %w[object array].include?(root_kind)
    raise ArgumentError, "successful response #{status} has unsupported root type #{root_kind.inspect}"
  end
  kind = root_kind == "array" ? "json-array" : "json-object"
  kind = "paged-object" if operation.key?("x-plaky115-pagination") && kind == "json-object"
  output = {
    "status" => status,
    "kind" => kind,
    "mediaType" => media_type,
    "schemaRef" => raw_schema["$ref"],
    "rootKind" => root_kind,
  }.compact
  if root_kind == "object"
    output["requiredProperties"] = required_properties(schema, "successful response #{status}")
  end
  if operation["method"].to_s.casecmp("post").zero? && root_kind == "object" && schema.dig("properties", "id")
    output["createdIdPointer"] = "$.id"
  end
  output["sensitiveLink"] = true if operation["x-plaky115-sensitive-output"] == true
  output
end

def success_metadata(operation, spec)
  responses = success_responses(operation, spec)
  raise ArgumentError, "operation has no numeric 2xx response" if responses.empty?

  selected_status = operation["x-plaky115-success-status"]&.to_i
  selected_status ||= responses.first.first
  selected = responses.find { |status, _response| status == selected_status }
  raise ArgumentError, "selected success status is unavailable: #{selected_status}" unless selected

  shapes = responses.map { |status, response| success_shape(status, response, spec, operation) }
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
  !!(schema.is_a?(Hash) && schema.dig("properties", "hasMore"))
end

def operation_semantics(operation)
  mcp = operation["x-plaky115-mcp"]
  return {
    "mcpName" => nil,
    "mcpTitle" => nil,
    "scopes" => [],
    "readOnly" => false,
    "destructive" => false,
    "idempotent" => false,
    "openWorld" => true,
    "confirmation" => nil,
    "compactKind" => nil,
    "sensitiveOutput" => nil,
  } unless mcp

  raise ArgumentError, "x-plaky115-mcp must be an object" unless mcp.is_a?(Hash)
  name = mcp["name"]
  title = mcp["title"]
  scopes = mcp["scopes"]
  raise ArgumentError, "MCP name is invalid" unless name.is_a?(String) && name.match?(/\Aplaky_[a-z0-9_]+\z/)
  raise ArgumentError, "MCP title is required" unless title.is_a?(String) && !title.strip.empty?
  unless scopes.is_a?(Array) && !scopes.empty? && scopes.all? { |scope| scope.is_a?(String) } && scopes.uniq == scopes
    raise ArgumentError, "MCP scopes must be a non-empty unique string array"
  end

  hints = %w[readOnlyHint destructiveHint idempotentHint openWorldHint]
  hints.each do |hint|
    raise ArgumentError, "MCP #{hint} must be boolean" unless [true, false].include?(mcp[hint])
  end
  confirmation = operation["x-plaky115-confirmation"]
  compact_kind = operation["x-plaky115-compact-kind"]
  sensitive_output = operation["x-plaky115-sensitive-output"]
  raise ArgumentError, "invalid confirmation: #{confirmation.inspect}" unless CONFIRMATIONS.include?(confirmation)
  raise ArgumentError, "invalid compact kind: #{compact_kind.inspect}" unless COMPACT_KINDS.include?(compact_kind)
  unless [true, false].include?(sensitive_output)
    raise ArgumentError, "sensitive output must be boolean"
  end

  destructive = mcp.fetch("destructiveHint")
  if destructive && (!scopes.include?("destructive") || confirmation != "destructive")
    raise ArgumentError, "destructive operation requires destructive scope and confirmation"
  end
  if !destructive && confirmation != "none"
    raise ArgumentError, "non-destructive operation requires confirmation none"
  end

  {
    "mcpName" => name,
    "mcpTitle" => title,
    "scopes" => scopes,
    "readOnly" => mcp.fetch("readOnlyHint"),
    "destructive" => destructive,
    "idempotent" => mcp.fetch("idempotentHint"),
    "openWorld" => mcp.fetch("openWorldHint"),
    "confirmation" => confirmation,
    "compactKind" => compact_kind,
    "sensitiveOutput" => sensitive_output,
  }
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
    "rootKind" => schema["type"],
  }.compact
  if schema["type"] == "object"
    required = required_properties(schema, "#{selected} request")
    min_properties = schema.fetch("minProperties", 0)
    unless min_properties.is_a?(Integer) && min_properties >= 0
      raise ArgumentError, "#{selected} request minProperties must be a non-negative integer"
    end
    output["requiredProperties"] = required
    output["allowEmptyObject"] = required.empty? && min_properties.zero?
  end
  output["parts"] = multipart_parts(schema, spec) if selected == "multipart/form-data"
  if operation["x-plaky115-filename-policy"]
    policy = operation.fetch("x-plaky115-filename-policy")
    unless policy.is_a?(Hash) && policy["maxUtf8Bytes"].is_a?(Integer) && policy["maxUtf8Bytes"] > 0 && policy["evidence"].is_a?(String)
      raise ArgumentError, "x-plaky115-filename-policy must include a positive maxUtf8Bytes and evidence"
    end
    output["filenamePolicy"] = {
      "maxUtf8Bytes" => policy.fetch("maxUtf8Bytes"),
      "evidence" => policy.fetch("evidence"),
    }
  end
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
    unless parameter.is_a?(Hash) && parameter["in"].is_a?(String) && parameter["name"].is_a?(String)
      raise ArgumentError, "operation #{operation.fetch('operationId')} has an invalid parameter"
    end
    unless %w[path query].include?(parameter["in"])
      raise ArgumentError, "operation #{operation.fetch('operationId')} has unsupported parameter location #{parameter['in'].inspect}"
    end

    key = [parameter.fetch("in"), parameter.fetch("name")]
    if merged.key?(key) && parameter_signature(merged.fetch(key)) != parameter_signature(parameter)
      raise ArgumentError, "operation #{operation.fetch('operationId')} has contradictory parameter #{key.join(':')}"
    end
    merged[key] = parameter
  end
  merged.values
end

def parameter_signature(parameter)
  parameter.select { |key, _value| %w[name in required style explode schema].include?(key) }
end

def parameter_schema(schema, spec, parameter_name)
  resolved = fetch_ref(schema || {}, spec)
  raise ArgumentError, "parameter #{parameter_name} schema must be an object" unless resolved.is_a?(Hash)

  type = resolved["type"]
  supported = %w[string integer number boolean array]
  raise ArgumentError, "unsupported parameter #{parameter_name} schema type #{type.inspect}" unless supported.include?(type)

  output = {}
  PARAMETER_SCHEMA_KEYS.each do |key|
    output[key] = resolved[key] if resolved.key?(key)
  end
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

def pagination_metadata(operation, parameters)
  raw = operation["x-plaky115-pagination"]
  return nil unless raw
  unless raw.is_a?(Hash) && raw["kind"] == "pageNumber"
    raise ArgumentError, "operation #{operation.fetch('operationId')} pagination must use kind pageNumber"
  end
  %w[pageParameter sizeParameter resultsPointer hasMorePointer].each do |key|
    value = raw[key]
    raise ArgumentError, "operation #{operation.fetch('operationId')} pagination #{key} is required" unless value.is_a?(String) && !value.empty?
  end
  if raw.fetch("pageParameter") == raw.fetch("sizeParameter")
    raise ArgumentError, "operation #{operation.fetch('operationId')} pagination inputs must be distinct"
  end

  inputs = %w[pageParameter sizeParameter].map do |key|
    name = raw.fetch(key)
    matches = parameters.select { |parameter| parameter["in"] == "query" && parameter["name"] == name }
    raise ArgumentError, "operation #{operation.fetch('operationId')} pagination #{key} does not resolve to one query parameter" unless matches.length == 1

    matches.first
  end
  {
    "kind" => raw.fetch("kind"),
    "pageParameter" => raw.fetch("pageParameter"),
    "sizeParameter" => raw.fetch("sizeParameter"),
    "resultsPointer" => raw.fetch("resultsPointer"),
    "hasMorePointer" => raw.fetch("hasMorePointer"),
    "inputs" => inputs,
  }
end

def generic_parameters(parameters, pagination)
  excluded = Array(pagination && pagination["inputs"]).map { |parameter| [parameter["in"], parameter["name"]] }
  parameters.reject { |parameter| excluded.include?([parameter["in"], parameter["name"]]) }
end

def query_parameters(parameters, pagination)
  excluded = Array(pagination && pagination["inputs"]).map { |parameter| [parameter["in"], parameter["name"]] }
  parameters
    .select { |parameter| parameter["in"] == "query" }
    .reject { |parameter| excluded.include?([parameter["in"], parameter["name"]]) }
    .map do |parameter|
      schema = parameter.fetch("schema")
      entry = {
        "name" => parameter.fetch("name"),
        "required" => parameter.fetch("required"),
        "description" => parameter["description"],
        "schema" => schema,
        "style" => parameter.fetch("style"),
        "explode" => parameter.fetch("explode"),
      }.compact
      entry["array"] = true if schema["type"] == "array"
      entry
    end
end

def validate_unique_metadata!(operations)
  {
    "operationId" => operations.map { |operation| operation["operationId"] },
    "MCP name" => operations.map { |operation| operation["mcpName"] }.compact,
  }.each do |label, values|
    duplicate = values.group_by(&:itself).find { |_value, entries| entries.length > 1 }&.first
    raise ArgumentError, "duplicate #{label}: #{duplicate}" if duplicate
  end
end

def generate_metadata(source, source_label = nil)
  spec = load_yaml(source)
  operations = []
  examples = {}

  spec.fetch("paths").each do |path, path_item|
    path_item.each do |method, operation|
      next unless HTTP_METHODS.include?(method)

      operation_id = operation.fetch("operationId")
      usage_example = operation["x-plaky115-usage-example"]
      semantics = operation_semantics(operation)
      parameters = operation_parameter_metadata(operation, path_item, spec)
      pagination = pagination_metadata(operation, parameters)
      success = success_metadata(operation.merge("method" => method), spec)

      entry = {
        "operationId" => operation_id,
        "method" => method.upcase,
        "path" => path,
        "summary" => operation["summary"],
        "mcpName" => semantics["mcpName"],
        "mcpTitle" => semantics["mcpTitle"],
        "scopes" => semantics.fetch("scopes"),
        "readOnly" => semantics.fetch("readOnly"),
        "destructive" => semantics.fetch("destructive"),
        "idempotent" => semantics.fetch("idempotent"),
        "openWorld" => semantics.fetch("openWorld"),
        "list" => list_operation?(operation, success, spec),
        "mutation" => !semantics.fetch("readOnly"),
        "request" => request_metadata(operation, spec),
        "success" => success,
        "confirmation" => semantics["confirmation"],
        "compactKind" => semantics["compactKind"],
        "sensitiveOutput" => semantics["sensitiveOutput"],
      }

      generic = generic_parameters(parameters, pagination)
      entry["parameters"] = generic unless generic.empty?
      if pagination
        entry["pagination"] = pagination
      end

      query = query_parameters(parameters, pagination)
      entry["query"] = query unless query.empty?

      operations << entry
      examples[operation_id] = usage_example if usage_example
    end
  end
  validate_unique_metadata!(operations)

  {
    "descriptorVersion" => 2,
    "generatedAt" => "deterministic",
    "source" => source_label || (source == SOURCE ? "openapi/plaky115-dx.openapi.yaml" : source),
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
  options = { source: SOURCE, out: OUT, source_label: nil }
  OptionParser.new do |parser|
    parser.on("--source PATH") { |path| options[:source] = path }
    parser.on("--out PATH") { |path| options[:out] = path }
    parser.on("--source-label LABEL") { |label| options[:source_label] = label }
  end.parse!(argv)
  options
end

if $PROGRAM_NAME == __FILE__
  begin
    options = parse_options(ARGV)
    payload = generate_metadata(options.fetch(:source), options[:source_label])
    formatted = JSON.pretty_generate(payload).gsub(/\[\s*\]/, "[]")
    FileUtils.mkdir_p(File.dirname(options.fetch(:out)))
    File.write(options.fetch(:out), "#{formatted}\n")
  rescue StandardError => e
    warn "generate-operation-metadata: #{e.message}"
    exit 1
  end
end
