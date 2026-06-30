#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "minitest/autorun"
require "yaml"

ROOT = File.expand_path("..", __dir__)

class OperationMetadataTest < Minitest::Test
  REQUIRED_OPERATION_IDS = %w[
    listSpaces
    getSpace
    listBoards
    listItems
    createItem
    updateItemField
    updateItemFields
    listUsers
    listTeams
    listItemComments
    createItemComment
    updateItemComment
    deleteItemComment
    replaceCommentReactions
  ].freeze

  HTTP_METHODS = %w[get post put patch delete head options trace].freeze

  # Mirror of the allow-lists in scripts/generate-operation-metadata.rb. Spec
  # query params deliberately NOT threaded onto raw CLI/MCP surfaces are listed
  # here explicitly, so a NEW spec query param fails this test until it is either
  # threaded (THREADED_QUERY_PARAMS in the generator) or ignored on purpose here.
  PAGINATION_QUERY_PARAMS = %w[page pageSize limit offset].freeze
  THREADED_QUERY_PARAMS = %w[expand emails status type boardViewId parentId subitemsBehaviour].freeze
  KNOWN_UNTHREADED_QUERY_PARAMS = %w[].freeze

  # Uppercase item-field type enum (ItemFieldResponse.type). Example payloads must
  # use these, not lowercase JSON-schema primitive names like "string".
  FIELD_TYPE_ENUM = %w[STRING NUMBER DATE_TIME STATUS TAG PERSON RICH_TEXT LINK TIMELINE].freeze

  def test_dx_overlay_names_core_operations_and_mcp_tools
    overlay = load_yaml("overlays/plaky115-dx.overlay.yaml")
    updates = overlay.fetch("actions").map { |action| action.fetch("update", {}) }
    by_operation_id = updates.each_with_object({}) do |update, index|
      next unless update["operationId"]

      index[update.fetch("operationId")] = update
    end

    REQUIRED_OPERATION_IDS.each do |operation_id|
      assert by_operation_id.key?(operation_id), "missing operationId #{operation_id}"
      assert by_operation_id.fetch(operation_id).fetch("summary").length >= 12
      mcp = by_operation_id.fetch(operation_id).fetch("x-plaky115-mcp")
      assert_match(/\Aplaky_[a-z0-9_]+\z/, mcp.fetch("name"))
      assert mcp.fetch("title").length >= 8
      assert_includes mcp.fetch("scopes"), "read" unless mcp.fetch("readOnlyHint") == false
      refute_nil mcp.fetch("destructiveHint")
      refute_nil mcp.fetch("idempotentHint")
      refute_nil mcp.fetch("openWorldHint")
      assert by_operation_id.fetch(operation_id).key?("x-plaky115-usage-example")
    end

    delete_item = by_operation_id.fetch("deleteItem").fetch("x-plaky115-mcp")
    assert_equal true, delete_item.fetch("destructiveHint")
    assert_includes delete_item.fetch("scopes"), "destructive"
  end

  def test_generated_metadata_classifies_operations_for_docs_and_tests
    metadata = JSON.parse(File.read(File.join(ROOT, "openapi/plaky115-operation-metadata.json")))
    operations = metadata.fetch("operations")

    assert_equal REQUIRED_OPERATION_IDS.sort, (REQUIRED_OPERATION_IDS & operations.map { |op| op.fetch("operationId") }).sort

    list_items = operation(operations, "listItems")
    assert_equal "GET", list_items.fetch("method")
    assert_equal true, list_items.fetch("list")
    assert_equal ["read"], list_items.fetch("scopes")
    assert_equal "$.data", list_items.fetch("pagination").fetch("results")

    update_fields = operation(operations, "updateItemFields")
    assert_equal "PATCH", update_fields.fetch("method")
    assert_equal ["write"], update_fields.fetch("scopes")
    assert_equal false, update_fields.fetch("destructive")

    delete_item = operation(operations, "deleteItem")
    assert_equal true, delete_item.fetch("destructive")
    assert_equal ["write", "destructive"], delete_item.fetch("scopes")

    examples = metadata.fetch("examples")
    assert examples.key?("createItem")
    assert_match(/create/i, examples.fetch("createItem").fetch("title"))
  end

  def test_every_spec_query_param_is_threaded_or_explicitly_ignored
    spec = load_yaml("openapi/plaky115-dx.openapi.yaml")
    known = PAGINATION_QUERY_PARAMS + THREADED_QUERY_PARAMS + KNOWN_UNTHREADED_QUERY_PARAMS
    unexpected = []
    each_operation(spec) do |_id, _method, operation, path_item|
      query_param_names(operation, path_item, spec).each do |name|
        unexpected << name unless known.include?(name)
      end
    end
    assert_equal [], unexpected.uniq.sort,
                 "spec query params are neither threaded onto raw surfaces nor explicitly ignored; thread " \
                 "them in generate-operation-metadata.rb or add to KNOWN_UNTHREADED_QUERY_PARAMS: " \
                 "#{unexpected.uniq.sort.join(', ')}"
  end

  def test_example_payloads_match_request_and_response_shapes
    spec = load_yaml("openapi/plaky115-dx.openapi.yaml")
    metadata = JSON.parse(File.read(File.join(ROOT, "openapi/plaky115-operation-metadata.json")))
    by_id = {}
    each_operation(spec) { |id, _method, operation, _path_item| by_id[id] = operation }

    errors = []
    metadata.fetch("examples").each do |op_id, example|
      next unless example.is_a?(Hash)

      operation = by_id[op_id]
      next unless operation

      check_request_example(op_id, example.fetch("request"), resolve_request_schema(operation, spec), spec, errors) if example.key?("request")
      check_response_example(op_id, example.fetch("response"), errors) if example.key?("response")
    end

    assert_equal [], errors, errors.join("\n")
  end

  private

  def operation(operations, id)
    operations.find { |op| op.fetch("operationId") == id } || flunk("missing metadata for #{id}")
  end

  def load_yaml(path)
    YAML.safe_load(File.read(File.join(ROOT, path)), aliases: true)
  end

  def each_operation(spec)
    spec.fetch("paths").each do |_path, path_item|
      path_item.each do |method, operation|
        next unless HTTP_METHODS.include?(method)

        yield operation.fetch("operationId"), method, operation, path_item
      end
    end
  end

  def query_param_names(operation, path_item, spec)
    (Array(path_item["parameters"]) + Array(operation["parameters"]))
      .map { |param| fetch_ref(param, spec) }
      .select { |param| param.is_a?(Hash) && param["in"] == "query" }
      .map { |param| param["name"] }
      .compact
  end

  def fetch_ref(schema, spec)
    return schema unless schema.is_a?(Hash) && schema["$ref"]

    pointer = schema.fetch("$ref").delete_prefix("#/").split("/")
    pointer.reduce(spec) { |node, part| node.fetch(part) }
  end

  def resolve_request_schema(operation, spec)
    schema = operation.dig("requestBody", "content", "application/json", "schema")
    schema && fetch_ref(schema, spec)
  end

  # Conservative request-example check: only enforced when the request schema is a
  # plain object with declared properties (skips genuinely-dynamic bodies such as
  # updateItemFields, typed as a string in the spec). Catches unknown top-level
  # keys and a wrong `fields` container type (object map vs array).
  def check_request_example(op_id, request, schema, spec, errors)
    return unless request.is_a?(Hash)
    return unless schema.is_a?(Hash) && schema["type"] == "object" && schema["properties"].is_a?(Hash)

    props = schema.fetch("properties")
    request.each_key do |key|
      errors << "#{op_id}.request: unknown key #{key.inspect} (not in #{props.keys.join(', ')})" unless props.key?(key)
    end

    return unless request.key?("fields") && props.key?("fields")

    fields_schema = fetch_ref(props.fetch("fields"), spec)
    fields_type = fields_schema.is_a?(Hash) ? fields_schema["type"] : nil
    if fields_type == "object" && !request.fetch("fields").is_a?(Hash)
      errors << "#{op_id}.request.fields must be an object map (schema type object), got #{request.fetch('fields').class}"
    elsif fields_type == "array" && !request.fetch("fields").is_a?(Array)
      errors << "#{op_id}.request.fields must be an array (schema type array), got #{request.fetch('fields').class}"
    end
  end

  # Walks a response example and enforces: item-field `type` values use the
  # uppercase enum, and any `fields` container is an array (item responses).
  def check_response_example(op_id, value, errors)
    case value
    when Hash
      if value["key"].is_a?(String) && value["type"].is_a?(String) && !FIELD_TYPE_ENUM.include?(value["type"])
        errors << "#{op_id}.response: field type #{value['type'].inspect} not in #{FIELD_TYPE_ENUM.join('|')}"
      end
      errors << "#{op_id}.response.fields must be an array" if value.key?("fields") && !value["fields"].is_a?(Array)
      value.each_value { |child| check_response_example(op_id, child, errors) }
    when Array
      value.each { |child| check_response_example(op_id, child, errors) }
    end
  end
end
