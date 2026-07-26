#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"
require "yaml"

ROOT = File.expand_path("..", __dir__)
GENERATOR = File.join(ROOT, "scripts/generate-operation-metadata.rb")
FIXTURES = File.join(ROOT, "test/fixtures/openapi")

class OperationMetadataV2Test < Minitest::Test
  def test_request_bodyless_put_is_explicit_none
    operation = generate(File.join(FIXTURES, "metadata-bodyless-put.yaml")).fetch("operations").fetch(0)
    assert_equal({ "kind" => "none", "required" => false }, operation.fetch("request"))
  end

  def test_request_json_required_optional_and_schema_ref
    spec = fixture("metadata-json.yaml")
    operation = generate_document(spec).fetch("operations").fetch(0)
    assert_equal({
      "kind" => "json",
      "required" => true,
      "mediaType" => "application/json",
      "schemaRef" => "#/components/schemas/WidgetInput",
    }, operation.fetch("request"))

    spec.dig("paths", "/fixture/widgets/{widgetId}", "post", "requestBody")["required"] = false
    optional = generate_document(spec).fetch("operations").fetch(0)
    assert_equal false, optional.fetch("request").fetch("required")
  end

  def test_request_multipart_emits_binary_parts_not_json
    spec = fixture("metadata-multipart.yaml")
    spec.dig("paths", "/fixture/widgets/{widgetId}/files", "post", "requestBody", "content",
             "multipart/form-data", "schema", "properties", "file")["description"] = "Fixture bytes"
    operation = generate_document(spec).fetch("operations").fetch(0)
    assert_equal "multipart", operation.dig("request", "kind")
    assert_equal "multipart/form-data", operation.dig("request", "mediaType")
    assert_equal [{
      "name" => "file",
      "required" => true,
      "type" => "string",
      "format" => "binary",
      "description" => "Fixture bytes",
    }], operation.dig("request", "parts")
    refute_equal "json", operation.dig("request", "kind")
  end

  def test_request_ambiguous_media_requires_explicit_selection
    source = File.join(FIXTURES, "metadata-invalid-request-media.yaml")
    _stdout, stderr, status = run_generator(source)
    refute status.success?
    assert_match(/multiple supported request media types/, stderr)

    spec = fixture("metadata-invalid-request-media.yaml")
    spec.dig("paths", "/fixture/ambiguous-request", "post")["x-plaky115-request-media-type"] = "application/json"
    selected = generate_document(spec).fetch("operations").fetch(0)
    assert_equal "json", selected.dig("request", "kind")
  end

  def test_request_multipart_requires_binary_and_rejects_nested_object_parts
    spec = fixture("metadata-multipart.yaml")
    file_schema = spec.dig("paths", "/fixture/widgets/{widgetId}/files", "post", "requestBody", "content",
                           "multipart/form-data", "schema", "properties", "file")
    file_schema["format"] = "text"
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/multipart request requires a binary part/, stderr)

    file_schema.replace("type" => "object", "properties" => { "nested" => { "type" => "string" } })
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/unsupported multipart part file.*object/, stderr)
  end

  def test_request_unresolved_schema_ref_fails
    spec = fixture("metadata-json.yaml")
    spec.dig("paths", "/fixture/widgets/{widgetId}", "post", "requestBody", "content",
             "application/json")["schema"] = { "$ref" => "#/components/schemas/Missing" }
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/key not found.*Missing/, stderr)
  end

  def test_parameter_metadata_is_contract_derived_and_typed
    metadata = generate(File.join(FIXTURES, "metadata-json.yaml"))
    operation = metadata.fetch("operations").fetch(0)
    widget_id, labels = operation.fetch("parameters")

    assert_equal({
      "name" => "widgetId",
      "in" => "path",
      "required" => true,
      "schema" => { "type" => "integer", "format" => "int64" },
      "style" => "simple",
      "explode" => false,
    }, widget_id)
    assert_equal "labels", labels.fetch("name")
    assert_equal "query", labels.fetch("in")
    assert_equal false, labels.fetch("required")
    assert_equal "Labels used to filter fixture widgets.", labels.fetch("description")
    assert_equal "form", labels.fetch("style")
    assert_equal true, labels.fetch("explode")
    assert_equal({
      "type" => "array",
      "default" => ["alpha"],
      "items" => { "type" => "string", "enum" => %w[alpha beta] },
    }, labels.fetch("schema"))
    assert_equal [{ "name" => "labels", "description" => "Labels used to filter fixture widgets.", "array" => true }],
                 operation.fetch("query")
  end

  def test_parameter_pagination_inputs_retain_schema_but_leave_generic_parameters
    spec = fixture("metadata-json.yaml")
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation["parameters"] << {
      "name" => "page",
      "in" => "query",
      "schema" => { "type" => "integer", "format" => "int32", "default" => 1 },
    }
    operation["x-plaky115-pagination"] = {
      "type" => "offsetLimit",
      "outputs" => { "results" => "$.data" },
    }
    metadata = generate_document(spec)
    generated = metadata.fetch("operations").fetch(0)
    assert_equal %w[widgetId labels], generated.fetch("parameters").map { |parameter| parameter.fetch("name") }
    assert_equal({
      "name" => "page",
      "in" => "query",
      "required" => false,
      "schema" => { "type" => "integer", "format" => "int32", "default" => 1 },
      "style" => "form",
      "explode" => true,
    }, generated.dig("pagination", "inputs", 0))
  end

  def test_parameter_local_refs_unescape_json_pointer_and_detect_cycles
    spec = fixture("metadata-json.yaml")
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation["parameters"] = [{ "$ref" => "#/components/parameters/Query~1Label~0Filter" }]
    spec.fetch("components")["parameters"] = {
      "Query/Label~Filter" => {
        "name" => "label",
        "in" => "query",
        "schema" => { "type" => "string" },
      },
    }
    generated = generate_document(spec).fetch("operations").fetch(0)
    assert_equal "label", generated.fetch("parameters").fetch(0).fetch("name")

    spec.fetch("components").fetch("parameters")["Query/Label~Filter"] = {
      "$ref" => "#/components/parameters/Query~1Label~0Filter",
    }
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/cyclic local \$ref/, stderr)
  end

  def test_parameter_unsupported_query_object_and_deep_object_fail_loudly
    spec = fixture("metadata-json.yaml")
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation["parameters"] << {
      "name" => "filter",
      "in" => "query",
      "style" => "deepObject",
      "schema" => { "type" => "object", "properties" => { "state" => { "type" => "string" } } },
    }
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/unsupported query parameter filter.*deepObject.*object/, stderr)
  end

  def test_parameter_existing_expand_and_emails_serialization_stays_compatible
    metadata = generate(File.join(ROOT, "openapi/plaky115-dx.openapi.yaml"))
    operations = metadata.fetch("operations").to_h { |operation| [operation.fetch("operationId"), operation] }
    expand = operations.fetch("listItems").fetch("query").find { |parameter| parameter.fetch("name") == "expand" }
    emails = operations.fetch("listUsers").fetch("query").find { |parameter| parameter.fetch("name") == "emails" }
    assert_equal true, expand.fetch("array")
    assert_equal false, expand.fetch("explode")
    assert_equal true, emails.fetch("array")
    refute emails.key?("explode")
    refute_includes File.read(GENERATOR), "THREADED" + "_QUERY_PARAMS"
  end

  private

  def fixture(name)
    YAML.safe_load(File.read(File.join(FIXTURES, name)), aliases: false)
  end

  def generate(source)
    Dir.mktmpdir("plaky115-metadata-v2-") do |dir|
      out = File.join(dir, "metadata.json")
      _stdout, stderr, status = Open3.capture3("ruby", GENERATOR, "--source", source, "--out", out)
      assert status.success?, stderr
      return JSON.parse(File.read(out))
    end
  end

  def run_generator(source)
    Dir.mktmpdir("plaky115-metadata-v2-") do |dir|
      out = File.join(dir, "metadata.json")
      return Open3.capture3("ruby", GENERATOR, "--source", source, "--out", out)
    end
  end

  def generate_document(document)
    stdout, stderr, status, out = run_generator_document(document, include_out: true)
    assert status.success?, "#{stdout}\n#{stderr}"
    JSON.parse(File.read(out))
  ensure
    FileUtils.remove_entry(File.dirname(out)) if out && File.exist?(File.dirname(out))
  end

  def run_generator_document(document, include_out: false)
    dir = Dir.mktmpdir("plaky115-metadata-v2-")
    source = File.join(dir, "source.yaml")
    out = File.join(dir, "metadata.json")
    File.write(source, YAML.dump(document))
    stdout, stderr, status = Open3.capture3("ruby", GENERATOR, "--source", source, "--out", out)
    return [stdout, stderr, status, out] if include_out

    FileUtils.remove_entry(dir)
    [stdout, stderr, status]
  end
end
