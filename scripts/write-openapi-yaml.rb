#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"

def validate_openapi_root(value)
  raise ArgumentError, "root must be an object" unless value.is_a?(Hash)
  raise ArgumentError, "root must contain an OpenAPI version" unless value["openapi"].is_a?(String)
  raise ArgumentError, "root paths must be an object" unless value["paths"].is_a?(Hash)
end

begin
  raise ArgumentError, "usage: write-openapi-yaml.rb INPUT" unless ARGV.length == 1

  source = File.binread(ARGV.fetch(0)).force_encoding(Encoding::UTF_8)
  raise ArgumentError, "input is not valid UTF-8" unless source.valid_encoding?

  document = JSON.parse(source, create_additions: false)
  validate_openapi_root(document)
  output = YAML.dump(document).sub(/\n*\z/, "\n")
  STDOUT.write(output.encode(Encoding::UTF_8))
rescue StandardError => e
  warn "write-openapi-yaml: #{e.message.lines.first.to_s.strip}"
  exit 1
end
