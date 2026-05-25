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
      mcp = by_operation_id.fetch(operation_id).fetch("x-speakeasy-mcp")
      assert_match(/\Aplaky_[a-z0-9_]+\z/, mcp.fetch("name"))
      assert mcp.fetch("title").length >= 8
      assert_includes mcp.fetch("scopes"), "read" unless mcp.fetch("readOnlyHint") == false
      refute_nil mcp.fetch("destructiveHint")
      refute_nil mcp.fetch("idempotentHint")
      refute_nil mcp.fetch("openWorldHint")
      assert by_operation_id.fetch(operation_id).key?("x-speakeasy-usage-example")
    end

    delete_item = by_operation_id.fetch("deleteItem").fetch("x-speakeasy-mcp")
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

  private

  def operation(operations, id)
    operations.find { |op| op.fetch("operationId") == id } || flunk("missing metadata for #{id}")
  end

  def load_yaml(path)
    YAML.safe_load(File.read(File.join(ROOT, path)), aliases: true)
  end
end
