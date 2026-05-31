#!/usr/bin/env ruby
# frozen_string_literal: true

require "psych"
require "set"
require "yaml"

HTTP_METHODS = %w[get post put patch delete head options trace].freeze
LEGACY_EXTENSION_PREFIX = "x-" + "spea" + "keasy-"

def duplicate_key_errors(path)
  errors = []
  stream = Psych.parse_stream(File.read(path))

  walk_yaml_node(stream) do |node|
    next unless node.is_a?(Psych::Nodes::Mapping)

    seen = {}
    node.children.each_slice(2) do |key_node, _value_node|
      next unless key_node.respond_to?(:value)

      key = key_node.value
      if seen.key?(key)
        errors << "#{path}:#{key_node.start_line + 1}: duplicate key #{key.inspect}"
      else
        seen[key] = true
      end
    end
  end
  errors
rescue Psych::SyntaxError => e
  ["#{path}:#{e.line}: YAML syntax error: #{e.message}"]
end

def walk_yaml_node(node, &block)
  yield node
  children = node.respond_to?(:children) ? node.children : nil
  children&.each { |child| walk_yaml_node(child, &block) }
end

def load_yaml(path)
  YAML.safe_load(File.read(path), aliases: true)
end

def each_nested(value, path = "$", &block)
  yield value, path
  case value
  when Hash
    value.each { |key, child| each_nested(child, "#{path}/#{key}", &block) }
  when Array
    value.each_with_index { |child, index| each_nested(child, "#{path}[#{index}]", &block) }
  end
end

def pointer_parts(ref)
  ref.delete_prefix("#/").split("/").map { |part| part.gsub("~1", "/").gsub("~0", "~") }
end

def resolve_pointer(document, ref)
  pointer_parts(ref).reduce(document) do |node, part|
    return nil unless node.is_a?(Hash) || node.is_a?(Array)

    node.is_a?(Array) ? node[Integer(part, exception: false)] : node[part]
  end
end

def lint_refs(document, errors)
  each_nested(document) do |node, path|
    next unless node.is_a?(Hash)

    ref = node["$ref"]
    next unless ref.is_a?(String) && ref.start_with?("#/")

    errors << "#{path}: unresolved local $ref #{ref}" if resolve_pointer(document, ref).nil?
  end
end

def operation_location(path, method)
  "#{path} #{method.upcase}"
end

def lint_operations(document, errors)
  paths = document["paths"]
  unless paths.is_a?(Hash)
    errors << "$.paths: paths must be an object"
    return
  end

  operation_ids = {}
  paths.each do |path, path_item|
    unless path_item.is_a?(Hash)
      errors << "#{path}: path item must be an object"
      next
    end

    path_item.each do |method, operation|
      next unless HTTP_METHODS.include?(method)

      location = operation_location(path, method)
      unless operation.is_a?(Hash)
        errors << "#{location}: operation must be an object"
        next
      end

      operation_id = operation["operationId"]
      if operation_id.nil? || operation_id.to_s.strip.empty?
        errors << "#{location}: missing operationId"
      elsif operation_ids.key?(operation_id)
        errors << "#{location}: duplicate operationId #{operation_id.inspect} also used by #{operation_ids.fetch(operation_id)}"
      else
        operation_ids[operation_id] = location
      end

      summary = operation["summary"]
      errors << "#{location}: missing summary" if summary.nil? || summary.to_s.strip.empty?

      responses = operation["responses"]
      if !responses.is_a?(Hash) || responses.empty?
        errors << "#{location}: responses must be a non-empty object"
      else
        responses.each do |code, response|
          unless response.is_a?(Hash) && response["description"].to_s.strip != ""
            errors << "#{location}: response #{code} must include a description"
          end
        end
      end

      lint_path_parameters(path, path_item, operation, location, errors)
      lint_plaky_metadata(operation, location, errors)
    end
  end
end

def lint_path_parameters(path, path_item, operation, location, errors)
  template_params = path.scan(/\{([^}]+)\}/).flatten
  return if template_params.empty?

  parameters = Array(path_item["parameters"]) + Array(operation["parameters"])
  path_params = parameters.select { |parameter| parameter.is_a?(Hash) && parameter["in"] == "path" }
  template_params.each do |name|
    match = path_params.find { |parameter| parameter["name"] == name }
    errors << "#{location}: missing path parameter #{name.inspect}" if match.nil?
  end
end

def lint_plaky_metadata(operation, location, errors)
  operation.each_key do |key|
    errors << "#{location}: legacy extension #{key} is not allowed" if key.to_s.start_with?(LEGACY_EXTENSION_PREFIX)
  end

  pagination = operation["x-plaky115-pagination"]
  if pagination
    unless pagination.is_a?(Hash) && pagination["type"].to_s != "" && pagination.dig("outputs", "results").to_s != ""
      errors << "#{location}: x-plaky115-pagination must include type and outputs.results"
    end
  end

  mcp = operation["x-plaky115-mcp"]
  return unless mcp

  unless mcp.is_a?(Hash)
    errors << "#{location}: x-plaky115-mcp must be an object"
    return
  end

  errors << "#{location}: x-plaky115-mcp.name must start with plaky_" unless mcp["name"].to_s.match?(/\Aplaky_[a-z0-9_]+\z/)
  scopes = mcp["scopes"]
  errors << "#{location}: x-plaky115-mcp.scopes must be a non-empty array" unless scopes.is_a?(Array) && scopes.all? { |scope| scope.is_a?(String) } && !scopes.empty?
  %w[readOnlyHint destructiveHint idempotentHint openWorldHint].each do |key|
    errors << "#{location}: x-plaky115-mcp.#{key} must be boolean" unless [true, false].include?(mcp[key])
  end
end

def lint_openapi_root(document, errors)
  unless document.is_a?(Hash)
    errors << "$: OpenAPI document must be an object"
    return
  end

  openapi = document["openapi"]
  errors << "$.openapi: missing openapi version" if openapi.to_s.strip.empty?

  info = document["info"]
  unless info.is_a?(Hash)
    errors << "$.info: info must be an object"
    return
  end

  errors << "$.info.title: missing title" if info["title"].to_s.strip.empty?
  errors << "$.info.version: missing version" if info["version"].to_s.strip.empty?
end

def lint_document(path)
  errors = duplicate_key_errors(path)
  return errors unless errors.empty?

  document = load_yaml(path)
  lint_openapi_root(document, errors)
  lint_refs(document, errors)
  lint_operations(document, errors)
  errors
rescue Psych::Exception => e
  ["#{path}: YAML load error: #{e.message}"]
end

paths = ARGV
abort("lint-openapi: provide at least one OpenAPI file") if paths.empty?

errors = paths.flat_map { |path| lint_document(path) }

if errors.empty?
  puts "openapi-lint: OK"
else
  errors.each { |error| warn "lint-openapi: #{error}" }
  exit 1
end
