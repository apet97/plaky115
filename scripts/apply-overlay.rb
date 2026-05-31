#!/usr/bin/env ruby
# frozen_string_literal: true

require "optparse"
require "psych"
require "json"
require "yaml"

HTTP_METHODS = %w[get post put patch delete head options trace].freeze

def parse_options(argv)
  options = {}
  OptionParser.new do |parser|
    parser.on("--source PATH") { |value| options[:source] = value }
    parser.on("--overlay PATH") { |value| options[:overlay] = value }
    parser.on("--out PATH") { |value| options[:out] = value }
    parser.on("--check") { options[:check] = true }
  end.parse!(argv)

  abort("apply-overlay: --source is required") unless options[:source]
  abort("apply-overlay: --overlay is required") unless options[:overlay]
  abort("apply-overlay: --out is required unless --check is set") unless options[:out] || options[:check]
  options
end

def load_yaml(path)
  errors = duplicate_key_errors(path)
  raise ArgumentError, errors.join("\n") unless errors.empty?

  YAML.safe_load(File.read(path), aliases: true)
end

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
end

def walk_yaml_node(node, &block)
  yield node
  children = node.respond_to?(:children) ? node.children : nil
  children&.each { |child| walk_yaml_node(child, &block) }
end

def deep_merge!(target, update)
  update.each do |key, value|
    if target[key].is_a?(Hash) && value.is_a?(Hash)
      deep_merge!(target[key], value)
    else
      target[key] = value
    end
  end
  target
end

def resolve_targets(spec, target)
  return [spec.fetch("info")] if target == "$.info"

  exact = target.match(/\A\$\.(paths)\["([^"]+)"\]\.(#{HTTP_METHODS.join("|")})\z/)
  if exact
    path = exact[2]
    method = exact[3]
    path_item = spec.fetch("paths", {})[path]
    return [] unless path_item.is_a?(Hash) && path_item[method].is_a?(Hash)

    return [path_item.fetch(method)]
  end

  wildcard = target.match(/\A\$\.paths\.\*\[((?:"#{HTTP_METHODS.join('")|(?:"')}")(?:,"(?:#{HTTP_METHODS.join('|')})")*)\]\z/)
  if wildcard
    methods = wildcard[1].scan(/"([^"]+)"/).flatten
    return spec.fetch("paths", {}).values.flat_map do |path_item|
      next [] unless path_item.is_a?(Hash)

      methods.filter_map { |method| path_item[method] if path_item[method].is_a?(Hash) }
    end
  end

  raise ArgumentError, "invalid target grammar: #{target}"
end

def apply_overlay!(spec, overlay)
  actions = overlay.fetch("actions")
  raise ArgumentError, "overlay actions must be an array" unless actions.is_a?(Array)

  actions.each_with_index do |action, index|
    target = action.fetch("target")
    update = action.fetch("update")
    raise ArgumentError, "action #{index + 1} update must be an object" unless update.is_a?(Hash)

    targets = resolve_targets(spec, target)
    raise ArgumentError, "unmatched target: #{target}" if targets.empty?

    targets.each do |resolved|
      raise ArgumentError, "target is not an object: #{target}" unless resolved.is_a?(Hash)

      deep_merge!(resolved, update)
    end
  end
end

def scalar?(value)
  value.nil? || value == true || value == false || value.is_a?(Numeric) || value.is_a?(String)
end

def yaml_scalar(value)
  case value
  when nil
    "null"
  when true
    "true"
  when false
    "false"
  when Numeric
    value.to_s
  when String
    JSON.generate(value)
  else
    raise ArgumentError, "unsupported YAML scalar #{value.class}"
  end
end

def deterministic_yaml(value, indent = 0)
  space = " " * indent
  case value
  when Hash
    return "#{space}{}\n" if value.empty?

    value.map do |key, child|
      rendered_key = JSON.generate(key.to_s)
      if scalar?(child)
        "#{space}#{rendered_key}: #{yaml_scalar(child)}\n"
      else
        "#{space}#{rendered_key}:\n#{deterministic_yaml(child, indent + 2)}"
      end
    end.join
  when Array
    return "#{space}[]\n" if value.empty?

    value.map do |child|
      if scalar?(child)
        "#{space}- #{yaml_scalar(child)}\n"
      else
        "#{space}-\n#{deterministic_yaml(child, indent + 2)}"
      end
    end.join
  else
    "#{space}#{yaml_scalar(value)}\n"
  end
end

begin
  options = parse_options(ARGV)
  spec = load_yaml(options.fetch(:source))
  overlay = load_yaml(options.fetch(:overlay))
  apply_overlay!(spec, overlay)
  File.write(options.fetch(:out), deterministic_yaml(spec)) if options[:out]
  puts "overlay-apply: OK"
rescue KeyError, Psych::Exception, ArgumentError => e
  warn "apply-overlay: #{e.message}"
  exit 1
end
