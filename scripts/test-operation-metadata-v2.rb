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
  def test_semantics_existing_20_are_exact_and_explicit
    metadata = generate(File.join(ROOT, "openapi/plaky115-dx.openapi.yaml"))
    operations = metadata.fetch("operations")
    assert_equal 20, operations.length
    expected_compact = {
      "listSpaces" => "space", "getSpace" => "space",
      "listBoards" => "board", "getBoard" => "board",
      "listItems" => "item", "createItem" => "item", "getItem" => "item",
      "listSubitems" => "item", "updateItemField" => "item", "updateItemFields" => "item",
      "listItemComments" => "comment", "createItemComment" => "comment", "updateItemComment" => "comment",
    }
    destructive = %w[deleteItem deleteItemComment]
    operations.each do |operation|
      id = operation.fetch("operationId")
      assert operation.key?("request"), "#{id} request"
      assert operation.key?("success"), "#{id} success"
      assert_equal expected_compact.fetch(id, "raw"), operation.fetch("compactKind"), id
      assert_equal destructive.include?(id) ? "destructive" : "none", operation.fetch("confirmation"), id
      assert_equal false, operation.fetch("sensitiveOutput"), id
      assert_match(/\Aplaky_[a-z0-9_]+\z/, operation.fetch("mcpName"), id)
      refute_empty operation.fetch("mcpTitle"), id
      refute_empty operation.fetch("scopes"), id
    end
  end

  def test_semantics_reject_invalid_compact_confirmation_and_sensitive_values
    spec = semantic_fixture
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    {
      "x-plaky115-compact-kind" => ["invalid", /invalid compact kind/],
      "x-plaky115-confirmation" => ["sometimes", /invalid confirmation/],
      "x-plaky115-sensitive-output" => ["false", /sensitive output must be boolean/],
    }.each do |field, (value, message)|
      changed = Marshal.load(Marshal.dump(spec))
      changed.dig("paths", "/fixture/widgets/{widgetId}", "post")[field] = value
      _stdout, stderr, status = run_generator_document(changed)
      refute status.success?
      assert_match message, stderr
    end
    assert_equal "item", generate_document(spec).dig("operations", 0, "compactKind")
    assert_equal false, operation.fetch("x-plaky115-sensitive-output")
  end

  def test_semantics_require_mcp_fields_and_destructive_consistency
    spec = semantic_fixture
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation.fetch("x-plaky115-mcp").delete("title")
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/MCP title is required/, stderr)

    spec = semantic_fixture
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation.fetch("x-plaky115-mcp")["destructiveHint"] = true
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/destructive operation requires destructive scope and confirmation/, stderr)

    operation.fetch("x-plaky115-mcp")["scopes"] << "destructive"
    operation["x-plaky115-confirmation"] = "destructive"
    assert_equal true, generate_document(spec).dig("operations", 0, "destructive")
  end

  def test_semantics_reject_duplicate_mcp_names_and_operation_ids
    spec = semantic_fixture
    first = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    spec.fetch("paths")["/fixture/other"] = { "post" => Marshal.load(Marshal.dump(first)) }
    spec.dig("paths", "/fixture/other", "post")["operationId"] = "otherOperation"
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/duplicate MCP name/, stderr)

    spec.dig("paths", "/fixture/other", "post", "x-plaky115-mcp")["name"] = "plaky_other_operation"
    spec.dig("paths", "/fixture/other", "post")["operationId"] = first.fetch("operationId")
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/duplicate operationId/, stderr)
  end

  def test_success_200_and_201_json_objects_include_schema_refs
    json = generate(File.join(FIXTURES, "metadata-json.yaml")).fetch("operations").fetch(0)
    assert_equal({
      "status" => 200,
      "kind" => "json-object",
      "mediaType" => "application/json",
      "schemaRef" => "#/components/schemas/Widget",
    }, json.fetch("success"))

    multipart = generate(File.join(FIXTURES, "metadata-multipart.yaml")).fetch("operations").fetch(0)
    assert_equal 201, multipart.dig("success", "status")
    assert_equal "json-object", multipart.dig("success", "kind")
    assert_equal "#/components/schemas/File", multipart.dig("success", "schemaRef")
  end

  def test_success_bare_array_is_list_and_bodyless_put_is_void
    array = generate(File.join(FIXTURES, "metadata-array.yaml")).fetch("operations").fetch(0)
    assert_equal({
      "status" => 200,
      "kind" => "json-array",
      "mediaType" => "application/json",
    }, array.fetch("success"))
    assert_equal true, array.fetch("list")

    bodyless = generate(File.join(FIXTURES, "metadata-bodyless-put.yaml")).fetch("operations").fetch(0)
    assert_equal({ "status" => 200, "kind" => "void" }, bodyless.fetch("success"))
  end

  def test_success_204_and_205_are_void
    spec = fixture("metadata-json.yaml")
    responses = spec.dig("paths", "/fixture/widgets/{widgetId}", "post", "responses")
    responses.clear
    responses["204"] = { "description" => "No content" }
    assert_equal({ "status" => 204, "kind" => "void" },
                 generate_document(spec).dig("operations", 0, "success"))
    responses.clear
    responses["205"] = { "description" => "Reset content", "content" => { "application/json" => { "schema" => { "type" => "object" } } } }
    assert_equal({ "status" => 205, "kind" => "void" },
                 generate_document(spec).dig("operations", 0, "success"))
  end

  def test_success_multiple_compatible_uses_lowest_status
    spec = fixture("metadata-json.yaml")
    responses = spec.dig("paths", "/fixture/widgets/{widgetId}", "post", "responses")
    responses["201"] = Marshal.load(Marshal.dump(responses.fetch("200")))
    assert_equal 200, generate_document(spec).dig("operations", 0, "success", "status")
  end

  def test_success_incompatible_shapes_require_explicit_selection
    source = File.join(FIXTURES, "metadata-invalid-success-shapes.yaml")
    _stdout, stderr, status = run_generator(source)
    refute status.success?
    assert_match(/incompatible successful response kinds/, stderr)

    spec = fixture("metadata-invalid-success-shapes.yaml")
    spec.dig("paths", "/fixture/ambiguous-success", "get")["x-plaky115-success-status"] = 206
    selected = generate_document(spec).fetch("operations").fetch(0)
    assert_equal 206, selected.dig("success", "status")
    assert_equal "json-array", selected.dig("success", "kind")
  end

  def test_success_unresolved_response_schema_fails
    spec = fixture("metadata-json.yaml")
    spec.dig("paths", "/fixture/widgets/{widgetId}", "post", "responses", "200", "content",
             "application/json")["schema"] = { "$ref" => "#/components/schemas/MissingResponse" }
    _stdout, stderr, status = run_generator_document(spec)
    refute status.success?
    assert_match(/key not found.*MissingResponse/, stderr)
  end

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

  def semantic_fixture
    spec = fixture("metadata-json.yaml")
    operation = spec.dig("paths", "/fixture/widgets/{widgetId}", "post")
    operation["x-plaky115-confirmation"] = "none"
    operation["x-plaky115-compact-kind"] = "item"
    operation["x-plaky115-sensitive-output"] = false
    operation["x-plaky115-mcp"] = {
      "name" => "plaky_fixture_create_widget",
      "title" => "Create fixture widget",
      "scopes" => ["write"],
      "readOnlyHint" => false,
      "destructiveHint" => false,
      "idempotentHint" => false,
      "openWorldHint" => true,
    }
    spec
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
