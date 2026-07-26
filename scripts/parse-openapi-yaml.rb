#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"

def canonical(value)
  case value
  when Hash
    value.keys.sort.each_with_object({}) { |key, result| result[key] = canonical(value.fetch(key)) }
  when Array
    value.map { |entry| canonical(entry) }
  else
    value
  end
end

def validate_openapi_root(value)
  raise ArgumentError, "root must be an object" unless value.is_a?(Hash)
  raise ArgumentError, "root must contain an OpenAPI version" unless value["openapi"].is_a?(String)
  raise ArgumentError, "root paths must be an object" unless value["paths"].is_a?(Hash)
end

begin
  raise ArgumentError, "usage: parse-openapi-yaml.rb INPUT" unless ARGV.length == 1

  source = File.binread(ARGV.fetch(0)).force_encoding(Encoding::UTF_8)
  raise ArgumentError, "input is not valid UTF-8" unless source.valid_encoding?

  document = YAML.safe_load(
    source,
    permitted_classes: [],
    permitted_symbols: [],
    aliases: false
  )
  validate_openapi_root(document)
  STDOUT.write(JSON.generate(canonical(document)))
  STDOUT.write("\n")
rescue StandardError => e
  warn "parse-openapi-yaml: #{e.message.lines.first.to_s.strip}"
  exit 1
end
