#!/usr/bin/env ruby
# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

ROOT = File.expand_path("..", __dir__)
FIXTURE_ROOT = File.join(ROOT, "test/fixtures/openapi")

class OperationMetadataFixturesTest < Minitest::Test
  def test_all_fixtures_are_safe_openapi_documents_with_unique_operation_ids
    ids = []
    fixture_paths.each do |path|
      document = load_fixture(path)
      assert_equal "3.1.0", document.fetch("openapi")
      document.fetch("paths").each_value do |path_item|
        path_item.each do |method, operation|
          next unless %w[get put post delete patch options head trace].include?(method)

          ids << operation.fetch("operationId")
        end
      end
    end
    assert_equal ids.length, ids.uniq.length
  end

  def test_required_json_object_quadrant_and_typed_parameters
    operation = operation("metadata-json.yaml", "/fixture/widgets/{widgetId}", "post")
    assert_equal true, operation.fetch("requestBody").fetch("required")
    assert_equal ["application/json"], operation.fetch("requestBody").fetch("content").keys
    assert_equal "#/components/schemas/WidgetInput",
                 operation.dig("requestBody", "content", "application/json", "schema", "$ref")
    assert_equal "#/components/schemas/Widget",
                 operation.dig("responses", "200", "content", "application/json", "schema", "$ref")
    widget_id, labels = operation.fetch("parameters")
    assert_equal({ "type" => "integer", "format" => "int64" }, widget_id.fetch("schema"))
    assert_equal ["query", "form", true, "array"],
                 [labels.fetch("in"), labels.fetch("style"), labels.fetch("explode"), labels.dig("schema", "type")]
  end

  def test_bodyless_put_void_quadrant
    operation = operation("metadata-bodyless-put.yaml", "/fixture/widgets/{widgetId}/archive", "put")
    refute operation.key?("requestBody")
    refute operation.fetch("responses").fetch("200").key?("content")
  end

  def test_multipart_binary_201_object_quadrant
    operation = operation("metadata-multipart.yaml", "/fixture/widgets/{widgetId}/files", "post")
    content = operation.fetch("requestBody").fetch("content")
    assert_equal ["multipart/form-data"], content.keys
    schema = content.fetch("multipart/form-data").fetch("schema")
    assert_equal ["file"], schema.fetch("required")
    assert_equal({ "type" => "string", "format" => "binary" }, schema.dig("properties", "file"))
    assert_equal "#/components/schemas/File",
                 operation.dig("responses", "201", "content", "application/json", "schema", "$ref")
  end

  def test_bare_array_200_quadrant
    operation = operation("metadata-array.yaml", "/fixture/widgets/{widgetId}/files", "get")
    schema = operation.dig("responses", "200", "content", "application/json", "schema")
    assert_equal "array", schema.fetch("type")
    assert_equal "#/components/schemas/File", schema.dig("items", "$ref")
  end

  def test_invalid_fixtures_represent_exact_ambiguities
    success = operation("metadata-invalid-success-shapes.yaml", "/fixture/ambiguous-success", "get")
    kinds = %w[200 206].map { |status| success.dig("responses", status, "content", "application/json", "schema", "type") }
    assert_equal %w[object array], kinds

    request = operation("metadata-invalid-request-media.yaml", "/fixture/ambiguous-request", "post")
    assert_equal ["application/json", "multipart/form-data"], request.dig("requestBody", "content").keys
  end

  private

  def fixture_paths
    Dir[File.join(FIXTURE_ROOT, "metadata-*.yaml")].sort
  end

  def load_fixture(name_or_path)
    path = name_or_path.start_with?(FIXTURE_ROOT) ? name_or_path : File.join(FIXTURE_ROOT, name_or_path)
    YAML.safe_load(File.read(path), permitted_classes: [], permitted_symbols: [], aliases: false)
  end

  def operation(file, path, method)
    load_fixture(file).fetch("paths").fetch(path).fetch(method)
  end
end
